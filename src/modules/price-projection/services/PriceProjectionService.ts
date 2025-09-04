/**
 * Price Projection Service
 * 
 * High-level service for managing price projections with caching,
 * performance monitoring, and batch processing capabilities.
 */

import type {
  ProjectionRequest,
  ProjectionResponse,
  BatchProjectionRequest,
  BatchProjectionResponse,
  PriceProjectionServiceConfig,
  ProjectionCacheEntry,
  ModelPerformanceMetrics,
  IPriceProjectionService,
  PriceModelParams
} from '../types'
import { priceModelRegistry } from './PriceModelRegistry'

/**
 * Price Projection Service Implementation
 */
export class PriceProjectionService implements IPriceProjectionService {
  private cache: Map<string, ProjectionCacheEntry> = new Map()
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map()
  private config: PriceProjectionServiceConfig

  constructor(config: Partial<PriceProjectionServiceConfig> = {}) {
    this.config = {
      enableCaching: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      maxConcurrentProjections: 5,
      defaultProjectionMonths: 12,
      enablePerformanceMetrics: true,
      ...config
    }
  }

  /**
   * Generate a single price projection
   */
  async generateProjection(request: ProjectionRequest): Promise<ProjectionResponse> {
    const startTime = performance.now()
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedProjection(request)
        if (cached) {
          console.log(`📦 Using cached projection for model: ${request.modelId}`)
          return {
            success: true,
            result: cached.result,
            modelId: request.modelId,
            generatedAt: cached.timestamp.toISOString()
          }
        }
      }

      // Generate new projection
      const result = await priceModelRegistry.generateProjection(
        request.modelId,
        request.historicalData,
        request.params
      )

      if (!result) {
        return {
          success: false,
          error: `Failed to generate projection with model: ${request.modelId}`,
          modelId: request.modelId,
          generatedAt: new Date().toISOString()
        }
      }

      // Cache the result
      if (this.config.enableCaching) {
        this.cacheProjection(request, result)
      }

      // Update performance metrics
      if (this.config.enablePerformanceMetrics) {
        this.updatePerformanceMetrics(request.modelId, performance.now() - startTime, true)
      }

      return {
        success: true,
        result,
        modelId: request.modelId,
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      // Update performance metrics for failed request
      if (this.config.enablePerformanceMetrics) {
        this.updatePerformanceMetrics(
          request.modelId, 
          performance.now() - startTime, 
          false,
          error instanceof Error ? error.message : String(error)
        )
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        modelId: request.modelId,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Generate multiple projections in batch
   */
  async generateBatchProjections(request: BatchProjectionRequest): Promise<BatchProjectionResponse> {
    console.log(`🚀 Generating batch projections for ${request.modelIds.length} models`)
    
    const startTime = performance.now()
    const results = await priceModelRegistry.compareModels(
      request.modelIds,
      request.historicalData,
      request.params
    )

    const successful = results.filter(r => r.result !== null).length
    const failed = results.length - successful

    console.log(`✅ Batch projection complete in ${(performance.now() - startTime).toFixed(2)}ms`)

    return {
      results,
      successful,
      failed,
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): Array<{ id: string; name: string; description: string }> {
    return priceModelRegistry.getModelNames()
  }

  /**
   * Get default parameters for a model
   */
  getModelDefaultParams(modelId: string): Record<string, any> | null {
    return priceModelRegistry.getModelDefaultParams(modelId)
  }

  /**
   * Validate model parameters
   */
  validateModelParams(modelId: string, params: PriceModelParams): boolean {
    const model = priceModelRegistry.getModel(modelId)
    if (!model) {
      return false
    }

    return model.validateParams(params)
  }

  /**
   * Clear projection cache
   */
  clearCache(): void {
    console.log('🧹 Clearing projection cache')
    this.cache.clear()
  }

  /**
   * Get performance metrics for all models
   */
  getPerformanceMetrics(): ModelPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
  }

  /**
   * Get cached projection if available and not expired
   */
  private getCachedProjection(request: ProjectionRequest): ProjectionCacheEntry | null {
    const cacheKey = this.generateCacheKey(request)
    const cached = this.cache.get(cacheKey)

    if (!cached) {
      return null
    }

    // Check if cache entry has expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(cacheKey)
      return null
    }

    return cached
  }

  /**
   * Cache a projection result
   */
  private cacheProjection(request: ProjectionRequest, result: any): void {
    const cacheKey = this.generateCacheKey(request)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.cacheTimeout)

    const cacheEntry: ProjectionCacheEntry = {
      key: cacheKey,
      result,
      timestamp: now,
      expiresAt,
      modelId: request.modelId,
      params: request.params
    }

    this.cache.set(cacheKey, cacheEntry)
    
    // Clean up expired entries periodically
    this.cleanupExpiredCache()
  }

  /**
   * Generate cache key for a projection request
   */
  private generateCacheKey(request: ProjectionRequest): string {
    const paramsHash = JSON.stringify({
      modelId: request.modelId,
      startPrice: request.params.startPrice,
      projectionMonths: request.params.projectionMonths,
      modelSpecificParams: request.params.modelSpecificParams
    })
    
    return `projection_${btoa(paramsHash).replace(/[^a-zA-Z0-9]/g, '')}`
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`)
    }
  }

  /**
   * Update performance metrics for a model
   */
  private updatePerformanceMetrics(
    modelId: string, 
    executionTime: number, 
    success: boolean,
    error?: string
  ): void {
    let metrics = this.performanceMetrics.get(modelId)
    
    if (!metrics) {
      metrics = {
        modelId,
        averageExecutionTime: 0,
        successRate: 0,
        totalExecutions: 0,
        lastExecution: new Date(),
        errors: []
      }
      this.performanceMetrics.set(modelId, metrics)
    }

    // Update metrics
    metrics.totalExecutions++
    metrics.lastExecution = new Date()
    
    // Update average execution time
    metrics.averageExecutionTime = (
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1)) + executionTime
    ) / metrics.totalExecutions

    // Update success rate
    const successfulExecutions = success 
      ? (metrics.successRate * (metrics.totalExecutions - 1)) + 1
      : (metrics.successRate * (metrics.totalExecutions - 1))
    
    metrics.successRate = successfulExecutions / metrics.totalExecutions

    // Track errors
    if (!success && error) {
      metrics.errors.push(error)
      // Keep only last 10 errors
      if (metrics.errors.length > 10) {
        metrics.errors = metrics.errors.slice(-10)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number
    expiredEntries: number
    cacheHitRate: number
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    const now = new Date()
    let expiredEntries = 0
    let oldestEntry: Date | null = null
    let newestEntry: Date | null = null

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredEntries++
      }

      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp
      }

      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      cacheHitRate: 0, // Would need to track hits/misses to calculate this
      oldestEntry,
      newestEntry
    }
  }
}

// Export singleton instance
export const priceProjectionService = new PriceProjectionService()
