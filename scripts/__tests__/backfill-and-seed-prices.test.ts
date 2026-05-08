import { describe, it, expect } from 'vitest'
import {
  sanityValidate,
  computeDryRunDiff,
  parseCliArgs,
  BINANCE_FIRST_DATE,
} from '../backfill-and-seed-prices'
import type { DailyOHLC } from '../../src/modules/price-data/services/PriceSource/types'

const goodRow = (date: string, high: number): DailyOHLC => ({
  date, openTime: new Date(date + 'T00:00:00Z').getTime(),
  open: high - 100, high, low: high - 200, close: high - 50, volume: 100,
})

describe('sanityValidate', () => {
  it('accepts a plausible row', () => {
    expect(() => sanityValidate(goodRow('2025-10-07', 126_272))).not.toThrow()
  })
  it('rejects high < low', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.high = 50_000
    expect(() => sanityValidate(bad)).toThrow(/high.*low/i)
  })
  it('rejects close > high', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.close = 150_000
    expect(() => sanityValidate(bad)).toThrow(/close.*high/i)
  })
  it('rejects open < low', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.open = 50_000  // less than low (99_800)
    expect(() => sanityValidate(bad)).toThrow(/open.*low/i)
  })
  it('rejects non-positive prices', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.low = 0
    expect(() => sanityValidate(bad)).toThrow(/positive/i)
  })
  it('rejects implausibly high price (> 10M)', () => {
    expect(() => sanityValidate(goodRow('2025-10-07', 12_000_000))).toThrow(/implausible/i)
  })
})

describe('computeDryRunDiff', () => {
  it('emits delta records for changed highs', () => {
    const newRows: DailyOHLC[] = [goodRow('2025-10-07', 126_272)]
    const existing = new Map([['2025-10-07', { high: 124_773, low: 124_773, open: 124_773, close: 124_773 }]])
    const diff = computeDryRunDiff(newRows, existing)
    expect(diff).toHaveLength(1)
    expect(diff[0].date).toBe('2025-10-07')
    expect(diff[0].oldHigh).toBeCloseTo(124_773, 0)
    expect(diff[0].newHigh).toBeCloseTo(126_272, 0)
    expect(diff[0].deltaHigh).toBeGreaterThan(0)
  })
  it('emits records for new dates (no existing row)', () => {
    const diff = computeDryRunDiff([goodRow('2025-10-07', 126_272)], new Map())
    expect(diff).toHaveLength(1)
    expect(diff[0].oldHigh).toBeNull()
  })
  it('emits zero-delta records for unchanged rows', () => {
    const diff = computeDryRunDiff(
      [goodRow('2025-10-07', 100_000)],
      new Map([['2025-10-07', { high: 100_000, low: 99_800, open: 99_900, close: 99_950 }]]),
    )
    expect(diff[0].deltaHigh).toBe(0)
  })
})

describe('parseCliArgs', () => {
  it('defaults to incremental mode', () => {
    const args = parseCliArgs([])
    expect(args.mode).toBe('incremental')
    expect(args.dryRun).toBe(false)
    expect(args.from).toBeUndefined()
    expect(args.to).toBeUndefined()
    expect(args.restoreFile).toBeUndefined()
  })
  it('--full → mode=full', () => {
    expect(parseCliArgs(['--full']).mode).toBe('full')
  })
  it('--dry-run sets dryRun=true', () => {
    expect(parseCliArgs(['--dry-run']).dryRun).toBe(true)
  })
  it('--from --to override range', () => {
    const args = parseCliArgs(['--from', '2024-01-01', '--to', '2024-12-31'])
    expect(args.from).toBe('2024-01-01')
    expect(args.to).toBe('2024-12-31')
  })
  it('--restore <file> → mode=restore', () => {
    const args = parseCliArgs(['--restore', 'snapshot.json'])
    expect(args.mode).toBe('restore')
    expect(args.restoreFile).toBe('snapshot.json')
  })
  it('throws on invalid date format', () => {
    expect(() => parseCliArgs(['--from', '2024/01/01'])).toThrow(/YYYY-MM-DD/)
  })
  it('throws when --from > --to', () => {
    expect(() => parseCliArgs(['--from', '2025-01-01', '--to', '2024-01-01'])).toThrow(/from.*to/i)
  })
})

describe('BINANCE_FIRST_DATE', () => {
  it('is the first BTCUSDT day', () => {
    expect(BINANCE_FIRST_DATE).toBe('2017-08-17')
  })
})
