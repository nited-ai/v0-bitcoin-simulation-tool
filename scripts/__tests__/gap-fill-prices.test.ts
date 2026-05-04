import { describe, it, expect, vi, beforeEach } from 'vitest'

// Imports from the module we're about to write (will fail until Task 9 creates it)
import {
  parseCoinGeckoResponse,
  detectGapRange,
  gapFillFromCoinGecko,
  type CoinGeckoMarketChartResponse,
} from '../gap-fill-prices'

// === parseCoinGeckoResponse: pure function ===

describe('parseCoinGeckoResponse', () => {
  it('converts CoinGecko [ms_timestamp, price] tuples into BitcoinPrice rows', () => {
    const response: CoinGeckoMarketChartResponse = {
      prices: [
        [1755561600000, 113346.02],   // 2025-08-19
        [1755648000000, 114000.00],   // 2025-08-20
      ],
      market_caps: [],
      total_volumes: [
        [1755561600000, 1234567],
        [1755648000000, 2345678],
      ],
    }

    const rows = parseCoinGeckoResponse(response, 'coingecko')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      date: '2025-08-19',
      close: 113346.02,
      // CoinGecko free tier gives only close — open/high/low default to close
      open: 113346.02,
      high: 113346.02,
      low: 113346.02,
      volume: 1234567,
      source: 'coingecko',
    })
    // timestamp should be a BigInt (matches Prisma BitcoinPrice.timestamp column)
    expect(typeof rows[0].timestamp).toBe('bigint')
    expect(rows[0].timestamp).toBe(BigInt(1755561600000))

    expect(rows[1].date).toBe('2025-08-20')
    expect(rows[1].close).toBe(114000.00)
  })

  it('handles missing volumes gracefully (volume = null)', () => {
    const response: CoinGeckoMarketChartResponse = {
      prices: [[1755561600000, 113346.02]],
      market_caps: [],
      total_volumes: [],
    }

    const rows = parseCoinGeckoResponse(response, 'coingecko')
    expect(rows[0].volume).toBeNull()
  })

  it('throws on a malformed response (missing prices array)', () => {
    expect(() =>
      parseCoinGeckoResponse({} as CoinGeckoMarketChartResponse, 'coingecko'),
    ).toThrow(/prices/i)
  })
})

// === detectGapRange: pure function ===

describe('detectGapRange', () => {
  it('returns full range when DB is empty (latest = null)', () => {
    const range = detectGapRange(null, '2026-05-04')
    expect(range).toEqual({ from: '2013-11-01', to: '2026-05-04' })
  })

  it('returns from = latest_date + 1 day when DB has data', () => {
    const range = detectGapRange('2025-08-19', '2026-05-04')
    expect(range).toEqual({ from: '2025-08-20', to: '2026-05-04' })
  })

  it('returns null when DB is up to date (latest = today)', () => {
    const range = detectGapRange('2026-05-04', '2026-05-04')
    expect(range).toBeNull()
  })

  it('returns null when DB is ahead of today (latest > today, edge case)', () => {
    const range = detectGapRange('2026-05-05', '2026-05-04')
    expect(range).toBeNull()
  })

  it('handles month/year boundaries correctly', () => {
    const range = detectGapRange('2025-12-31', '2026-01-02')
    expect(range).toEqual({ from: '2026-01-01', to: '2026-01-02' })
  })
})

// === gapFillFromCoinGecko: orchestration with mocked Prisma + fetch ===

describe('gapFillFromCoinGecko', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('skips when DB is up to date (no gap)', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const mockPrisma = {
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue({ date: today }),
        createMany: vi.fn(),
      },
      systemMeta: { upsert: vi.fn() },
    } as any
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await gapFillFromCoinGecko(mockPrisma)

    expect(result.skipped).toBe(true)
    expect(result.reason).toMatch(/up to date|no gap/i)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockPrisma.bitcoinPrice.createMany).not.toHaveBeenCalled()
  })

  it('fetches and inserts when there is a gap', async () => {
    // Mock latest in DB = 2025-08-19, today = some later date
    const mockResponse: CoinGeckoMarketChartResponse = {
      prices: [
        [1755648000000, 114000.00],  // 2025-08-20
        [1755734400000, 115000.00],  // 2025-08-21
      ],
      market_caps: [],
      total_volumes: [
        [1755648000000, 1000000],
        [1755734400000, 2000000],
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      }),
    )
    const mockPrisma = {
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue({ date: '2025-08-19' }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      systemMeta: { upsert: vi.fn().mockResolvedValue({}) },
    } as any

    const result = await gapFillFromCoinGecko(mockPrisma)

    expect(result.skipped).toBe(false)
    expect(result.rowsInserted).toBeGreaterThanOrEqual(1)
    expect(mockPrisma.bitcoinPrice.createMany).toHaveBeenCalledOnce()
    expect(mockPrisma.systemMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'lastSeedRunAt' } }),
    )
  })

  it('uses skipDuplicates: true on createMany (idempotency safety net)', async () => {
    const mockResponse: CoinGeckoMarketChartResponse = {
      prices: [[1755648000000, 114000.00]],
      market_caps: [],
      total_volumes: [],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      }),
    )
    const mockPrisma = {
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue({ date: '2025-08-19' }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      systemMeta: { upsert: vi.fn().mockResolvedValue({}) },
    } as any

    await gapFillFromCoinGecko(mockPrisma)

    const createManyCall = mockPrisma.bitcoinPrice.createMany.mock.calls[0][0]
    expect(createManyCall.skipDuplicates).toBe(true)
  })

  it('throws when fetch fails (non-2xx response, so caller exits non-zero)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    )
    const mockPrisma = {
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue({ date: '2025-08-19' }),
        createMany: vi.fn(),
      },
      systemMeta: { upsert: vi.fn() },
    } as any

    await expect(gapFillFromCoinGecko(mockPrisma)).rejects.toThrow(/503|Service Unavailable/)
    expect(mockPrisma.bitcoinPrice.createMany).not.toHaveBeenCalled()
  })

  it('handles fresh DB (no rows) by seeding from 2013-11-01', async () => {
    const mockResponse: CoinGeckoMarketChartResponse = {
      prices: [[1383264000000, 196.93]],  // 2013-11-01
      market_caps: [],
      total_volumes: [],
    }
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    })
    vi.stubGlobal('fetch', fetchSpy)
    const mockPrisma = {
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue(null),  // empty DB
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      systemMeta: { upsert: vi.fn().mockResolvedValue({}) },
    } as any

    const result = await gapFillFromCoinGecko(mockPrisma)

    expect(result.skipped).toBe(false)
    expect(fetchSpy).toHaveBeenCalledOnce()
    // Verify the URL contains a from= timestamp matching 2013-11-01 (1383264000)
    const fetchUrl = fetchSpy.mock.calls[0][0] as string
    expect(fetchUrl).toContain('from=1383264000')
  })
})
