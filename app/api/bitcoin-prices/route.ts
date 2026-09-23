// app/api/bitcoin-prices/route.ts
//
// Single read endpoint. Returns { prices, currentPrice, ath, lastUpdated, isStale }.
// Cached at the Edge via Cache-Control: s-maxage=60, stale-while-revalidate=300.
//
// Lazy refresh (per spec §7): if latest.fetchedAt > 5 min old, fire updateCurrent
// via Next.js after() so it runs after the response is sent — never blocks the request.
//
// Public refresh requests respect the upstream cooldown.
// ?from=YYYY-MM-DD&to=YYYY-MM-DD constrains the historical range; default = full history.
//
import { NextResponse, after } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createPriceStore } from "@/src/modules/price-data/services/PriceStore";
import { createPriceUpdater } from "@/src/modules/price-data/services/PriceUpdater";
import { fetchCurrentWithFallback } from "@/src/modules/price-data/services/PriceSource";
import { readFile } from 'node:fs/promises';

export const runtime = "nodejs";

const COOLDOWN_MS = 5 * 60 * 1000;
const STALE_CRON_MS = 25 * 60 * 60 * 1000; // 25h: daily cron should heartbeat within 24h
const STALE_PRICE_MS = 60 * 60 * 1000;

function validDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export async function GET(request: Request) {
  if (process.env.FIREHODL_DISABLE_LIVE_DATA === "1") {
    return NextResponse.json({ error: "live_data_disabled" }, { status: 503 });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "1970-01-01";
  const to = url.searchParams.get("to") ?? "9999-12-31";
  if (!validDate(from) || !validDate(to) || from > to) {
    return NextResponse.json({ error: "invalid_date_range" }, { status: 400 });
  }

  // Explicit local preview mode: an existing market-data backup, no DB or upstream writes.
  if (process.env.FIREHODL_READ_ONLY_DATA === '1' && process.env.FIREHODL_PREVIEW_PRICE_FILE) {
    try {
      const snapshot = JSON.parse(await readFile(process.env.FIREHODL_PREVIEW_PRICE_FILE, 'utf8'));
      const rows = snapshot.filter((r: any) => validDate(r.date) && [r.close, r.open, r.high, r.low].every((n: number) => Number.isFinite(n) && n > 0))
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const lastDate = rows.at(-1)?.date ?? null;
      return NextResponse.json({
        prices: rows.filter((r: any) => r.date >= from && r.date <= to && r.date < new Date().toISOString().slice(0, 10))
          .map(({ date, close, high, low, open }: any) => ({ date, close, high, low, open })),
        currentPrice: null, ath: rows.length ? { value: Math.max(...rows.map((r: any) => r.high)) } : null,
        lastUpdated: lastDate, isStale: true, sourceDescription: 'Lokale historische Datensicherung',
      }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ error: 'preview_data_unavailable' }, { status: 503 });
    }
  }

  const prisma = new PrismaClient();
  try {
    const store = createPriceStore(prisma);

    let latest, rangeRows, athValue, lastCronStr;
    try {
      [latest, rangeRows, athValue, lastCronStr] = await Promise.all([
        store.getLatest(),
        store.getRange(from, to),
        store.getATH(),
        store.getMeta("lastSuccessfulCronAt"),
      ]);
    } catch (err) {
      console.error("GET /api/bitcoin-prices DB error:", err);
      return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    }

    // Decide whether to fire a background refresh
    const ageMs = latest ? Date.now() - latest.fetchedAt.getTime() : Infinity;
    if (ageMs > COOLDOWN_MS && process.env.FIREHODL_READ_ONLY_DATA !== "1") {
      after(async () => {
        // The response client is disconnected in finally; background work owns its client.
        const refreshPrisma = new PrismaClient();
        try {
          const updater = createPriceUpdater({
            store: createPriceStore(refreshPrisma),
            fetchCurrent: fetchCurrentWithFallback,
          });
          await updater.updateCurrent(false);
        } catch (err) {
          console.warn("background updateCurrent failed:", err);
        } finally {
          await refreshPrisma.$disconnect();
        }
      });
    }

    // Staleness check (cron heartbeat)
    const cronAgeMs = lastCronStr
      ? Date.now() - new Date(lastCronStr).getTime()
      : Infinity;
    const isStale =
      !Number.isFinite(ageMs) ||
      ageMs < 0 ||
      ageMs > STALE_PRICE_MS ||
      !Number.isFinite(cronAgeMs) ||
      cronAgeMs < 0 ||
      cronAgeMs > STALE_CRON_MS;

    const body = {
      // An incomplete current candle is not a historical daily close.
      prices: rangeRows
        .filter((r) => r.date < new Date().toISOString().slice(0, 10))
        .map((r) => ({
          date: r.date,
          close: r.close,
          high: r.high,
          low: r.low,
          open: r.open,
        })),
      currentPrice: latest
        ? { value: latest.close, fetchedAt: latest.fetchedAt }
        : null,
      ath: athValue !== null ? { value: athValue } : null,
      lastUpdated: latest?.fetchedAt ?? null,
      isStale,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
