/**
 * SQL Historical Data Loader for Price Engine
 * Replaces CSV-based loading with SQL database integration
 */

import type { HistoricalDataPoint } from "./types"
import { HistoricalDataCache } from "./cache-manager"
import { PerformanceMonitor } from "./performance-monitor"
import { databaseManager } from "@/app/simulation/data/database/DatabaseManager"
import { ensureDatabaseInitialized } from "@/app/simulation/data/database/DatabaseInitializer"

// Global cache instance
const cache = new HistoricalDataCache()

/**
 * Load historical Bitcoin price data from SQL database
 * @returns A promise that resolves to an array of historical data points
 */
async function loadPriceHistoryFromDatabase(): Promise<HistoricalDataPoint[]> {
  try {
    console.log('📊 Loading historical data from SQL database...')
    
    // Ensure database is initialized
    await ensureDatabaseInitialized()
    
    // Get historical data from SQL database
    const dbData = await databaseManager.getHistoricalData()
    
    if (dbData.length === 0) {
      throw new Error('No historical data found in database')
    }
    
    // Convert database format to price engine format
    const historicalData: HistoricalDataPoint[] = dbData.map(record => ({
      time: Math.floor(record.timestamp / 1000), // Convert milliseconds to seconds
      close: record.close
    }))
    
    // Sort by timestamp to ensure chronological order
    historicalData.sort((a, b) => a.time - b.time)
    
    console.log(`✅ Loaded ${historicalData.length} historical data points from SQL database`)
    console.log(`📅 Date range: ${new Date(historicalData[0].time * 1000).toISOString().split('T')[0]} to ${new Date(historicalData[historicalData.length - 1].time * 1000).toISOString().split('T')[0]}`)
    
    return historicalData
    
  } catch (error) {
    console.error('❌ Failed to load historical data from SQL database:', error)
    throw error
  }
}

/**
 * Load historical data with intelligent caching
 * Uses SQL database as the primary source with memory/localStorage caching for performance
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

      // Cache needs update - check if database has newer data
      console.log("🔄 Cache found but needs update, checking database...")
      return await loadIncrementalData(cachedData, updateCheck.lastTimestamp)
    }

    // 2. Full data load from database (first visit or cache cleared)
    console.log("📥 Performing full data load from SQL database...")
    PerformanceMonitor.recordLoadTime("cache-miss", performance.now() - startTime)
    return await loadFullDataWithCache()

  } catch (error) {
    console.error("❌ SQL database load failed, falling back to original CSV method:", error)
    
    // Fallback to original CSV-based loader if database fails
    const { loadHistoricalPriceDataWithFallbacks } = await import('./historical-data-loader')
    return await loadHistoricalPriceDataWithFallbacks()
  }
}

/**
 * Load incremental data when cache exists but needs updating
 */
async function loadIncrementalData(cachedData: HistoricalDataPoint[], lastCachedTimestamp: number): Promise<HistoricalDataPoint[]> {
  try {
    // Get fresh data from database
    const freshData = await loadPriceHistoryFromDatabase()
    
    // Find new data points since last cache update
    const newDataPoints = freshData.filter(point => point.time > lastCachedTimestamp)
    
    if (newDataPoints.length === 0) {
      console.log("✅ Database has no newer data, using cache")
      return cachedData
    }
    
    // Merge cached data with new data
    const mergedData = cache.mergeWithNewData(cachedData, newDataPoints)
    
    // Update cache
    await cache.saveToCache(mergedData)
    
    console.log(`✅ Updated cache with ${newDataPoints.length} new data points from database`)
    return mergedData

  } catch (error) {
    console.error("Incremental load failed:", error)
    // Return cached data if incremental update fails
    return cachedData
  }
}

/**
 * Full data load from database with caching
 */
async function loadFullDataWithCache(): Promise<HistoricalDataPoint[]> {
  const startTime = performance.now()

  // Load data from SQL database
  const data = await loadPriceHistoryFromDatabase()

  // Cache the data for future use
  await cache.saveToCache(data)

  const loadTime = performance.now() - startTime
  PerformanceMonitor.recordLoadTime("full-load", loadTime)
  console.log(`💾 Full data loaded from SQL database and cached in ${Math.round(loadTime)}ms (${data.length} points)`)

  return data
}

/**
 * Get current Bitcoin price from database
 */
export async function getCurrentBitcoinPrice(): Promise<number> {
  try {
    await ensureDatabaseInitialized()
    
    const data = await databaseManager.getHistoricalData()
    
    if (data.length === 0) {
      throw new Error('No price data available')
    }
    
    // Get the most recent price
    const latestPrice = data[data.length - 1].close
    console.log(`💰 Current Bitcoin price from database: $${latestPrice}`)
    
    return latestPrice
    
  } catch (error) {
    console.error('❌ Failed to get current price from database:', error)
    
    // Fallback to API
    const { loadCurrentBtcPrice } = await import('@/lib/load-btc-price')
    return await loadCurrentBtcPrice()
  }
}

/**
 * Update database with latest price data
 * This should be called periodically to keep the database current
 */
export async function updateDatabaseWithLatestData(): Promise<void> {
  try {
    console.log('🔄 Updating database with latest price data...')
    
    await ensureDatabaseInitialized()
    
    // Update current price
    await databaseManager.updateCurrentPrice()
    
    // Fill any data gaps
    await databaseManager.updateDatabase()
    
    // Clear cache to force reload of fresh data
    cache.clearCache()
    
    console.log('✅ Database updated successfully')
    
  } catch (error) {
    console.error('❌ Failed to update database:', error)
    throw error
  }
}

/**
 * Get database statistics for monitoring
 */
export async function getDatabaseStats(): Promise<{
  totalRecords: number
  dateRange: { start: string; end: string }
  lastUpdate: string
  sources: string[]
}> {
  try {
    await ensureDatabaseInitialized()
    return await databaseManager.getStats()
  } catch (error) {
    console.error('❌ Failed to get database stats:', error)
    throw error
  }
}

/**
 * Robust error handling with multiple fallback strategies
 * Maintains compatibility with existing price engine code
 */
export async function loadHistoricalPriceDataWithFallbacks(): Promise<HistoricalDataPoint[]> {
  const strategies = [
    () => loadHistoricalPriceData(), // SQL database (primary)
    async () => {
      // Fallback to original CSV loader
      const { loadHistoricalPriceDataWithFallbacks: originalLoader } = await import('./historical-data-loader')
      return originalLoader()
    }
  ]

  for (const [index, strategy] of strategies.entries()) {
    try {
      console.log(`🔄 Trying data loading strategy ${index + 1}/${strategies.length}`)
      const result = await strategy()
      if (result.length > 0) {
        return result
      }
    } catch (error) {
      console.warn(`Strategy ${index + 1} failed:`, error)
      if (index === strategies.length - 1) {
        throw error
      }
    }
  }

  throw new Error("All data loading strategies failed")
}

// Export the main function for backward compatibility
export { loadHistoricalPriceData as loadHistoricalPriceDataOriginal }
