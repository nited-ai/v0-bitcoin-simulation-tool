import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPriceUpdater } from '../PriceUpdater'
import type { PriceStore } from '../PriceStore'
import type { NormalizedPricePoint } from '../PriceSource/types'

function mockStore(overrides: Partial<PriceStore> = {}): PriceStore {
  return {
    getLatest: vi.fn(),
    getRange: vi.fn(),
    getATH: vi.fn(),
    upsertDay: vi.fn().mockResolvedValue(undefined),
    getMeta: vi.fn(),
    setMeta: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any
}

const fakePoint: NormalizedPricePoint = {
  date: '2026-05-04', timestamp: 1746316800000,
  close: 100000, high: 100000, low: 100000, open: 100000,
  volume: null, source: 'binance', fetchedAt: new Date('2026-05-04T12:00:00Z'),
}

describe('PriceUpdater.updateCurrent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips fetch when latest fetchedAt is within cooldown', async () => {
    const recent = new Date(Date.now() - 60_000) // 1 min ago
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', fetchedAt: recent } as any),
    })
    const fetchSpy = vi.fn()
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent()

    expect(result.skipped).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(store.upsertDay).not.toHaveBeenCalled()
  })

  it('fetches and upserts when latest is older than cooldown', async () => {
    const old = new Date(Date.now() - 10 * 60_000) // 10 min ago
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', high: 99000, low: 99000, open: 99500, fetchedAt: old } as any),
    })
    const fetchSpy = vi.fn().mockResolvedValue(fakePoint)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent()

    expect(result.skipped).toBe(false)
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(store.upsertDay).toHaveBeenCalledOnce()
  })

  it('force flag bypasses cooldown', async () => {
    const recent = new Date(Date.now() - 60_000)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', high: 99000, low: 99000, open: 99500, fetchedAt: recent } as any),
    })
    const fetchSpy = vi.fn().mockResolvedValue(fakePoint)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent(true)

    expect(result.skipped).toBe(false)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('on fetch failure: returns last known good (does not throw)', async () => {
    const old = new Date(Date.now() - 10 * 60_000)
    const stale = { date: '2026-05-04', fetchedAt: old, close: 99000 } as any
    const store = mockStore({ getLatest: vi.fn().mockResolvedValue(stale) })
    const fetchSpy = vi.fn().mockRejectedValue(new Error('all providers failed'))
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent()

    expect(result.skipped).toBe(true)
    expect(result.reason).toMatch(/fetch failed|providers failed/i)
    expect(store.upsertDay).not.toHaveBeenCalled()
  })

  it('inflight dedup: two concurrent calls share one fetch', async () => {
    const old = new Date(Date.now() - 10 * 60_000)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', high: 99000, low: 99000, open: 99500, fetchedAt: old } as any),
    })
    let fetchResolve!: (v: NormalizedPricePoint) => void
    const fetchPromise = new Promise<NormalizedPricePoint>((r) => { fetchResolve = r })
    const fetchSpy = vi.fn().mockReturnValue(fetchPromise)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const p1 = updater.updateCurrent()
    const p2 = updater.updateCurrent()
    fetchResolve(fakePoint)

    await Promise.all([p1, p2])
    expect(fetchSpy).toHaveBeenCalledOnce()  // shared!
    expect(store.upsertDay).toHaveBeenCalledOnce()
  })

  // === MAX/MIN aggregation tests (the bug Task 4 review flagged) ===

  it('takes MAX(stored.high, new.high) when same-day row already exists', async () => {
    const old = new Date(Date.now() - 10 * 60_000)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({
        date: '2026-05-04',
        open: 99500, high: 102000, low: 99000, close: 101000,
        fetchedAt: old,
      } as any),
    })
    // New fetch reports lower high (price has dropped intraday)
    const lowerPoint: NormalizedPricePoint = {
      ...fakePoint,
      date: '2026-05-04',
      open: 100500, high: 100500, low: 100500, close: 100500,
    }
    const fetchSpy = vi.fn().mockResolvedValue(lowerPoint)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    await updater.updateCurrent()

    const upsertCall = (store.upsertDay as any).mock.calls[0][0]
    // High stays at 102000 (the day's actual MAX), even though new fetch is 100500
    expect(upsertCall.high).toBe(102000)
    // Low stays at 99000 (the day's actual MIN), since new low (100500) is higher
    expect(upsertCall.low).toBe(99000)
    // Open stays at 99500 (day's first open), since same date
    expect(upsertCall.open).toBe(99500)
    // Close updates to latest fetch
    expect(upsertCall.close).toBe(100500)
  })

  it('uses new OHLC when previous row is from a DIFFERENT day', async () => {
    const old = new Date(Date.now() - 24 * 60 * 60_000)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({
        date: '2026-05-03',  // YESTERDAY
        open: 95000, high: 96000, low: 94000, close: 95500,
        fetchedAt: old,
      } as any),
    })
    const fetchSpy = vi.fn().mockResolvedValue(fakePoint)  // fakePoint is 2026-05-04
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    await updater.updateCurrent()

    const upsertCall = (store.upsertDay as any).mock.calls[0][0]
    // Different day: use the new point's values directly
    expect(upsertCall.open).toBe(100000)
    expect(upsertCall.high).toBe(100000)
    expect(upsertCall.low).toBe(100000)
    expect(upsertCall.close).toBe(100000)
  })
})

// Closed-day finalization, interior gaps and atomic validation are tested in closed-history.test.ts.
