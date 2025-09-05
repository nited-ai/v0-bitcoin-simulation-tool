/**
 * Multi-API Bitcoin Price Data Retrieval System
 * Implements multiple APIs with rate limiting and automatic failover
 */

export interface BitcoinPriceData {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  source: string
}

export interface ApiProvider {
  name: string
  priority: number
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour?: number
    requestsPerDay?: number
  }
  lastRequestTime: number
  requestCount: {
    minute: number
    hour: number
    day: number
  }
  resetTimes: {
    minute: number
    hour: number
    day: number
  }
}

export interface ApiResponse {
  success: boolean
  data: BitcoinPriceData[]
  source: string
  error?: string
  rateLimited?: boolean
}

export class MultiApiBitcoinService {
  private providers: Map<string, ApiProvider> = new Map()

  constructor() {
    this.initializeProviders()
  }

  /**
   * Initialize API providers with their configurations
   */
  private initializeProviders(): void {
    const now = Date.now()

    // CoinGecko API (Primary)
    this.providers.set('coingecko', {
      name: 'CoinGecko',
      priority: 1,
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerHour: 500,
        requestsPerDay: 10000
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // Binance API (Secondary)
    this.providers.set('binance', {
      name: 'Binance',
      priority: 2,
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerHour: 1200
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // CoinCap API (Tertiary)
    this.providers.set('coincap', {
      name: 'CoinCap',
      priority: 3,
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerHour: 200
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // CryptoCompare API (Backup)
    this.providers.set('cryptocompare', {
      name: 'CryptoCompare',
      priority: 4,
      rateLimit: {
        requestsPerMinute: 15,
        requestsPerHour: 300,
        requestsPerDay: 2000
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // Yahoo Finance API (Additional)
    this.providers.set('yahoo', {
      name: 'Yahoo Finance',
      priority: 5,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 1000
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // CoinMarketCap API (Additional)
    this.providers.set('coinmarketcap', {
      name: 'CoinMarketCap',
      priority: 6,
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerHour: 333,
        requestsPerDay: 10000
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // Messari API (Additional)
    this.providers.set('messari', {
      name: 'Messari',
      priority: 7,
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerHour: 500
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    // CoinDesk API (Additional with API Key)
    this.providers.set('coindesk', {
      name: 'CoinDesk',
      priority: 8,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      lastRequestTime: 0,
      requestCount: { minute: 0, hour: 0, day: 0 },
      resetTimes: { minute: now, hour: now, day: now }
    })

    console.log(`🔧 Initialized ${this.providers.size} API providers`)
  }

  /**
   * Fetch Bitcoin price data for a date range with automatic failover
   */
  async fetchPriceData(startDate: string, endDate: string): Promise<ApiResponse> {
    console.log(`📡 Fetching Bitcoin price data from ${startDate} to ${endDate}`)

    // Sort providers by priority
    const sortedProviders = Array.from(this.providers.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)

    for (const [providerId, provider] of sortedProviders) {
      try {
        // Check rate limits
        if (!this.canMakeRequest(providerId)) {
          console.log(`⏳ ${provider.name} rate limited, trying next provider`)
          continue
        }

        console.log(`🔄 Trying ${provider.name} API...`)

        // Make API request
        const response = await this.makeApiRequest(providerId, startDate, endDate)

        if (response.success && response.data.length > 0) {
          console.log(`✅ ${provider.name} returned ${response.data.length} records`)
          return response
        } else {
          console.log(`⚠️ ${provider.name} returned no data, trying next provider`)
        }

      } catch (error) {
        console.error(`❌ ${provider.name} API error:`, error)
        continue
      }
    }

    return {
      success: false,
      data: [],
      source: 'none',
      error: 'All API providers failed or are rate limited'
    }
  }

  /**
   * Check if we can make a request to the specified provider
   */
  private canMakeRequest(providerId: string): boolean {
    const provider = this.providers.get(providerId)
    if (!provider) return false

    const now = Date.now()

    // Reset counters if time windows have passed
    if (now - provider.resetTimes.minute >= 60000) {
      provider.requestCount.minute = 0
      provider.resetTimes.minute = now
    }
    if (now - provider.resetTimes.hour >= 3600000) {
      provider.requestCount.hour = 0
      provider.resetTimes.hour = now
    }
    if (now - provider.resetTimes.day >= 86400000) {
      provider.requestCount.day = 0
      provider.resetTimes.day = now
    }

    // Check rate limits
    if (provider.requestCount.minute >= provider.rateLimit.requestsPerMinute) {
      return false
    }
    if (provider.rateLimit.requestsPerHour && provider.requestCount.hour >= provider.rateLimit.requestsPerHour) {
      return false
    }
    if (provider.rateLimit.requestsPerDay && provider.requestCount.day >= provider.rateLimit.requestsPerDay) {
      return false
    }

    // Ensure minimum time between requests (avoid hitting rate limits)
    const minInterval = 60000 / provider.rateLimit.requestsPerMinute // ms between requests
    if (now - provider.lastRequestTime < minInterval) {
      return false
    }

    return true
  }

  /**
   * Make API request to specific provider
   */
  private async makeApiRequest(providerId: string, startDate: string, endDate: string): Promise<ApiResponse> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    // Update request tracking
    const now = Date.now()
    provider.lastRequestTime = now
    provider.requestCount.minute++
    provider.requestCount.hour++
    provider.requestCount.day++

    switch (providerId) {
      case 'coingecko':
        return await this.fetchFromCoinGecko(startDate, endDate)
      case 'binance':
        return await this.fetchFromBinance(startDate, endDate)
      case 'coincap':
        return await this.fetchFromCoinCap(startDate, endDate)
      case 'cryptocompare':
        return await this.fetchFromCryptoCompare(startDate, endDate)
      case 'yahoo':
        return await this.fetchFromYahoo(startDate, endDate)
      case 'coinmarketcap':
        return await this.fetchFromCoinMarketCap(startDate, endDate)
      case 'messari':
        return await this.fetchFromMessari(startDate, endDate)
      case 'coindesk':
        return await this.fetchFromCoinDesk(startDate, endDate)
      default:
        throw new Error(`Unknown provider: ${providerId}`)
    }
  }

  /**
   * Fetch data from CoinGecko API
   */
  private async fetchFromCoinGecko(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)

      const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.prices || data.prices.length === 0) {
        return { success: false, data: [], source: 'coingecko', error: 'No price data returned' }
      }

      // Convert CoinGecko data format
      const priceData: BitcoinPriceData[] = []
      const priceMap = new Map<string, any>()

      // Group data by date
      data.prices.forEach(([timestamp, price]: [number, number]) => {
        const date = new Date(timestamp).toISOString().split('T')[0]
        if (!priceMap.has(date)) {
          priceMap.set(date, { prices: [], volumes: [], timestamps: [] })
        }
        priceMap.get(date).prices.push(price)
        priceMap.get(date).timestamps.push(timestamp)
      })

      // Add volume data if available
      if (data.total_volumes) {
        data.total_volumes.forEach(([timestamp, volume]: [number, number]) => {
          const date = new Date(timestamp).toISOString().split('T')[0]
          if (priceMap.has(date)) {
            priceMap.get(date).volumes.push(volume)
          }
        })
      }

      // Convert to our format
      for (const [date, dayData] of priceMap.entries()) {
        if (dayData.prices.length > 0) {
          const prices = dayData.prices.sort((a: number, b: number) => a - b)
          const volume = dayData.volumes.length > 0 ? dayData.volumes[dayData.volumes.length - 1] : 0

          priceData.push({
            date,
            timestamp: dayData.timestamps[0],
            open: prices[0],
            high: Math.max(...prices),
            low: Math.min(...prices),
            close: prices[prices.length - 1],
            volume,
            source: 'coingecko'
          })
        }
      }

      return {
        success: true,
        data: priceData.sort((a, b) => a.date.localeCompare(b.date)),
        source: 'coingecko'
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'coingecko',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from Binance API
   */
  private async fetchFromBinance(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const startTime = new Date(startDate).getTime()
      const endTime = new Date(endDate).getTime()

      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1000`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data) || data.length === 0) {
        return { success: false, data: [], source: 'binance', error: 'No kline data returned' }
      }

      // Convert Binance kline format
      const priceData: BitcoinPriceData[] = data.map((kline: any[]) => ({
        date: new Date(kline[0]).toISOString().split('T')[0],
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        source: 'binance'
      }))

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
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from CoinCap API with API Key
   */
  private async fetchFromCoinCap(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const startTimestamp = new Date(startDate).getTime()
      const endTimestamp = new Date(endDate).getTime()

      // Use CoinCap's candles endpoint for OHLCV data with API key
      const url = `https://api.coincap.io/v2/candles?exchange=binance&interval=d1&baseId=bitcoin&quoteId=tether&start=${startTimestamp}&end=${endTimestamp}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer 1566c56f-f8a4-43b9-8d62-20e5105c298b`,
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        // Fallback to assets endpoint if candles fail
        console.log(`⚠️ CoinCap candles endpoint failed (${response.status}), trying assets endpoint...`)
        return await this.fetchFromCoinCapAssets(startDate, endDate)
      }

      const data = await response.json()

      if (!data.data || data.data.length === 0) {
        console.log('⚠️ CoinCap candles returned no data, trying assets endpoint...')
        return await this.fetchFromCoinCapAssets(startDate, endDate)
      }

      // Convert CoinCap candles data format (OHLCV available)
      const priceData: BitcoinPriceData[] = data.data.map((item: any) => ({
        date: new Date(item.period).toISOString().split('T')[0],
        timestamp: new Date(item.period).getTime(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume) || 0,
        source: 'coincap'
      }))

      return {
        success: true,
        data: priceData,
        source: 'coincap'
      }

    } catch (error) {
      console.log('⚠️ CoinCap candles endpoint error, trying assets endpoint...')
      return await this.fetchFromCoinCapAssets(startDate, endDate)
    }
  }

  /**
   * Fallback CoinCap Assets endpoint (price only, no OHLCV)
   */
  private async fetchFromCoinCapAssets(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const startTimestamp = new Date(startDate).getTime()
      const endTimestamp = new Date(endDate).getTime()

      const url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${startTimestamp}&end=${endTimestamp}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer 1566c56f-f8a4-43b9-8d62-20e5105c298b`,
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CoinCap Assets API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.data || data.data.length === 0) {
        return { success: false, data: [], source: 'coincap', error: 'No price data returned from assets endpoint' }
      }

      // Convert CoinCap assets data format (price only)
      const priceData: BitcoinPriceData[] = data.data.map((item: any) => ({
        date: new Date(item.time).toISOString().split('T')[0],
        timestamp: item.time,
        open: parseFloat(item.priceUsd),
        high: parseFloat(item.priceUsd), // Assets endpoint doesn't provide OHLC
        low: parseFloat(item.priceUsd),
        close: parseFloat(item.priceUsd),
        volume: 0, // Assets endpoint doesn't provide volume
        source: 'coincap'
      }))

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
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from CryptoCompare API
   */
  private async fetchFromCryptoCompare(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const days = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60))

      const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${Math.min(days, 2000)}&toTs=${endTimestamp}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CryptoCompare API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.Data?.Data || data.Data.Data.length === 0) {
        return { success: false, data: [], source: 'cryptocompare', error: 'No price data returned' }
      }

      // Convert CryptoCompare data format and filter by date range
      const priceData: BitcoinPriceData[] = data.Data.Data
        .filter((item: any) => {
          const itemDate = new Date(item.time * 1000).toISOString().split('T')[0]
          return itemDate >= startDate && itemDate <= endDate
        })
        .map((item: any) => ({
          date: new Date(item.time * 1000).toISOString().split('T')[0],
          timestamp: item.time * 1000,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volumeto || 0,
          source: 'cryptocompare'
        }))

      return {
        success: true,
        data: priceData,
        source: 'cryptocompare'
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'cryptocompare',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from Yahoo Finance API
   */
  private async fetchFromYahoo(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.chart?.result?.[0]?.indicators?.quote?.[0]) {
        return { success: false, data: [], source: 'yahoo', error: 'No price data returned' }
      }

      const result = data.chart.result[0]
      const timestamps = result.timestamp
      const quotes = result.indicators.quote[0]

      // Convert Yahoo Finance data format
      const priceData: BitcoinPriceData[] = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        timestamp: timestamp * 1000,
        open: quotes.open[index] || quotes.close[index],
        high: quotes.high[index] || quotes.close[index],
        low: quotes.low[index] || quotes.close[index],
        close: quotes.close[index],
        volume: quotes.volume[index] || 0,
        source: 'yahoo'
      })).filter((item: any) => item.close !== null && !isNaN(item.close))

      return {
        success: true,
        data: priceData,
        source: 'yahoo'
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'yahoo',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from CoinMarketCap API (free tier)
   */
  private async fetchFromCoinMarketCap(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      // CoinMarketCap free tier has limited historical data access
      // Using their quotes endpoint for recent data
      const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC'

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-CMC_PRO_API_KEY': 'demo-key', // Would need real API key
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`)
      }

      // For now, return empty as we'd need API key for full access
      return {
        success: false,
        data: [],
        source: 'coinmarketcap',
        error: 'CoinMarketCap requires API key for historical data'
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'coinmarketcap',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from Messari API (requires API key for full access)
   */
  private async fetchFromMessari(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      // Try with API key first (if available in environment)
      const apiKey = process.env.MESSARI_API_KEY

      if (apiKey) {
        console.log('🔑 Trying Messari API with API key...')
        return await this.fetchFromMessariWithKey(startDate, endDate, apiKey)
      } else {
        console.log('⚠️ No Messari API key found, trying public endpoint...')
        return await this.fetchFromMessariPublic(startDate, endDate)
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'messari',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch from Messari with API key
   */
  private async fetchFromMessariWithKey(startDate: string, endDate: string, apiKey: string): Promise<ApiResponse> {
    try {
      const url = `https://data.messari.io/api/v1/assets/bitcoin/metrics/price/time-series?start=${startDate}&end=${endDate}&interval=1d`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-messari-api-key': apiKey,
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        console.log(`⚠️ Messari with API key failed (${response.status}), trying public endpoint...`)
        return await this.fetchFromMessariPublic(startDate, endDate)
      }

      const data = await response.json()

      if (!data.data?.values || data.data.values.length === 0) {
        return await this.fetchFromMessariPublic(startDate, endDate)
      }

      // Convert Messari data format
      const priceData: BitcoinPriceData[] = data.data.values.map((item: any) => ({
        date: new Date(item[0]).toISOString().split('T')[0],
        timestamp: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5] || 0,
        source: 'messari'
      }))

      return {
        success: true,
        data: priceData,
        source: 'messari'
      }

    } catch (error) {
      console.log('⚠️ Messari with API key error, trying public endpoint...')
      return await this.fetchFromMessariPublic(startDate, endDate)
    }
  }

  /**
   * Fallback Messari public endpoint (limited access)
   */
  private async fetchFromMessariPublic(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const url = `https://data.messari.io/api/v1/assets/bitcoin/metrics/price/time-series?start=${startDate}&end=${endDate}&interval=1d`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Messari public API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.data?.values || data.data.values.length === 0) {
        return { success: false, data: [], source: 'messari', error: 'No price data returned from public endpoint' }
      }

      // Convert Messari data format
      const priceData: BitcoinPriceData[] = data.data.values.map((item: any) => ({
        date: new Date(item[0]).toISOString().split('T')[0],
        timestamp: item[0],
        open: item[1] || item[4], // Use close if open not available
        high: item[2] || item[4],
        low: item[3] || item[4],
        close: item[4],
        volume: item[5] || 0,
        source: 'messari'
      }))

      return {
        success: true,
        data: priceData,
        source: 'messari'
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'messari',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Fetch data from CoinDesk API with API Key
   */
  private async fetchFromCoinDesk(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      // CoinDesk API uses different date format (YYYY-MM-DD)
      const url = `https://api.coindesk.com/v1/bpi/historical/close.json?start=${startDate}&end=${endDate}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer 3e9ba37b23ad618af9308dfea087cd26884b1a91c666c514403cc4e41103343e`,
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        // Try without API key as CoinDesk might not require it for historical data
        console.log(`⚠️ CoinDesk with API key failed (${response.status}), trying without key...`)
        return await this.fetchFromCoinDeskPublic(startDate, endDate)
      }

      const data = await response.json()

      if (!data.bpi || Object.keys(data.bpi).length === 0) {
        return { success: false, data: [], source: 'coindesk', error: 'No price data returned' }
      }

      // Convert CoinDesk data format
      const priceData: BitcoinPriceData[] = Object.entries(data.bpi).map(([dateStr, price]) => ({
        date: dateStr,
        timestamp: new Date(dateStr).getTime(),
        open: parseFloat(price as string),
        high: parseFloat(price as string), // CoinDesk only provides close price
        low: parseFloat(price as string),
        close: parseFloat(price as string),
        volume: 0, // CoinDesk doesn't provide volume
        source: 'coindesk'
      }))

      return {
        success: true,
        data: priceData,
        source: 'coindesk'
      }

    } catch (error) {
      console.log('⚠️ CoinDesk with API key error, trying public endpoint...')
      return await this.fetchFromCoinDeskPublic(startDate, endDate)
    }
  }

  /**
   * Fallback CoinDesk public endpoint (no API key required)
   */
  private async fetchFromCoinDeskPublic(startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const url = `https://api.coindesk.com/v1/bpi/historical/close.json?start=${startDate}&end=${endDate}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CoinDesk public API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.bpi || Object.keys(data.bpi).length === 0) {
        return { success: false, data: [], source: 'coindesk', error: 'No price data returned from public endpoint' }
      }

      // Convert CoinDesk data format
      const priceData: BitcoinPriceData[] = Object.entries(data.bpi).map(([dateStr, price]) => ({
        date: dateStr,
        timestamp: new Date(dateStr).getTime(),
        open: parseFloat(price as string),
        high: parseFloat(price as string), // CoinDesk only provides close price
        low: parseFloat(price as string),
        close: parseFloat(price as string),
        volume: 0, // CoinDesk doesn't provide volume
        source: 'coindesk'
      }))

      return {
        success: true,
        data: priceData,
        source: 'coindesk'
      }

    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'coindesk',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get provider status information
   */
  getProviderStatus(): Record<string, any> {
    const status: Record<string, any> = {}

    for (const [id, provider] of this.providers.entries()) {
      status[id] = {
        name: provider.name,
        priority: provider.priority,
        canMakeRequest: this.canMakeRequest(id),
        requestCount: { ...provider.requestCount },
        rateLimit: { ...provider.rateLimit }
      }
    }

    return status
  }
}

// Export singleton instance
export const multiApiBitcoinService = new MultiApiBitcoinService()
