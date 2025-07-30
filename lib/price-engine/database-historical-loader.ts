/**
 * Database-based Historical Data Loader
 * Replaces CSV-based loading with database queries and maintains caching
 */

import type { HistoricalDataPoint } from "./types"

// Simplified database loader without cache dependencies
// Cache management is now handled by the centralized data service

/**
 * Load historical Bitcoin price data from database via API
 * Maintains the same interface as the original CSV loader
 */
export async function loadHistoricalPriceData(): Promise<HistoricalDataPoint[]> {
  console.log("🚀 Loading historical price data from database...")
  const startTime = performance.now()

  try {
    // Direct database load (caching handled by centralized service)
    return await loadFullDataWithoutCache()

  } catch (error) {
    console.error("❌ Database load failed:", error)
    throw error
  }
}

/**
 * Load complete historical data from database without caching (Node.js environment)
 */
async function loadFullDataWithoutCache(): Promise<HistoricalDataPoint[]> {
  try {
    console.log("📊 Fetching all historical data from database (no cache)...")

    // Fetch all historical data from database API
    const response = await fetch('/api/bitcoin-prices/historical')

    if (!response.ok) {
      throw new Error(`Database API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Invalid database API response')
    }

    // Convert database format to HistoricalDataPoint format
    const historicalData: HistoricalDataPoint[] = result.data.map((record: any) => ({
      time: Math.floor(record.timestamp / 1000), // Convert milliseconds to seconds
      close: record.close,
      // Additional data available but not used in current interface
      open: record.open,
      high: record.high,
      low: record.low,
      volume: record.volume,
      date: record.date,
      source: record.source
    }))

    // Sort by time to ensure chronological order
    historicalData.sort((a, b) => a.time - b.time)

    console.log(`✅ Loaded ${historicalData.length} records from database (${result.metadata.startDate} to ${result.metadata.endDate})`)

    return historicalData

  } catch (error) {
    console.error("❌ Failed to load from database:", error)
    throw error
  }
}

/**
 * Load complete historical data from database and cache it (Browser environment)
 */
async function loadFullDataWithCache(): Promise<HistoricalDataPoint[]> {
  try {
    console.log("📊 Fetching all historical data from database...")
    
    // Fetch all historical data from database API
    const response = await fetch('/api/bitcoin-prices/historical')
    
    if (!response.ok) {
      throw new Error(`Database API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Invalid database API response')
    }

    // Convert database format to HistoricalDataPoint format
    const historicalData: HistoricalDataPoint[] = result.data.map((record: any) => ({
      time: Math.floor(record.timestamp / 1000), // Convert milliseconds to seconds
      close: record.close,
      // Additional data available but not used in current interface
      open: record.open,
      high: record.high,
      low: record.low,
      volume: record.volume,
      date: record.date,
      source: record.source
    }))

    // Sort by time to ensure chronological order
    historicalData.sort((a, b) => a.time - b.time)

    // Cache the data (only in browser environment)
    if (cache) {
      await cache.saveToCache(historicalData)
    }

    console.log(`✅ Loaded ${historicalData.length} records from database (${result.metadata.startDate} to ${result.metadata.endDate})`)
    
    return historicalData

  } catch (error) {
    console.error("❌ Failed to load from database:", error)
    throw error
  }
}

/**
 * Load only new data since the last cache update
 */
async function loadIncrementalData(
  cachedData: HistoricalDataPoint[],
  lastTimestamp?: number
): Promise<HistoricalDataPoint[]> {
  try {
    const now = new Date()
    now.setUTCHours(0, 0, 0, 0)

    const lastCacheDate = lastTimestamp ? new Date(lastTimestamp * 1000) : new Date(0)
    lastCacheDate.setUTCHours(0, 0, 0, 0)

    const daysSinceLastUpdate = Math.floor((now.getTime() - lastCacheDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastUpdate <= 0) {
      console.log("📊 Cache is up to date")
      return cachedData
    }

    // Calculate date range for incremental update
    const startDate = new Date(lastCacheDate)
    startDate.setDate(startDate.getDate() + 1) // Start from day after last cached date
    const endDate = new Date(now)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log(`📡 Fetching incremental data from ${startDateStr} to ${endDateStr}...`)

    // Fetch incremental data from database
    const response = await fetch(`/api/bitcoin-prices/historical?startDate=${startDateStr}&endDate=${endDateStr}`)
    
    if (!response.ok) {
      throw new Error(`Database API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error('Failed to fetch incremental data')
    }

    // Convert new data to HistoricalDataPoint format
    const newData: HistoricalDataPoint[] = result.data.map((record: any) => ({
      time: Math.floor(record.timestamp / 1000),
      close: record.close,
      open: record.open,
      high: record.high,
      low: record.low,
      volume: record.volume,
      date: record.date,
      source: record.source
    }))

    // Merge with cached data (only in browser environment)
    let mergedData = cachedData
    if (cache) {
      mergedData = cache.mergeWithNewData(cachedData, newData)
      // Update cache
      await cache.saveToCache(mergedData)
    } else {
      // Simple merge for Node.js environment
      mergedData = [...cachedData, ...newData].sort((a, b) => a.time - b.time)
    }

    console.log(`✅ Updated cache with ${newData.length} new data points`)
    return mergedData

  } catch (error) {
    console.error("❌ Incremental load failed:", error)
    // Return cached data on error
    return cachedData
  }
}

/**
 * Fallback: Load historical data from CSV (original method)
 * Used when database is unavailable
 */
async function loadHistoricalPriceDataFromCsv(): Promise<HistoricalDataPoint[]> {
  console.log("⚠️ Falling back to CSV data loading...")
  
  try {
    // Import the original CSV loader dynamically to avoid circular dependencies
    const { loadHistoricalPriceData: originalLoader } = await import('./historical-data-loader')
    return await originalLoader()
  } catch (error) {
    console.error("❌ CSV fallback also failed:", error)
    
    // Last resort: return empty array or mock data
    console.log("🔄 Using minimal mock data for development...")
    return generateMinimalMockData()
  }
}

/**
 * Generate minimal mock data as last resort
 */
function generateMinimalMockData(): HistoricalDataPoint[] {
  const mockData: HistoricalDataPoint[] = []
  const startDate = new Date('2013-10-01')
  const endDate = new Date()
  
  let currentPrice = 100 // Starting price
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    // Simple random walk for mock data
    const change = (Math.random() - 0.5) * 0.1 // ±5% daily change
    currentPrice *= (1 + change)
    
    mockData.push({
      time: Math.floor(date.getTime() / 1000),
      close: Math.round(currentPrice * 100) / 100
    })
  }
  
  console.log(`📊 Generated ${mockData.length} mock data points`)
  return mockData
}

/**
 * Get current Bitcoin price from database or live API
 */
export async function getCurrentBitcoinPrice(preferLive: boolean = false): Promise<number | null> {
  try {
    const response = await fetch(`/api/bitcoin-prices/current${preferLive ? '?live=true' : ''}`)
    
    if (!response.ok) {
      throw new Error(`Current price API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success && result.data?.current?.close) {
      return result.data.current.close
    }
    
    return null
  } catch (error) {
    console.error("❌ Failed to fetch current price:", error)
    return null
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<any> {
  try {
    const response = await fetch('/api/bitcoin-prices/stats')
    
    if (!response.ok) {
      throw new Error(`Stats API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success) {
      return result.data
    }
    
    return null
  } catch (error) {
    console.error("❌ Failed to fetch database stats:", error)
    return null
  }
}

/**
 * Trigger database update
 */
export async function triggerDatabaseUpdate(maxGaps: number = 50): Promise<boolean> {
  try {
    const response = await fetch('/api/bitcoin-prices/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ maxGaps })
    })
    
    if (!response.ok) {
      throw new Error(`Update API error: ${response.status}`)
    }

    const result = await response.json()
    return result.success
  } catch (error) {
    console.error("❌ Failed to trigger database update:", error)
    return false
  }
}
