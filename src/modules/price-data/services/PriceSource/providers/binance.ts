// src/modules/price-data/services/PriceSource/providers/binance.ts
import type { PriceProvider, NormalizedPricePoint, DailyOHLC } from '../types'

const BINANCE_BASE = 'https://api.binance.com'

/**
 * Parse a Binance Klines response (array of 12-element arrays) into DailyOHLC[].
 * Coerces string-typed numerics (Binance returns prices as strings).
 * Pure function — no fetching.
 */
export function parseKlinesResponse(klines: unknown[]): DailyOHLC[] {
  if (!Array.isArray(klines)) {
    throw new Error('binance: klines response is not an array')
  }
  return klines.map((row) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new Error('binance: malformed kline row (expected 12-tuple)')
    }
    const [openTime, open, high, low, close, volume] = row as [number, string, string, string, string, string]
    return {
      date: new Date(openTime).toISOString().slice(0, 10),
      openTime,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }
  })
}

export const binance: PriceProvider = {
  name: 'binance',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=BTCUSDT`)
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
