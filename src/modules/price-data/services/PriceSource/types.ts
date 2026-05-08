export interface NormalizedPricePoint {
  date: string         // YYYY-MM-DD (UTC day boundary)
  timestamp: number    // Unix ms
  close: number        // USD
  high: number         // USD (= close if provider doesn't supply OHLC)
  low: number          // USD (= close if provider doesn't supply OHLC)
  open: number         // USD (= close if provider doesn't supply OHLC)
  volume: number | null
  source: string       // e.g. "binance"
  fetchedAt: Date
}

export interface PriceProvider {
  name: string
  fetchCurrent(): Promise<NormalizedPricePoint>
}

/**
 * Real daily OHLC parsed from a Binance Klines response.
 * Used by historical backfill (scripts/backfill-and-seed-prices.ts)
 * and by the live fetchCurrent() in binance.ts.
 */
export interface DailyOHLC {
  date: string         // YYYY-MM-DD (UTC day boundary)
  openTime: number     // Unix ms (Binance openTime field)
  open: number         // USD
  high: number         // USD
  low: number          // USD
  close: number        // USD
  volume: number       // BTC (Binance returns base-asset volume)
}
