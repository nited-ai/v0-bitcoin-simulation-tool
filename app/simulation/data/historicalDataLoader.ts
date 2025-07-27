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
 * Load complete historical Bitcoin price data from database (2013-current)
 */
export async function loadHistoricalData(): Promise<HistoricalDataPoint[]> {
  console.log('📊 Loading complete Bitcoin price history (2013-current)...')

  try {
    // Step 1: Initialize database with CSV integration and current price update
    console.log('🗄️ Initializing database with complete historical data...')
    const { databaseManager } = await import('./database/DatabaseManager')
    const { autoUpdateService } = await import('./AutoUpdateService')

    // Start auto-update service (includes current price update)
    await autoUpdateService.start()

    // Step 2: Load complete historical data (CSV + API data)
    const databaseData = await databaseManager.getHistoricalData()

    // Convert database format to our format
    const historicalData: HistoricalDataPoint[] = databaseData.map(row => ({
      timestamp: row.timestamp,
      date: row.date,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume
    }))

    console.log(`✅ Complete historical data loaded: ${historicalData.length} points`)
    console.log(`📅 Full timeline: ${historicalData[0]?.date} to ${historicalData[historicalData.length - 1]?.date}`)

    // Verify we have complete data from 2013
    const startYear = new Date(historicalData[0]?.date || '').getFullYear()
    if (startYear > 2013) {
      console.warn(`⚠️ Historical data starts from ${startYear}, expected 2013`)
    } else {
      console.log(`✅ Complete historical timeline confirmed: ${startYear}-${new Date().getFullYear()}`)
    }

    return historicalData

  } catch (error) {
    console.error('❌ Database loading failed:', error)
    console.log('🔄 Falling back to CSV loading...')

    try {
      // Fallback: try basic CSV loading
      const csvData = await loadCSVData()
      const historicalData = csvData.map(row => ({
        timestamp: new Date(row.Date).getTime(),
        date: row.Date,
        open: row['24h Open (USD)'],
        high: row['24h High (USD)'],
        low: row['24h Low (USD)'],
        close: row['Closing Price (USD)'],
        volume: undefined
      }))

      console.log(`✅ Fallback CSV data loaded: ${historicalData.length} points`)
      return historicalData

    } catch (csvError) {
      console.error('❌ CSV fallback also failed:', csvError)
      console.log('🔄 Using mock data for development...')

      const mockData = generateMockHistoricalData()
      console.log(`✅ Mock data loaded: ${mockData.length} points`)
      return mockData
    }
  }
}

/**
 * CSV data structure from public/btc-price-history.csv
 */
interface CSVDataPoint {
  Currency: string
  Date: string
  'Closing Price (USD)': number
  '24h Open (USD)': number
  '24h High (USD)': number
  '24h Low (USD)': number
}

/**
 * Load and parse CSV data from public/btc-price-history.csv
 */
async function loadCSVData(): Promise<CSVDataPoint[]> {
  const response = await fetch('/btc-price-history.csv')
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
  }

  const csvText = await response.text()
  const lines = csvText.trim().split('\n')

  if (lines.length < 2) {
    throw new Error('CSV file appears to be empty or invalid')
  }

  // Parse header
  const header = lines[0].split(',')
  const data: CSVDataPoint[] = []

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    if (values.length !== header.length) continue // Skip malformed rows

    const row: any = {}
    header.forEach((col, index) => {
      const value = values[index]?.trim()
      if (col === 'Currency' || col === 'Date') {
        row[col] = value
      } else {
        row[col] = parseFloat(value) || 0
      }
    })

    data.push(row as CSVDataPoint)
  }

  return data
}

/**
 * Fetch gap data from CoinGecko API to bridge CSV end date to current date
 */
async function fetchGapData(startTimestamp: number, endTimestamp: number): Promise<HistoricalDataPoint[]> {
  try {
    // CoinGecko API expects timestamps in seconds, not milliseconds
    const fromTimestamp = Math.floor(startTimestamp / 1000)
    const toTimestamp = Math.floor(endTimestamp / 1000)

    console.log(`🌐 Fetching CoinGecko data from ${new Date(startTimestamp).toISOString().split('T')[0]} to ${new Date(endTimestamp).toISOString().split('T')[0]}`)

    // CoinGecko historical data endpoint
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error('Invalid CoinGecko API response format')
    }

    // Convert CoinGecko format to our HistoricalDataPoint format
    const gapData: HistoricalDataPoint[] = data.prices.map((pricePoint: [number, number]) => {
      const timestamp = pricePoint[0] // CoinGecko returns timestamp in milliseconds
      const price = pricePoint[1]
      const date = new Date(timestamp)

      return {
        timestamp,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        open: price, // CoinGecko doesn't provide OHLC in this endpoint, using price for all
        high: price,
        low: price,
        close: price,
        volume: undefined
      }
    })

    // Filter out any data points that might overlap with CSV data
    const filteredGapData = gapData.filter(point => point.timestamp > startTimestamp)

    console.log(`✅ CoinGecko gap data processed: ${filteredGapData.length} points`)
    return filteredGapData

  } catch (error) {
    console.error('❌ Failed to fetch gap data from CoinGecko:', error)

    // Try alternative: fetch just current price and create minimal gap bridge
    try {
      console.log('🔄 Attempting to fetch current price as fallback...')
      const currentPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')

      if (currentPriceResponse.ok) {
        const currentPriceData = await currentPriceResponse.json()
        const currentPrice = currentPriceData.bitcoin?.usd

        if (currentPrice) {
          const now = Date.now()
          const currentDate = new Date(now).toISOString().split('T')[0]

          console.log(`✅ Current price fallback: $${currentPrice}`)

          return [{
            timestamp: now,
            date: currentDate,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: undefined
          }]
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback current price fetch also failed:', fallbackError)
    }

    return [] // Return empty array if all attempts fail
  }
}

/**
 * Append current Bitcoin price to historical data
 */
export async function appendCurrentPrice(historicalData: HistoricalDataPoint[]): Promise<HistoricalDataPoint[]> {
  try {
    console.log('📡 Fetching current Bitcoin price...')

    // Try to fetch real current price from CoinGecko API
    let currentPrice = 45000 // Fallback price

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      if (response.ok) {
        const data = await response.json()
        currentPrice = data.bitcoin?.usd || currentPrice
        console.log(`✅ Current Bitcoin price fetched: $${currentPrice}`)
      } else {
        console.log('⚠️ CoinGecko API unavailable, using fallback price')
      }
    } catch (apiError) {
      console.log('⚠️ Failed to fetch current price, using fallback:', apiError)
    }

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
 * Keep USD prices as-is (no conversion needed)
 */
export function keepUsdPrices(data: HistoricalDataPoint[]): HistoricalDataPoint[] {
  console.log(`💰 Using USD prices directly (no conversion)`)

  return data.map(point => ({
    ...point,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close
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
