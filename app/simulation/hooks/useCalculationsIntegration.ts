"use client"

import { useMemo, useCallback, useEffect, useState } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { useCalculations, type CalculationResults } from '../tabs/parameters/calculationsService'
import type { SimulationParams } from '../types/simulation'

/**
 * Integration hook that bridges useCalculations with useSimulation context
 * 
 * This hook provides seamless integration between the centralized calculations service
 * and the existing simulation context without breaking changes to existing components.
 */
export function useCalculationsIntegration() {
  const { params, setParams, addError, clearErrors } = useSimulation()
  const [calculationErrors, setCalculationErrors] = useState<string[]>([])

  // Convert SimulationParams to CalculationsService format
  // Note: Removed monthlyWithdrawal and btcAccumulation as they belong in strategy tab
  const calculationParams = useMemo(() => {
    return {
      initialBtcAmount: params.initialBtcAmount,
      initialBtcPrice: params.initialBtcPrice,
      loanAmountPercent: params.loanAmountPercent,
      platform: params.platform, // FIX: Remove type casting to allow custom platform IDs
      // FIX: Add platform-specific parameters that were missing
      originationFeePercent: params.originationFeePercent,
      originationFeeType: params.originationFeeType,
      maxInitialLtv: params.maxInitialLtv,
      availableLoanTerms: params.availableLoanTerms,
      riskManagement: {
        targetLtv: params.riskManagement.targetLtv,
        maxLoanAmount: params.maxLoanAmount,
        annualInterestRate: params.annualInterestRate,
        loanTermMonths: params.loanTermMonths,
        liquidationFeePercent: params.liquidationFeePercent,
        liquidationLtv: params.riskManagement.liquidationLtv // FIX: Add missing liquidation LTV
      }
    }
  }, [
    params.initialBtcAmount,
    params.initialBtcPrice,
    params.loanAmountPercent,
    params.platform,
    params.riskManagement.targetLtv,
    params.maxLoanAmount,
    params.annualInterestRate,
    params.loanTermMonths,
    params.liquidationFeePercent,
    // FIX: Add platform-specific parameters to ensure recalculation when they change
    params.originationFeePercent,
    params.originationFeeType,
    params.maxInitialLtv,
    params.availableLoanTerms,
    params.riskManagement.liquidationLtv // FIX: Add missing liquidation LTV dependency
  ])

  // Get calculations using the centralized service
  const calculations = useCalculations(calculationParams)

  // Extract cache management functions from calculations (if available)
  const calculationsClearCache = (calculations as any)?.clearCache
  const calculationsGetCacheStats = (calculations as any)?.getCacheStats

  // Handle calculation errors
  useEffect(() => {
    if (calculations?.validation && !calculations.validation.isValid) {
      const errors = calculations.validation.errors
      setCalculationErrors(errors)
      
      // Add errors to simulation context
      errors.forEach(error => addError(`Calculation Error: ${error}`))
    } else {
      setCalculationErrors([])
    }
  }, [calculations?.validation, addError])

  // Provide helper functions for common calculations
  const helpers = useMemo(() => ({
    // Liquidation helpers
    getLiquidationPrice: (immediate = true) => {
      return immediate
        ? calculations?.liquidation.initialImmediateLiquidationPrice || 0
        : calculations?.liquidation.initialTrueLiquidationPrice || 0
    },

    getPriceDropPercentage: (immediate = true) => {
      return immediate
        ? calculations?.liquidation.initialImmediatePriceDropPercentage || 0
        : calculations?.liquidation.initialTruePriceDropPercentage || 0
    },

    // Collateral helpers
    getLockedCollateral: (inBtc = true) => {
      return inBtc
        ? calculations?.collateral.initialLockedCollateralBtc || 0
        : calculations?.collateral.initialLockedCollateralValue || 0
    },

    getFreeCollateral: (inBtc = true) => {
      return inBtc
        ? calculations?.collateral.initialFreeCollateralBtc || 0
        : calculations?.collateral.initialFreeCollateralValue || 0
    },

    getCollateralUtilization: () => {
      return calculations?.collateral.initialCollateralUtilizationPercent || 0
    },

    // Loan helpers
    getCurrentLoanAmount: () => {
      return calculations?.loan.initialCurrentLoanAmount || 0
    },

    getMaxLoanCapacity: () => {
      return calculations?.loan.initialMaxLoanCapacity || 0
    },

    getAvailableBorrowingCapacity: () => {
      return calculations?.loan.initialAvailableBorrowingCapacity || 0
    },

    getLoanUtilization: () => {
      return calculations?.loan.initialLoanUtilizationPercent || 0
    },

    // Validation helpers
    isValid: () => {
      return calculations?.validation.isValid || false
    },

    getValidationErrors: () => {
      return calculations?.validation.errors || []
    },

    getValidationWarnings: () => {
      return calculations?.validation.warnings || []
    },

    // Platform helpers
    getPlatformConfig: () => {
      return calculations?.platform || null
    }
  }), [calculations])

  // Provide update functions that work with simulation context
  const updateFunctions = useMemo(() => ({
    updateBtcAmount: (amount: number) => {
      setParams(prev => ({ ...prev, initialBtcAmount: amount }))
    },

    updateBtcPrice: (price: number) => {
      setParams(prev => ({ ...prev, initialBtcPrice: price }))
    },

    updateLoanPercentage: (percentage: number) => {
      setParams(prev => ({ ...prev, loanAmountPercent: percentage }))
    },

    updateTargetLtv: (ltv: number) => {
      setParams(prev => ({
        ...prev,
        riskManagement: { ...prev.riskManagement, targetLtv: ltv }
      }))
    },

    updatePlatform: (platform: string) => {
      setParams(prev => ({ ...prev, platform }))
    }
  }), [setParams])

  // Cache management - use the cache functions from the actual calculations
  const cacheManagement = useMemo(() => ({
    clearCache: () => {
      if (calculationsClearCache) {
        calculationsClearCache()
      } else {
        console.warn('Cache clearing function not available')
      }
    },
    getCacheStats: () => {
      if (calculationsGetCacheStats) {
        return calculationsGetCacheStats()
      } else {
        console.warn('Cache stats function not available')
        return { size: 0, keys: [] }
      }
    }
  }), [calculationsClearCache, calculationsGetCacheStats])

  return {
    // Core calculations
    calculations,
    
    // Helper functions
    ...helpers,
    
    // Update functions
    ...updateFunctions,
    
    // Cache management
    ...cacheManagement,
    
    // Error handling
    hasCalculationErrors: calculationErrors.length > 0,
    calculationErrors,
    clearCalculationErrors: () => setCalculationErrors([]),
    
    // Status
    isCalculating: !calculations,
    lastCalculated: calculations?.calculatedAt || null
  }
}

/**
 * Simplified hook for components that only need specific calculation results
 */
export function useSpecificCalculations<T extends keyof CalculationResults>(
  calculationType: T
): CalculationResults[T] | null {
  const { calculations } = useCalculationsIntegration()
  
  return useMemo(() => {
    return calculations?.[calculationType] || null
  }, [calculations, calculationType])
}

/**
 * Hook for liquidation-specific calculations
 */
export function useLiquidationCalculations() {
  return useSpecificCalculations('liquidation')
}

/**
 * Hook for collateral-specific calculations
 */
export function useCollateralCalculations() {
  return useSpecificCalculations('collateral')
}

/**
 * Hook for loan-specific calculations
 */
export function useLoanCalculations() {
  return useSpecificCalculations('loan')
}
