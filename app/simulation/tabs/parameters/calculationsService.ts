/**
 * Centralized Calculations Service
 *
 * This service consolidates all financial calculations currently scattered across
 * parameter tab components, providing a single source of truth for all financial
 * computations with reactive updates and comprehensive error handling.
 */

import { useMemo, useCallback } from 'react'
import { getPlatformConfig as getMainPlatformConfig } from '../../constants/platformPresets'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Parameters tab simulation parameters interface - all inputs needed for initial loan calculations
 */
export interface SimulationParams {
  /** Initial amount of BTC in the user's stack */
  initialBtcAmount: number
  /** Initial BTC price in USD */
  initialBtcPrice: number
  /** Loan amount as percentage of total BTC stack value */
  loanAmountPercent: number
  /** Selected lending platform */
  platform: string // FIX: Allow custom platform IDs like 'custom-123456789'
  /** Platform-specific origination fee percentage */
  originationFeePercent: number
  /** Platform-specific origination fee type */
  originationFeeType: 'one-time' | 'annual'
  /** Platform-specific maximum initial LTV */
  maxInitialLtv: number
  /** Platform-specific available loan terms */
  availableLoanTerms: (number | 'infinity')[]
  /** Risk management parameters */
  riskManagement: {
    /** Target LTV ratio percentage */
    targetLtv: number
    /** Maximum loan amount in USD */
    maxLoanAmount: number
    /** Annual interest rate percentage */
    annualInterestRate: number
    /** Loan term in months */
    loanTermMonths: number
    /** Liquidation fee percentage */
    liquidationFeePercent: number
    /** Platform-specific liquidation LTV */
    liquidationLtv: number
  }
}

/**
 * Initial liquidation analysis results for parameters tab
 */
export interface LiquidationMetrics {
  /** Initial immediate liquidation price (without free collateral top-up) */
  initialImmediateLiquidationPrice: number
  /** Initial immediate price drop percentage required for liquidation */
  initialImmediatePriceDropPercentage: number
  /** Initial true liquidation price (with free collateral available) */
  initialTrueLiquidationPrice: number
  /** Initial true price drop percentage required for liquidation */
  initialTruePriceDropPercentage: number
  /** Initial amount of free BTC available for collateral top-up */
  initialFreeBtcAmount: number
  /** Whether initial free collateral is available */
  initialHasFreeCollateral: boolean
  /** Initial current BTC price used in calculations */
  initialCurrentBtcPrice: number
  /** ATH price for comparison calculations */
  athPrice?: number
  /** ATH-based liquidation metrics */
  athMetrics?: {
    liquidationPrice: number
    priceDropPercentage: number
    trueLiquidationPrice: number
    truePriceDropPercentage: number
  }
}

/**
 * Initial collateral management results for parameters tab
 */
export interface CollateralMetrics {
  /** Initial total BTC stack value in USD */
  initialTotalStackValue: number
  /** Initial amount of BTC locked as collateral */
  initialLockedCollateralBtc: number
  /** Initial amount of free BTC available */
  initialFreeCollateralBtc: number
  /** Initial collateral utilization as percentage */
  initialCollateralUtilizationPercent: number
  /** Initial locked collateral value in USD */
  initialLockedCollateralValue: number
  /** Initial free collateral value in USD */
  initialFreeCollateralValue: number
  /** Whether initial collateral is sufficient for current loan */
  isSufficient: boolean
}

/**
 * ATH distance metrics for collateral risk analysis
 */
export interface ATHDistanceMetrics {
  /** Current ATH price in USD */
  athPrice: number
  /** Current BTC price in USD */
  currentPrice: number
  /** Distance from ATH as percentage (positive = below ATH) */
  distancePercent: number
  /** Distance from ATH in USD (positive = below ATH) */
  distanceUSD: number
  /** Risk level based on ATH proximity */
  riskLevel: 'low' | 'medium' | 'high'
  /** Color code for risk visualization */
  riskColor: string
  /** Human-readable risk description */
  riskDescription: string
}

/**
 * Initial loan metrics and calculations for parameters tab
 */
export interface LoanMetrics {
  /** Initial net cash advance in USD, after applying borrowing limits */
  initialCurrentLoanAmount: number
  /** Initial origination fee amount */
  initialOriginationFee: number
  /** Initial debt: net cash advance plus financed origination fees, before daily interest */
  initialTotalLoanCost: number
  /** Initial maximum loan capacity based on platform limits */
  initialMaxLoanCapacity: number
  /** Initial loan utilization as percentage of max capacity */
  initialLoanUtilizationPercent: number
  /** Initial available borrowing capacity remaining */
  initialAvailableBorrowingCapacity: number
  /** Initial available capacity as percentage */
  initialAvailableCapacityPercent: number
  /** Initial monthly interest payment */
  initialMonthlyInterestPayment: number
  /** Simple interest estimate on opening debt for the term (12-month reference for open terms) */
  initialTotalInterestPayment: number
}

/**
 * Platform-specific configuration and metrics
 */
export interface PlatformMetrics {
  /** Platform name */
  platform: string
  /** Maximum initial LTV allowed */
  maxInitialLtv: number
  /** Liquidation LTV threshold */
  liquidationLtv: number
  /** Origination fee percentage */
  originationFeePercent: number
  /** Platform-specific calculations applied */
  appliedConfig: {
    maxLoanAmount: number
    interestRate: number
    liquidationFee: number
  }
}

/**
 * Parameter validation results
 */
export interface ValidationResult {
  /** Whether all parameters are valid */
  isValid: boolean
  /** Array of validation error messages */
  errors: string[]
  /** Array of warning messages */
  warnings: string[]
  /** Validation details for each parameter */
  details: {
    initialBtcAmount: { valid: boolean; message?: string }
    initialBtcPrice: { valid: boolean; message?: string }
    loanAmountPercent: { valid: boolean; message?: string }
    platform: { valid: boolean; message?: string }
    riskManagement: { valid: boolean; message?: string }
  }
}

/**
 * Complete calculation results interface
 */
export interface CalculationResults {
  /** Liquidation analysis results */
  liquidation: LiquidationMetrics
  /** Collateral management results */
  collateral: CollateralMetrics
  /** Loan metrics and calculations */
  loan: LoanMetrics
  /** Platform-specific metrics */
  platform: PlatformMetrics
  /** Parameter validation results */
  validation: ValidationResult
  /** Timestamp of calculation */
  calculatedAt: Date
}

// ============================================================================
// CALCULATIONS SERVICE CLASS
// ============================================================================

/**
 * Centralized service for all financial calculations
 * 
 * This class provides a single source of truth for all financial computations
 * used across parameter tab components, with comprehensive error handling,
 * performance optimization, and platform-agnostic design.
 */
export class CalculationsService {
  private static instance: CalculationsService
  private calculationCache: Map<string, any> = new Map()

  constructor() {
    // Singleton pattern for consistent service instance
    if (CalculationsService.instance) {
      return CalculationsService.instance
    }
    CalculationsService.instance = this
  }

  /**
   * Calculate liquidation metrics including immediate and true liquidation scenarios
   * This method exactly matches the logic from PriceDropToleranceCard component
   *
   * @param athPrice - All-time high price (required). Callers obtain this from
   *   `usePriceData()` and pass it explicitly. No internal fallback — pass a
   *   sensible sentinel (e.g. `currentPrice`) if ATH is not yet loaded.
   */
  calculateLiquidationMetrics(params: SimulationParams, athPrice: number): LiquidationMetrics {
    const finalAthPrice = athPrice
    const cacheKey = `liquidation-${JSON.stringify(params)}-ath-${finalAthPrice}`
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey)
    }

    // Use shared basic calculation method to eliminate redundancy
    const { currentLoanAmount, totalLoanCost, lockedCollateralBtc: btcLockedAsCollateral } = this.calculateBasicLoanValues(params)


    // Calculate free BTC available for collateral top-up
    const freeBtcAmount = Math.max(0, params.initialBtcAmount - btcLockedAsCollateral)
    const hasFreeCollateral = freeBtcAmount > 0

    // Initialize liquidation variables
    let liquidationPrice = 0
    let priceDropPercentage = 0
    let trueLiquidationPrice = 0
    let truePriceDropPercentage = 0

    // Calculate liquidation metrics only if there's a loan
    if (currentLoanAmount > 0 && params.initialBtcAmount > 0 && btcLockedAsCollateral > 0) {
      // Immediate liquidation price calculation (without free collateral top-up)
      // Uses platform-specific liquidation LTV from simulation parameters
      liquidationPrice = totalLoanCost / (params.riskManagement.liquidationLtv / 100) / btcLockedAsCollateral

      // Calculate immediate price drop percentage
      priceDropPercentage = Math.max(0, ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100)

      // True liquidation price calculation (with free collateral available)
      trueLiquidationPrice = hasFreeCollateral
        ? totalLoanCost / (params.riskManagement.liquidationLtv / 100) / params.initialBtcAmount
        : liquidationPrice // Same as immediate liquidation if no free collateral

      // Calculate true price drop percentage
      truePriceDropPercentage = Math.max(0, ((params.initialBtcPrice - trueLiquidationPrice) / params.initialBtcPrice) * 100)
    }

    // ATH calculations (use dynamic ATH or fallback to constant)
    const athMetrics = this.calculateAthLiquidationMetrics(liquidationPrice, trueLiquidationPrice, finalAthPrice)

    const result: LiquidationMetrics = {
      initialImmediateLiquidationPrice: Math.max(0, liquidationPrice),
      initialImmediatePriceDropPercentage: Math.max(0, Math.min(100, priceDropPercentage)),
      initialTrueLiquidationPrice: Math.max(0, trueLiquidationPrice),
      initialTruePriceDropPercentage: Math.max(0, Math.min(100, truePriceDropPercentage)),
      initialFreeBtcAmount: freeBtcAmount,
      initialHasFreeCollateral: hasFreeCollateral,
      initialCurrentBtcPrice: params.initialBtcPrice,
      athPrice: finalAthPrice,
      athMetrics
    }

    this.calculationCache.set(cacheKey, result)
    return result
  }

  /**
   * Calculate collateral management metrics
   * This method exactly matches the logic from CollateralVisualizationCard component
   */
  calculateCollateralMetrics(params: SimulationParams): CollateralMetrics {
    const cacheKey = `collateral-${JSON.stringify(params)}`
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey)
    }

    // Use shared basic calculation method to eliminate redundancy
    const { totalStackValue, lockedCollateralBtc } = this.calculateBasicLoanValues(params)

    // Calculate free collateral (remaining BTC available)
    const freeCollateralBtc = Math.max(0, params.initialBtcAmount - lockedCollateralBtc)

    // Calculate collateral utilization percentage (matching component logic)
    const collateralUtilizationPercent = params.initialBtcAmount > 0
      ? (lockedCollateralBtc / params.initialBtcAmount) * 100
      : 0

    // Calculate free collateral percentage (for compatibility with CollateralVisualizationCard)
    const freeCollateralPercentage = params.initialBtcAmount > 0
      ? (freeCollateralBtc / params.initialBtcAmount) * 100
      : 0

    // Calculate collateral values in USD
    const lockedCollateralValue = lockedCollateralBtc * params.initialBtcPrice
    const freeCollateralValue = freeCollateralBtc * params.initialBtcPrice

    // Check if collateral is sufficient for the current loan
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

    this.calculationCache.set(cacheKey, result)
    return result
  }

  /**
   * Calculate loan metrics and costs
   * This method includes logic from both LoanUsageVisualizationCard and general loan calculations
   */
  calculateLoanMetrics(params: SimulationParams): LoanMetrics {
    const cacheKey = `loan-${JSON.stringify(params)}`
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey)
    }

    // Use shared basic calculation method to eliminate redundancy
    const { currentLoanAmount, originationFee, totalInterestPayment, totalLoanCost, maxLoanCapacity } = this.calculateBasicLoanValues(params)

    // Calculate available borrowing capacity (matching LoanUsageVisualizationCard)
    const availableBorrowingCapacity = Math.max(0, maxLoanCapacity - currentLoanAmount)

    // Calculate loan utilization percentage (matching LoanUsageVisualizationCard)
    const loanUtilizationPercent = maxLoanCapacity > 0
      ? (currentLoanAmount / maxLoanCapacity) * 100
      : 0

    // Calculate available capacity percentage (matching LoanUsageVisualizationCard)
    const availableCapacityPercent = maxLoanCapacity > 0
      ? (availableBorrowingCapacity / maxLoanCapacity) * 100
      : 100

    // Calculate monthly interest payment
    const monthlyInterestRate = params.riskManagement.annualInterestRate / 100 / 12
    const monthlyInterestPayment = totalLoanCost * monthlyInterestRate

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

    this.calculationCache.set(cacheKey, result)
    return result
  }

  /**
   * Apply platform-specific configurations from simulation parameters
   */
  applyPlatformConfig(params: SimulationParams): PlatformMetrics {
    // Get platform name from localStorage for display purposes only
    const platformConfig = this.getPlatformConfig(params.platform)

    return {
      platform: platformConfig.name, // Keep name from config for display
      maxInitialLtv: params.maxInitialLtv, // Use values from simulation parameters
      liquidationLtv: params.riskManagement.liquidationLtv,
      originationFeePercent: params.originationFeePercent,
      appliedConfig: {
        maxLoanAmount: params.riskManagement.maxLoanAmount,
        interestRate: params.riskManagement.annualInterestRate,
        liquidationFee: params.riskManagement.liquidationFeePercent
      }
    }
  }

  /**
   * Validate all simulation parameters
   */
  validateParameters(params: SimulationParams): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate BTC amount
    const btcAmountValid = params.initialBtcAmount > 0
    if (!btcAmountValid) {
      errors.push('Initial BTC amount must be positive')
    }

    // Validate BTC price
    const btcPriceValid = params.initialBtcPrice > 0
    if (!btcPriceValid) {
      errors.push('BTC price must be positive')
    }

    // Validate loan amount percentage
    const loanPercentValid = params.loanAmountPercent >= 0 && params.loanAmountPercent <= 100
    if (!loanPercentValid) {
      errors.push('Loan amount percentage must be between 0 and 100')
    }

    // Validate platform
    const platformValid = ['firefish', 'strike', 'coinbase', 'custom'].includes(params.platform) || params.platform.startsWith('custom-')
    if (!platformValid) {
      errors.push('Invalid platform selection')
    }

    // Validate risk management parameters
    const riskManagementValid = this.validateRiskManagement(params.riskManagement)
    if (!riskManagementValid.valid) {
      errors.push(...riskManagementValid.errors)
    }
    if (params.riskManagement.loanTermMonths === Infinity && params.originationFeeType === 'annual' && params.originationFeePercent > 0) {
      errors.push('Open-ended loans require a one-time origination fee')
    }

    // Add warnings for edge cases
    if (params.initialBtcAmount < 0.01) {
      warnings.push('Very small initial BTC amount may lead to imprecise calculations')
    }

    if (params.loanAmountPercent > 50) {
      warnings.push('High loan percentage increases liquidation risk')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        initialBtcAmount: { valid: btcAmountValid, message: btcAmountValid ? undefined : 'Must be positive' },
        initialBtcPrice: { valid: btcPriceValid, message: btcPriceValid ? undefined : 'Must be positive' },
        loanAmountPercent: { valid: loanPercentValid, message: loanPercentValid ? undefined : 'Must be 0-100%' },
        platform: { valid: platformValid, message: platformValid ? undefined : 'Invalid platform' },
        riskManagement: { valid: riskManagementValid.valid, message: riskManagementValid.errors.join(', ') || undefined }
      }
    }
  }

  /**
   * Calculate all metrics in a single call
   *
   * @param athPrice - All-time high price (required). Pass from `usePriceData()`
   *   in the calling component, or use `params.initialBtcPrice` as a sentinel.
   */
  calculateAll(params: SimulationParams, athPrice: number): CalculationResults {
    const validation = this.validateParameters(params)

    if (!validation.isValid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
    }

    return {
      liquidation: this.calculateLiquidationMetrics(params, athPrice),
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
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.calculationCache.size,
      keys: Array.from(this.calculationCache.keys())
    }
  }

  /**
   * Get platform configuration (private helper)
   * Uses the centralized platform configuration from platformPresets.ts
   */
  private getPlatformConfig(platform: string) {
    // Use the centralized platform configuration function
    // This ensures single source of truth and eliminates duplication
    return getMainPlatformConfig(platform)
  }

  /**
   * Calculate basic loan values shared across all calculation methods
   * This eliminates the redundant calculation code that was repeated 4 times
   */
  private calculateBasicLoanValues(params: SimulationParams) {
    const totalStackValue = params.initialBtcAmount * params.initialBtcPrice
    const targetLtv = Math.min(params.riskManagement.targetLtv, params.maxInitialLtv) / 100
    const term = params.riskManagement.loanTermMonths
    if (term === Infinity && params.originationFeeType === 'annual' && params.originationFeePercent > 0) {
      throw new Error('Open-ended loans require a one-time origination fee')
    }
    const feeRate = params.originationFeePercent / 100 * (
      params.originationFeeType === 'annual' && Number.isFinite(term) ? term / 12 : 1
    )

    // Both limits constrain opening debt, including financed fees.
    const debtCapacity = Math.max(0, Math.min(totalStackValue * targetLtv, params.riskManagement.maxLoanAmount))
    const maxLoanCapacity = debtCapacity / (1 + feeRate)
    const currentLoanAmount = Math.max(0, Math.min((params.loanAmountPercent / 100) * totalStackValue, maxLoanCapacity))
    const originationFee = currentLoanAmount * feeRate
    const totalLoanCost = currentLoanAmount + originationFee
    const lockedCollateralBtc = totalLoanCost > 0 && params.initialBtcPrice > 0 && targetLtv > 0
      ? Math.min(params.initialBtcAmount, totalLoanCost / (params.initialBtcPrice * targetLtv))
      : 0

    // This is only a simple estimate. Actual interest accrues daily in the engine;
    // it does not increase opening debt, pledged BTC, or initial liquidation prices.
    const referenceMonths = term === Infinity ? 12 : term
    const totalInterestPayment = totalLoanCost * params.riskManagement.annualInterestRate / 100 * referenceMonths / 12

    return {
      totalStackValue,
      currentLoanAmount,
      originationFee,
      totalInterestPayment,
      totalLoanCost,
      maxLoanCapacity,
      lockedCollateralBtc
    }
  }

  /**
   * Validate collateral sufficiency for a given loan amount
   * This method provides detailed validation logic for collateral requirements
   */
  validateCollateralSufficiency(params: SimulationParams): {
    isSufficient: boolean
    requiredCollateralBtc: number
    availableCollateralBtc: number
    shortfallBtc: number
    shortfallUsd: number
    utilizationPercent: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    warnings: string[]
  } {
    // Use shared basic calculation method to eliminate redundancy
    const { lockedCollateralBtc: requiredCollateralBtc } = this.calculateBasicLoanValues(params)
    const availableCollateralBtc = params.initialBtcAmount
    const shortfallBtc = Math.max(0, requiredCollateralBtc - availableCollateralBtc)
    const shortfallUsd = shortfallBtc * params.initialBtcPrice

    const isSufficient = requiredCollateralBtc <= availableCollateralBtc
    const utilizationPercent = availableCollateralBtc > 0
      ? (requiredCollateralBtc / availableCollateralBtc) * 100
      : 0

    // Determine risk level based on utilization
    let riskLevel: 'low' | 'medium' | 'high' | 'critical'
    if (utilizationPercent <= 30) riskLevel = 'low'
    else if (utilizationPercent <= 60) riskLevel = 'medium'
    else if (utilizationPercent <= 90) riskLevel = 'high'
    else riskLevel = 'critical'

    // Generate warnings
    const warnings: string[] = []
    if (!isSufficient) {
      warnings.push(`Insufficient collateral: need ${shortfallBtc.toFixed(4)} more BTC`)
    }
    if (utilizationPercent > 80) {
      warnings.push('High collateral utilization increases liquidation risk')
    }
    if (utilizationPercent > 95) {
      warnings.push('Critical collateral utilization - consider reducing loan amount')
    }

    return {
      isSufficient,
      requiredCollateralBtc,
      availableCollateralBtc,
      shortfallBtc,
      shortfallUsd,
      utilizationPercent,
      riskLevel,
      warnings
    }
  }

  /**
   * Calculate ATH distance metrics for collateral risk analysis
   * Used by BasicParametersCard for enhanced collateral display
   */
  calculateATHDistance(currentPrice: number, athPrice: number): ATHDistanceMetrics {
    // Calculate distance from ATH (clamp to 0 if above ATH)
    const rawDistancePercent = athPrice > 0 ? ((athPrice - currentPrice) / athPrice) * 100 : 0
    const rawDistanceUSD = athPrice - currentPrice

    const distancePercent = Math.max(0, rawDistancePercent)
    const distanceUSD = Math.max(0, rawDistanceUSD)

    // Determine risk level based on distance from ATH
    let riskLevel: 'low' | 'medium' | 'high'
    let riskColor: string
    let riskDescription: string

    if (rawDistancePercent <= 0) {
      // Price is at or above ATH - treat as high risk
      riskLevel = 'high'
      riskColor = '#ef4444' // Red
      riskDescription = 'Smaller loan amounts and lower LTV percentages recommended'
    } else if (distancePercent <= 15) {
      // Price is 0-15% below ATH
      riskLevel = 'high'
      riskColor = '#ef4444' // Red
      riskDescription = 'Smaller loan amounts and lower LTV percentages recommended'
    } else if (distancePercent <= 40) {
      // Price is 15-40% below ATH
      riskLevel = 'medium'
      riskColor = '#f59e0b' // Orange
      riskDescription = 'Moderate loan amounts and LTV percentages recommended'
    } else {
      // Price is more than 40% below ATH
      riskLevel = 'low'
      riskColor = '#22c55e' // Green
      riskDescription = 'Favorable conditions for larger loan amounts and higher LTV percentages'
    }

    return {
      athPrice,
      currentPrice,
      distancePercent: Math.abs(distancePercent), // Always return positive for display
      distanceUSD: Math.abs(distanceUSD), // Always return positive for display
      riskLevel,
      riskColor,
      riskDescription
    }
  }

  /**
   * Calculate ATH-based liquidation metrics (private helper)
   * Matches the ATH calculation logic from PriceDropToleranceCard
   */
  private calculateAthLiquidationMetrics(liquidationPrice: number, trueLiquidationPrice: number, athPrice: number) {
    // Immediate liquidation from ATH
    const athPriceDropPercentage = liquidationPrice > 0
      ? Math.max(0, ((athPrice - liquidationPrice) / athPrice) * 100)
      : 0

    // True liquidation from ATH with free collateral
    const trueAthPriceDropPercentage = trueLiquidationPrice > 0
      ? Math.max(0, ((athPrice - trueLiquidationPrice) / athPrice) * 100)
      : 0

    return {
      liquidationPrice,
      priceDropPercentage: athPriceDropPercentage,
      trueLiquidationPrice,
      truePriceDropPercentage: trueAthPriceDropPercentage
    }
  }

  /**
   * Validate risk management parameters (private helper)
   */
  private validateRiskManagement(riskManagement: SimulationParams['riskManagement']): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (riskManagement.targetLtv <= 0 || riskManagement.targetLtv > 100) {
      errors.push('Target LTV must be between 0 and 100')
    }

    if (riskManagement.maxLoanAmount <= 0) {
      errors.push('Max loan amount must be positive')
    }

    if (riskManagement.annualInterestRate < 0 || riskManagement.annualInterestRate > 50) {
      errors.push('Annual interest rate must be between 0 and 50')
    }

    if (riskManagement.loanTermMonths <= 0 && riskManagement.loanTermMonths !== Infinity) {
      errors.push('Loan term must be positive or infinity')
    }

    if (riskManagement.liquidationFeePercent < 0 || riskManagement.liquidationFeePercent > 20) {
      errors.push('Liquidation fee must be between 0 and 20')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// ============================================================================
// REACT INTEGRATION HOOK
// ============================================================================

/**
 * React hook for reactive calculations with automatic memoization
 *
 * This hook provides a React-friendly interface to the CalculationsService
 * with automatic recalculation when parameters change, built-in memoization
 * for performance optimization, error boundary integration, and graceful error handling.
 */
export function useCalculations(params: SimulationParams): CalculationResults | null {
  // Create service instance (singleton pattern ensures consistency)
  const service = useMemo(() => new CalculationsService(), [])

  // Memoize parameter validation separately for better performance
  const validation = useMemo(() => {
    try {
      return service.validateParameters(params)
    } catch (error) {
      console.error('Error validating parameters:', error)
      return {
        isValid: false,
        errors: ['Parameter validation failed'],
        warnings: [],
        details: {
          initialBtcAmount: { valid: false, message: 'Validation error' },
          initialBtcPrice: { valid: false, message: 'Validation error' },
          loanAmountPercent: { valid: false, message: 'Validation error' },
          platform: { valid: false, message: 'Validation error' },
          riskManagement: { valid: false, message: 'Validation error' }
        }
      }
    }
  }, [
    service,
    params.initialBtcAmount,
    params.initialBtcPrice,
    params.loanAmountPercent,
    params.platform,
    params.originationFeePercent,
    params.originationFeeType,
    params.maxInitialLtv,
    params.riskManagement.liquidationLtv,
    params.riskManagement.targetLtv,
    params.riskManagement.maxLoanAmount,
    params.riskManagement.annualInterestRate,
    params.riskManagement.loanTermMonths,
    params.riskManagement.liquidationFeePercent
  ])

  // Memoize calculations based on parameter changes
  const calculations = useMemo(() => {
    // Early return if validation failed
    if (!validation.isValid) {
      console.warn('Invalid parameters for calculations:', validation.errors)
      return null
    }

    try {
      // Calculate individual metrics with error handling for each.
      // PR4 Task 2: athPrice is now a required parameter on calculateLiquidationMetrics.
      // This hook does not yet receive ATH from usePriceData() — using
      // params.initialBtcPrice as a placeholder until useCalculations is migrated
      // in a later PR4 task. Distance/drop-from-ATH metrics will collapse to 0%
      // here, but the components that surface those (e.g. ATHAlert) call the
      // service directly with the real ATH from usePriceData().
      const athPlaceholder = params.initialBtcPrice
      const liquidation = service.calculateLiquidationMetrics(params, athPlaceholder)
      const collateral = service.calculateCollateralMetrics(params)
      const loan = service.calculateLoanMetrics(params)
      const platform = service.applyPlatformConfig(params)

      return {
        liquidation,
        collateral,
        loan,
        platform,
        validation,
        calculatedAt: new Date()
      }

    } catch (error) {
      console.error('Error in calculations:', error)
      // Return partial results if possible
      try {
        const platform = service.applyPlatformConfig(params)
        return {
          liquidation: {
            initialImmediateLiquidationPrice: 0,
            initialImmediatePriceDropPercentage: 0,
            initialTrueLiquidationPrice: 0,
            initialTruePriceDropPercentage: 0,
            initialFreeBtcAmount: params.initialBtcAmount,
            initialHasFreeCollateral: true,
            initialCurrentBtcPrice: params.initialBtcPrice
          } as LiquidationMetrics,
          collateral: {
            initialTotalStackValue: params.initialBtcAmount * params.initialBtcPrice,
            initialLockedCollateralBtc: 0,
            initialFreeCollateralBtc: params.initialBtcAmount,
            initialCollateralUtilizationPercent: 0,
            initialLockedCollateralValue: 0,
            initialFreeCollateralValue: params.initialBtcAmount * params.initialBtcPrice,
            isSufficient: true
          } as CollateralMetrics,
          loan: {
            initialCurrentLoanAmount: 0,
            initialOriginationFee: 0,
            initialTotalLoanCost: 0,
            initialMaxLoanCapacity: 0,
            initialLoanUtilizationPercent: 0,
            initialAvailableBorrowingCapacity: 0,
            initialAvailableCapacityPercent: 100,
            initialMonthlyInterestPayment: 0,
            initialTotalInterestPayment: 0
          } as LoanMetrics,
          platform,
          validation: {
            ...validation,
            errors: [...validation.errors, 'Calculation error occurred'],
            isValid: false
          },
          calculatedAt: new Date()
        }
      } catch (fallbackError) {
        console.error('Fallback calculation also failed:', fallbackError)
        return null
      }
    }
  }, [
    service,
    validation,
    params.initialBtcAmount,
    params.initialBtcPrice,
    params.loanAmountPercent,
    params.platform,
    params.originationFeePercent,
    params.originationFeeType,
    params.maxInitialLtv,
    params.riskManagement.liquidationLtv,
    params.riskManagement.targetLtv,
    params.riskManagement.maxLoanAmount,
    params.riskManagement.annualInterestRate,
    params.riskManagement.loanTermMonths,
    params.riskManagement.liquidationFeePercent
  ])

  // Provide cache management functions with error handling
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

  // Return calculations with utility functions
  return calculations ? {
    ...calculations,
    // Add utility functions to the result
    clearCache,
    getCacheStats
  } as CalculationResults & {
    clearCache: () => void
    getCacheStats: () => { size: number; keys: string[] }
  } : null
}
