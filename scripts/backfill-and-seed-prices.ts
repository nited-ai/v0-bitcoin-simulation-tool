// scripts/backfill-and-seed-prices.ts
//
// Real-OHLC backfill + seed for bitcoin_prices table. Replaces
// gap-fill-prices.ts. Sources daily OHLC from Binance Klines for
// 2017-08-17+; pre-2017 rows are NOT touched (Binance has no data
// before BTCUSDT launched).
//
// Modes (see parseCliArgs):
//   (none)      incremental gap-fill: MAX(date)+1 → today
//   --full      full sweep: 2017-08-17 → yesterday UTC (production fix)
//   --dry-run   preview top deltas, write nothing
//   --from/--to explicit range
//   --restore <file>  rollback from JSON snapshot
//
// Spec: docs/superpowers/specs/2026-05-06-real-ohlc-backfill-design.md
//
import type { DailyOHLC } from '../src/modules/price-data/services/PriceSource/types'

export const BINANCE_FIRST_DATE = '2017-08-17'
const MAX_PLAUSIBLE_PRICE = 10_000_000  // sanity ceiling

// === Pure helpers (testable without IO) ===

export function sanityValidate(row: DailyOHLC): void {
  const { open, high, low, close, date } = row
  if (low <= 0 || open <= 0 || close <= 0 || high <= 0) {
    throw new Error(`sanityValidate: non-positive price on ${date}`)
  }
  if (high >= MAX_PLAUSIBLE_PRICE) {
    throw new Error(`sanityValidate: implausible high on ${date}: ${high}`)
  }
  if (low > high) {
    throw new Error(`sanityValidate: high < low on ${date} (${high} < ${low})`)
  }
  if (open < low || open > high) {
    throw new Error(`sanityValidate: open outside [low,high] on ${date}`)
  }
  if (close < low || close > high) {
    throw new Error(`sanityValidate: close outside [low,high] on ${date}`)
  }
}

export interface DryRunDelta {
  date: string
  oldHigh: number | null   // null if row was missing
  newHigh: number
  deltaHigh: number        // newHigh - (oldHigh ?? newHigh)
}

export interface ExistingRow {
  high: number
  low: number
  open: number
  close: number
}

export function computeDryRunDiff(
  newRows: DailyOHLC[],
  existing: Map<string, ExistingRow>,
): DryRunDelta[] {
  return newRows.map((r) => {
    const old = existing.get(r.date)
    const oldHigh = old?.high ?? null
    return {
      date: r.date,
      oldHigh,
      newHigh: r.high,
      deltaHigh: oldHigh === null ? 0 : r.high - oldHigh,
    }
  })
}

// === CLI argument parsing ===

export interface CliArgs {
  mode: 'incremental' | 'full' | 'restore'
  dryRun: boolean
  from?: string         // YYYY-MM-DD
  to?: string           // YYYY-MM-DD
  restoreFile?: string  // path to snapshot JSON
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = { mode: 'incremental', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--full') args.mode = 'full'
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--from') {
      const v = argv[++i]
      if (!ISO_DATE_RE.test(v)) throw new Error(`--from must be YYYY-MM-DD, got ${v}`)
      args.from = v
    } else if (a === '--to') {
      const v = argv[++i]
      if (!ISO_DATE_RE.test(v)) throw new Error(`--to must be YYYY-MM-DD, got ${v}`)
      args.to = v
    } else if (a === '--restore') {
      const v = argv[++i]
      if (!v) throw new Error('--restore requires a file path')
      args.mode = 'restore'
      args.restoreFile = v
    } else {
      throw new Error(`unknown argument: ${a}`)
    }
  }
  if (args.from && args.to && args.from > args.to) {
    throw new Error(`--from (${args.from}) must be <= --to (${args.to})`)
  }
  return args
}

// === Orchestration ===

export interface BackfillDeps {
  mode: 'incremental' | 'full'
  dryRun: boolean
  prisma: {
    bitcoinPrice: {
      findMany(): Promise<Array<{ date: string; high: number; low: number; open: number; close: number }>>
      upsert(args: {
        where: { date: string }
        create: {
          date: string; timestamp: bigint
          open: number; high: number; low: number; close: number
          volume: number | null; source: string
        }
        update: {
          open: number; high: number; low: number; close?: number
          volume: number | null; source: string
        }
      }): Promise<unknown>
    }
  }
  fetchKlines: (from: Date, to: Date) => Promise<DailyOHLC[]>
  now: () => Date
  from?: string  // YYYY-MM-DD override
  to?: string    // YYYY-MM-DD override
}

export interface BackfillResult {
  inserted: number
  updated: number
  oldAth: number
  newAth: number
  deltas?: DryRunDelta[]
  fetchedRows: number
}

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function dateStringToUtcMidnight(s: string): Date {
  return new Date(s + 'T00:00:00.000Z')
}

export async function runBackfill(deps: BackfillDeps): Promise<BackfillResult> {
  const { mode, dryRun, prisma, fetchKlines, now } = deps

  // Compute fetch range
  let fromDate: Date
  let toDate: Date

  if (deps.from) {
    fromDate = dateStringToUtcMidnight(deps.from)
  } else if (mode === 'incremental') {
    const all = await prisma.bitcoinPrice.findMany()
    const maxDate = all.reduce<string | null>((m, r) => (m === null || r.date > m ? r.date : m), null)
    if (maxDate === null) {
      fromDate = dateStringToUtcMidnight(BINANCE_FIRST_DATE)
    } else {
      const next = new Date(maxDate + 'T00:00:00.000Z')
      next.setUTCDate(next.getUTCDate() + 1)
      fromDate = next
    }
  } else {
    // full
    fromDate = dateStringToUtcMidnight(BINANCE_FIRST_DATE)
  }

  if (deps.to) {
    toDate = dateStringToUtcMidnight(deps.to)
    toDate.setUTCHours(23, 59, 59, 999)
  } else {
    // default: yesterday UTC end-of-day (avoid partial today candle)
    const yesterday = utcMidnight(now())
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(23, 59, 59, 999)
    toDate = yesterday
  }

  // Fetch
  const fetched = await fetchKlines(fromDate, toDate)

  // Sanity validate ALL rows BEFORE any write
  for (const r of fetched) sanityValidate(r)

  // Snapshot of existing rows for diff/comparison
  const allExisting = await prisma.bitcoinPrice.findMany()
  const existingMap = new Map(
    allExisting.map((r) => [r.date, { high: r.high, low: r.low, open: r.open, close: r.close }]),
  )
  const oldAth = allExisting.reduce((m, r) => Math.max(m, r.high), 0)

  if (dryRun) {
    const deltas = computeDryRunDiff(fetched, existingMap)
    const newAthFromFetch = fetched.reduce((m, r) => Math.max(m, r.high), oldAth)
    return { inserted: 0, updated: 0, oldAth, newAth: newAthFromFetch, deltas, fetchedRows: fetched.length }
  }

  // Upsert
  let inserted = 0
  let updated = 0
  for (const r of fetched) {
    const exists = existingMap.has(r.date)
    await prisma.bitcoinPrice.upsert({
      where: { date: r.date },
      create: {
        date: r.date,
        timestamp: BigInt(r.openTime),
        // For NEW rows (fresh install), use Binance close as canonical close.
        open: r.open, high: r.high, low: r.low, close: r.close,
        volume: r.volume, source: 'binance-klines-1d',
      },
      update: {
        // For EXISTING rows, preserve the existing close value.
        // Binance's close (end-of-day 23:59:59 UTC) and CoinGecko's old close
        // (00:00 UTC start-of-day) follow different timezone conventions that
        // varied across CoinGecko's free-tier history. Overwriting close with
        // Binance values causes downstream models (e.g., EnhancedCycleRepeatModel)
        // to diverge from their historically-trained behavior. Only update the
        // OHLC extremes (high/low/open) which the original CoinGecko data
        // didn't have — those give us correct ATH and chart wicks.
        open: r.open, high: r.high, low: r.low,
        volume: r.volume, source: 'binance-klines-1d',
      },
    })
    if (exists) updated++
    else inserted++
  }

  const allAfter = await prisma.bitcoinPrice.findMany()
  const newAth = allAfter.reduce((m, r) => Math.max(m, r.high), 0)

  return { inserted, updated, oldAth, newAth, fetchedRows: fetched.length }
}

// === Snapshot + restore ===

export interface DumpSnapshotDeps {
  prisma: {
    bitcoinPrice: { findMany(): Promise<unknown[]> }
  }
  writeFile: (path: string, content: string) => Promise<void>
  now: () => Date
}

export async function dumpSnapshot(deps: DumpSnapshotDeps): Promise<string> {
  const rows = await deps.prisma.bitcoinPrice.findMany()
  const ts = deps.now().toISOString().replace(/[:.]/g, '-')
  const path = `bitcoin_prices_pre_pr6_${ts}.json`
  // Custom JSON to handle BigInt → string
  const json = JSON.stringify(rows, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  )
  await deps.writeFile(path, json)
  return path
}

export interface RestoreDeps {
  prisma: {
    bitcoinPrice: {
      deleteMany(): Promise<{ count: number }>
      createMany(args: { data: unknown[] }): Promise<{ count: number }>
    }
  }
  readFile: (path: string) => Promise<string>
  restoreFile: string
}

export async function runRestore(deps: RestoreDeps): Promise<{ deleted: number; inserted: number }> {
  const json = await deps.readFile(deps.restoreFile)
  const rows = JSON.parse(json) as Array<Record<string, unknown>>
  if (!Array.isArray(rows)) throw new Error('restore: snapshot file does not contain an array')

  // Coerce timestamp string back to BigInt
  const dataForCreate = rows.map((r) => ({
    ...r,
    timestamp: typeof r.timestamp === 'string' ? BigInt(r.timestamp) : r.timestamp,
  }))

  const { count: deleted } = await deps.prisma.bitcoinPrice.deleteMany()
  const { count: inserted } = await deps.prisma.bitcoinPrice.createMany({ data: dataForCreate })
  return { deleted, inserted }
}

// === CLI entry ===

async function main(): Promise<void> {
  const { PrismaClient } = await import('@prisma/client')
  const { writeFile, readFile } = await import('node:fs/promises')
  const { fetchHistoricalKlines } = await import(
    '../src/modules/price-data/services/PriceSource/providers/binance'
  )

  const args = parseCliArgs(process.argv.slice(2))
  const prisma = new PrismaClient()
  try {
    if (args.mode === 'restore') {
      console.log(`Restoring from snapshot: ${args.restoreFile}`)
      const { deleted, inserted } = await runRestore({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma: prisma as any,
        readFile: (p) => readFile(p, 'utf8'),
        restoreFile: args.restoreFile!,
      })
      console.log(`Restore complete: deleted ${deleted} rows, inserted ${inserted}`)
      return
    }

    // For --full and incremental, snapshot first if writing
    if (args.mode === 'full' && !args.dryRun) {
      const path = await dumpSnapshot({
        prisma,
        writeFile: (p, c) => writeFile(p, c),
        now: () => new Date(),
      })
      console.log(`Snapshot written: ${path}`)
    }

    // After the early return above, args.mode is 'incremental' | 'full'
    const backfillMode: 'incremental' | 'full' =
      args.mode === 'full' ? 'full' : 'incremental'
    const result = await runBackfill({
      mode: backfillMode,
      dryRun: args.dryRun,
      prisma,
      fetchKlines: fetchHistoricalKlines,
      now: () => new Date(),
      from: args.from,
      to: args.to,
    })

    if (args.dryRun) {
      console.log(`DRY RUN — no writes`)
      console.log(`Fetched ${result.fetchedRows} rows`)
      console.log(`Old ATH: ${result.oldAth}`)
      console.log(`New ATH (after merge): ${result.newAth}`)
      console.log(`ATH delta: +${(result.newAth - result.oldAth).toFixed(2)}`)
      const top = (result.deltas ?? [])
        .filter((d) => d.deltaHigh > 0)
        .sort((a, b) => b.deltaHigh - a.deltaHigh)
        .slice(0, 50)
      console.log(`Top 50 high-deltas:`)
      for (const d of top) {
        console.log(`  ${d.date}: ${d.oldHigh} -> ${d.newHigh} (+${d.deltaHigh.toFixed(2)})`)
      }
    } else {
      console.log(`Inserted: ${result.inserted}`)
      console.log(`Updated:  ${result.updated}`)
      console.log(`Old ATH: ${result.oldAth}`)
      console.log(`New ATH: ${result.newAth}`)
      console.log(`ATH delta: +${(result.newAth - result.oldAth).toFixed(2)}`)
    }
  } catch (err) {
    console.error('backfill-and-seed-prices failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
