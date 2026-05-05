// src/modules/price-data/__tests__/usePriceData.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'
import { usePriceData } from '../hooks/usePriceData'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
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

const SAMPLE_RESPONSE = {
  prices: [
    { date: '2026-05-01', close: 100000, high: 102000, low: 99000, open: 99500 },
    { date: '2026-05-02', close: 101000, high: 103000, low: 100000, open: 100000 },
  ],
  currentPrice: { value: 101000, fetchedAt: '2026-05-02T12:00:00.000Z' },
  ath: { value: 124773.51 },
  lastUpdated: '2026-05-02T12:00:00.000Z',
  isStale: false,
}

// Test harness — wrap hook in SWRConfig with provider:() => new Map() so each
// test gets a fresh SWR cache. Without this, swr's global cache leaks across tests.
function renderHook<T>(hookFn: () => T): { result: { current: T | null }; unmount: () => void } {
  const result: { current: T | null } = { current: null }
  function HookHarness() {
    result.current = hookFn()
    return null
  }
  const { unmount } = render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <HookHarness />
    </SWRConfig>,
  )
  return { result, unmount }
}

describe('usePriceData', () => {
  it('returns isLoading=true initially, then loads data', async () => {
    mockApiResponse(SAMPLE_RESPONSE)
    const { result } = renderHook(() => usePriceData())

    // Immediately after mount: SWR fires fetch, isLoading should be true
    expect(result.current?.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false)
    })

    expect(result.current?.prices).toHaveLength(2)
    expect(result.current?.currentPrice?.value).toBe(101000)
    expect(result.current?.ath?.value).toBe(124773.51)
    expect(result.current?.isStale).toBe(false)
    expect(result.current?.error).toBeUndefined()
  })

  it('exposes a refresh() that re-fetches', async () => {
    mockApiResponse(SAMPLE_RESPONSE)
    const { result } = renderHook(() => usePriceData())

    await waitFor(() => expect(result.current?.isLoading).toBe(false))

    // Now mock a different response for the refresh
    mockApiResponse({
      ...SAMPLE_RESPONSE,
      currentPrice: { value: 102000, fetchedAt: '2026-05-02T12:05:00.000Z' },
    })

    await result.current!.refresh()

    await waitFor(() => {
      expect(result.current?.currentPrice?.value).toBe(102000)
    })
  })

  it('exposes error when fetch fails', async () => {
    mockApiResponse({ error: 'db_unavailable' }, 503)
    const { result } = renderHook(() => usePriceData())

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false)
    })

    expect(result.current?.error).toBeDefined()
    expect(String(result.current?.error)).toMatch(/503|db_unavailable/i)
  })

  it('accepts ?from and ?to params and includes them in the fetch URL', async () => {
    mockApiResponse(SAMPLE_RESPONSE)
    renderHook(() => usePriceData({ from: '2026-01-01', to: '2026-05-04' }))

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const url = calls[0][0] as string
      expect(url).toContain('from=2026-01-01')
      expect(url).toContain('to=2026-05-04')
    })
  })
})
