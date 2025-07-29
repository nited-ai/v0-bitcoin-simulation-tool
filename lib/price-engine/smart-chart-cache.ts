/**
 * Smart Chart Generation Cache
 * 
 * Implements intelligent caching and conditional generation to eliminate redundant calculations.
 * Tracks parameter changes and only regenerates when necessary.
 */

import type { PriceEngineParams, PriceChartDataPoint } from "./types"

interface CacheEntry {
  params: PriceEngineParams
  chartData: PriceChartDataPoint[]
  timestamp: number
  parameterHash: string
}

interface RelevantParams {
  priceModel: string
  initialBtcPrice: number
  simulationMonths: number
  powerLawPrognosisLine?: string
  annualGrowthRates?: number[]
  historicalDataLength: number
}

export class SmartChartCache {
  private cache = new Map<string, CacheEntry>()
  private maxCacheSize = 10 // Keep last 10 parameter combinations
  
  /**
   * Generate a hash for the parameters that actually affect chart generation
   */
  private generateParameterHash(params: PriceEngineParams, historicalDataLength: number): string {
    const relevantParams: RelevantParams = {
      priceModel: params.priceModel,
      initialBtcPrice: params.initialBtcPrice,
      simulationMonths: params.simulationMonths,
      historicalDataLength
    }
    
    // Add model-specific parameters
    if (params.priceModel === 'powerLaw') {
      relevantParams.powerLawPrognosisLine = params.powerLawSettings?.prognosisLine
    } else if (params.priceModel === 'manual') {
      relevantParams.annualGrowthRates = params.annualGrowthRates
    }
    
    return JSON.stringify(relevantParams)
  }
  
  /**
   * Check if we should regenerate the chart based on parameter changes
   */
  shouldRegenerateChart(params: PriceEngineParams, historicalDataLength: number): boolean {
    const parameterHash = this.generateParameterHash(params, historicalDataLength)
    const cached = this.cache.get(parameterHash)
    
    if (!cached) {
      console.log(`🔄 Chart regeneration needed: No cache entry for parameters`)
      return true
    }
    
    // Cache hit - no regeneration needed
    console.log(`⚡ Chart cache hit: Using cached data for ${params.priceModel} model`)
    return false
  }
  
  /**
   * Get cached chart data if available
   */
  getCachedChartData(params: PriceEngineParams, historicalDataLength: number): PriceChartDataPoint[] | null {
    const parameterHash = this.generateParameterHash(params, historicalDataLength)
    const cached = this.cache.get(parameterHash)
    
    if (cached) {
      console.log(`📦 Using cached chart data: ${cached.chartData.length} points for ${params.priceModel} model`)
      return cached.chartData
    }
    
    return null
  }
  
  /**
   * Cache the generated chart data
   */
  cacheChartData(params: PriceEngineParams, historicalDataLength: number, chartData: PriceChartDataPoint[]): void {
    const parameterHash = this.generateParameterHash(params, historicalDataLength)
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(parameterHash, {
      params: { ...params },
      chartData: [...chartData],
      timestamp: Date.now(),
      parameterHash
    })
    
    console.log(`💾 Cached chart data: ${chartData.length} points for ${params.priceModel} model`)
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🗑️ Chart cache cleared')
  }
  
  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const smartChartCache = new SmartChartCache()
