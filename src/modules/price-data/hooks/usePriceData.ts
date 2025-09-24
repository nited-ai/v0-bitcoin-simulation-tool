/**
 * usePriceData Hook
 * 
 * Main React hook for price data management.
 * Provides unified interface for historical data, current prices, and projections.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { 
  HistoricalDataPoint, 
  PriceEngineParams, 
  PriceChartDataPoint,
  DataFetchOptions,
  CacheStats
} from '../types'
import { priceDataService } from '../services/PriceDataService'

interface UsePriceDataOptions extends DataFetchOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UsePriceDataReturn {
  // Data
  historicalData: HistoricalDataPoint[]
  currentPrice: number | null
  projectionData: PriceChartDataPoint[]
  
  // Loading states
  isLoadingHistorical: boolean
  isLoadingCurrentPrice: boolean
  isGeneratingProjection: boolean
  
  // Error states
  historicalError: string | null
  currentPriceError: string | null
  projectionError: string | null
  
  // Actions
  loadHistoricalData: () => Promise<void>
  fetchCurrentPrice: () => Promise<void>
  generateProjection: (params: PriceEngineParams) => Promise<void>
  clearCache: () => void
  
  // Metadata
  cacheStats: CacheStats | null
  lastUpdated: Date | null
}

/**
 * Main hook for price data management.
 */
export function usePriceData(options: UsePriceDataOptions = {}): UsePriceDataReturn {
  // State
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [projectionData, setProjectionData] = useState<PriceChartDataPoint[]>([])
  
  // Loading states
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false)
  const [isLoadingCurrentPrice, setIsLoadingCurrentPrice] = useState(false)
  const [isGeneratingProjection, setIsGeneratingProjection] = useState(false)
  
  // Error states
  const [historicalError, setHistoricalError] = useState<string | null>(null)
  const [currentPriceError, setCurrentPriceError] = useState<string | null>(null)
  const [projectionError, setProjectionError] = useState<string | null>(null)
  
  // Metadata
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  /**
   * Load historical Bitcoin price data.
   */
  const loadHistoricalData = useCallback(async () => {
    setIsLoadingHistorical(true)
    setHistoricalError(null)

    try {
      const data = await priceDataService.loadHistoricalData(options)
      setHistoricalData(data)
      setLastUpdated(new Date())
      console.log(`✅ Historical data loaded: ${data.length} points`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load historical data'
      setHistoricalError(errorMessage)
      console.error('❌ Failed to load historical data:', error)
    } finally {
      setIsLoadingHistorical(false)
    }
  }, [options])

  /**
   * Fetch current Bitcoin price.
   */
  const fetchCurrentPrice = useCallback(async () => {
    setIsLoadingCurrentPrice(true)
    setCurrentPriceError(null)

    try {
      const price = await priceDataService.getCurrentPrice(options)
      setCurrentPrice(price)
      setLastUpdated(new Date())
      console.log(`✅ Current price fetched: $${price}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch current price'
      setCurrentPriceError(errorMessage)
      console.error('❌ Failed to fetch current price:', error)
    } finally {
      setIsLoadingCurrentPrice(false)
    }
  }, [options])

  /**
   * Generate price projection.
   */
  const generateProjection = useCallback(async (params: PriceEngineParams) => {
    setIsGeneratingProjection(true)
    setProjectionError(null)

    try {
      const data = await priceDataService.generatePriceProjection(params, historicalData.length > 0 ? historicalData : undefined)
      setProjectionData(data)
      setLastUpdated(new Date())
      console.log(`✅ Price projection generated: ${data.length} points`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate projection'
      setProjectionError(errorMessage)
      console.error('❌ Failed to generate projection:', error)
    } finally {
      setIsGeneratingProjection(false)
    }
  }, [historicalData])

  /**
   * Clear all cached data.
   */
  const clearCache = useCallback(() => {
    priceDataService.clearCache()
    setCacheStats(priceDataService.getCacheStats())
    console.log('🗑️ Cache cleared')
  }, [])

  /**
   * Update cache stats.
   */
  const updateCacheStats = useCallback(() => {
    setCacheStats(priceDataService.getCacheStats())
  }, [])

  // Auto-refresh functionality
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(() => {
        if (currentPrice !== null) {
          fetchCurrentPrice()
        }
      }, options.refreshInterval)

      return () => clearInterval(interval)
    }
  }, [options.autoRefresh, options.refreshInterval, currentPrice, fetchCurrentPrice])

  // Load initial data
  useEffect(() => {
    loadHistoricalData()
    updateCacheStats()
  }, [loadHistoricalData, updateCacheStats])

  // Update cache stats after operations
  useEffect(() => {
    updateCacheStats()
  }, [historicalData, currentPrice, projectionData, updateCacheStats])

  return {
    // Data
    historicalData,
    currentPrice,
    projectionData,
    
    // Loading states
    isLoadingHistorical,
    isLoadingCurrentPrice,
    isGeneratingProjection,
    
    // Error states
    historicalError,
    currentPriceError,
    projectionError,
    
    // Actions
    loadHistoricalData,
    fetchCurrentPrice,
    generateProjection,
    clearCache,
    
    // Metadata
    cacheStats,
    lastUpdated
  }
}

/**
 * Hook for price data with automatic current price fetching.
 */
export function usePriceDataWithCurrentPrice(options: UsePriceDataOptions = {}) {
  const priceData = usePriceData(options)

  // Automatically fetch current price when historical data is loaded
  useEffect(() => {
    if (priceData.historicalData.length > 0 && priceData.currentPrice === null && !priceData.isLoadingCurrentPrice) {
      priceData.fetchCurrentPrice()
    }
  }, [priceData.historicalData.length, priceData.currentPrice, priceData.isLoadingCurrentPrice, priceData.fetchCurrentPrice])

  return priceData
}

/**
 * Hook for price data with performance monitoring.
 */
export function usePriceDataWithMetrics(options: UsePriceDataOptions = {}) {
  const priceData = usePriceData(options)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)

  const updateMetrics = useCallback(() => {
    const metrics = priceDataService.getPerformanceMetrics()
    setPerformanceMetrics(metrics)
  }, [])

  // Update metrics after operations
  useEffect(() => {
    updateMetrics()
  }, [priceData.historicalData, priceData.currentPrice, priceData.projectionData, updateMetrics])

  return {
    ...priceData,
    performanceMetrics,
    updateMetrics
  }
}
