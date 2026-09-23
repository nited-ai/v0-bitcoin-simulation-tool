import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const readFile = vi.fn()
  return { ...actual, readFile, default: { ...actual, readFile } }
})

vi.mock('@prisma/client', () => ({
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
  mockStoreInstance.getMeta.mockResolvedValue(
    new Date(Date.now() - 60 * 60 * 1000).toISOString()  // 1 hour ago, well under 25h staleness threshold
  )
  mockUpdater.updateCurrent.mockResolvedValue({ skipped: true })
})

async function callGet(url = 'https://example.com/api/bitcoin-prices') {
  const mod = await import('../route')
  return mod.GET(new Request(url))
}

describe('GET /api/bitcoin-prices', () => {
  it('serves a clearly stale local preview without creating a database connection', async () => {
    vi.stubEnv('FIREHODL_READ_ONLY_DATA', '1')
    vi.stubEnv('FIREHODL_PREVIEW_PRICE_FILE', 'preview.json')
    try {
      const { readFile } = await import('node:fs/promises')
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ date: '2024-01-01', close: 100, open: 95, high: 110, low: 90 }]))
      const res = await callGet()
      const body = await res.json()
      expect(body.currentPrice).toBeNull()
      expect(body.isStale).toBe(true)
      expect(body.sourceDescription).toContain('Datensicherung')
      expect(body.prices).toHaveLength(1)
      expect(mockStoreInstance.getRange).not.toHaveBeenCalled()
      expect(mockUpdater.updateCurrent).not.toHaveBeenCalled()
    } finally { vi.unstubAllEnvs() }
  })

  it('does not refresh an old database row in read-only mode', async () => {
    vi.stubEnv('FIREHODL_READ_ONLY_DATA', '1')
    mockStoreInstance.getLatest.mockResolvedValue({ date: '2020-01-01', close: 100, fetchedAt: new Date('2020-01-01') })
    try {
      await callGet()
      expect(mockUpdater.updateCurrent).not.toHaveBeenCalled()
    } finally { vi.unstubAllEnvs() }
  })
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

  it('public refresh cannot bypass upstream cooldown', async () => {
    const fresh = new Date(Date.now() - 60_000)
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, high: 100000, low: 100000, open: 100000, fetchedAt: fresh,
    })
    await callGet('https://example.com/api/bitcoin-prices?refresh=force')
    expect(mockUpdater.updateCurrent).not.toHaveBeenCalled()
  })

  it('returns 503 on DB connection error', async () => {
    mockStoreInstance.getLatest.mockRejectedValue(new Error('connection refused'))
    const res = await callGet()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('db_unavailable')
    expect(body).not.toHaveProperty('detail')
  })

  it('marks old actual prices stale despite a fresh heartbeat', async () => {
    mockStoreInstance.getLatest.mockResolvedValue({close:100000, fetchedAt:new Date(Date.now()-2*60*60*1000)})
    const res = await callGet()
    expect((await res.json()).isStale).toBe(true)
  })

  it('rejects malformed and reversed date ranges', async () => {
    expect((await callGet('https://example.com/api/bitcoin-prices?from=not-a-date')).status).toBe(400)
    expect((await callGet('https://example.com/api/bitcoin-prices?from=2026-02-30')).status).toBe(400)
    expect((await callGet('https://example.com/api/bitcoin-prices?from=2026-05-01&to=2026-04-01')).status).toBe(400)
  })

  it('parses ?from= and ?to= query params', async () => {
    await callGet('https://example.com/api/bitcoin-prices?from=2026-01-01&to=2026-05-04')
    expect(mockStoreInstance.getRange).toHaveBeenCalledWith('2026-01-01', '2026-05-04')
  })

  it('excludes the incomplete current day from historical candles', async()=>{
    const today=new Date().toISOString().slice(0,10)
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10)
    mockStoreInstance.getRange.mockResolvedValue([yesterday,today].map(date=>({date,open:100,close:100,low:100,high:100})))
    expect((await (await callGet()).json()).prices.map((p:any)=>p.date)).toEqual([yesterday])
  })
})
