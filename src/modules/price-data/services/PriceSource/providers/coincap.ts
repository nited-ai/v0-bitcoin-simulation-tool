// src/modules/price-data/services/PriceSource/providers/coincap.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const coincap: PriceProvider = {
  name: 'coincap',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const apiKey = process.env.COINCAP_API_KEY
    if (!apiKey) throw new Error('coincap: COINCAP_API_KEY env var not set')
    const res = await fetch('https://api.coincap.io/v2/assets/bitcoin', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`coincap: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { data?: { priceUsd?: string } }
    if (typeof json.data?.priceUsd !== 'string') {
      throw new Error('coincap: malformed response (data.priceUsd missing)')
    }
    const close = parseFloat(json.data.priceUsd)
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close, high: close, low: close, open: close,
      volume: null,
      source: 'coincap',
      fetchedAt: now,
    }
  },
}
