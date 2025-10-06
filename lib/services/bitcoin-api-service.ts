/**
 * Enhanced Bitcoin Price API Service
 * Provides reliable OHLC data from external APIs
 */

export interface BitcoinPriceData {
  date: string // YYYY-MM-DD format
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface ApiResponse {
  success: boolean
  data: BitcoinPriceData[]
  source: string
  error?: string
}

export interface GapDetectionResult {
  gaps: string[] // Array of missing dates
  totalGaps: number
  latestDate: string
  oldestGap?: string
  newestGap?: string
}

/**
 * Enhanced Bitcoin API service for fetching data from external APIs
 */
export class EnhancedBitcoinApiService {
  
  private readonly APIs = [
    {
      name: 'CoinGecko',
      fetchHistorical: this.fetchFromCoinGecko.bind(this),
      fetchCurrent: this.fetchCurrentFromCoinGecko.bind(this),
      rateLimit: 1000, // 1 second between calls
      dailyLimit: 100 // Free tier limit
    },
    {
      name: 'CoinCap',
      fetchHistorical: this.fetchFromCoinCap.bind(this),
      fetchCurrent: this.fetchCurrentFromCoinCap.bind(this),
      rateLimit: 1000,
      dailyLimit: 1000
    },
    {
      name: 'Binance',
      fetchHistorical: this.fetchFromBinance.bind(this),
      fetchCurrent: this.fetchCurrentFromBinance.bind(this),
      rateLimit: 1200,
      dailyLimit: 2400
    }
  ]

  private lastApiCall = 0
  private currentApiIndex = 0

  constructor() {
    // No initialization needed for API-only service
  }





  /**
   * Fetch historical Bitcoin price data with automatic API fallback
   */
  async fetchHistoricalData(startDate: string, endDate: string): Promise<ApiResponse> {
    console.log(`📡 Fetching historical data from ${startDate} to ${endDate}`)

    for (let i = 0; i < this.APIs.length; i++) {
      const api = this.APIs[this.currentApiIndex]
      
      try {
        await this.respectRateLimit(api.rateLimit)
        
        const data = await api.fetchHistorical(startDate, endDate)
        
        if (data && data.length > 0) {
          console.log(`✅ Fetched ${data.length} records from ${api.name}`)
          return {
            success: true,
            data,
            source: api.name
          }
        }
        
      } catch (error) {
        console.error(`❌ ${api.name} failed:`, error)
      }
      
      this.currentApiIndex = (this.currentApiIndex + 1) % this.APIs.length
    }

    return {
      success: false,
      data: [],
      source: 'none',
      error: 'All APIs failed'
    }
  }




  /**
   * Rate limiting helper
   */
  private async respectRateLimit(minInterval: number): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall
    
    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastApiCall = Date.now()
  }

  /**
   * CoinGecko API implementation (Free tier: 100 calls/day)
   */
  private async fetchFromCoinGecko(startDate: string, endDate: string): Promise<BitcoinPriceData[]> {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.prices || !Array.isArray(result.prices)) {
      throw new Error('Invalid CoinGecko API response')
    }

    // Convert CoinGecko format to our format
    const priceData: BitcoinPriceData[] = []
    const dailyData = new Map<string, any>()

    // Group by date and aggregate OHLC
    result.prices.forEach(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          timestamp,
          open: price,
          high: price,
          low: price,
          close: price,
          prices: [price]
        })
      } else {
        const dayData = dailyData.get(date)
        dayData.high = Math.max(dayData.high, price)
        dayData.low = Math.min(dayData.low, price)
        dayData.close = price // Last price of the day
        dayData.prices.push(price)
      }
    })

    // Convert to final format
    dailyData.forEach(dayData => {
      priceData.push({
        date: dayData.date,
        timestamp: dayData.timestamp,
        open: dayData.open,
        high: dayData.high,
        low: dayData.low,
        close: dayData.close
      })
    })

    return priceData.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * CoinCap API implementation
   */
  private async fetchFromCoinCap(startDate: string, endDate: string): Promise<BitcoinPriceData[]> {
    const startTimestamp = new Date(startDate).getTime()
    const endTimestamp = new Date(endDate).getTime()

    const url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${startTimestamp}&end=${endTimestamp}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`CoinCap API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error('Invalid CoinCap API response')
    }

    return result.data.map((item: any) => ({
      date: new Date(item.time).toISOString().split('T')[0],
      timestamp: item.time,
      open: parseFloat(item.priceUsd),
      high: parseFloat(item.priceUsd),
      low: parseFloat(item.priceUsd),
      close: parseFloat(item.priceUsd)
    }))
  }

  /**
   * Binance API implementation
   */
  private async fetchFromBinance(startDate: string, endDate: string): Promise<BitcoinPriceData[]> {
    const startTimestamp = new Date(startDate).getTime()
    const endTimestamp = new Date(endDate).getTime()

    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTimestamp}&endTime=${endTimestamp}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const result = await response.json()

    if (!Array.isArray(result)) {
      throw new Error('Invalid Binance API response')
    }

    return result.map((kline: any[]) => ({
      date: new Date(kline[0]).toISOString().split('T')[0],
      timestamp: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }))
  }

  /**
   * Fetch current Bitcoin price
   */
  async fetchCurrentPrice(): Promise<ApiResponse> {
    console.log('📡 Fetching current Bitcoin price...')

    for (let i = 0; i < this.APIs.length; i++) {
      const api = this.APIs[this.currentApiIndex]

      try {
        await this.respectRateLimit(api.rateLimit)

        const data = await api.fetchCurrent()

        if (data && data.length > 0) {
          console.log(`✅ Current price from ${api.name}: $${data[0].close}`)
          return {
            success: true,
            data,
            source: api.name
          }
        }

      } catch (error) {
        console.error(`❌ ${api.name} current price failed:`, error)
      }

      this.currentApiIndex = (this.currentApiIndex + 1) % this.APIs.length
    }

    return {
      success: false,
      data: [],
      source: 'none',
      error: 'All current price APIs failed'
    }
  }

  /**
   * Current price implementations
   */
  private async fetchCurrentFromCoinGecko(): Promise<BitcoinPriceData[]> {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    if (!response.ok) throw new Error(`CoinGecko current price error: ${response.status}`)

    const result = await response.json()
    const price = result.bitcoin.usd
    const now = Date.now()

    return [{
      date: new Date(now).toISOString().split('T')[0],
      timestamp: now,
      open: price,
      high: price,
      low: price,
      close: price
    }]
  }

  private async fetchCurrentFromCoinCap(): Promise<BitcoinPriceData[]> {
    const response = await fetch('https://api.coincap.io/v2/assets/bitcoin')
    if (!response.ok) throw new Error(`CoinCap current price error: ${response.status}`)

    const result = await response.json()
    const price = parseFloat(result.data.priceUsd)
    const now = Date.now()

    return [{
      date: new Date(now).toISOString().split('T')[0],
      timestamp: now,
      open: price,
      high: price,
      low: price,
      close: price
    }]
  }

  private async fetchCurrentFromBinance(): Promise<BitcoinPriceData[]> {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
    if (!response.ok) throw new Error(`Binance current price error: ${response.status}`)

    const result = await response.json()
    const price = parseFloat(result.price)
    const now = Date.now()

    return [{
      date: new Date(now).toISOString().split('T')[0],
      timestamp: now,
      open: price,
      high: price,
      low: price,
      close: price
    }]
  }


}

// Export singleton instance
export const enhancedBitcoinApiService = new EnhancedBitcoinApiService()
