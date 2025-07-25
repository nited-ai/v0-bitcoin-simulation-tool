import type { HistoricalDataPoint, PriceChartDataPoint } from "./types"
import { getDaysSinceGenesis } from "./models/power-law"

/**
 * Cache for processed historical chart data structure.
 * This avoids re-processing the same historical data every time a price model changes.
 */
export class HistoricalChartDataCache {
  private cache = new Map<string, PriceChartDataPoint[]>()

  /**
   * Get processed historical chart data, using cache when possible.
   * Only regenerates when new historical data arrives.
   */
  async getHistoricalChartData(historicalData: HistoricalDataPoint[]): Promise<PriceChartDataPoint[]> {
    const cacheKey = `historical-${historicalData.length}`
    
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Using cached historical chart data (${historicalData.length} points)`)
      return this.cache.get(cacheKey)!
    }
    
    console.log(`🔄 Processing historical data for chart (${historicalData.length} points)`)
    const chartData = this.processHistoricalData(historicalData)
    this.cache.set(cacheKey, chartData)
    return chartData
  }

  /**
   * Process raw historical data into chart data structure.
   * This is the expensive operation we want to cache.
   */
  private processHistoricalData(historicalData: HistoricalDataPoint[]): PriceChartDataPoint[] {
    return historicalData.map(point => {
      const date = new Date(point.time * 1000)
      return {
        date: date.toISOString().split("T")[0],
        days: getDaysSinceGenesis(date),
        historicalPrice: point.close,
        // No projection data - will be added separately
      }
    })
  }

  /**
   * Clear the cache (useful for testing or when historical data source changes)
   */
  clearCache(): void {
    this.cache.clear()
    console.log("🗑️ Historical chart data cache cleared")
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}
