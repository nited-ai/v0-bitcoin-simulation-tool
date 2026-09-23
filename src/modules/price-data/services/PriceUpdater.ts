// src/modules/price-data/services/PriceUpdater.ts
//
// Orchestration layer: combines PriceStore (DB) and a fetcher (external API).
// updateCurrent: lazy-refresh with cooldown + inflight dedup (per spec §7, D7)
// fillGaps:      backfill missing days from external history (cron path)
//
// MAX/MIN aggregation: when the same-day row already exists in DB, preserve
// the day's actual MAX(high), MIN(low), and original open. Only close updates
// to the latest fetch. (See Task 4 review: without this, intraday high/low
// would be clobbered by a later fetch reporting a lower value.)
//
import type { PriceStore } from "./PriceStore";
import type { NormalizedPricePoint } from "./PriceSource/types";

export interface UpdateCurrentResult {
  skipped: boolean;
  reason?: string;
  point?: NormalizedPricePoint;
}

export interface FillGapsResult {
  gapDays: number;
  fromDate?: string;
  toDate?: string;
}

export interface PriceUpdaterDeps {
  store: PriceStore;
  fetchCurrent: () => Promise<NormalizedPricePoint>;
  fetchHistory?: (from: string, to: string) => Promise<NormalizedPricePoint[]>;
  cooldownMs?: number;
}

export interface PriceUpdater {
  updateCurrent(force?: boolean): Promise<UpdateCurrentResult>;
  fillGaps(): Promise<FillGapsResult>;
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 min per spec D3

export function createPriceUpdater(deps: PriceUpdaterDeps): PriceUpdater {
  const { store, fetchCurrent, fetchHistory } = deps;
  const cooldownMs = deps.cooldownMs ?? DEFAULT_COOLDOWN_MS;

  // Inflight promise dedup (per spec D7, red-team #8).
  // Concurrent callers within one process share the same in-flight promise.
  let inflight: Promise<UpdateCurrentResult> | null = null;

  return {
    async updateCurrent(force = false) {
      if (inflight) return inflight;

      inflight = (async () => {
        try {
          const latest = await store.getLatest();

          if (!force && latest) {
            const ageMs = Date.now() - latest.fetchedAt.getTime();
            if (ageMs < cooldownMs) {
              return {
                skipped: true,
                reason: `within cooldown (age ${Math.round(ageMs / 1000)}s)`,
              };
            }
          }

          let point: NormalizedPricePoint;
          try {
            point = await fetchCurrent();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(
              "updateCurrent: fetch failed, returning stale DB value:",
              msg,
            );
            return { skipped: true, reason: `fetch failed: ${msg}` };
          }

          // MAX/MIN aggregation when same-day row exists.
          // If the previous row in DB is from a different day, use new values directly.
          let high = point.high;
          let low = point.low;
          let open = point.open;
          if (latest && latest.date === point.date) {
            high = Math.max(latest.high, point.high);
            low = Math.min(latest.low, point.low);
            open = latest.open; // preserve original open of the day
          }

          await store.upsertDay({
            date: point.date,
            timestamp: BigInt(point.timestamp),
            open,
            high,
            low,
            close: point.close,
            volume: point.volume,
            source: point.source,
            fetchedAt: point.fetchedAt,
          });

          return { skipped: false, point };
        } finally {
          inflight = null;
        }
      })();

      return inflight;
    },

    async fillGaps() {
      if (!fetchHistory) {
        throw new Error("PriceUpdater.fillGaps: fetchHistory not configured");
      }

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.parse(today) - 86400000)
        .toISOString()
        .slice(0, 10);
      const stored = await store.getRange("2010-01-01", yesterday);
      const available = new Set(stored.map((p) => p.date));
      const earliest = stored.length
        ? stored.reduce(
            (first, p) => (p.date < first ? p.date : first),
            stored[0].date,
          )
        : "2017-08-17";
      // Find interior holes, not just dates after latest (which can already be today).
      // Always finalize yesterday: the last intraday quote is not a daily close.
      let fromDate = earliest;
      while (fromDate < yesterday && available.has(fromDate))
        fromDate = nextDayISO(fromDate);
      if (fromDate > yesterday) return { gapDays: 0 };
      const points = await fetchHistory(fromDate, yesterday);
      const expectedDays =
        (Date.parse(yesterday) - Date.parse(fromDate)) / 86400000 + 1;
      if (
        points.length !== expectedDays ||
        points.some(
          (p, i) =>
            p.date !==
            new Date(Date.parse(fromDate) + i * 86400000)
              .toISOString()
              .slice(0, 10),
        )
      ) {
        throw new Error(
          "Historical response incomplete; no success heartbeat written",
        );
      }
      if (
        points.some(
          (p) =>
            ![p.open, p.high, p.low, p.close].every(
              (n) => Number.isFinite(n) && n > 0,
            ) ||
            p.low > Math.min(p.open, p.close) ||
            p.high < Math.max(p.open, p.close),
        )
      ) {
        throw new Error("Invalid historical OHLC response");
      }
      for (const p of points) {
        await store.upsertDay({
          date: p.date,
          timestamp: BigInt(p.timestamp),
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
          source: p.source,
          fetchedAt: p.fetchedAt,
        });
      }

      // Only the cron owner may record success after both history and live refresh.
      return { gapDays: points.length, fromDate, toDate: yesterday };
    },
  };
}

function nextDayISO(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
