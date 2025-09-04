/**
 * Centralized Calculations Service
 *
 * This service consolidates all financial calculations for loan parameters,
 * providing a single source of truth for all financial computations with
 * reactive updates and comprehensive error handling.
 */

import { useMemo, useCallback } from 'react'
import type { 
  SimulationParams, 
  LoanMetrics, 
  CollateralMetrics, 
  LiquidationMetrics,
  PlatformApplicationResult,
  CalculationResults,
  ValidationResult,
  ATHDistanceMetrics,
  CollateralSufficiencyResult,
  BasicLoanValues,
  CacheStats
} from '../types'

/**
 * Centralized Calculations Service Class
 * 
 * Provides all financial calculations needed for parameter validation
 * and loan metric computation with caching and error handling.
 */
export class CalculationsService {
  private calculationCache = new Map<string, any>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Calculate liquidation metrics with optional ATH context
   */
  calculateLiquidationMetrics(params: SimulationParams, athPrice?: number): LiquidationMetrics {
    const cacheKey = `liquidation_${JSON.stringify(params)}_${athPrice || 'no-ath'}`
    
    if (this.calculationCache.has(cacheKey)) {
      const cached = this.calculationCache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value
      }
    }

    const { totalStackValue, currentLoanAmount } = this.calculateBasicLoanValues(params)
    
    // Calculate immediate liquidation price (with fees)
    const liquidationFeeMultiplier = 1 + (params.liquidationFeePercent / 100)
    const immediateLiquidationPrice = (currentLoanAmount * liquidationFeeMultiplier) / params.initialBtcAmount
    
    // Calculate true liquidation price (platform LTV threshold)
    const trueLiquidationPrice = (currentLoanAmount / params.initialBtcAmount) * (100 / params.riskManagement.liquidationLtv)
    
    // Calculate price drop percentages
    const immediatePriceDropPercentage = ((params.initialBtcPrice - immediateLiquidationPrice) / params.initialBtcPrice) * 100
    const truePriceDropPercentage = ((params.initialBtcPrice - trueLiquidationPrice) / params.initialBtcPrice) * 100
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (immediatePriceDropPercentage < 30) riskLevel = 'high'
    else if (immediatePriceDropPercentage < 50) riskLevel = 'medium'
    
    const result: LiquidationMetrics = {
      initialImmediateLiquidationPrice: Math.max(0, immediateLiquidationPrice),
      initialTrueLiquidationPrice: Math.max(0, trueLiquidationPrice),
      initialImmediatePriceDropPercentage: Math.max(0, immediatePriceDropPercentage),
      initialTruePriceDropPercentage: Math.max(0, truePriceDropPercentage),
      initialLiquidationRiskLevel: riskLevel
    }

    // Add ATH-based calculations if ATH price provided
    if (athPrice && athPrice > 0) {
      const athLiquidationPrice = immediateLiquidationPrice
      const athPriceDropPercentage = ((athPrice - athLiquidationPrice) / athPrice) * 100
      
      result.initialATHLiquidationPrice = athLiquidationPrice
      result.initialATHPriceDropPercentage = Math.max(0, athPriceDropPercentage)
    }

    // Cache result
    this.calculationCache.set(cacheKey, {
      value: result,
      timestamp: Date.now()
    })

    return result
  }

  /**
   * Calculate collateral metrics
   */
  calculateCollateralMetrics(params: SimulationParams): CollateralMetrics {
    const cacheKey = `collateral_${JSON.stringify(params)}`
    
    if (this.calculationCache.has(cacheKey)) {
      const cached = this.calculationCache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value
      }
    }

    const { totalStackValue, currentLoanAmount } = this.calculateBasicLoanValues(params)
    
    // Calculate locked collateral based on target LTV
    const lockedCollateralBtc = currentLoanAmount / (params.initialBtcPrice * (params.riskManagement.targetLtv / 100))
    
    // Calculate free collateral
    const freeCollateralBtc = Math.max(0, params.initialBtcAmount - lockedCollateralBtc)
    
    // Calculate utilization percentage
    const collateralUtilizationPercent = params.initialBtcAmount > 0
      ? (lockedCollateralBtc / params.initialBtcAmount) * 100
      : 0
    
    // Calculate values in USD
    const lockedCollateralValue = lockedCollateralBtc * params.initialBtcPrice
    const freeCollateralValue = freeCollateralBtc * params.initialBtcPrice
    
    // Check sufficiency
    const isSufficient = lockedCollateralBtc <= params.initialBtcAmount

    const result: CollateralMetrics = {
      initialTotalStackValue: totalStackValue,
      initialLockedCollateralBtc: Math.max(0, lockedCollateralBtc),
      initialFreeCollateralBtc: Math.max(0, freeCollateralBtc),
      initialCollateralUtilizationPercent: Math.max(0, Math.min(100, collateralUtilizationPercent)),
      initialLockedCollateralValue: Math.max(0, lockedCollateralValue),
      initialFreeCollateralValue: Math.max(0, freeCollateralValue),
      isSufficient
    }

    // Cache result
    this.calculationCache.set(cacheKey, {
      value: result,
      timestamp: Date.now()
    })

    return result
  }

  /**
   * Calculate loan metrics
   */
  calculateLoanMetrics(params: SimulationParams): LoanMetrics {
    const cacheKey = `loan_${JSON.stringify(params)}`
    
    if (this.calculationCache.has(cacheKey)) {
      const cached = this.calculationCache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value
      }
    }

    const { totalStackValue, currentLoanAmount, originationFee, totalInterestPayment, totalLoanCost } = this.calculateBasicLoanValues(params)
    
    // Calculate maximum loan capacity
    const maxLoanCapacity = totalStackValue * (params.maxInitialLtv / 100)
    
    // Calculate available borrowing capacity
    const availableBorrowingCapacity = Math.max(0, maxLoanCapacity - currentLoanAmount)
    
    // Calculate utilization percentages
    const loanUtilizationPercent = maxLoanCapacity > 0 ? (currentLoanAmount / maxLoanCapacity) * 100 : 0
    const availableCapacityPercent = maxLoanCapacity > 0 ? (availableBorrowingCapacity / maxLoanCapacity) * 100 : 0
    
    // Calculate monthly interest payment
    const monthlyInterestRate = params.riskManagement.annualInterestRate / 100 / 12
    const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate

    const result: LoanMetrics = {
      initialCurrentLoanAmount: currentLoanAmount,
      initialOriginationFee: originationFee,
      initialTotalLoanCost: totalLoanCost,
      initialMaxLoanCapacity: maxLoanCapacity,
      initialLoanUtilizationPercent: Math.max(0, Math.min(100, loanUtilizationPercent)),
      initialAvailableBorrowingCapacity: availableBorrowingCapacity,
      initialAvailableCapacityPercent: Math.max(0, Math.min(100, availableCapacityPercent)),
      initialMonthlyInterestPayment: monthlyInterestPayment,
      initialTotalInterestPayment: totalInterestPayment
    }

    // Cache result
    this.calculationCache.set(cacheKey, {
      value: result,
      timestamp: Date.now()
    })

    return result
  }

  /**
   * Apply platform configuration to parameters
   */
  applyPlatformConfig(params: SimulationParams): PlatformApplicationResult {
    // For now, return the current platform as applied
    // This would be expanded to handle platform-specific logic
    return {
      appliedPlatform: params.platform,
      updatedParams: {},
      configSource: params.platform === 'custom' ? 'custom' : 'platform',
      warnings: []
    }
  }

  /**
   * Validate simulation parameters
   */
  validateParameters(params: SimulationParams): ValidationResult {
    const errors: string[] = []

    // Validate BTC amount
    if (!params.initialBtcAmount || params.initialBtcAmount <= 0) {
      errors.push('BTC amount must be greater than 0')
    }

    // Validate BTC price
    if (!params.initialBtcPrice || params.initialBtcPrice <= 0) {
      errors.push('BTC price must be greater than 0')
    }

    // Validate loan percentage
    if (params.loanAmountPercent < 0 || params.loanAmountPercent > 100) {
      errors.push('loan amount percentage must be between 0 and 100')
    }

    // Validate interest rate
    if (params.riskManagement.annualInterestRate < 0 || params.riskManagement.annualInterestRate > 50) {
      errors.push('interest rate must be between 0 and 50%')
    }

    // Validate LTV values
    if (params.riskManagement.targetLtv < 0 || params.riskManagement.targetLtv > 100) {
      errors.push('Target LTV must be between 0 and 100%')
    }

    if (params.riskManagement.liquidationLtv < 0 || params.riskManagement.liquidationLtv > 100) {
      errors.push('Liquidation LTV must be between 0 and 100%')
    }

    // Validate loan term
    if (params.riskManagement.loanTermMonths !== Infinity && params.riskManagement.loanTermMonths <= 0) {
      errors.push('Loan term must be greater than 0 months or infinity')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate basic loan values used across multiple calculations
   */
  private calculateBasicLoanValues(params: SimulationParams): BasicLoanValues {
    const totalStackValue = params.initialBtcAmount * params.initialBtcPrice
    const currentLoanAmount = totalStackValue * (params.loanAmountPercent / 100)

    // Calculate origination fee
    let originationFee = 0
    if (params.originationFeeType === 'one-time') {
      originationFee = currentLoanAmount * (params.originationFeePercent / 100)
    } else if (params.originationFeeType === 'annual') {
      const annualOriginationFee = currentLoanAmount * (params.originationFeePercent / 100)
      const loanTermYears = params.riskManagement.loanTermMonths === Infinity
        ? 1 // For infinite loans, calculate 1 year of fees as reference
        : params.riskManagement.loanTermMonths / 12
      originationFee = annualOriginationFee * loanTermYears
    }

    // Calculate total interest
    const monthlyInterestRate = params.riskManagement.annualInterestRate / 100 / 12
    const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate

    let totalInterestPayment = 0
    if (params.riskManagement.loanTermMonths === Infinity) {
      totalInterestPayment = monthlyInterestPayment * 12 // 12 months reference
    } else {
      totalInterestPayment = monthlyInterestPayment * params.riskManagement.loanTermMonths
    }

    const totalLoanCost = currentLoanAmount + originationFee + totalInterestPayment

    return {
      totalStackValue,
      currentLoanAmount,
      originationFee,
      totalInterestPayment,
      totalLoanCost
    }
  }

  /**
   * Calculate ATH distance metrics
   */
  calculateATHDistance(currentPrice: number, athPrice: number): ATHDistanceMetrics {
    const distancePercent = athPrice > 0 ? ((athPrice - currentPrice) / athPrice) * 100 : 0
    const distanceUSD = athPrice - currentPrice

    let riskLevel: 'low' | 'medium' | 'high'
    let riskColor: string
    let riskDescription: string

    if (distancePercent < 0) {
      riskLevel = 'low'
      riskColor = 'text-green-600'
      riskDescription = 'Above ATH - New highs'
    } else if (distancePercent < 20) {
      riskLevel = 'low'
      riskColor = 'text-green-600'
      riskDescription = 'Near ATH - Low risk'
    } else if (distancePercent < 50) {
      riskLevel = 'medium'
      riskColor = 'text-yellow-600'
      riskDescription = 'Moderate distance from ATH'
    } else {
      riskLevel = 'high'
      riskColor = 'text-red-600'
      riskDescription = 'Far from ATH - Higher risk'
    }

    return {
      distancePercent,
      distanceUSD,
      riskLevel,
      riskColor,
      riskDescription
    }
  }

  /**
   * Calculate all metrics in a single call
   */
  calculateAll(params: SimulationParams): CalculationResults {
    const validation = this.validateParameters(params)

    if (!validation.isValid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
    }

    return {
      liquidation: this.calculateLiquidationMetrics(params),
      collateral: this.calculateCollateralMetrics(params),
      loan: this.calculateLoanMetrics(params),
      platform: this.applyPlatformConfig(params),
      validation,
      calculatedAt: new Date()
    }
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.calculationCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      size: this.calculationCache.size,
      keys: Array.from(this.calculationCache.keys())
    }
  }
}

/**
 * React hook for reactive calculations with automatic memoization
 */
export function useCalculations(params: SimulationParams): CalculationResults | null {
  const service = useMemo(() => new CalculationsService(), [])

  const validation = useMemo(() => {
    return service.validateParameters(params)
  }, [service, params])

  const calculations = useMemo(() => {
    if (!validation.isValid) {
      console.warn('Invalid parameters for calculations:', validation.errors)
      return null
    }

    try {
      return service.calculateAll(params)
    } catch (error) {
      console.error('Error calculating metrics:', error)
      return null
    }
  }, [service, validation, params])

  const clearCache = useCallback(() => {
    try {
      service.clearCache()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }, [service])

  const getCacheStats = useCallback(() => {
    try {
      return service.getCacheStats()
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return { size: 0, keys: [] }
    }
  }, [service])

  return calculations
}
