/**
 * Centralized Data Service
 * 
 * Single source of truth for all Bitcoin price data in the application.
 * Eliminates redundant data loading, multiple caching layers, and CSV fallbacks.
 * 
 * Architecture:
 * - Historical data: Load once from PostgreSQL database on app initialization
 * - Current price: Fetch fresh from external APIs on every request
 * - Daily updates: Automated background job to update database
 * - Global state: Share loaded data across all components and price models
 */

import { enhancedBitcoinApiService } from './bitcoin-api-service'

// Types
export interface HistoricalDataPoint {
  timestamp: number    // Unix timestamp in milliseconds
  date: string        // YYYY-MM-DD format
  open: number        // Opening price in USD
  high: number        // Highest price in USD
  low: number         // Lowest price in USD
  close: number       // Closing price in USD
  volume?: number     // Optional volume data
  source?: string     // Data source identifier
}

export interface CurrentPriceData {
  price: number
  timestamp: number
  source: string
  lastUpdated: string
}

export interface DataServiceState {
  historicalData: HistoricalDataPoint[]
  currentPrice: CurrentPriceData | null
  isHistoricalDataLoaded: boolean
  isLoadingHistoricalData: boolean
  lastHistoricalDataLoad: number
  errors: string[]
}

/**
 * Centralized Data Service Class
 * Singleton pattern to ensure single instance across the application
 */
class CentralizedDataService {
  private static instance: CentralizedDataService
  private state: DataServiceState = {
    historicalData: [],
    currentPrice: null,
    isHistoricalDataLoaded: false,
    isLoadingHistoricalData: false,
    lastHistoricalDataLoad: 0,
    errors: []
  }
  
  private subscribers: Set<(state: DataServiceState) => void> = new Set()
  
  private constructor() {
    console.log('🏗️ Initializing Centralized Data Service')
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): CentralizedDataService {
    if (!CentralizedDataService.instance) {
      CentralizedDataService.instance = new CentralizedDataService()
    }
    return CentralizedDataService.instance
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: DataServiceState) => void): () => void {
    this.subscribers.add(callback)
    // Immediately call with current state
    callback(this.state)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }
  
  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.state))
  }
  
  /**
   * Get current state (read-only)
   */
  getState(): Readonly<DataServiceState> {
    return { ...this.state }
  }
  
  /**
   * Load historical data from PostgreSQL database
   * This should be called once on app initialization
   */
  async loadHistoricalData(force: boolean = false): Promise<HistoricalDataPoint[]> {
    // Prevent multiple simultaneous loads
    if (this.state.isLoadingHistoricalData && !force) {
      console.log('📊 Historical data load already in progress, waiting...')
      return this.waitForHistoricalDataLoad()
    }
    
    // Return cached data if already loaded and not forced
    if (this.state.isHistoricalDataLoaded && !force) {
      console.log(`📦 Using cached historical data: ${this.state.historicalData.length} points`)
      return this.state.historicalData
    }
    
    this.state.isLoadingHistoricalData = true
    this.state.errors = []
    this.notifySubscribers()
    
    try {
      console.log('📊 Loading historical data from PostgreSQL database...')
      const startTime = performance.now()
      
      // Fetch from database API
      const response = await fetch('/api/bitcoin-prices/historical')
      
      if (!response.ok) {
        throw new Error(`Database API error: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from database API')
      }
      
      // Transform database records to application format
      const historicalData: HistoricalDataPoint[] = result.data.map((record: any) => ({
        timestamp: record.timestamp,
        date: record.date,
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        volume: record.volume,
        source: record.source || 'database'
      }))
      
      // Filter data from 2013 onwards (Bitcoin's meaningful price history)
      const year2013 = new Date('2013-01-01').getTime()
      const filteredData = historicalData.filter(point => point.timestamp >= year2013)
      
      const loadTime = performance.now() - startTime
      console.log(`✅ Historical data loaded: ${filteredData.length} points in ${Math.round(loadTime)}ms`)
      
      // Update state
      this.state.historicalData = filteredData
      this.state.isHistoricalDataLoaded = true
      this.state.lastHistoricalDataLoad = Date.now()
      this.state.isLoadingHistoricalData = false
      
      this.notifySubscribers()
      return filteredData
      
    } catch (error) {
      console.error('❌ Failed to load historical data from database:', error)
      
      this.state.errors.push(`Failed to load historical data: ${error instanceof Error ? error.message : String(error)}`)
      this.state.isLoadingHistoricalData = false
      
      this.notifySubscribers()
      throw error
    }
  }
  
  /**
   * Wait for ongoing historical data load to complete
   */
  private async waitForHistoricalDataLoad(): Promise<HistoricalDataPoint[]> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!this.state.isLoadingHistoricalData) {
          clearInterval(checkInterval)
          if (this.state.isHistoricalDataLoaded) {
            resolve(this.state.historicalData)
          } else {
            reject(new Error('Historical data load failed'))
          }
        }
      }, 100)
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error('Historical data load timeout'))
      }, 30000)
    })
  }
  
  /**
   * Get current Bitcoin price from external APIs
   * Always fetches fresh data, no caching
   */
  async getCurrentPrice(): Promise<CurrentPriceData> {
    try {
      console.log('💰 Fetching current Bitcoin price from external APIs...')
      
      const response = await enhancedBitcoinApiService.fetchCurrentPrice()
      
      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error('Failed to fetch current price from external APIs')
      }
      
      const priceData = response.data[0]
      const currentPrice: CurrentPriceData = {
        price: priceData.close,
        timestamp: priceData.timestamp || Date.now(),
        source: response.source,
        lastUpdated: new Date().toISOString()
      }
      
      console.log(`✅ Current Bitcoin price: $${currentPrice.price} from ${currentPrice.source}`)
      
      // Update state
      this.state.currentPrice = currentPrice
      this.notifySubscribers()
      
      return currentPrice
      
    } catch (error) {
      console.error('❌ Failed to fetch current Bitcoin price:', error)
      
      this.state.errors.push(`Failed to fetch current price: ${error instanceof Error ? error.message : String(error)}`)
      this.notifySubscribers()
      
      throw error
    }
  }
  
  /**
   * Get the latest historical price (fallback for current price)
   */
  getLatestHistoricalPrice(): number | null {
    if (this.state.historicalData.length === 0) {
      return null
    }
    
    const latestPoint = this.state.historicalData[this.state.historicalData.length - 1]
    return latestPoint.close
  }
  
  /**
   * Initialize the data service
   * Should be called once when the app starts
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Centralized Data Service...')
    
    try {
      // Load historical data first
      await this.loadHistoricalData()
      
      // Try to get current price (non-blocking)
      this.getCurrentPrice().catch(error => {
        console.warn('⚠️ Could not fetch current price during initialization:', error)
      })
      
      console.log('✅ Centralized Data Service initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize Centralized Data Service:', error)
      throw error
    }
  }
  
  /**
   * Clear all data and reset state
   */
  reset(): void {
    console.log('🔄 Resetting Centralized Data Service...')
    
    this.state = {
      historicalData: [],
      currentPrice: null,
      isHistoricalDataLoaded: false,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: 0,
      errors: []
    }
    
    this.notifySubscribers()
  }
}

// Export singleton instance
export const centralizedDataService = CentralizedDataService.getInstance()

// Export convenience functions
export const loadHistoricalData = () => centralizedDataService.loadHistoricalData()
export const getCurrentPrice = () => centralizedDataService.getCurrentPrice()
export const getDataServiceState = () => centralizedDataService.getState()
export const subscribeToDataService = (callback: (state: DataServiceState) => void) => 
  centralizedDataService.subscribe(callback)
