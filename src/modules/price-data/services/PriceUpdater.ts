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
import type { PriceStore } from './PriceStore'
import type { NormalizedPricePoint } from './PriceSource/types'

export interface UpdateCurrentResult {
  skipped: boolean
  reason?: string
  point?: NormalizedPricePoint
}

export interface FillGapsResult {
  gapDays: number
  fromDate?: string
  toDate?: string
}

export interface PriceUpdaterDeps {
  store: PriceStore
  fetchCurrent: () => Promise<NormalizedPricePoint>
  fetchHistory?: (from: string, to: string) => Promise<NormalizedPricePoint[]>
  cooldownMs?: number
}

export interface PriceUpdater {
  updateCurrent(force?: boolean): Promise<UpdateCurrentResult>
  fillGaps(): Promise<FillGapsResult>
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000  // 5 min per spec D3

export function createPriceUpdater(deps: PriceUpdaterDeps): PriceUpdater {
  const { store, fetchCurrent, fetchHistory } = deps
  const cooldownMs = deps.cooldownMs ?? DEFAULT_COOLDOWN_MS

  // Inflight promise dedup (per spec D7, red-team #8).
  // Concurrent callers within one process share the same in-flight promise.
  let inflight: Promise<UpdateCurrentResult> | null = null

  return {
    async updateCurrent(force = false) {
      if (inflight) return inflight

      inflight = (async () => {
        try {
          const latest = await store.getLatest()

          if (!force && latest) {
            const ageMs = Date.now() - latest.fetchedAt.getTime()
            if (ageMs < cooldownMs) {
              return { skipped: true, reason: `within cooldown (age ${Math.round(ageMs / 1000)}s)` }
            }
          }

          let point: NormalizedPricePoint
          try {
            point = await fetchCurrent()
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn('updateCurrent: fetch failed, returning stale DB value:', msg)
            return { skipped: true, reason: `fetch failed: ${msg}` }
          }

          // MAX/MIN aggregation when same-day row exists.
          // If the previous row in DB is from a different day, use new values directly.
          let high = point.high
          let low = point.low
          let open = point.open
          if (latest && latest.date === point.date) {
            high = Math.max(latest.high, point.high)
            low = Math.min(latest.low, point.low)
            open = latest.open  // preserve original open of the day
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
          })

          return { skipped: false, point }
        } finally {
          inflight = null
        }
      })()

      return inflight
    },

    async fillGaps() {
      if (!fetchHistory) {
        throw new Error('PriceUpdater.fillGaps: fetchHistory not configured')
      }

      const today = new Date().toISOString().slice(0, 10)
      const latest = await store.getLatest()
      const fromDate = latest ? nextDayISO(latest.date) : '2013-11-01'

      if (fromDate > today) {
        return { gapDays: 0 }
      }

      const points = await fetchHistory(fromDate, today)
      for (const p of points) {
        await store.upsertDay({
          date: p.date,
          timestamp: BigInt(p.timestamp),
          open: p.open, high: p.high, low: p.low, close: p.close,
          volume: p.volume, source: p.source, fetchedAt: p.fetchedAt,
        })
      }

      // Heartbeat
      await store.setMeta('lastSuccessfulCronAt', new Date().toISOString())

      return { gapDays: points.length, fromDate, toDate: today }
    },
  }
}

function nextDayISO(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
