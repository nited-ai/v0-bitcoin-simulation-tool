/**
 * Bitcoin JSON Data Service
 * 
 * Loads Bitcoin historical data from static JSON files for improved performance.
 * Implements progressive loading strategy and maintains compatibility with existing interfaces.
 */

import type { HistoricalDataPoint } from './centralized-data-service'
import { PerformanceMonitor } from '../price-engine/performance-monitor'

export interface OptimizedBitcoinData {
  meta: {
    startDate: string
    endDate: string
    interval: 'daily' | 'weekly' | 'monthly'
    count: number
    lastUpdated: string
  }
  data: [number, number][] // [timestamp, close]
}

export class BitcoinJsonDataService {
  private cache = new Map<string, HistoricalDataPoint[]>()
  private loadingPromises = new Map<string, Promise<HistoricalDataPoint[]>>()

  /**
   * Load historical Bitcoin data from JSON files with database fallback
   */
  async loadHistoricalData(
    interval: 'daily' | 'weekly' | 'monthly' = 'monthly',
    enableFallback: boolean = true
  ): Promise<HistoricalDataPoint[]> {
    console.log(`📊 Loading ${interval} Bitcoin data from JSON files...`)
    const startTime = performance.now()

    // Check cache first
    const cacheKey = interval
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Using cached ${interval} data: ${this.cache.get(cacheKey)!.length} points`)
      return this.cache.get(cacheKey)!
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`⏳ ${interval} data load already in progress, waiting...`)
      return this.loadingPromises.get(cacheKey)!
    }

    // Start loading with fallback
    const loadingPromise = this.loadWithFallback(interval, enableFallback)
    this.loadingPromises.set(cacheKey, loadingPromise)

    try {
      const data = await loadingPromise

      // Cache the result
      this.cache.set(cacheKey, data)

      const loadTime = performance.now() - startTime
      PerformanceMonitor.recordLoadTime(`json-${interval}`, loadTime)
      console.log(`✅ Loaded ${interval} data: ${data.length} points in ${Math.round(loadTime)}ms`)

      return data
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(cacheKey)
    }
  }

  /**
   * Load data with fallback to database API
   */
  private async loadWithFallback(
    interval: 'daily' | 'weekly' | 'monthly',
    enableFallback: boolean
  ): Promise<HistoricalDataPoint[]> {
    try {
      // Try JSON file first
      return await this.loadFromJsonFile(interval)
    } catch (error) {
      console.warn(`⚠️ JSON loading failed for ${interval}:`, error)

      if (!enableFallback) {
        throw error
      }

      // Fallback to database API
      console.log(`🔄 Falling back to database API for ${interval} data...`)
      return await this.loadFromDatabaseAPI(interval)
    }
  }

  /**
   * Fallback to database API
   */
  private async loadFromDatabaseAPI(interval: 'daily' | 'weekly' | 'monthly'): Promise<HistoricalDataPoint[]> {
    try {
      const response = await fetch(`/api/bitcoin-prices/historical?interval=${interval}`)

      if (!response.ok) {
        throw new Error(`Database API error: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('Invalid database API response')
      }

      // Convert database format to HistoricalDataPoint format
      const historicalData: HistoricalDataPoint[] = result.data.map((record: any) => ({
        time: Math.floor(record.timestamp / 1000),
        close: record.close,
        open: record.open,
        high: record.high,
        low: record.low,
        volume: record.volume,
        date: record.date,
        source: record.source
      }))

      console.log(`✅ Database fallback successful: ${historicalData.length} points`)
      return historicalData

    } catch (error) {
      console.error(`❌ Database fallback failed:`, error)
      throw new Error(`Both JSON and database loading failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Load data from specific JSON file
   */
  private async loadFromJsonFile(interval: 'daily' | 'weekly' | 'monthly'): Promise<HistoricalDataPoint[]> {
    const fileName = `${interval}.json`
    const url = `/data/bitcoin/${fileName}`

    try {
      console.log(`📡 Fetching ${url}...`)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
      }

      const jsonData: OptimizedBitcoinData = await response.json()
      
      // Validate data integrity
      this.validateDataIntegrity(jsonData)

      // Additional validation for interval consistency
      this.validateIntervalConsistency(jsonData, interval)

      // Convert to HistoricalDataPoint format
      return this.convertToHistoricalDataPoints(jsonData)

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          throw new Error(`Failed to load JSON data: ${error.message}`)
        } else if (error.message.includes('JSON')) {
          throw new Error(`Failed to parse JSON data: ${error.message}`)
        } else {
          throw new Error(`Failed to load JSON data: ${error.message}`)
        }
      }
      throw new Error(`Failed to load JSON data: ${String(error)}`)
    }
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity(data: OptimizedBitcoinData): void {
    if (!data.meta || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: missing meta or data')
    }

    if (data.meta.count !== data.data.length) {
      throw new Error(`Data count mismatch: expected ${data.meta.count}, got ${data.data.length}`)
    }

    // Validate data format
    for (let i = 0; i < data.data.length; i++) {
      const point = data.data[i]
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error(`Invalid data point format at index ${i}: expected [timestamp, close]`)
      }
      
      const [timestamp, close] = point
      if (typeof timestamp !== 'number' || typeof close !== 'number') {
        throw new Error(`Invalid data types at index ${i}: expected numbers`)
      }
      
      if (timestamp <= 0 || close <= 0) {
        throw new Error(`Invalid values at index ${i}: timestamp and close must be positive`)
      }
    }

    console.log(`✅ Data integrity validated: ${data.data.length} points`)
  }

  /**
   * Validate interval consistency
   */
  private validateIntervalConsistency(
    data: OptimizedBitcoinData,
    expectedInterval: 'daily' | 'weekly' | 'monthly'
  ): void {
    if (data.meta.interval !== expectedInterval) {
      throw new Error(`Interval mismatch: expected ${expectedInterval}, got ${data.meta.interval}`)
    }

    // Validate date range makes sense
    if (data.meta.startDate && data.meta.endDate) {
      const startDate = new Date(data.meta.startDate)
      const endDate = new Date(data.meta.endDate)

      if (startDate >= endDate) {
        throw new Error(`Invalid date range: startDate (${data.meta.startDate}) >= endDate (${data.meta.endDate})`)
      }
    }

    // Validate lastUpdated is recent (within last 30 days for development)
    if (data.meta.lastUpdated) {
      const lastUpdated = new Date(data.meta.lastUpdated)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      if (lastUpdated < thirtyDaysAgo) {
        console.warn(`⚠️ Data may be stale: last updated ${data.meta.lastUpdated}`)
      }
    }

    console.log(`✅ Interval consistency validated for ${expectedInterval}`)
  }

  /**
   * Convert optimized format to HistoricalDataPoint format
   */
  convertToHistoricalDataPoints(data: OptimizedBitcoinData): HistoricalDataPoint[] {
    return data.data.map(([timestamp, close]) => ({
      time: Math.floor(timestamp / 1000), // Convert milliseconds to seconds
      close,
      // Fill in missing OHLCV data with close price (typical for aggregated data)
      open: close,
      high: close,
      low: close,
      volume: 0,
      date: new Date(timestamp).toISOString().split('T')[0],
      source: 'json'
    }))
  }

  /**
   * Progressive loading strategy
   * Loads data in order of increasing detail: monthly → weekly → daily
   */
  async loadProgressiveData(): Promise<{
    monthly: HistoricalDataPoint[]
    weekly?: HistoricalDataPoint[]
    daily?: HistoricalDataPoint[]
  }> {
    console.log('🔄 Starting progressive data loading...')
    
    // Always load monthly first for instant display
    const monthly = await this.loadHistoricalData('monthly')
    
    const result = { monthly }
    
    // Load weekly data in background
    try {
      const weekly = await this.loadHistoricalData('weekly')
      Object.assign(result, { weekly })
    } catch (error) {
      console.warn('⚠️ Failed to load weekly data:', error)
    }
    
    // Load daily data in background (optional)
    try {
      const daily = await this.loadHistoricalData('daily')
      Object.assign(result, { daily })
    } catch (error) {
      console.warn('⚠️ Failed to load daily data:', error)
    }
    
    return result
  }

  /**
   * Get cached data if available
   */
  getCachedData(interval: 'daily' | 'weekly' | 'monthly'): HistoricalDataPoint[] | null {
    return this.cache.get(interval) || null
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🗑️ JSON data cache cleared')
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { interval: string; points: number; size: string }[] {
    const status: { interval: string; points: number; size: string }[] = []
    
    for (const [interval, data] of this.cache.entries()) {
      const sizeBytes = JSON.stringify(data).length
      const sizeKB = Math.round(sizeBytes / 1024)
      
      status.push({
        interval,
        points: data.length,
        size: `${sizeKB}KB`
      })
    }
    
    return status
  }
}

// Export singleton instance
export const bitcoinJsonDataService = new BitcoinJsonDataService()
