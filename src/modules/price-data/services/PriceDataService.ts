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

// Phase 1 Migration: Import UnifiedPriceProjectionService
import { unifiedPriceProjectionService, PriceProjectionAdapter } from '../../shared'

// === API client functions (replacing PR1/2's inline mocks) ===

interface PriceApiResponse {
  prices: Array<{ date: string; close: number; high: number; low: number; open: number }>
  currentPrice: { value: number; fetchedAt: string } | null
  ath: { value: number } | null
  lastUpdated: string | null
  isStale: boolean
}

/**
 * Determine the API base URL.
 * - Browser: relative path (same-origin) works
 * - Server-side: must be absolute. Use NEXT_PUBLIC_API_BASE or VERCEL_URL or fall back to localhost.
 *
 * For tests: vi.stubGlobal('fetch') intercepts before the URL is resolved anyway.
 */
function getApiBase(): string {
  if (typeof window !== 'undefined') return ''
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function fetchPriceData(
  params: { from?: string; to?: string; refresh?: 'force' } = {},
): Promise<PriceApiResponse> {
  const base = getApiBase()
  const url = new URL('/api/bitcoin-prices', base || 'http://localhost:3000')
  if (params.from) url.searchParams.set('from', params.from)
  if (params.to) url.searchParams.set('to', params.to)
  if (params.refresh) url.searchParams.set('refresh', params.refresh)

  // For browser, use just pathname+search (relative); for server, use absolute
  const fetchUrl = base
    ? url.toString()
    : typeof window !== 'undefined'
      ? `/api/bitcoin-prices${url.search}`
      : url.toString()

  const res = await fetch(fetchUrl)
  if (!res.ok) {
    throw new Error(`Price API: HTTP ${res.status} ${res.statusText}`)
  }
  return res.json()
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

      console.log('📡 Loading historical data from /api/bitcoin-prices...')
      const apiResponse = await fetchPriceData()
      // Convert API row shape -> HistoricalDataPoint shape
      const data: HistoricalDataPoint[] = apiResponse.prices.map((p) => ({
        time: Math.floor(new Date(p.date).getTime() / 1000), // unix seconds
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }))

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

      console.log('💰 Fetching current price from /api/bitcoin-prices...')
      const apiResponse = await fetchPriceData(
        options.preferLive ? { refresh: 'force' } : {},
      )
      const price = apiResponse.currentPrice?.value
      if (typeof price !== 'number') {
        throw new Error('PriceDataService: API returned no currentPrice')
      }

      if (options.useCache !== false) {
        this.cache.set(cacheKey, price, 5 * 60 * 1000) // 5 minutes
      }

      this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, true, false)
      console.log(`✅ Current price: $${price}`)

      return price

    } catch (error) {
      this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, false, false)
      console.error('❌ Failed to fetch current price:', error)
      throw error
    }
  }

  /**
   * Generate price projection chart data.
   * Combines historical data with projected future prices.
   *
   * @deprecated This method returns legacy PriceChartDataPoint[] format.
   * For new code, use UnifiedPriceProjectionService.generateProjection() which returns
   * the standard PriceProjectionResult format from app/simulation/price-models/types.ts
   *
   * Phase 1-4 Migration: Now uses UnifiedPriceProjectionService internally
   * while maintaining backward compatibility by converting to legacy format.
   * This method is kept only for backward compatibility with existing code.
   */
  public async generatePriceProjection(
    params: PriceEngineParams,
    historicalData?: HistoricalDataPoint[]
  ): Promise<PriceChartDataPoint[]> {
    const startTime = performance.now()

    try {
      console.log(`🎯 [Phase 1 Migration] Generating price projection for model: ${params.priceModel}`)

      // Load historical data if not provided
      const histData = historicalData || await this.loadHistoricalData({ useCache: true })

      // Phase 1 Migration: Use UnifiedPriceProjectionService
      console.log(`🔄 [Phase 1 Migration] Using UnifiedPriceProjectionService for ${params.priceModel}`)
      const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
        params,
        histData
      )

      // Convert to legacy format for backward compatibility
      console.log(`🔄 [Phase 1 Migration] Converting to legacy format for backward compatibility`)
      const chartData = PriceProjectionAdapter.toLegacyFormat(projection, histData)

      // Add Power Law reference lines if needed
      if (params.priceModel === 'powerLaw' || params.priceModel === 'cycleRepeatPowerLaw') {
        this.chartMerger.addPowerLawLines(chartData, params)
      }

      this.performanceMonitor.recordOperation('price-projection-generation', performance.now() - startTime, true, false)
      console.log(`✅ [Phase 1 Migration] Price projection generated: ${chartData.length} points`)

      return chartData

    } catch (error) {
      this.performanceMonitor.recordOperation('price-projection-generation', performance.now() - startTime, false, false)
      console.error('❌ [Phase 1 Migration] Failed to generate price projection:', error)
      throw error
    }
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
