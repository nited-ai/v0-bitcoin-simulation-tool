/**
 * Historical Data Loader
 * 
 * Loads Bitcoin historical price data from static CSV files and APIs.
 * Provides caching and data transformation utilities.
 */

export interface HistoricalDataPoint {
  timestamp: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Load historical Bitcoin price data
 * For now, we'll use mock data until CSV integration is complete
 */
export async function loadHistoricalData(): Promise<HistoricalDataPoint[]> {
  console.log('📊 Loading historical Bitcoin price data...')
  
  try {
    // Mock historical data for development
    // In production, this would load from CSV files or API
    const mockData: HistoricalDataPoint[] = generateMockHistoricalData()
    
    console.log(`✅ Historical data loaded: ${mockData.length} points`)
    return mockData
    
  } catch (error) {
    console.error('❌ Failed to load historical data:', error)
    throw new Error('Failed to load historical Bitcoin price data')
  }
}

/**
 * Append current Bitcoin price to historical data
 */
export async function appendCurrentPrice(historicalData: HistoricalDataPoint[]): Promise<HistoricalDataPoint[]> {
  try {
    console.log('📡 Fetching current Bitcoin price...')
    
    // Mock current price for development
    // In production, this would fetch from CoinGecko or similar API
    const currentPrice = 45000 // Mock current price in USD
    const now = new Date()
    
    const currentDataPoint: HistoricalDataPoint = {
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      open: currentPrice,
      high: currentPrice * 1.02,
      low: currentPrice * 0.98,
      close: currentPrice,
      volume: 1000000
    }
    
    // Add current price if it's not already the latest point
    const latestPoint = historicalData[historicalData.length - 1]
    if (!latestPoint || latestPoint.date !== currentDataPoint.date) {
      historicalData.push(currentDataPoint)
      console.log(`✅ Current price appended: $${currentPrice}`)
    }
    
    return historicalData
    
  } catch (error) {
    console.warn('⚠️ Failed to fetch current price, using historical data only:', error)
    return historicalData
  }
}

/**
 * Convert USD prices to EUR
 */
export function convertToEur(data: HistoricalDataPoint[], usdToEurRate: number = 0.92): HistoricalDataPoint[] {
  console.log(`💱 Converting prices to EUR (rate: ${usdToEurRate})`)
  
  return data.map(point => ({
    ...point,
    open: point.open * usdToEurRate,
    high: point.high * usdToEurRate,
    low: point.low * usdToEurRate,
    close: point.close * usdToEurRate
  }))
}

/**
 * Generate mock historical data for development
 * This simulates Bitcoin price data from 2013 to present
 */
function generateMockHistoricalData(): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  const startDate = new Date('2013-01-01')
  const endDate = new Date()
  
  // Starting price in 2013
  let currentPrice = 100
  
  // Generate daily data points
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    // Simulate Bitcoin's general upward trend with volatility
    const yearProgress = (date.getFullYear() - 2013) / (new Date().getFullYear() - 2013)
    
    // Base growth trend (exponential)
    const basePrice = 100 * Math.pow(450, yearProgress) // From $100 to ~$45,000
    
    // Add some volatility and cycles
    const volatility = 0.05 // 5% daily volatility
    const cycleEffect = Math.sin((date.getTime() / (1000 * 60 * 60 * 24)) / 365.25 * 2 * Math.PI) * 0.3
    const randomFactor = (Math.random() - 0.5) * volatility
    
    currentPrice = basePrice * (1 + cycleEffect + randomFactor)
    
    // Ensure price doesn't go negative
    currentPrice = Math.max(currentPrice, 1)
    
    // Calculate OHLC from close price
    const high = currentPrice * (1 + Math.random() * 0.03)
    const low = currentPrice * (1 - Math.random() * 0.03)
    const open = low + Math.random() * (high - low)
    
    data.push({
      timestamp: date.getTime(),
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(currentPrice * 100) / 100,
      volume: Math.round(Math.random() * 10000000)
    })
  }
  
  return data
}

/**
 * Cache manager for historical data
 */
class HistoricalDataCache {
  private cache: Map<string, { data: HistoricalDataPoint[]; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 1000 * 60 * 60 // 1 hour
  
  get(key: string): HistoricalDataPoint[] | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 Using cached historical data: ${key}`)
      return cached.data
    }
    return null
  }
  
  set(key: string, data: HistoricalDataPoint[]): void {
    this.cache.set(key, { data, timestamp: Date.now() })
    console.log(`💾 Cached historical data: ${key} (${data.length} points)`)
  }
  
  clear(): void {
    this.cache.clear()
    console.log('🗑️ Historical data cache cleared')
  }
}

// Export singleton cache instance
export const historicalDataCache = new HistoricalDataCache()

/**
 * Load historical data with caching
 */
export async function loadHistoricalDataCached(): Promise<HistoricalDataPoint[]> {
  const cacheKey = 'bitcoin-historical-data'
  
  // Try to get from cache first
  const cached = historicalDataCache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  // Load fresh data
  const data = await loadHistoricalData()
  const dataWithCurrentPrice = await appendCurrentPrice(data)
  
  // Cache the result
  historicalDataCache.set(cacheKey, dataWithCurrentPrice)
  
  return dataWithCurrentPrice
}

/**
 * Get data statistics
 */
export function getDataStatistics(data: HistoricalDataPoint[]): {
  totalPoints: number
  dateRange: { start: string; end: string }
  priceRange: { min: number; max: number; current: number }
  averageVolume: number
} {
  if (data.length === 0) {
    return {
      totalPoints: 0,
      dateRange: { start: '', end: '' },
      priceRange: { min: 0, max: 0, current: 0 },
      averageVolume: 0
    }
  }
  
  const prices = data.map(d => d.close)
  const volumes = data.map(d => d.volume || 0)
  
  return {
    totalPoints: data.length,
    dateRange: {
      start: data[0].date,
      end: data[data.length - 1].date
    },
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      current: data[data.length - 1].close
    },
    averageVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  }
}
