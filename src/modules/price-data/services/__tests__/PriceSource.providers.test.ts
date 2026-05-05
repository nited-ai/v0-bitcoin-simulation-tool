import { describe, it, expect, vi, beforeEach } from 'vitest'
import { binance } from '../PriceSource/providers/binance'
import { coincap } from '../PriceSource/providers/coincap'
import { cryptocompare } from '../PriceSource/providers/cryptocompare'
import { yahoo } from '../PriceSource/providers/yahoo'
import { coingecko } from '../PriceSource/providers/coingecko'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function mockFetchOnce(jsonBody: any, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(jsonBody),
    }),
  )
}

describe('binance.fetchCurrent', () => {
  it('parses { symbol, price } shape and normalizes', async () => {
    mockFetchOnce({ symbol: 'BTCUSDT', price: '100123.45' })
    const p = await binance.fetchCurrent()
    expect(p.source).toBe('binance')
    expect(p.close).toBe(100123.45)
    expect(p.open).toBe(100123.45)
    expect(p.high).toBe(100123.45)
    expect(p.low).toBe(100123.45)
    expect(p.volume).toBeNull()
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('throws on non-2xx', async () => {
    mockFetchOnce({}, 503)
    await expect(binance.fetchCurrent()).rejects.toThrow(/503/)
  })
})

describe('coincap.fetchCurrent', () => {
  it('parses { data: { priceUsd } } and normalizes', async () => {
    process.env.COINCAP_API_KEY = 'test-key'
    mockFetchOnce({ data: { priceUsd: '100456.78' } })
    const p = await coincap.fetchCurrent()
    expect(p.source).toBe('coincap')
    expect(p.close).toBe(100456.78)
  })

  it('throws if COINCAP_API_KEY missing', async () => {
    delete process.env.COINCAP_API_KEY
    await expect(coincap.fetchCurrent()).rejects.toThrow(/COINCAP_API_KEY/)
  })
})

describe('cryptocompare.fetchCurrent', () => {
  it('parses { USD: <price> } and normalizes', async () => {
    mockFetchOnce({ USD: 100789.12 })
    const p = await cryptocompare.fetchCurrent()
    expect(p.source).toBe('cryptocompare')
    expect(p.close).toBe(100789.12)
  })

  it('throws on rate-limit response (200 with Response: Error)', async () => {
    mockFetchOnce({ Response: 'Error', Message: 'Rate limit' }, 200)
    await expect(cryptocompare.fetchCurrent()).rejects.toThrow(/rate limit|Response.*Error/i)
  })
})

describe('yahoo.fetchCurrent', () => {
  it('parses chart.result[0].meta.regularMarketPrice and normalizes', async () => {
    mockFetchOnce({
      chart: {
        result: [{ meta: { regularMarketPrice: 101000.55, regularMarketTime: 1746316800 } }],
        error: null,
      },
    })
    const p = await yahoo.fetchCurrent()
    expect(p.source).toBe('yahoo')
    expect(p.close).toBe(101000.55)
  })

  it('throws on { chart: { error: {...} } } shape', async () => {
    mockFetchOnce({ chart: { result: null, error: { description: 'Quote not found' } } })
    await expect(yahoo.fetchCurrent()).rejects.toThrow(/Quote not found/)
  })
})

describe('coingecko.fetchCurrent', () => {
  it('parses { bitcoin: { usd } } and normalizes', async () => {
    mockFetchOnce({ bitcoin: { usd: 100333.21 } })
    const p = await coingecko.fetchCurrent()
    expect(p.source).toBe('coingecko')
    expect(p.close).toBe(100333.21)
  })

  it('throws on 429 rate limit', async () => {
    mockFetchOnce({}, 429)
    await expect(coingecko.fetchCurrent()).rejects.toThrow(/429/)
  })
})
