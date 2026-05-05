// src/modules/price-data/services/PriceSource/providers/binance.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const binance: PriceProvider = {
  name: 'binance',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
    if (!res.ok) throw new Error(`binance: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { symbol?: string; price?: string }
    if (typeof json.price !== 'string') throw new Error('binance: malformed response (price missing)')
    const close = parseFloat(json.price)
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close, high: close, low: close, open: close,
      volume: null,
      source: 'binance',
      fetchedAt: now,
    }
  },
}
