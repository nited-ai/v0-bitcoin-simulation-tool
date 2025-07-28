/**
 * Client-side Historical Data Loader
 * Calls server-side API routes to access SQL database data
 */

import type { HistoricalDataPoint } from "./types"
import { HistoricalDataCache } from "./cache-manager"
import { PerformanceMonitor } from "./performance-monitor"

// Global cache instance
const cache = new HistoricalDataCache()

/**
 * Load historical Bitcoin price data from server API
 * @returns A promise that resolves to an array of historical data points
 */
async function loadPriceHistoryFromAPI(): Promise<HistoricalDataPoint[]> {
  try {
    console.log('📊 Loading historical data from server API...')
    
    const response = await fetch('/api/bitcoin-prices?action=historical')
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }
    
    const historicalData: HistoricalDataPoint[] = result.data
    
    console.log(`✅ Loaded ${historicalData.length} historical data points from API`)
    console.log(`📅 Date range: ${result.dateRange.start} to ${result.dateRange.end}`)
    
    return historicalData
    
  } catch (error) {
    console.error('❌ Failed to load historical data from API:', error)
    throw error
  }
}

/**
 * Load historical data with intelligent caching
 * Uses server API as the primary source with memory/localStorage caching for performance
 */
export async function loadHistoricalPriceData(): Promise<HistoricalDataPoint[]> {
  const startTime = performance.now()

  try {
    // 1. Check memory/localStorage cache first
    const cachedData = await cache.loadFromCache()
    if (cachedData) {
      const updateCheck = cache.needsUpdate()

      if (!updateCheck.needsUpdate) {
        const loadTime = performance.now() - startTime
        PerformanceMonitor.recordLoadTime("cache-hit", loadTime)
        console.log(`⚡ Data loaded from cache in ${Math.round(loadTime)}ms (${cachedData.length} points)`)
        return cachedData
      }

      // Cache needs update - check if server has newer data
      console.log("🔄 Cache found but needs update, checking server...")
      return await loadIncrementalData(cachedData, updateCheck.lastTimestamp)
    }

    // 2. Full data load from server API (first visit or cache cleared)
    console.log("📥 Performing full data load from server API...")
    PerformanceMonitor.recordLoadTime("cache-miss", performance.now() - startTime)
    return await loadFullDataWithCache()

  } catch (error) {
    console.error("❌ Server API load failed:", error)

    // Try to use cached data as fallback
    const cachedData = await cache.loadFromCache()
    if (cachedData && cachedData.length > 0) {
      console.log("🔄 Using cached data as fallback")
      return cachedData
    }

    throw new Error('SQL database API failed and no cached data available')
  }
}

/**
 * Load incremental data when cache exists but needs updating
 */
async function loadIncrementalData(cachedData: HistoricalDataPoint[], lastCachedTimestamp: number): Promise<HistoricalDataPoint[]> {
  try {
    // Get fresh data from server
    const freshData = await loadPriceHistoryFromAPI()
    
    // Find new data points since last cache update
    const newDataPoints = freshData.filter(point => point.time > lastCachedTimestamp)
    
    if (newDataPoints.length === 0) {
      console.log("✅ Server has no newer data, using cache")
      return cachedData
    }
    
    // Merge cached data with new data
    const mergedData = cache.mergeWithNewData(cachedData, newDataPoints)
    
    // Update cache
    await cache.saveToCache(mergedData)
    
    console.log(`✅ Updated cache with ${newDataPoints.length} new data points from server`)
    return mergedData

  } catch (error) {
    console.error("Incremental load failed:", error)
    // Return cached data if incremental update fails
    return cachedData
  }
}

/**
 * Full data load from server API with caching
 */
async function loadFullDataWithCache(): Promise<HistoricalDataPoint[]> {
  const startTime = performance.now()

  // Load data from server API
  const data = await loadPriceHistoryFromAPI()

  // Cache the data for future use
  await cache.saveToCache(data)

  const loadTime = performance.now() - startTime
  PerformanceMonitor.recordLoadTime("full-load", loadTime)
  console.log(`💾 Full data loaded from server API and cached in ${Math.round(loadTime)}ms (${data.length} points)`)

  return data
}

/**
 * Get current Bitcoin price from server API
 */
export async function getCurrentBitcoinPrice(): Promise<number> {
  try {
    console.log('💰 Getting current Bitcoin price from server API...')
    
    const response = await fetch('/api/bitcoin-prices?action=current')
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to get current price')
    }
    
    console.log(`💰 Current Bitcoin price from server: $${result.price}`)
    
    return result.price
    
  } catch (error) {
    console.error('❌ Failed to get current price from server API:', error)
    throw new Error('Unable to get current Bitcoin price from SQL database')
  }
}

/**
 * Update server database with latest price data
 */
export async function updateDatabaseWithLatestData(): Promise<void> {
  try {
    console.log('🔄 Updating server database with latest price data...')
    
    const response = await fetch('/api/bitcoin-prices?action=update', {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Database update failed')
    }
    
    // Clear cache to force reload of fresh data
    cache.clearCache()
    
    console.log('✅ Server database updated successfully')
    
  } catch (error) {
    console.error('❌ Failed to update server database:', error)
    throw error
  }
}

/**
 * Get database statistics from server
 */
export async function getDatabaseStats(): Promise<{
  totalRecords: number
  dateRange: { start: string; end: string }
  lastUpdate: string
  sources: string[]
}> {
  try {
    const response = await fetch('/api/bitcoin-prices?action=stats')
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to get database stats')
    }
    
    return result.stats
    
  } catch (error) {
    console.error('❌ Failed to get database stats from server:', error)
    throw error
  }
}

/**
 * Check database health on server
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  issues: string[]
  stats: any
}> {
  try {
    const response = await fetch('/api/bitcoin-prices?action=health')
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to check database health')
    }
    
    return result.health
    
  } catch (error) {
    console.error('❌ Failed to check database health:', error)
    throw error
  }
}

/**
 * Robust error handling with multiple fallback strategies
 * Maintains compatibility with existing price engine code
 */
export async function loadHistoricalPriceDataWithFallbacks(): Promise<HistoricalDataPoint[]> {
  try {
    console.log('🔄 Loading historical data from SQL database...')
    const data = await loadHistoricalPriceData()

    if (data && data.length > 0) {
      console.log(`✅ Successfully loaded ${data.length} data points from SQL database`)
      return data
    }

    throw new Error('SQL database returned no data')

  } catch (error) {
    console.error('❌ Failed to load historical data from SQL database:', error)

    // Try cached data as last resort
    const cachedData = await cache.loadFromCache()
    if (cachedData && cachedData.length > 0) {
      console.log("🔄 Using cached data as last resort")
      return cachedData
    }

    throw new Error('SQL database failed and no cached data available')
  }
}

// Export the main function for backward compatibility
export { loadHistoricalPriceData as loadHistoricalPriceDataOriginal }
