/**
 * Price Data Service
 * 
 * Central service for fetching current and historical price data from multiple sources.
 * Provides caching, validation, and source management functionality.
 */

import type {
  IPriceDataService,
  PriceDataRequest,
  PriceDataResponse,
  PriceDataSource,
  SourceStatus,
  PriceDataPoint
} from '../types'
import type { ValidationResult } from '@/modules/shared/types'
import { coinCapAdapter } from '../adapters/CoinCapAdapter'
import { coinDeskAdapter } from '../adapters/CoinDeskAdapter'
import { dataCache } from '../storage/DataCache'

/**
 * Price Data Service Implementation
 */
export class PriceDataService implements IPriceDataService {
  private sources: Map<string, any> = new Map()
  private sourceStats: Map<string, SourceStatus> = new Map()

  constructor() {
    this.registerDefaultSources()
  }

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string, source?: string): Promise<PriceDataResponse> {
    const startTime = performance.now()
    
    try {
      // Validate input
      if (!symbol || symbol.trim() === '') {
        return this.createErrorResponse('Symbol cannot be empty', startTime, symbol)
      }

      // Get source adapter
      const adapter = this.getSourceAdapter(source)
      if (!adapter) {
        return this.createErrorResponse(`Source not found: ${source || 'default'}`, startTime)
      }

      // Fetch current price
      const response = await adapter.fetchCurrentPrice(symbol)
      
      if (!response.success) {
        this.updateSourceStats(adapter.getSourceInfo().id, false, performance.now() - startTime)
        return this.createErrorResponse(response.error || 'Failed to fetch price', startTime)
      }

      // Transform to standard format
      const priceData: PriceDataPoint[] = [{
        timestamp: Date.now(),
        price: response.data!,
        metadata: {
          source: adapter.getSourceInfo().id,
          symbol
        }
      }]

      this.updateSourceStats(adapter.getSourceInfo().id, true, performance.now() - startTime)

      return {
        success: true,
        data: priceData,
        source: adapter.getSourceInfo().id,
        cached: false,
        timestamp: Date.now(),
        metadata: {
          symbol,
          interval: 'current',
          totalPoints: 1
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createErrorResponse(errorMessage, startTime)
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(request: PriceDataRequest): Promise<PriceDataResponse> {
    const startTime = performance.now()
    
    try {
      // Validate request
      const validation = this.validateRequest(request)
      if (!validation.isValid) {
        return this.createErrorResponse(validation.errors.join(', '), startTime)
      }

      // Check cache if enabled
      if (request.useCache !== false) {
        const cacheKey = this.generateCacheKey(request)
        const cached = await dataCache.get<PriceDataPoint[]>(cacheKey)
        
        if (cached) {
          return {
            success: true,
            data: cached,
            source: 'cache',
            cached: true,
            timestamp: Date.now(),
            metadata: {
              symbol: request.symbol,
              interval: request.interval || 'daily',
              startDate: request.startDate?.toISOString(),
              endDate: request.endDate?.toISOString(),
              totalPoints: cached.length
            }
          }
        }
      }

      // Get source adapter
      const adapter = this.getSourceAdapter(request.source)
      if (!adapter) {
        return this.createErrorResponse(`Source not found: ${request.source || 'default'}`, startTime)
      }

      // Set default date range if not provided
      const endDate = request.endDate || new Date()
      const startDate = request.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

      // Fetch historical data
      const response = await adapter.fetchHistoricalData(request.symbol, startDate, endDate)
      
      if (!response.success) {
        this.updateSourceStats(adapter.getSourceInfo().id, false, performance.now() - startTime)
        return this.createErrorResponse(response.error || 'Failed to fetch historical data', startTime)
      }

      // Transform response
      const priceData = adapter.transformResponse(response.data!)

      // Cache the result if caching is enabled
      if (request.useCache !== false) {
        const cacheKey = this.generateCacheKey(request)
        const ttl = request.maxAge || 3600000 // 1 hour default
        await dataCache.set(cacheKey, priceData, ttl)
      }

      this.updateSourceStats(adapter.getSourceInfo().id, true, performance.now() - startTime)

      return {
        success: true,
        data: priceData,
        source: adapter.getSourceInfo().id,
        cached: false,
        timestamp: Date.now(),
        metadata: {
          symbol: request.symbol,
          interval: request.interval || 'daily',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalPoints: priceData.length
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createErrorResponse(errorMessage, startTime)
    }
  }

  /**
   * Get multiple assets at once
   */
  async getMultipleAssets(symbols: string[], source?: string): Promise<Map<string, PriceDataResponse>> {
    const results = new Map<string, PriceDataResponse>()
    
    if (symbols.length === 0) {
      return results
    }

    // Fetch all symbols concurrently
    const promises = symbols.map(async (symbol) => {
      const response = await this.getCurrentPrice(symbol, source)
      return { symbol, response }
    })

    const responses = await Promise.all(promises)
    
    responses.forEach(({ symbol, response }) => {
      results.set(symbol, response)
    })

    return results
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity(data: PriceDataPoint[]): ValidationResult {
    const errors: string[] = []

    if (!data || data.length === 0) {
      return { isValid: true, errors: [] } // Empty data is valid
    }

    // Check for valid timestamps and prices
    data.forEach((point, index) => {
      if (typeof point.timestamp !== 'number' || point.timestamp <= 0) {
        errors.push(`Point ${index}: Invalid timestamp`)
      }
      
      if (typeof point.price !== 'number' || point.price <= 0) {
        errors.push(`Point ${index}: Invalid price`)
      }
    })

    // Check for duplicates and sorting
    const timestamps = data.map(p => p.timestamp)
    const uniqueTimestamps = new Set(timestamps)
    
    if (uniqueTimestamps.size !== timestamps.length) {
      errors.push('Duplicate timestamps detected')
    }

    // Check if data is sorted by timestamp
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i - 1]) {
        errors.push('Data is not sorted by timestamp')
        break
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get available data sources
   */
  getAvailableSources(): PriceDataSource[] {
    return Array.from(this.sources.values())
      .map(adapter => adapter.getSourceInfo())
      .filter(source => source.enabled)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get source status
   */
  async getSourceStatus(sourceId: string): Promise<SourceStatus> {
    const adapter = this.sources.get(sourceId)
    if (!adapter) {
      throw new Error(`Source not found: ${sourceId}`)
    }

    // Get cached status or create new one
    let status = this.sourceStats.get(sourceId)
    if (!status) {
      const sourceInfo = adapter.getSourceInfo()
      status = {
        id: sourceId,
        name: sourceInfo.name,
        online: false,
        lastCheck: new Date(),
        responseTime: 0,
        errorCount: 0,
        rateLimit: {
          remaining: sourceInfo.rateLimit,
          resetTime: new Date(Date.now() + 60000) // 1 minute from now
        },
        dataQuality: {
          score: 1.0,
          issues: []
        }
      }
      this.sourceStats.set(sourceId, status)
    }

    // Test connection
    try {
      const startTime = performance.now()
      const online = await adapter.testConnection()
      const responseTime = performance.now() - startTime
      
      status.online = online
      status.responseTime = responseTime
      status.lastCheck = new Date()
      
    } catch (error) {
      status.online = false
      status.errorCount++
    }

    return status
  }

  /**
   * Register default data sources
   */
  private registerDefaultSources(): void {
    console.log('🔧 Registering default price data sources...')
    
    // Register CoinCap adapter (highest priority)
    this.sources.set('coincap', coinCapAdapter)
    console.log('📊 Registered price source: coincap (CoinCap API)')
    
    // Register CoinDesk adapter
    this.sources.set('coindesk', coinDeskAdapter)
    console.log('📊 Registered price source: coindesk (CoinDesk API)')
    
    console.log(`✅ Registered ${this.sources.size} price data sources`)
  }

  /**
   * Get source adapter by ID or default
   */
  private getSourceAdapter(sourceId?: string): any {
    if (sourceId) {
      return this.sources.get(sourceId)
    }
    
    // Return highest priority enabled source
    const sources = this.getAvailableSources()
    if (sources.length === 0) {
      return null
    }
    
    return this.sources.get(sources[0].id)
  }

  /**
   * Validate price data request
   */
  private validateRequest(request: PriceDataRequest): ValidationResult {
    const errors: string[] = []

    if (!request.symbol || request.symbol.trim() === '') {
      errors.push('Symbol is required')
    }

    if (request.startDate && request.endDate && request.startDate > request.endDate) {
      errors.push('Invalid date range: start date must be before end date')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: PriceDataRequest): string {
    const parts = [
      'price-data',
      request.symbol,
      request.interval || 'daily',
      request.startDate?.toISOString().split('T')[0] || '',
      request.endDate?.toISOString().split('T')[0] || '',
      request.source || 'default'
    ]
    
    return parts.join(':')
  }

  /**
   * Update source statistics
   */
  private updateSourceStats(sourceId: string, success: boolean, responseTime: number): void {
    let stats = this.sourceStats.get(sourceId)
    if (!stats) {
      const adapter = this.sources.get(sourceId)
      const sourceInfo = adapter?.getSourceInfo()
      
      stats = {
        id: sourceId,
        name: sourceInfo?.name || sourceId,
        online: success,
        lastCheck: new Date(),
        responseTime,
        errorCount: success ? 0 : 1,
        rateLimit: {
          remaining: sourceInfo?.rateLimit || 60,
          resetTime: new Date(Date.now() + 60000)
        },
        dataQuality: {
          score: success ? 1.0 : 0.8,
          issues: success ? [] : ['Request failed']
        }
      }
    } else {
      stats.online = success
      stats.lastCheck = new Date()
      stats.responseTime = responseTime
      if (!success) {
        stats.errorCount++
      }
    }
    
    this.sourceStats.set(sourceId, stats)
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: string, startTime: number, symbol?: string): PriceDataResponse {
    return {
      success: false,
      error,
      source: 'unknown',
      cached: false,
      timestamp: Date.now(),
      metadata: {
        symbol: symbol || '',
        interval: '',
        totalPoints: 0
      }
    }
  }
}

// Export singleton instance
export const priceDataService = new PriceDataService()
