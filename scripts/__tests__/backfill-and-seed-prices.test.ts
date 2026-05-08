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

import {
  runBackfill,
  runRestore,
  dumpSnapshot,
} from '../backfill-and-seed-prices'

interface FakeRow {
  date: string
  open: number
  high: number
  low: number
  close: number
  source: string
}

function makeFakePrisma(initialRows: FakeRow[] = []) {
  const table = new Map<string, FakeRow>(initialRows.map((r) => [r.date, r]))
  return {
    table,
    bitcoinPrice: {
      async findMany() {
        return [...table.values()]
      },
      async upsert(args: {
        where: { date: string }
        create: FakeRow & { timestamp: bigint; volume: number | null }
        update: Partial<FakeRow>
      }) {
        const existing = table.get(args.where.date)
        if (existing) {
          table.set(args.where.date, { ...existing, ...args.update })
        } else {
          table.set(args.where.date, args.create)
        }
        return table.get(args.where.date)
      },
      async deleteMany() {
        const count = table.size
        table.clear()
        return { count }
      },
      async createMany({ data }: { data: FakeRow[] }) {
        for (const r of data) table.set(r.date, r)
        return { count: data.length }
      },
    },
  }
}

describe('runBackfill — happy path', () => {
  it('upserts new rows when DB is empty', async () => {
    const prisma = makeFakePrisma([])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.inserted).toBe(1)
    expect(result.updated).toBe(0)
    expect(prisma.table.get('2025-10-07')?.high).toBe(126_272)
    expect(prisma.table.get('2025-10-07')?.source).toBe('binance-klines-1d')
  })

  it('updates fake-OHLC rows in place with real OHLC', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(1)
    expect(prisma.table.get('2025-10-07')?.high).toBe(126_272)
    expect(prisma.table.get('2025-10-07')?.source).toBe('binance-klines-1d')
  })

  it('reports oldAth and newAth in result', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.oldAth).toBe(124_773)
    expect(result.newAth).toBe(126_272)
  })
})

describe('runBackfill — dry-run', () => {
  it('writes nothing and returns deltas', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: true,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.deltas?.[0].deltaHigh).toBe(126_272 - 124_773)
    expect(prisma.table.get('2025-10-07')?.high).toBe(124_773)  // untouched
  })
})

describe('runBackfill — sanity check rejection', () => {
  it('throws and writes nothing if any row fails sanityValidate', async () => {
    const prisma = makeFakePrisma([])
    const bad: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 100, high: 50, low: 200, close: 100, volume: 1 },
    ]
    await expect(
      runBackfill({
        mode: 'full',
        dryRun: false,
        prisma: prisma as any,
        fetchKlines: async () => bad,
        now: () => new Date('2026-05-08T12:00:00Z'),
      }),
    ).rejects.toThrow(/sanityValidate/)
    expect(prisma.table.size).toBe(0)
  })
})

describe('runBackfill — endTime cutoff in --full mode', () => {
  it('passes endTime = yesterday UTC midnight to fetchKlines', async () => {
    const prisma = makeFakePrisma([])
    let captured: { from: Date; to: Date } | null = null
    await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async (from, to) => {
        captured = { from, to }
        return []
      },
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    // yesterday UTC = 2026-05-07T23:59:59.999Z (approx)
    expect(captured!.to.toISOString().slice(0, 10)).toBe('2026-05-07')
    expect(captured!.from.toISOString().slice(0, 10)).toBe('2017-08-17')
  })
})

describe('runBackfill — incremental mode', () => {
  it('starts from MAX(date)+1', async () => {
    const prisma = makeFakePrisma([
      { date: '2026-05-05', open: 80000, high: 80000, low: 80000, close: 80000, source: 'binance' },
      { date: '2026-05-06', open: 81000, high: 81000, low: 81000, close: 81000, source: 'binance' },
    ])
    let captured: Date | null = null
    await runBackfill({
      mode: 'incremental',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async (from, _to) => {
        captured = from
        return []
      },
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(captured!.toISOString().slice(0, 10)).toBe('2026-05-07')
  })
})

describe('dumpSnapshot', () => {
  it('writes a JSON file containing every row', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    let written: { path: string; content: string } | null = null
    const path = await dumpSnapshot({
      prisma: prisma as any,
      writeFile: async (p, c) => { written = { path: p, content: String(c) } },
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(path).toMatch(/bitcoin_prices_pre_pr6_.*\.json$/)
    expect(written!.path).toBe(path)
    const parsed = JSON.parse(written!.content)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].date).toBe('2025-10-07')
  })
})

describe('runRestore', () => {
  it('clears table and reinstates rows from snapshot', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 999, high: 999, low: 999, close: 999, source: 'wrong' },
    ])
    const snapshot = JSON.stringify([
      { date: '2025-10-07', timestamp: '1759795200000', open: 124_773, high: 124_773, low: 124_773, close: 124_773, volume: null, source: 'coingecko' },
    ])
    const result = await runRestore({
      prisma: prisma as any,
      readFile: async () => snapshot,
      restoreFile: 'fake.json',
    })
    expect(result.deleted).toBe(1)
    expect(result.inserted).toBe(1)
    expect(prisma.table.get('2025-10-07')?.high).toBe(124_773)
    expect(prisma.table.get('2025-10-07')?.source).toBe('coingecko')
  })
})
