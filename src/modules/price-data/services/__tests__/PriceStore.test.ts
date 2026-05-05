import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPriceStore, type PriceStore } from '../PriceStore'

// Build a minimal mocked Prisma client. Each test sets up the methods it needs.
function mockPrisma(overrides: any = {}) {
  return {
    bitcoinPrice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      ...overrides.bitcoinPrice,
    },
    systemMeta: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      ...overrides.systemMeta,
    },
  } as any
}

describe('PriceStore.getLatest', () => {
  it('returns the most recent row by date', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue({
          date: '2026-05-04', close: 100000, high: 102000, low: 99000, open: 99500,
          fetchedAt: new Date('2026-05-04T12:00:00Z'),
        }),
      },
    })
    const store = createPriceStore(prisma)

    const latest = await store.getLatest()

    expect(latest?.date).toBe('2026-05-04')
    expect(prisma.bitcoinPrice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: 'desc' } }),
    )
  })

  it('returns null on empty DB', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: { findFirst: vi.fn().mockResolvedValue(null) },
    })
    const store = createPriceStore(prisma)
    expect(await store.getLatest()).toBeNull()
  })
})

describe('PriceStore.getRange', () => {
  it('returns rows within [from, to] inclusive, ordered ascending by date', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        findMany: vi.fn().mockResolvedValue([
          { date: '2026-01-01', close: 100, high: 110, low: 90, open: 95 },
          { date: '2026-01-02', close: 105, high: 115, low: 95, open: 100 },
        ]),
      },
    })
    const store = createPriceStore(prisma)

    const rows = await store.getRange('2026-01-01', '2026-01-02')

    expect(rows).toHaveLength(2)
    expect(prisma.bitcoinPrice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: '2026-01-01', lte: '2026-01-02' } },
        orderBy: { date: 'asc' },
      }),
    )
  })
})

describe('PriceStore.getATH', () => {
  it('returns MAX(high) per spec D5', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        aggregate: vi.fn().mockResolvedValue({ _max: { high: 124773.51 } }),
      },
    })
    const store = createPriceStore(prisma)

    const ath = await store.getATH()

    expect(ath).toBe(124773.51)
    expect(prisma.bitcoinPrice.aggregate).toHaveBeenCalledWith({
      _max: { high: true },
    })
  })

  it('returns null on empty DB', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: { aggregate: vi.fn().mockResolvedValue({ _max: { high: null } }) },
    })
    const store = createPriceStore(prisma)
    expect(await store.getATH()).toBeNull()
  })
})

describe('PriceStore.upsertDay', () => {
  it('upserts by unique date key with full create/update field set', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        upsert: vi.fn().mockResolvedValue({ date: '2026-05-04', close: 100000 }),
      },
    })
    const store = createPriceStore(prisma)

    await store.upsertDay({
      date: '2026-05-04',
      timestamp: BigInt(1746316800000),
      open: 99500, high: 102000, low: 99000, close: 100000,
      volume: 1234567, source: 'binance',
      fetchedAt: new Date('2026-05-04T12:00:00Z'),
    })

    const args = prisma.bitcoinPrice.upsert.mock.calls[0][0]
    expect(args.where).toEqual({ date: '2026-05-04' })
    // create branch contains all fields
    expect(args.create.close).toBe(100000)
    expect(args.create.high).toBe(102000)
    expect(args.create.source).toBe('binance')
    // update branch tracks new fetchedAt + close
    expect(args.update.fetchedAt).toEqual(new Date('2026-05-04T12:00:00Z'))
    expect(args.update.close).toBe(100000)
    // high in update branch is set (form depends on impl detail; just check defined)
    expect(args.update.high).toBeDefined()
  })
})

describe('PriceStore.getMeta / setMeta', () => {
  it('getMeta returns value or null', async () => {
    const prisma = mockPrisma({
      systemMeta: {
        findUnique: vi.fn().mockResolvedValue({ key: 'lastSuccessfulCronAt', value: '2026-05-04T00:05:00.000Z' }),
      },
    })
    const store = createPriceStore(prisma)

    const v = await store.getMeta('lastSuccessfulCronAt')
    expect(v).toBe('2026-05-04T00:05:00.000Z')
  })

  it('getMeta returns null when key missing (defensive — not throws)', async () => {
    const prisma = mockPrisma({
      systemMeta: { findUnique: vi.fn().mockResolvedValue(null) },
    })
    const store = createPriceStore(prisma)
    expect(await store.getMeta('does-not-exist')).toBeNull()
  })

  it('setMeta upserts the row', async () => {
    const prisma = mockPrisma({
      systemMeta: { upsert: vi.fn().mockResolvedValue({}) },
    })
    const store = createPriceStore(prisma)

    await store.setMeta('lastSuccessfulCronAt', '2026-05-04T12:00:00.000Z')

    expect(prisma.systemMeta.upsert).toHaveBeenCalledWith({
      where: { key: 'lastSuccessfulCronAt' },
      update: { value: '2026-05-04T12:00:00.000Z' },
      create: { key: 'lastSuccessfulCronAt', value: '2026-05-04T12:00:00.000Z' },
    })
  })
})
