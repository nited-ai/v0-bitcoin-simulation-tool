/**
 * Calculations Integration Hook
 * 
 * Provides reactive integration with the calculations service,
 * managing calculation state, caching, and performance optimization.
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { CalculationsService } from '../services/calculationsService'
import type { 
  SimulationParams, 
  CalculationResults,
  LoanMetrics,
  CollateralMetrics,
  LiquidationMetrics,
  ATHDistanceMetrics,
  CacheStats
} from '../types'

interface CalculationsState {
  results: CalculationResults | null
  loading: boolean
  error: string | null
  lastCalculated: Date | null
}

interface CalculationsIntegrationOptions {
  enableCaching?: boolean
  autoRecalculate?: boolean
  debounceMs?: number
  athPrice?: number
}

/**
 * Hook for reactive calculations with performance optimization
 */
export function useCalculationsIntegration(
  params: SimulationParams,
  options: CalculationsIntegrationOptions = {}
) {
  const {
    enableCaching = true,
    autoRecalculate = true,
    debounceMs = 300,
    athPrice
  } = options

  const calculationsService = useMemo(() => new CalculationsService(), [])
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const lastParamsRef = useRef<string>('')

  // Calculate results with memoization
  const calculateResults = useCallback((): CalculationResults | null => {
    try {
      const validation = calculationsService.validateParameters(params)
      
      if (!validation.isValid) {
        console.warn('Invalid parameters for calculations:', validation.errors)
        return null
      }

      return calculationsService.calculateAll(params)
    } catch (error) {
      console.error('Error calculating results:', error)
      return null
    }
  }, [calculationsService, params])

  // Memoized calculation results
  const results = useMemo(() => {
    if (!autoRecalculate) return null
    return calculateResults()
  }, [calculateResults, autoRecalculate])

  // Individual metric calculations with memoization
  const loanMetrics = useMemo((): LoanMetrics | null => {
    try {
      return calculationsService.calculateLoanMetrics(params)
    } catch (error) {
      console.error('Error calculating loan metrics:', error)
      return null
    }
  }, [calculationsService, params])

  const collateralMetrics = useMemo((): CollateralMetrics | null => {
    try {
      return calculationsService.calculateCollateralMetrics(params)
    } catch (error) {
      console.error('Error calculating collateral metrics:', error)
      return null
    }
  }, [calculationsService, params])

  const liquidationMetrics = useMemo((): LiquidationMetrics | null => {
    try {
      return calculationsService.calculateLiquidationMetrics(params, athPrice)
    } catch (error) {
      console.error('Error calculating liquidation metrics:', error)
      return null
    }
  }, [calculationsService, params, athPrice])

  const athDistanceMetrics = useMemo((): ATHDistanceMetrics | null => {
    if (!athPrice) return null
    
    try {
      return calculationsService.calculateATHDistance(params.initialBtcPrice, athPrice)
    } catch (error) {
      console.error('Error calculating ATH distance metrics:', error)
      return null
    }
  }, [calculationsService, params.initialBtcPrice, athPrice])

  // Manual calculation trigger
  const recalculate = useCallback((): CalculationResults | null => {
    if (enableCaching) {
      calculationsService.clearCache()
    }
    return calculateResults()
  }, [calculateResults, calculationsService, enableCaching])

  // Debounced recalculation
  const debouncedRecalculate = useCallback((): Promise<CalculationResults | null> => {
    return new Promise((resolve) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const result = recalculate()
        resolve(result)
      }, debounceMs)
    })
  }, [recalculate, debounceMs])

  // Cache management
  const clearCache = useCallback(() => {
    calculationsService.clearCache()
  }, [calculationsService])

  const getCacheStats = useCallback((): CacheStats => {
    return calculationsService.getCacheStats()
  }, [calculationsService])

  // Performance monitoring
  const measureCalculationTime = useCallback(async (): Promise<{
    result: CalculationResults | null
    duration: number
  }> => {
    const startTime = performance.now()
    const result = calculateResults()
    const duration = performance.now() - startTime
    
    console.log(`Calculations completed in ${duration.toFixed(2)}ms`)
    
    return { result, duration }
  }, [calculateResults])

  // Parameter change detection
  const hasParametersChanged = useCallback((): boolean => {
    const currentParamsString = JSON.stringify(params)
    const hasChanged = currentParamsString !== lastParamsRef.current
    lastParamsRef.current = currentParamsString
    return hasChanged
  }, [params])

  // Effect for automatic recalculation on parameter changes
  useEffect(() => {
    if (autoRecalculate && hasParametersChanged()) {
      debouncedRecalculate()
    }
  }, [autoRecalculate, hasParametersChanged, debouncedRecalculate])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  // Validation helpers
  const isValidForCalculations = useMemo(() => {
    const validation = calculationsService.validateParameters(params)
    return validation.isValid
  }, [calculationsService, params])

  const validationErrors = useMemo(() => {
    const validation = calculationsService.validateParameters(params)
    return validation.errors
  }, [calculationsService, params])

  // Calculation status
  const calculationStatus = useMemo(() => {
    if (!isValidForCalculations) return 'invalid'
    if (!results) return 'pending'
    return 'complete'
  }, [isValidForCalculations, results])

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const cacheStats = getCacheStats()
    return {
      cacheSize: cacheStats.size,
      cacheKeys: cacheStats.keys.length,
      lastCalculated: results?.calculatedAt || null,
      isValid: isValidForCalculations,
      hasResults: !!results
    }
  }, [getCacheStats, results, isValidForCalculations])

  return {
    // Main results
    results,
    loanMetrics,
    collateralMetrics,
    liquidationMetrics,
    athDistanceMetrics,

    // Calculation control
    recalculate,
    debouncedRecalculate,
    measureCalculationTime,

    // Cache management
    clearCache,
    getCacheStats,

    // Validation
    isValidForCalculations,
    validationErrors,
    calculationStatus,

    // Performance
    performanceMetrics,
    hasParametersChanged,

    // State
    loading: calculationStatus === 'pending',
    error: !isValidForCalculations ? validationErrors.join(', ') : null,
    hasResults: !!results,
    lastCalculated: results?.calculatedAt || null
  }
}
