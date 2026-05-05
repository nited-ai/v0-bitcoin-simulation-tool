import { describe, it, expect, vi } from 'vitest'
import { fetchCurrentWithFallback } from '../PriceSource'
import type { PriceProvider, NormalizedPricePoint } from '../PriceSource/types'

function mockProvider(name: string, behavior: 'pass' | 'fail'): PriceProvider {
  return {
    name,
    fetchCurrent: vi.fn().mockImplementation(() =>
      behavior === 'pass'
        ? Promise.resolve({
            date: '2026-05-04', timestamp: 0, close: 100, high: 100, low: 100, open: 100,
            volume: null, source: name, fetchedAt: new Date(),
          } as NormalizedPricePoint)
        : Promise.reject(new Error(`${name} failed`)),
    ),
  }
}

describe('fetchCurrentWithFallback', () => {
  it('returns first provider that succeeds', async () => {
    const chain = [mockProvider('a', 'pass'), mockProvider('b', 'pass')]
    const result = await fetchCurrentWithFallback(chain)
    expect(result.source).toBe('a')
    expect(chain[1].fetchCurrent).not.toHaveBeenCalled()
  })

  it('falls through to next on failure', async () => {
    const chain = [
      mockProvider('a', 'fail'),
      mockProvider('b', 'fail'),
      mockProvider('c', 'pass'),
    ]
    const result = await fetchCurrentWithFallback(chain)
    expect(result.source).toBe('c')
  })

  it('throws aggregated error when ALL providers fail', async () => {
    const chain = [
      mockProvider('a', 'fail'),
      mockProvider('b', 'fail'),
    ]
    await expect(fetchCurrentWithFallback(chain)).rejects.toThrow(/all providers failed/i)
  })

  it('throws on empty chain (programmer error)', async () => {
    await expect(fetchCurrentWithFallback([])).rejects.toThrow(/empty/i)
  })
})
