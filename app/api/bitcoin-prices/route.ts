// app/api/bitcoin-prices/route.ts
//
// Single read endpoint. Returns { prices, currentPrice, ath, lastUpdated, isStale }.
// Cached at the Edge via Cache-Control: s-maxage=60, stale-while-revalidate=300.
//
// Lazy refresh (per spec §7): if latest.fetchedAt > 5 min old, fire updateCurrent
// via Next.js after() so it runs after the response is sent — never blocks the request.
//
// ?refresh=force bypasses cooldown (used by "Load current price" button in PR4).
// ?from=YYYY-MM-DD&to=YYYY-MM-DD constrains the historical range; default = full history.
//
import { NextResponse, after } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { createPriceStore } from '@/src/modules/price-data/services/PriceStore'
import { createPriceUpdater } from '@/src/modules/price-data/services/PriceUpdater'
import { fetchCurrentWithFallback } from '@/src/modules/price-data/services/PriceSource'

export const runtime = 'nodejs'

const COOLDOWN_MS = 5 * 60 * 1000
const STALE_CRON_MS = 25 * 60 * 60 * 1000  // 25h: daily cron should heartbeat within 24h

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? '1970-01-01'
  const to = url.searchParams.get('to') ?? '9999-12-31'
  const force = url.searchParams.get('refresh') === 'force'

  const prisma = new PrismaClient()
  try {
    const store = createPriceStore(prisma)

    let latest, rangeRows, athValue, lastCronStr
    try {
      ;[latest, rangeRows, athValue, lastCronStr] = await Promise.all([
        store.getLatest(),
        store.getRange(from, to),
        store.getATH(),
        store.getMeta('lastSuccessfulCronAt'),
      ])
    } catch (err) {
      console.error('GET /api/bitcoin-prices DB error:', err)
      return NextResponse.json(
        { error: 'db_unavailable', detail: err instanceof Error ? err.message : String(err) },
        { status: 503 },
      )
    }

    // Decide whether to fire a background refresh
    const ageMs = latest ? Date.now() - latest.fetchedAt.getTime() : Infinity
    if (force || ageMs > COOLDOWN_MS) {
      const updater = createPriceUpdater({ store, fetchCurrent: fetchCurrentWithFallback })
      after(async () => {
        try {
          await updater.updateCurrent(force)
        } catch (err) {
          console.warn('background updateCurrent failed:', err)
        }
      })
    }

    // Staleness check (cron heartbeat)
    const cronAgeMs = lastCronStr
      ? Date.now() - new Date(lastCronStr).getTime()
      : Infinity
    const isStale = cronAgeMs > STALE_CRON_MS

    const body = {
      prices: rangeRows.map((r) => ({
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
    }

    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}
