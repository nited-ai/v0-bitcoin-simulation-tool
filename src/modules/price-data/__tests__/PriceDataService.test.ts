// src/modules/price-data/__tests__/PriceDataService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PriceDataService } from '../services/PriceDataService'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  // Reset singleton between tests so each test gets a fresh cache + state
  ;(PriceDataService as any).instance = null
})

function mockApiResponse(body: any, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
    }),
  )
}

const SAMPLE_API_RESPONSE = {
  prices: [
    { date: '2026-05-01', close: 100000, high: 102000, low: 99000, open: 99500 },
    { date: '2026-05-02', close: 101000, high: 103000, low: 100000, open: 100000 },
  ],
  currentPrice: { value: 101000, fetchedAt: '2026-05-02T12:00:00.000Z' },
  ath: { value: 124773.51 },
  lastUpdated: '2026-05-02T12:00:00.000Z',
  isStale: false,
}

describe('PriceDataService.loadHistoricalData', () => {
  it('fetches /api/bitcoin-prices and returns HistoricalDataPoint[]', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    const data = await svc.loadHistoricalData({ useCache: false })

    expect(data).toHaveLength(2)
    expect(data[0]).toMatchObject({
      date: '2026-05-01',
      close: 100000,
    })
    // The fetch URL should be the unified read endpoint
    const fetchCall = (global.fetch as any).mock.calls[0]
    expect(fetchCall[0]).toMatch(/\/api\/bitcoin-prices/)
  })

  it('returns cached data on second call when useCache !== false', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    await svc.loadHistoricalData({ useCache: true })
    await svc.loadHistoricalData({ useCache: true })

    // Only ONE fetch — second call hit the cache
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on HTTP 503 (DB unavailable)', async () => {
    mockApiResponse({ error: 'db_unavailable' }, 503)
    const svc = PriceDataService.getInstance()

    await expect(svc.loadHistoricalData({ useCache: false })).rejects.toThrow(/503|db_unavailable/i)
  })
})

describe('PriceDataService.getCurrentPrice', () => {
  it('returns currentPrice.value from /api/bitcoin-prices', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    const price = await svc.getCurrentPrice({ useCache: false })

    expect(price).toBe(101000)
  })

  it('caches current price for 5 minutes by default', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    await svc.getCurrentPrice({ useCache: true })
    await svc.getCurrentPrice({ useCache: true })

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on HTTP failure', async () => {
    mockApiResponse({}, 500)
    const svc = PriceDataService.getInstance()

    await expect(svc.getCurrentPrice({ useCache: false })).rejects.toThrow(/500/)
  })
})
