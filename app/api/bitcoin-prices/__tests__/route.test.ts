import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}))

const mockStoreInstance: any = {
  getLatest: vi.fn(),
  getRange: vi.fn(),
  getATH: vi.fn(),
  getMeta: vi.fn(),
}
vi.mock('@/src/modules/price-data/services/PriceStore', () => ({
  createPriceStore: vi.fn(() => mockStoreInstance),
}))

const mockUpdater: any = { updateCurrent: vi.fn() }
vi.mock('@/src/modules/price-data/services/PriceUpdater', () => ({
  createPriceUpdater: vi.fn(() => mockUpdater),
}))

vi.mock('@/src/modules/price-data/services/PriceSource', () => ({
  fetchCurrentWithFallback: vi.fn(),
}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: vi.fn((fn: () => void) => fn()),  // run inline in tests for assertion
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockStoreInstance.getLatest.mockResolvedValue({
    date: '2026-05-04', close: 100000, high: 100000, low: 100000, open: 100000,
    fetchedAt: new Date(Date.now() - 60_000),
  })
  mockStoreInstance.getRange.mockResolvedValue([])
  mockStoreInstance.getATH.mockResolvedValue(124773.51)
  mockStoreInstance.getMeta.mockResolvedValue('2026-05-04T00:05:00.000Z')
  mockUpdater.updateCurrent.mockResolvedValue({ skipped: true })
})

async function callGet(url = 'https://example.com/api/bitcoin-prices') {
  const mod = await import('../route')
  return mod.GET(new Request(url))
}

describe('GET /api/bitcoin-prices', () => {
  it('returns prices, currentPrice, ath, lastUpdated, isStale', async () => {
    const res = await callGet()
    const body = await res.json()
    expect(body).toHaveProperty('prices')
    expect(body).toHaveProperty('currentPrice')
    expect(body.currentPrice.value).toBe(100000)
    expect(body).toHaveProperty('ath')
    expect(body.ath.value).toBe(124773.51)
    expect(body).toHaveProperty('lastUpdated')
    expect(body.isStale).toBe(false)  // cron heartbeat is recent
  })

  it('sets Cache-Control: s-maxage=60, stale-while-revalidate=300', async () => {
    const res = await callGet()
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=60.*stale-while-revalidate=300/)
  })

  it('isStale=true when lastSuccessfulCronAt > 25h ago', async () => {
    mockStoreInstance.getMeta.mockResolvedValue(
      new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    )
    const res = await callGet()
    const body = await res.json()
    expect(body.isStale).toBe(true)
  })

  it('triggers updateCurrent via after() when latest.fetchedAt > 5 min', async () => {
    const old = new Date(Date.now() - 10 * 60 * 1000)
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, high: 100000, low: 100000, open: 100000, fetchedAt: old,
    })
    await callGet()
    expect(mockUpdater.updateCurrent).toHaveBeenCalledWith(false)  // not forced
  })

  it('does NOT trigger updateCurrent when latest.fetchedAt is fresh', async () => {
    const fresh = new Date(Date.now() - 60_000)  // 1 min
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, high: 100000, low: 100000, open: 100000, fetchedAt: fresh,
    })
    await callGet()
    expect(mockUpdater.updateCurrent).not.toHaveBeenCalled()
  })

  it('?refresh=force triggers updateCurrent regardless of cooldown', async () => {
    const fresh = new Date(Date.now() - 60_000)
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, high: 100000, low: 100000, open: 100000, fetchedAt: fresh,
    })
    await callGet('https://example.com/api/bitcoin-prices?refresh=force')
    expect(mockUpdater.updateCurrent).toHaveBeenCalledWith(true)  // force=true
  })

  it('returns 503 on DB connection error', async () => {
    mockStoreInstance.getLatest.mockRejectedValue(new Error('connection refused'))
    const res = await callGet()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('db_unavailable')
  })

  it('parses ?from= and ?to= query params', async () => {
    await callGet('https://example.com/api/bitcoin-prices?from=2026-01-01&to=2026-05-04')
    expect(mockStoreInstance.getRange).toHaveBeenCalledWith('2026-01-01', '2026-05-04')
  })
})
