/**
 * Enhanced Bitcoin Price API Service with Database Integration
 * Provides reliable OHLC data with gap detection and automatic updates
 */

import { PrismaClient } from '../generated/prisma'

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
 * Enhanced Bitcoin API service with database integration and gap detection
 */
export class EnhancedBitcoinApiService {
  private prisma: PrismaClient
  
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
    this.prisma = new PrismaClient()
  }

  /**
   * Detect gaps in Bitcoin price data
   */
  async detectDataGaps(startDate?: string, endDate?: string): Promise<GapDetectionResult> {
    const start = startDate || '2013-10-01'
    const end = endDate || new Date().toISOString().split('T')[0]

    console.log(`🔍 Detecting data gaps from ${start} to ${end}`)

    // Get all existing dates from database
    const existingRecords = await this.prisma.bitcoinPrice.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      select: { date: true },
      orderBy: { date: 'asc' }
    })

    const existingDates = new Set(existingRecords.map(r => r.date))
    const gaps: string[] = []

    // Generate all dates in range and check for gaps
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const oneDay = 24 * 60 * 60 * 1000

    for (let time = startTime; time <= endTime; time += oneDay) {
      const dateStr = new Date(time).toISOString().split('T')[0]
      if (!existingDates.has(dateStr)) {
        gaps.push(dateStr)
      }
    }

    const latestRecord = await this.prisma.bitcoinPrice.findFirst({
      orderBy: { date: 'desc' }
    })

    return {
      gaps,
      totalGaps: gaps.length,
      latestDate: latestRecord?.date || start,
      oldestGap: gaps[0],
      newestGap: gaps[gaps.length - 1]
    }
  }

  /**
   * Fill data gaps by fetching missing Bitcoin price data
   */
  async fillDataGaps(maxGapsToFill: number = 100): Promise<{
    success: boolean
    gapsFilled: number
    errors: string[]
  }> {
    console.log(`🔧 Starting gap filling process (max ${maxGapsToFill} gaps)`)

    const gapDetection = await this.detectDataGaps()
    
    if (gapDetection.totalGaps === 0) {
      console.log('✅ No gaps found, data is complete')
      return { success: true, gapsFilled: 0, errors: [] }
    }

    console.log(`📊 Found ${gapDetection.totalGaps} gaps to fill`)
    
    const gapsToFill = gapDetection.gaps.slice(0, maxGapsToFill)
    let gapsFilled = 0
    const errors: string[] = []

    // Group consecutive dates for batch fetching
    const dateRanges = this.groupConsecutiveDates(gapsToFill)
    
    for (const range of dateRanges) {
      try {
        console.log(`📡 Fetching data for range: ${range.start} to ${range.end}`)
        
        const apiResponse = await this.fetchHistoricalData(range.start, range.end)
        
        if (apiResponse.success && apiResponse.data.length > 0) {
          // Insert data into database
          const insertedCount = await this.insertPriceData(apiResponse.data, apiResponse.source)
          gapsFilled += insertedCount
          
          console.log(`✅ Filled ${insertedCount} gaps from ${apiResponse.source}`)
        } else {
          const error = `Failed to fetch data for ${range.start} to ${range.end}: ${apiResponse.error}`
          errors.push(error)
          console.error(`❌ ${error}`)
        }

        // Rate limiting
        await this.respectRateLimit(1000)
        
      } catch (error) {
        const errorMsg = `Error processing range ${range.start} to ${range.end}: ${error}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    // Log the operation
    await this.prisma.dataUpdate.create({
      data: {
        updateDate: new Date().toISOString().split('T')[0],
        recordsAdded: gapsFilled,
        recordsUpdated: 0,
        source: 'GAP_FILL',
        startDate: gapsToFill[0],
        endDate: gapsToFill[gapsToFill.length - 1],
        status: errors.length === 0 ? 'success' : 'partial',
        errorMessage: errors.length > 0 ? errors.join('; ') : null
      }
    })

    return {
      success: errors.length === 0,
      gapsFilled,
      errors
    }
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
   * Insert price data into database
   */
  private async insertPriceData(data: BitcoinPriceData[], source: string): Promise<number> {
    let insertedCount = 0
    
    for (const record of data) {
      try {
        await this.prisma.bitcoinPrice.create({
          data: {
            date: record.date,
            timestamp: record.timestamp,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            source
          }
        })
        insertedCount++
      } catch (error) {
        // Skip duplicates or other errors
        console.warn(`⚠️ Skipped record for ${record.date}:`, error)
      }
    }
    
    return insertedCount
  }

  /**
   * Group consecutive dates into ranges for efficient batch fetching
   */
  private groupConsecutiveDates(dates: string[]): Array<{ start: string; end: string }> {
    if (dates.length === 0) return []
    
    const ranges: Array<{ start: string; end: string }> = []
    let rangeStart = dates[0]
    let rangeEnd = dates[0]
    
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i])
      const previousDate = new Date(dates[i - 1])
      const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000)
      
      if (dayDiff === 1) {
        // Consecutive date, extend current range
        rangeEnd = dates[i]
      } else {
        // Gap found, close current range and start new one
        ranges.push({ start: rangeStart, end: rangeEnd })
        rangeStart = dates[i]
        rangeEnd = dates[i]
      }
    }
    
    // Add the last range
    ranges.push({ start: rangeStart, end: rangeEnd })
    
    return ranges
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

  /**
   * Cleanup database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance
export const enhancedBitcoinApiService = new EnhancedBitcoinApiService()
