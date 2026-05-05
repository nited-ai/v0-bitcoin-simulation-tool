// src/modules/price-data/utils/adaptToHistoricalDataPoint.ts
//
// PR4 introduced 3 inline copies of this adapter in chart consumers
// (SimulationPage, UnifiedPriceChart, PriceProjectionChart). PR5a extracts
// to a single utility. Charts call this when they need the legacy
// HistoricalDataPoint shape (with time/volume/source fields) from the new
// PricePoint shape that GET /api/bitcoin-prices returns.
//
// Long-term plan: the chart code itself will migrate to PricePoint, at
// which point this utility becomes unused and can be deleted.
//
import type { PricePoint } from '../hooks/usePriceData'
import type { HistoricalDataPoint } from '../types'

export function adaptToHistoricalDataPoint(p: PricePoint): HistoricalDataPoint {
  return {
    time: Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000),
    date: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: 0,         // PR2's API doesn't return volume yet
    source: 'api',     // Single source identifier for API-derived rows
  }
}

export function adaptManyToHistoricalDataPoints(prices: PricePoint[]): HistoricalDataPoint[] {
  return prices.map(adaptToHistoricalDataPoint)
}
