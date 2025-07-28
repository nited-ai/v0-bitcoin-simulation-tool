/**
 * Bitcoin API Service for fetching historical price data
 * Supports multiple APIs with fallback mechanisms to fill data gaps
 */

export interface BitcoinPriceData {
  date: string          // YYYY-MM-DD format
  timestamp: number     // Unix timestamp in milliseconds
  open: number
  high: number
  low: number
  close: number
  volume?: number
  source: string
}

export interface DateRange {
  start: string         // YYYY-MM-DD format
  end: string           // YYYY-MM-DD format
}

export interface ApiResponse {
  success: boolean
  data: BitcoinPriceData[]
  source: string
  error?: string
  rateLimitReset?: number
}

/**
 * Bitcoin API Service with multiple provider support
 */
export class BitcoinApiService {
  private static instance: BitcoinApiService
  private rateLimits: Map<string, number> = new Map()

  static getInstance(): BitcoinApiService {
    if (!BitcoinApiService.instance) {
      BitcoinApiService.instance = new BitcoinApiService()
    }
    return BitcoinApiService.instance
  }

  /**
   * Fetch historical Bitcoin price data for a date range
   */
  async fetchHistoricalData(dateRange: DateRange): Promise<ApiResponse> {
    console.log(`🔍 Fetching historical data from ${dateRange.start} to ${dateRange.end}`)

    // Try multiple APIs in order of preference
    const apis = [
      () => this.fetchFromCoinGecko(dateRange),
      () => this.fetchFromCoinCap(dateRange),
      () => this.fetchFromBinance(dateRange)
    ]

    for (const apiCall of apis) {
      try {
        const result = await apiCall()
        if (result.success && result.data.length > 0) {
          console.log(`✅ Successfully fetched ${result.data.length} records from ${result.source}`)
          return result
        }
      } catch (error) {
        console.warn(`⚠️ API call failed:`, error)
        continue
      }
    }

    return {
      success: false,
      data: [],
      source: 'none',
      error: 'All API sources failed'
    }
  }

  /**
   * Fetch current Bitcoin price
   */
  async fetchCurrentPrice(): Promise<BitcoinPriceData | null> {
    try {
      // Try CoinGecko first for current price
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }

      const data = await response.json()
      const price = data.bitcoin?.usd

      if (!price) {
        throw new Error('Invalid price data from CoinGecko')
      }

      const now = new Date()
      const today = now.toISOString().split('T')[0]

      return {
        date: today,
        timestamp: now.getTime(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: undefined,
        source: 'coingecko-current'
      }
    } catch (error) {
      console.error('❌ Failed to fetch current price:', error)
      return null
    }
  }

  /**
   * Fetch from CoinGecko API (preferred for historical data)
   */
  private async fetchFromCoinGecko(dateRange: DateRange): Promise<ApiResponse> {
    if (this.isRateLimited('coingecko')) {
      throw new Error('CoinGecko rate limited')
    }

    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // CoinGecko has different endpoints for different time ranges
    let url: string
    if (daysDiff <= 1) {
      // For single day, use hourly data
      const timestamp = Math.floor(startDate.getTime() / 1000)
      url = `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${startDate.toISOString().split('T')[0]}`
    } else if (daysDiff <= 90) {
      // For up to 90 days, use daily data
      url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${Math.floor(startDate.getTime() / 1000)}&to=${Math.floor(endDate.getTime() / 1000)}`
    } else {
      // For longer periods, split into chunks
      return this.fetchLongRangeData(dateRange, 'coingecko')
    }

    try {
      const response = await fetch(url)
      
      if (response.status === 429) {
        this.setRateLimit('coingecko', 60) // 1 minute cooldown
        throw new Error('Rate limited')
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const priceData = this.parseCoinGeckoResponse(data, dateRange)

      return {
        success: true,
        data: priceData,
        source: 'coingecko'
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'coingecko',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetch from CoinCap API (backup)
   */
  private async fetchFromCoinCap(dateRange: DateRange): Promise<ApiResponse> {
    if (this.isRateLimited('coincap')) {
      throw new Error('CoinCap rate limited')
    }

    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    const url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${startDate.getTime()}&end=${endDate.getTime()}`

    try {
      const response = await fetch(url)
      
      if (response.status === 429) {
        this.setRateLimit('coincap', 60)
        throw new Error('Rate limited')
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const priceData = this.parseCoinCapResponse(data, dateRange)

      return {
        success: true,
        data: priceData,
        source: 'coincap'
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'coincap',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetch from Binance API (backup)
   */
  private async fetchFromBinance(dateRange: DateRange): Promise<ApiResponse> {
    if (this.isRateLimited('binance')) {
      throw new Error('Binance rate limited')
    }

    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    // Binance uses different intervals - use 1d for daily data
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startDate.getTime()}&endTime=${endDate.getTime()}&limit=1000`

    try {
      const response = await fetch(url)
      
      if (response.status === 429) {
        this.setRateLimit('binance', 60)
        throw new Error('Rate limited')
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const priceData = this.parseBinanceResponse(data, dateRange)

      return {
        success: true,
        data: priceData,
        source: 'binance'
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'binance',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Handle long date ranges by splitting into chunks
   */
  private async fetchLongRangeData(dateRange: DateRange, source: string): Promise<ApiResponse> {
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const allData: BitcoinPriceData[] = []

    // Split into 90-day chunks
    let currentStart = new Date(startDate)
    
    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + 89) // 90 days
      
      if (currentEnd > endDate) {
        currentEnd.setTime(endDate.getTime())
      }

      const chunkRange: DateRange = {
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      }

      console.log(`📦 Fetching chunk: ${chunkRange.start} to ${chunkRange.end}`)

      const chunkResult = await this.fetchFromCoinGecko(chunkRange)
      if (chunkResult.success) {
        allData.push(...chunkResult.data)
      }

      // Move to next chunk
      currentStart.setDate(currentStart.getDate() + 90)
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: allData.length > 0,
      data: allData,
      source: source
    }
  }

  /**
   * Parse CoinGecko API response
   */
  private parseCoinGeckoResponse(data: any, dateRange: DateRange): BitcoinPriceData[] {
    const results: BitcoinPriceData[] = []

    if (data.prices && Array.isArray(data.prices)) {
      // Market chart format
      for (let i = 0; i < data.prices.length; i++) {
        const timestamp = data.prices[i][0]
        const close = data.prices[i][1]
        const date = new Date(timestamp)
        
        results.push({
          date: date.toISOString().split('T')[0],
          timestamp: timestamp,
          open: close, // CoinGecko doesn't provide OHLC in this format
          high: close,
          low: close,
          close: close,
          volume: undefined,
          source: 'coingecko'
        })
      }
    } else if (data.market_data) {
      // Single day history format
      const date = new Date(dateRange.start)
      const price = data.market_data.current_price?.usd
      
      if (price) {
        results.push({
          date: dateRange.start,
          timestamp: date.getTime(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: undefined,
          source: 'coingecko'
        })
      }
    }

    return results
  }

  /**
   * Parse CoinCap API response
   */
  private parseCoinCapResponse(data: any, dateRange: DateRange): BitcoinPriceData[] {
    const results: BitcoinPriceData[] = []

    if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        const timestamp = parseInt(item.time)
        const price = parseFloat(item.priceUsd)
        const date = new Date(timestamp)

        results.push({
          date: date.toISOString().split('T')[0],
          timestamp: timestamp,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: undefined,
          source: 'coincap'
        })
      }
    }

    return results
  }

  /**
   * Parse Binance API response
   */
  private parseBinanceResponse(data: any, dateRange: DateRange): BitcoinPriceData[] {
    const results: BitcoinPriceData[] = []

    if (Array.isArray(data)) {
      for (const kline of data) {
        const timestamp = parseInt(kline[0])
        const open = parseFloat(kline[1])
        const high = parseFloat(kline[2])
        const low = parseFloat(kline[3])
        const close = parseFloat(kline[4])
        const volume = parseFloat(kline[5])
        const date = new Date(timestamp)

        results.push({
          date: date.toISOString().split('T')[0],
          timestamp: timestamp,
          open: open,
          high: high,
          low: low,
          close: close,
          volume: volume,
          source: 'binance'
        })
      }
    }

    return results
  }

  /**
   * Rate limiting helpers
   */
  private isRateLimited(source: string): boolean {
    const resetTime = this.rateLimits.get(source)
    if (!resetTime) return false
    
    return Date.now() < resetTime
  }

  private setRateLimit(source: string, seconds: number): void {
    this.rateLimits.set(source, Date.now() + (seconds * 1000))
  }

  /**
   * Generate date ranges for missing data
   */
  static generateDateRanges(startDate: string, endDate: string, chunkSizeDays: number = 90): DateRange[] {
    const ranges: DateRange[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    let currentStart = new Date(start)
    
    while (currentStart < end) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + chunkSizeDays - 1)
      
      if (currentEnd > end) {
        currentEnd.setTime(end.getTime())
      }

      ranges.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      })

      currentStart.setDate(currentStart.getDate() + chunkSizeDays)
    }

    return ranges
  }
}

export const bitcoinApiService = BitcoinApiService.getInstance()
