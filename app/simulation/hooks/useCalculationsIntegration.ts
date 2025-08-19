"use client"

import { useMemo, useCallback, useEffect, useState } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { useCalculations } from '../components/parameters/calculationsService'
import type { SimulationParams } from '../types/simulation'
import type { CalculationResults } from '../components/parameters/calculationsService'

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
      initialBtcAmount: params.btcAmount,
      initialBtcPrice: params.initialBtcPrice,
      loanAmountPercent: params.loanAmountPercent,
      platform: params.platform as "strike" | "firefish" | "custom",
      riskManagement: {
        targetLtv: params.riskManagement.targetLtv,
        maxLoanAmount: params.maxLoanAmount,
        annualInterestRate: params.annualInterestRate,
        loanTermMonths: params.loanTermMonths,
        liquidationFeePercent: params.liquidationFeePercent
      }
    }
  }, [
    params.btcAmount,
    params.initialBtcPrice,
    params.loanAmountPercent,
    params.platform,
    params.riskManagement.targetLtv,
    params.maxLoanAmount,
    params.annualInterestRate,
    params.loanTermMonths,
    params.liquidationFeePercent
  ])

  // Get calculations using the centralized service
  const calculations = useCalculations(calculationParams)

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
      setParams(prev => ({ ...prev, btcAmount: amount }))
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

  // Cache management - removed as not implemented in calculations service
  const cacheManagement = useMemo(() => ({
    clearCache: () => {},
    getCacheStats: () => ({ size: 0, keys: [] })
  }), [])

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
