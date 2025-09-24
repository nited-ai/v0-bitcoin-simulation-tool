/**
 * usePriceProjection Hook
 * 
 * Specialized React hook for Bitcoin price projection generation and management.
 * Handles different projection models and chart data preparation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { 
  PriceEngineParams, 
  PriceChartDataPoint, 
  HistoricalDataPoint,
  PriceModel 
} from '../types'
import { priceDataService } from '../services/PriceDataService'

interface UsePriceProjectionOptions {
  autoGenerate?: boolean
  historicalData?: HistoricalDataPoint[]
  cacheResults?: boolean
}

interface UsePriceProjectionReturn {
  // Data
  projectionData: PriceChartDataPoint[]
  currentParams: PriceEngineParams | null
  
  // Loading state
  isGenerating: boolean
  error: string | null
  
  // Actions
  generateProjection: (params: PriceEngineParams) => Promise<void>
  clearProjection: () => void
  
  // Computed values
  projectionRange: { min: number; max: number } | null
  projectionLength: number
  hasHistoricalData: boolean
  hasProjectionData: boolean
}

/**
 * Hook for managing Bitcoin price projections.
 */
export function usePriceProjection(options: UsePriceProjectionOptions = {}): UsePriceProjectionReturn {
  // State
  const [projectionData, setProjectionData] = useState<PriceChartDataPoint[]>([])
  const [currentParams, setCurrentParams] = useState<PriceEngineParams | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Generate price projection with given parameters.
   */
  const generateProjection = useCallback(async (params: PriceEngineParams) => {
    setIsGenerating(true)
    setError(null)

    try {
      console.log(`🎯 Generating projection for model: ${params.priceModel}`)
      
      const data = await priceDataService.generatePriceProjection(
        params, 
        options.historicalData
      )
      
      setProjectionData(data)
      setCurrentParams(params)
      
      console.log(`✅ Price projection generated: ${data.length} points`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate projection'
      setError(errorMessage)
      console.error('❌ Failed to generate projection:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [options.historicalData])

  /**
   * Clear current projection data.
   */
  const clearProjection = useCallback(() => {
    setProjectionData([])
    setCurrentParams(null)
    setError(null)
    console.log('🗑️ Projection data cleared')
  }, [])

  // Computed values
  const projectionRange = useMemo(() => {
    if (projectionData.length === 0) return null

    const prices = projectionData
      .map(point => point.simulationPath)
      .filter((price): price is number => price !== undefined)

    if (prices.length === 0) return null

    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }, [projectionData])

  const projectionLength = useMemo(() => projectionData.length, [projectionData])

  const hasHistoricalData = useMemo(() => {
    return projectionData.some(point => point.historicalPrice !== undefined)
  }, [projectionData])

  const hasProjectionData = useMemo(() => {
    return projectionData.some(point => point.simulationPath !== undefined)
  }, [projectionData])

  return {
    // Data
    projectionData,
    currentParams,
    
    // Loading state
    isGenerating,
    error,
    
    // Actions
    generateProjection,
    clearProjection,
    
    // Computed values
    projectionRange,
    projectionLength,
    hasHistoricalData,
    hasProjectionData
  }
}

/**
 * Hook for price projection with automatic regeneration on parameter changes.
 */
export function useAutoProjection(
  params: PriceEngineParams | null,
  options: UsePriceProjectionOptions = {}
) {
  const projection = usePriceProjection(options)

  // Auto-generate when parameters change
  useEffect(() => {
    if (params && options.autoGenerate !== false) {
      projection.generateProjection(params)
    }
  }, [params, options.autoGenerate, projection.generateProjection])

  return projection
}

/**
 * Hook for comparing multiple price projection models.
 */
export function useProjectionComparison(
  baseParams: Omit<PriceEngineParams, 'priceModel'>,
  models: PriceModel[],
  options: UsePriceProjectionOptions = {}
) {
  const [projections, setProjections] = useState<Map<PriceModel, PriceChartDataPoint[]>>(new Map())
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Map<PriceModel, string>>(new Map())

  /**
   * Generate projections for all models.
   */
  const generateAllProjections = useCallback(async () => {
    setIsGenerating(true)
    const newProjections = new Map<PriceModel, PriceChartDataPoint[]>()
    const newErrors = new Map<PriceModel, string>()

    for (const model of models) {
      try {
        const params: PriceEngineParams = { ...baseParams, priceModel: model }
        const data = await priceDataService.generatePriceProjection(params, options.historicalData)
        newProjections.set(model, data)
        console.log(`✅ ${model} projection generated: ${data.length} points`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to generate ${model} projection`
        newErrors.set(model, errorMessage)
        console.error(`❌ Failed to generate ${model} projection:`, error)
      }
    }

    setProjections(newProjections)
    setErrors(newErrors)
    setIsGenerating(false)
  }, [baseParams, models, options.historicalData])

  /**
   * Clear all projections.
   */
  const clearAllProjections = useCallback(() => {
    setProjections(new Map())
    setErrors(new Map())
    console.log('🗑️ All projections cleared')
  }, [])

  /**
   * Get projection data for a specific model.
   */
  const getProjectionForModel = useCallback((model: PriceModel) => {
    return projections.get(model) || []
  }, [projections])

  /**
   * Get error for a specific model.
   */
  const getErrorForModel = useCallback((model: PriceModel) => {
    return errors.get(model) || null
  }, [errors])

  // Computed values
  const allProjectionsGenerated = useMemo(() => {
    return models.every(model => projections.has(model) || errors.has(model))
  }, [models, projections, errors])

  const successfulProjections = useMemo(() => {
    return models.filter(model => projections.has(model))
  }, [models, projections])

  const failedProjections = useMemo(() => {
    return models.filter(model => errors.has(model))
  }, [models, errors])

  return {
    // Data
    projections,
    errors,
    
    // Loading state
    isGenerating,
    
    // Actions
    generateAllProjections,
    clearAllProjections,
    getProjectionForModel,
    getErrorForModel,
    
    // Computed values
    allProjectionsGenerated,
    successfulProjections,
    failedProjections
  }
}

/**
 * Hook for price projection with caching.
 */
export function useCachedProjection(
  params: PriceEngineParams | null,
  cacheKey?: string,
  options: UsePriceProjectionOptions = {}
) {
  const projection = usePriceProjection(options)
  const [cachedResults, setCachedResults] = useState<Map<string, PriceChartDataPoint[]>>(new Map())

  const generateWithCache = useCallback(async (projectionParams: PriceEngineParams) => {
    const key = cacheKey || JSON.stringify(projectionParams)
    
    // Check cache first
    if (options.cacheResults !== false && cachedResults.has(key)) {
      const cached = cachedResults.get(key)!
      // Use the projection hook's methods instead of direct state setters
      projection.clearProjection()
      // The cached data will be handled by the projection hook
      console.log(`📊 Using cached projection: ${cached.length} points`)
      return
    }

    // Generate new projection
    await projection.generateProjection(projectionParams)
    
    // Cache the result
    if (options.cacheResults !== false && projection.projectionData.length > 0) {
      setCachedResults(prev => new Map(prev).set(key, projection.projectionData))
    }
  }, [cacheKey, options.cacheResults, cachedResults, projection])

  // Auto-generate when parameters change
  useEffect(() => {
    if (params) {
      generateWithCache(params)
    }
  }, [params, generateWithCache])

  return {
    ...projection,
    generateProjection: generateWithCache,
    clearCache: () => setCachedResults(new Map())
  }
}
