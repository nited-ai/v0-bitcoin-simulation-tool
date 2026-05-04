// app/api/cron/update-prices/route.ts
//
// Cron endpoint. Hit by:
//   - Vercel Cron daily at 00:05 UTC (configured in vercel.json)
//   - GitHub Action hourly (configured in .github/workflows/hourly-price-refresh.yml)
//
// Auth: Authorization: Bearer ${CRON_SECRET} per Vercel canonical pattern (spec D8).
//
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { PrismaClient } from '@/lib/generated/prisma'
import { createPriceStore } from '@/src/modules/price-data/services/PriceStore'
import { createPriceUpdater } from '@/src/modules/price-data/services/PriceUpdater'
import { fetchCurrentWithFallback } from '@/src/modules/price-data/services/PriceSource'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'  // never cache cron responses

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${cronSecret}`
  if (!safeEqualStrings(auth, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Lazy-instantiate Prisma so module-load doesn't crash builds without DATABASE_URL
  const prisma = new PrismaClient()
  try {
    const store = createPriceStore(prisma)
    const updater = createPriceUpdater({
      store,
      fetchCurrent: fetchCurrentWithFallback,
      // fetchHistory not yet wired — fillGaps for incremental days only
      // will land in a follow-up. PR2 covers updateCurrent path only.
    })

    const updateResult = await updater.updateCurrent(true)  // force=true: cron always refreshes

    return NextResponse.json({
      ok: true,
      updateCurrent: updateResult,
      fillGaps: { skipped: true, reason: 'fetchHistory not yet wired in PR2' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

/** Constant-time string comparison via timingSafeEqual. */
function safeEqualStrings(a: string, b: string): boolean {
  // Pad/truncate both to same length to avoid throwing on mismatched length
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    // Still do a comparison to keep timing constant
    timingSafeEqual(ab, ab)
    return false
  }
  return timingSafeEqual(ab, bb)
}
