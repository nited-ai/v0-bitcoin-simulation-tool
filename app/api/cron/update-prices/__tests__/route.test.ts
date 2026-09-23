import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies so we can test the route's auth + orchestration logic
// without hitting real DB/external APIs.
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}))
const mockStoreInstance: any = {
  setMeta: vi.fn().mockResolvedValue(undefined),
}
vi.mock('@/src/modules/price-data/services/PriceStore', () => ({
  createPriceStore: vi.fn(() => mockStoreInstance),
}))
vi.mock('@/src/modules/price-data/services/PriceSource', () => ({
  fetchCurrentWithFallback: vi.fn(),
}))
vi.mock('@/src/modules/price-data/services/PriceUpdater', () => ({
  createPriceUpdater: vi.fn(() => ({
    updateCurrent: vi.fn().mockResolvedValue({ skipped: false }),
    fillGaps: vi.fn().mockResolvedValue({ gapDays: 0 }),
  })),
}))

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret-12345'
  vi.clearAllMocks()
})

async function callRoute(headers: Record<string, string> = {}) {
  // Dynamic import after env mock to avoid module-load env capture
  const mod = await import('../route')
  const req = new Request('https://example.com/api/cron/update-prices', {
    method: 'POST',
    headers,
  })
  return mod.POST(req)
}

describe('POST /api/cron/update-prices auth', () => {
  it('rejects without Authorization header (401)', async () => {
    const res = await callRoute({})
    expect(res.status).toBe(401)
  })

  it('rejects with wrong bearer token (401)', async () => {
    const res = await callRoute({ Authorization: 'Bearer wrong-token' })
    expect(res.status).toBe(401)
  })

  it('accepts with correct bearer token (200)', async () => {
    const res = await callRoute({ Authorization: 'Bearer test-secret-12345' })
    expect(res.status).toBe(200)
  })

  it('rejects when CRON_SECRET env is unset (500 — misconfigured deploy)', async () => {
    delete process.env.CRON_SECRET
    const res = await callRoute({ Authorization: 'Bearer anything' })
    expect(res.status).toBe(500)
  })
})

describe('POST /api/cron/update-prices behavior', () => {
  it('supports authenticated GET used by Vercel Cron', async () => {
    const mod = await import('../route')
    expect(typeof mod.GET).toBe('function')
    const res = await mod.GET(new Request('https://example.com/api/cron/update-prices', { headers: { Authorization: 'Bearer test-secret-12345' } }))
    expect(res.status).toBe(200)
  })

  it('does not record success when upstream prices fail', async () => {
    const { createPriceUpdater } = await import('@/src/modules/price-data/services/PriceUpdater')
    vi.mocked(createPriceUpdater).mockReturnValueOnce({
      updateCurrent: vi.fn().mockResolvedValue({ skipped: true, reason: 'fetch failed: upstream error' }),
      fillGaps: vi.fn().mockResolvedValue({ gapDays: 0 }),
    })
    const res = await callRoute({ Authorization: 'Bearer test-secret-12345' })
    expect(res.status).toBe(503)
    expect(mockStoreInstance.setMeta).not.toHaveBeenCalled()
  })

  it('does not record success when historical repair fails', async () => {
    const { createPriceUpdater } = await import('@/src/modules/price-data/services/PriceUpdater')
    const updateCurrent=vi.fn()
    vi.mocked(createPriceUpdater).mockReturnValueOnce({updateCurrent,fillGaps:vi.fn().mockRejectedValue(new Error('incomplete history'))})
    const response=await callRoute({ Authorization:'Bearer test-secret-12345' })
    expect(response.status).toBe(500)
    expect(updateCurrent).not.toHaveBeenCalled()
    expect(mockStoreInstance.setMeta).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({ok:false,error:'price_update_failed'})
  })

  it('returns JSON summary of fillGaps + updateCurrent', async () => {
    const res = await callRoute({ Authorization: 'Bearer test-secret-12345' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('fillGaps')
    expect(body).toHaveProperty('updateCurrent')
  })

  it('writes lastSuccessfulCronAt heartbeat after successful updateCurrent', async () => {
    const res = await callRoute({ Authorization: 'Bearer test-secret-12345' })
    expect(res.status).toBe(200)
    expect(mockStoreInstance.setMeta).toHaveBeenCalledWith(
      'lastSuccessfulCronAt',
      expect.any(String),
    )
  })
})
