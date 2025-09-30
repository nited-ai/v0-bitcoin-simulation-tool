/**
 * Price Data Service
 *
 * Main service for price data management, consolidating functionality from:
 * - lib/price-engine/index.ts
 * - lib/price-engine/historical-data-loader.ts
 * - lib/services/centralized-data-service.ts
 *
 * Provides unified interface for:
 * - Historical data loading
 * - Current price fetching
 * - Price projection generation
 * - Data caching and validation
 *
 * ⚠️ TECHNICAL DEBT WARNING:
 * This service currently bridges between two price projection systems:
 * 1. Legacy ProjectionGenerator (manual, powerLaw, cycleRepeat)
 * 2. New PriceModelRegistry (enhancedCycleRepeat)
 *
 * See docs/architecture/PRICE_PROJECTION_REFACTORING_PLAN.md for migration plan.
 * TODO: Migrate all models to PriceModelRegistry and remove ProjectionGenerator
 */

import type {
  HistoricalDataPoint,
  PriceEngineParams,
  PriceChartDataPoint,
  IPriceDataService,
  DataFetchOptions,
  CacheStats,
  PriceDataResult,
  CurrentPriceData
} from '../types'

import { DataCache } from './DataCache'
import { ProjectionGenerator } from './ProjectionGenerator'
import { ChartMerger } from './ChartMerger'
import { PerformanceMonitor } from './PerformanceMonitor'

// Temporary mock services for migration phase
// These will be replaced with internal implementations in Phase 7
const centralizedDataService = {
  loadHistoricalData: async (): Promise<HistoricalDataPoint[]> => {
    // Mock implementation - returns empty array for now
    console.warn('Using mock centralized data service')
    return []
  },
  getCurrentPrice: async () => ({
    price: 50000,
    timestamp: Date.now() / 1000,
    source: 'mock',
    lastUpdated: new Date().toISOString()
  }),
  isInitialized: () => true,
  initialize: async () => {}
}

const enhancedBitcoinApiService = {
  getCurrentPrice: async (): Promise<number> => {
    // Mock implementation - returns fixed price for now
    console.warn('Using mock bitcoin API service')
    return 50000
  },
  getHistoricalData: async (): Promise<HistoricalDataPoint[]> => [],
  isHealthy: async () => true
}

/**
 * Main Price Data Service implementation.
 * Singleton pattern to ensure consistent state across the application.
 */
export class PriceDataService implements IPriceDataService {
  private static instance: PriceDataService | null = null
  private cache: DataCache
  private projectionGenerator: ProjectionGenerator
  private chartMerger: ChartMerger
  private performanceMonitor: PerformanceMonitor

  private constructor() {
    this.cache = new DataCache({
      maxSize: 1000,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      persistToLocalStorage: true,
      compressionEnabled: true
    })
    this.projectionGenerator = new ProjectionGenerator()
    this.chartMerger = new ChartMerger()
    this.performanceMonitor = new PerformanceMonitor()
  }

  /**
   * Get singleton instance of PriceDataService.
   */
  public static getInstance(): PriceDataService {
    if (!PriceDataService.instance) {
      PriceDataService.instance = new PriceDataService()
    }
    return PriceDataService.instance
  }

  /**
   * Load historical Bitcoin price data.
   * Uses centralized data service with caching.
   */
  public async loadHistoricalData(options: DataFetchOptions = {}): Promise<HistoricalDataPoint[]> {
    const startTime = performance.now()
    const cacheKey = 'historical-data'

    try {
      // Check cache first if enabled
      if (options.useCache !== false) {
        const cachedData = this.cache.get<HistoricalDataPoint[]>(cacheKey)
        if (cachedData) {
          this.performanceMonitor.recordOperation('historical-data-load', performance.now() - startTime, true, true)
          console.log('📊 Historical data loaded from cache')
          return cachedData
        }
      }

      // Load from centralized data service
      console.log('📡 Loading historical data from centralized service...')
      const data = await centralizedDataService.loadHistoricalData()

      // Cache the result
      if (options.useCache !== false) {
        this.cache.set(cacheKey, data, options.maxAge)
      }

      this.performanceMonitor.recordOperation('historical-data-load', performance.now() - startTime, true, false)
      console.log(`✅ Historical data loaded: ${data.length} points`)
      
      return data

    } catch (error) {
      this.performanceMonitor.recordOperation('historical-data-load', performance.now() - startTime, false, false)
      console.error('❌ Failed to load historical data:', error)
      throw error
    }
  }

  /**
   * Get current Bitcoin price.
   * Uses enhanced API service with fallbacks.
   */
  public async getCurrentPrice(options: DataFetchOptions = {}): Promise<number> {
    const startTime = performance.now()
    const cacheKey = 'current-price'

    try {
      // Check cache first if not preferring live data
      if (!options.preferLive && options.useCache !== false) {
        const cachedPrice = this.cache.get<number>(cacheKey)
        if (cachedPrice) {
          this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, true, true)
          return cachedPrice
        }
      }

      // Fetch current price
      console.log('💰 Fetching current Bitcoin price...')
      const priceData = await enhancedBitcoinApiService.getCurrentPrice()
      
      if (!priceData || typeof priceData !== 'number') {
        throw new Error('Invalid price data received')
      }

      // Cache the result (short cache for current price)
      if (options.useCache !== false) {
        this.cache.set(cacheKey, priceData, 5 * 60 * 1000) // 5 minutes cache
      }

      this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, true, false)
      console.log(`✅ Current Bitcoin price: $${priceData}`)
      
      return priceData

    } catch (error) {
      this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, false, false)
      console.error('❌ Failed to fetch current price:', error)
      throw error
    }
  }

  /**
   * Generate price projection chart data.
   * Combines historical data with projected future prices.
   */
  public async generatePriceProjection(
    params: PriceEngineParams,
    historicalData?: HistoricalDataPoint[]
  ): Promise<PriceChartDataPoint[]> {
    const startTime = performance.now()

    try {
      console.log(`🎯 Generating price projection for model: ${params.priceModel}`)

      // Load historical data if not provided
      const histData = historicalData || await this.loadHistoricalData({ useCache: true })

      // For models not supported by ProjectionGenerator, delegate to PriceModelRegistry
      if (params.priceModel === 'enhancedCycleRepeat') {
        console.log(`🔄 Delegating to PriceModelRegistry for model: ${params.priceModel}`)
        return await this.generateProjectionViaPriceModelRegistry(params, histData)
      }

      // Generate projection path using ProjectionGenerator
      const projectionPath = this.projectionGenerator.generateProjectionPath(params)

      // Convert historical data to chart format
      const historicalChartData = histData.map((point, index) => ({
        date: point.date,
        days: index,
        timestamp: point.time,
        price: point.close,
        isHistorical: true,
        confidence: 1.0,
        historicalPrice: point.close
      }))

      // Merge historical and projection data
      const chartData = this.chartMerger.mergeHistoricalAndProjection(historicalChartData, projectionPath)

      // Add Power Law reference lines if needed
      if (params.priceModel === 'powerLaw' || params.priceModel === 'cycleRepeatPowerLaw') {
        this.chartMerger.addPowerLawLines(chartData, params)
      }

      this.performanceMonitor.recordOperation('price-projection-generation', performance.now() - startTime, true, false)
      console.log(`✅ Price projection generated: ${chartData.length} points`)

      return chartData

    } catch (error) {
      this.performanceMonitor.recordOperation('price-projection-generation', performance.now() - startTime, false, false)
      console.error('❌ Failed to generate price projection:', error)
      throw error
    }
  }

  /**
   * Generate price projection using the new PriceModelRegistry system.
   * This is used for models that are not yet supported by ProjectionGenerator.
   */
  private async generateProjectionViaPriceModelRegistry(
    params: PriceEngineParams,
    historicalData: HistoricalDataPoint[]
  ): Promise<PriceChartDataPoint[]> {
    // Dynamically import PriceModelRegistry to avoid circular dependencies
    // Use relative path from workspace root
    const priceModelRegistryModule = await import('../../../../app/simulation/price-models/PriceModelRegistry')
    const priceModelRegistry = priceModelRegistryModule.priceModelRegistry

    // Extract model-specific parameters with proper defaults
    let modelSpecificParams: Record<string, any> = {}

    if (params.priceModel === 'enhancedCycleRepeat') {
      // Enhanced Cycle Repeat requires diminishingReturns parameters
      if (params.modelSpecificParams?.diminishingReturns) {
        modelSpecificParams = params.modelSpecificParams
      } else {
        // Try to load from sessionStorage (where the UI saves them)
        try {
          const savedParams = sessionStorage.getItem('enhancedCycleRepeat_params')
          if (savedParams) {
            const parsed = JSON.parse(savedParams)
            modelSpecificParams = { diminishingReturns: parsed }
          }
        } catch (error) {
          console.warn('Failed to load saved Enhanced Cycle Repeat parameters:', error)
        }

        // If still no parameters, use moderate preset as default
        if (!modelSpecificParams.diminishingReturns) {
          console.log('📊 Using moderate preset for Enhanced Cycle Repeat model')
          modelSpecificParams = {
            diminishingReturns: {
              diminishingFactor: 0.25,
              maturityThreshold: 2_000_000_000_000,
              cycleDegradation: 0.15,
              adoptionCurveType: 'sigmoid',
              institutionalSaturation: 0.4,
              regulatoryMaturity: 0.5,
              liquidityConstraint: 0.4,
              competitionFactor: 0.3
            }
          }
        }
      }
    } else if (params.modelSpecificParams) {
      // For other models, pass through any provided parameters
      modelSpecificParams = params.modelSpecificParams
    }

    // Convert PriceEngineParams to PriceModelParams
    const modelParams = {
      startPrice: params.initialBtcPrice,
      projectionMonths: params.simulationMonths,
      modelSpecificParams
    }

    // Generate projection using the new system
    const result = await priceModelRegistry.generateProjection(
      params.priceModel,
      historicalData,
      modelParams
    )

    if (!result) {
      throw new Error(`Failed to generate projection for model: ${params.priceModel}`)
    }

    // Convert PriceProjectionResult to PriceChartDataPoint[]
    const chartData: PriceChartDataPoint[] = []

    // Add historical data
    historicalData.forEach((point, index) => {
      chartData.push({
        date: point.date,
        days: index,
        timestamp: point.time,
        price: point.close,
        historicalPrice: point.close,
        isHistorical: true,
        confidence: 1.0
      })
    })

    // Add projection data
    result.projectionPoints.forEach((point, index) => {
      const date = new Date(point.timestamp)
      chartData.push({
        date: date.toISOString().split('T')[0],
        days: historicalData.length + index,
        timestamp: point.timestamp / 1000, // Convert to seconds
        price: point.price,
        simulationPath: point.price,
        isHistorical: false,
        confidence: point.confidence || 1.0
      })
    })

    console.log(`✅ Price projection generated via PriceModelRegistry: ${chartData.length} points`)
    return chartData
  }

  /**
   * Clear all cached data.
   */
  public clearCache(): void {
    this.cache.clear()
    console.log('🗑️ Price data cache cleared')
  }

  /**
   * Get cache statistics.
   */
  public getCacheStats(): CacheStats {
    return this.cache.getStats()
  }

  /**
   * Get performance metrics.
   */
  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics()
  }

  /**
   * Validate historical data integrity.
   */
  public validateHistoricalData(data: HistoricalDataPoint[]): boolean {
    if (!Array.isArray(data) || data.length === 0) {
      return false
    }

    return data.every(point => 
      typeof point.time === 'number' &&
      typeof point.close === 'number' &&
      point.close > 0 &&
      typeof point.date === 'string'
    )
  }

  /**
   * Initialize the service and preload essential data.
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing Price Data Service...')
    
    try {
      // Preload historical data
      await this.loadHistoricalData({ useCache: true })
      console.log('✅ Price Data Service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Price Data Service:', error)
      throw error
    }
  }
}

// Export singleton instance
export const priceDataService = PriceDataService.getInstance()
