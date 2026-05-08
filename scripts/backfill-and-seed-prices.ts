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
