// src/modules/price-data/services/PriceSource/providers/cryptocompare.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const cryptocompare: PriceProvider = {
  name: 'cryptocompare',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD')
    if (!res.ok) throw new Error(`cryptocompare: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { USD?: number; Response?: string; Message?: string }
    if (json.Response === 'Error') {
      throw new Error(`cryptocompare: ${json.Message ?? 'rate limit or other error'}`)
    }
    if (typeof json.USD !== 'number') throw new Error('cryptocompare: malformed response (USD missing)')
    const close = json.USD
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close, high: close, low: close, open: close,
      volume: null,
      source: 'cryptocompare',
      fetchedAt: now,
    }
  },
}
