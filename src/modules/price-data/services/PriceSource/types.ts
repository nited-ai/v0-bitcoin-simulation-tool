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
