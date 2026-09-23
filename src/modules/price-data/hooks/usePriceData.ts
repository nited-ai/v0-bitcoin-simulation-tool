// src/modules/price-data/hooks/usePriceData.ts
//
// SWR-based React hook over PR2's GET /api/bitcoin-prices endpoint.
// PR4 consumers will swap from useCentralizedData/useATH to this single
// hook. PR3 just adds the hook; doesn't migrate any consumer.
//
import useSWR from 'swr'

export interface PricePoint {
  date: string
  close: number
  high: number
  low: number
  open: number
}

export interface UsePriceDataResult {
  prices: PricePoint[]
  currentPrice: { value: number; fetchedAt: string } | null
  ath: { value: number } | null
  lastUpdated: string | null
  isStale: boolean
  sourceDescription?: string
  isLoading: boolean
  error: Error | undefined
  refresh: () => Promise<void>
}

export interface UsePriceDataOptions {
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Price API: HTTP ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function usePriceData(options: UsePriceDataOptions = {}): UsePriceDataResult {
  const params = new URLSearchParams()
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  const queryString = params.toString()
  const key = `/api/bitcoin-prices${queryString ? '?' + queryString : ''}`

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,        // don't auto-refetch on tab focus (avoids burst on tab switching)
    revalidateOnReconnect: true,
    dedupingInterval: 5000,          // 5-sec dedup window for identical concurrent calls
  })

  return {
    prices: data?.prices ?? [],
    currentPrice: data?.currentPrice ?? null,
    ath: data?.ath ?? null,
    lastUpdated: data?.lastUpdated ?? null,
    isStale: data?.isStale ?? false,
    sourceDescription: data?.sourceDescription,
    isLoading,
    error,
    refresh: async () => {
      await mutate()
    },
  }
}
