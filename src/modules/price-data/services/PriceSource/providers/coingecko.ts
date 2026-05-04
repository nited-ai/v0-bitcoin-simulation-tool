// src/modules/price-data/services/PriceSource/providers/coingecko.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const coingecko: PriceProvider = {
  name: 'coingecko',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    if (!res.ok) throw new Error(`coingecko: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { bitcoin?: { usd?: number } }
    if (typeof json.bitcoin?.usd !== 'number') {
      throw new Error('coingecko: malformed response (bitcoin.usd missing)')
    }
    const close = json.bitcoin.usd
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close, high: close, low: close, open: close,
      volume: null,
      source: 'coingecko',
      fetchedAt: now,
    }
  },
}
