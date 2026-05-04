// src/modules/price-data/services/PriceSource/providers/yahoo.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const yahoo: PriceProvider = {
  name: 'yahoo',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1d')
    if (!res.ok) throw new Error(`yahoo: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketTime?: number } }> | null
        error?: { description?: string } | null
      }
    }
    const err = json.chart?.error
    if (err) throw new Error(`yahoo: ${err.description ?? 'unknown error'}`)
    const meta = json.chart?.result?.[0]?.meta
    if (typeof meta?.regularMarketPrice !== 'number') {
      throw new Error('yahoo: malformed response (regularMarketPrice missing)')
    }
    const close = meta.regularMarketPrice
    const tsSec = meta.regularMarketTime ?? Math.floor(Date.now() / 1000)
    const ts = tsSec * 1000
    return {
      date: new Date(ts).toISOString().slice(0, 10),
      timestamp: ts,
      close, high: close, low: close, open: close,
      volume: null,
      source: 'yahoo',
      fetchedAt: new Date(),
    }
  },
}
