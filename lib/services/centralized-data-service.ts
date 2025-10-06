/**
 * Centralized Data Service
 * 
 * Single source of truth for all Bitcoin price data in the application.
 * Eliminates redundant data loading, multiple caching layers, and CSV fallbacks.
 * 
 * Architecture:
 * - Historical data: Load once from static JSON files on app initialization
 * - Current price: Fetch fresh from external APIs on every request
 * - Daily updates: Automated background job to update JSON files
 * - Global state: Share loaded data across all components and price models
 */

import { enhancedBitcoinApiService } from './bitcoin-api-service'
import { bitcoinJsonDataService } from './bitcoin-json-data-service'
import { athService, type ATHData } from './ath-service'

// Types
export interface HistoricalDataPoint {
  time: number        // Unix timestamp in seconds (for chart compatibility)
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
  ath: number | null
  athData: ATHData | null
  isHistoricalDataLoaded: boolean
  isLoadingHistoricalData: boolean
  isATHLoaded: boolean
  lastHistoricalDataLoad: number
  errors: string[]
  isInitializing: boolean // Flag to prevent premature notifications during initialization
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
    ath: null,
    athData: null,
    isHistoricalDataLoaded: false,
    isLoadingHistoricalData: false,
    isATHLoaded: false,
    lastHistoricalDataLoad: 0,
    errors: [],
    isInitializing: false
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
   * Skip notifications during initialization to prevent duplicate chart generations
   */
  private notifySubscribers(force: boolean = false): void {
    // Don't notify subscribers during initialization to prevent duplicate chart generations
    // unless forced (for direct data loading calls)
    if (this.state.isInitializing && !force) {
      return
    }

    this.subscribers.forEach(callback => callback(this.state))
  }
  
  /**
   * Get current state (read-only)
   */
  getState(): Readonly<DataServiceState> {
    return { ...this.state }
  }
  
  /**
   * Load historical data from JSON files
   * This should be called once on app initialization
   * Uses weekly data by default for better performance
   */
  async loadHistoricalData(force: boolean = false, interval: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<HistoricalDataPoint[]> {
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
      console.log(`📊 Loading historical data from JSON files (${interval} interval)...`)
      const startTime = performance.now()

      // Load data using JSON data service
      const historicalData = await bitcoinJsonDataService.loadHistoricalData(interval)

      // Filter data from 2013 onwards (Bitcoin's meaningful price history)
      const year2013 = new Date('2013-01-01').getTime() / 1000 // Convert to seconds
      const filteredData = historicalData.filter(point => point.time >= year2013)

      const loadTime = performance.now() - startTime
      console.log(`✅ Historical data loaded: ${filteredData.length} points (${interval}) in ${Math.round(loadTime)}ms`)

      // Update state
      this.state.historicalData = filteredData
      this.state.isHistoricalDataLoaded = true
      this.state.lastHistoricalDataLoad = Date.now()
      this.state.isLoadingHistoricalData = false

      // Force notification if this is a direct call (not during initialization)
      const forceNotification = !this.state.isInitializing
      this.notifySubscribers(forceNotification)
      return filteredData
      
    } catch (error) {
      console.error('❌ Failed to load historical data from JSON files:', error)

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
   * Loads both historical data AND current price before notifying components
   */
  async initialize(): Promise<void> {
    // Guard against multiple initializations
    if (this.state.isInitializing) {
      console.log('⚠️ Centralized Data Service is already initializing...')
      return
    }

    if (this.state.isHistoricalDataLoaded && this.state.currentPrice) {
      console.log('✅ Centralized Data Service already initialized')
      return
    }

    console.log('🚀 Initializing Centralized Data Service...')

    // Set initialization flag to prevent premature notifications
    this.state.isInitializing = true

    try {
      // Load historical data first
      console.log('📊 Loading historical data...')
      await this.loadHistoricalData()

      // Load ATH data
      console.log('📈 Loading ATH data...')
      try {
        const athValue = await athService.getCurrentATH()
        const athDataFull = await athService.getATHData()
        this.state.ath = athValue
        this.state.athData = athDataFull
        this.state.isATHLoaded = true
        console.log(`✅ ATH data loaded: $${athValue}`)
      } catch (error) {
        console.warn('⚠️ Could not fetch ATH during initialization, using fallback:', error)
        this.state.ath = 124277.98 // Fallback ATH
        this.state.athData = null
        this.state.isATHLoaded = true
      }

      // Load current price synchronously to prevent duplicate chart generations
      console.log('💰 Loading current price...')
      try {
        await this.getCurrentPrice()
        console.log('✅ Historical data, ATH, and current price loaded successfully')
      } catch (error) {
        console.warn('⚠️ Could not fetch current price during initialization, using latest historical price:', error)
        // Set current price to latest historical price as fallback
        const latestPrice = this.getLatestHistoricalPrice()
        if (latestPrice) {
          this.state.currentPrice = {
            price: latestPrice,
            timestamp: Date.now(),
            source: 'historical_fallback',
            lastUpdated: new Date().toISOString()
          }
          console.log(`📈 Using latest historical price as current price: $${latestPrice}`)
        }
      }

      // Initialization complete - now notify subscribers with complete data
      this.state.isInitializing = false
      console.log('✅ Centralized Data Service initialized successfully - notifying subscribers')
      this.notifySubscribers()

    } catch (error) {
      console.error('❌ Failed to initialize Centralized Data Service:', error)
      this.state.isInitializing = false
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
      ath: null,
      athData: null,
      isHistoricalDataLoaded: false,
      isLoadingHistoricalData: false,
      isATHLoaded: false,
      lastHistoricalDataLoad: 0,
      errors: [],
      isInitializing: false
    }

    // Also clear JSON data service cache
    bitcoinJsonDataService.clearCache()

    this.notifySubscribers()
  }

  /**
   * Clear state (alias for reset for backward compatibility)
   */
  clearState(): void {
    this.reset()
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { interval: string; points: number; size: string }[] {
    return bitcoinJsonDataService.getCacheStatus()
  }

  /**
   * Unsubscribe a specific callback (for backward compatibility)
   */
  unsubscribe(callback: (state: DataServiceState) => void): void {
    this.subscribers.delete(callback)
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
