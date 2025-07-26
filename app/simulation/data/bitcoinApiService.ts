/**
 * Bitcoin Price API Service with Multiple Fallback Sources
 * Provides reliable OHLC data from various free APIs
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

/**
 * Multi-API Bitcoin data service with automatic fallbacks
 */
export class BitcoinApiService {
  private readonly APIs = [
    {
      name: 'CoinCap',
      fetchHistorical: this.fetchFromCoinCap.bind(this),
      fetchCurrent: this.fetchCurrentFromCoinCap.bind(this),
      rateLimit: 1000 // 1 second between calls
    },
    {
      name: 'Binance',
      fetchHistorical: this.fetchFromBinance.bind(this),
      fetchCurrent: this.fetchCurrentFromBinance.bind(this),
      rateLimit: 1200 // 1.2 seconds between calls
    },
    {
      name: 'CoinDesk',
      fetchHistorical: this.fetchFromCoinDesk.bind(this),
      fetchCurrent: this.fetchCurrentFromCoinDesk.bind(this),
      rateLimit: 2000 // 2 seconds between calls
    }
  ]

  private lastApiCall = 0
  private currentApiIndex = 0

  /**
   * Fetch historical Bitcoin data with automatic API fallbacks
   */
  async fetchHistoricalData(startDate: string, endDate: string): Promise<ApiResponse> {
    console.log(`🌐 Fetching Bitcoin data from ${startDate} to ${endDate}`)

    for (let i = 0; i < this.APIs.length; i++) {
      const api = this.APIs[this.currentApiIndex]
      
      try {
        console.log(`📡 Trying ${api.name} API...`)
        
        // Rate limiting
        await this.respectRateLimit(api.rateLimit)
        
        const data = await api.fetchHistorical(startDate, endDate)
        
        if (data && data.length > 0) {
          console.log(`✅ ${api.name} API success: ${data.length} data points`)
          return {
            success: true,
            data,
            source: api.name
          }
        }
        
      } catch (error) {
        console.error(`❌ ${api.name} API failed:`, error)
      }
      
      // Move to next API
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
   * CoinCap API implementation (Free, reliable)
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
      close: parseFloat(item.priceUsd),
      volume: undefined
    }))
  }

  /**
   * Binance API implementation (Free, comprehensive)
   */
  private async fetchFromBinance(startDate: string, endDate: string): Promise<BitcoinPriceData[]> {
    const startTimestamp = new Date(startDate).getTime()
    const endTimestamp = new Date(endDate).getTime()
    
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTimestamp}&endTime=${endTimestamp}&limit=1000`
    
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
   * CoinDesk API implementation (Simple, reliable)
   */
  private async fetchFromCoinDesk(startDate: string, endDate: string): Promise<BitcoinPriceData[]> {
    const url = `https://api.coindesk.com/v1/bpi/historical/close.json?start=${startDate}&end=${endDate}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`CoinDesk API error: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.bpi) {
      throw new Error('Invalid CoinDesk API response')
    }
    
    return Object.entries(result.bpi).map(([date, price]) => ({
      date,
      timestamp: new Date(date).getTime(),
      open: price as number,
      high: price as number,
      low: price as number,
      close: price as number,
      volume: undefined
    }))
  }

  /**
   * Current price implementations
   */
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

  private async fetchCurrentFromCoinDesk(): Promise<BitcoinPriceData[]> {
    const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json')
    if (!response.ok) throw new Error(`CoinDesk current price error: ${response.status}`)
    
    const result = await response.json()
    const price = result.bpi.USD.rate_float
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
}

// Export singleton instance
export const bitcoinApiService = new BitcoinApiService()
