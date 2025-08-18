/**
 * Centralized Calculations Service
 *
 * This service consolidates all financial calculations currently scattered across
 * parameter tab components, providing a single source of truth for all financial
 * computations with reactive updates and comprehensive error handling.
 */

import { useMemo, useCallback } from 'react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Simulation parameters interface - all inputs needed for calculations
 */
export interface SimulationParams {
  /** Amount of BTC in the user's stack */
  btcAmount: number
  /** Initial BTC price in USD */
  initialBtcPrice: number
  /** Monthly withdrawal amount in USD (negative for deposits) */
  monthlyWithdrawal: number
  /** Whether to accumulate BTC over time */
  btcAccumulation: boolean
  /** Loan amount as percentage of total BTC stack value */
  loanAmountPercent: number
  /** Selected lending platform */
  platform: 'firefish' | 'strike' | 'custom'
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
  }
}

/**
 * Liquidation analysis results
 */
export interface LiquidationMetrics {
  /** Immediate liquidation price (without free collateral top-up) */
  liquidationPrice: number
  /** Price drop percentage required for immediate liquidation */
  priceDropPercentage: number
  /** True liquidation price (with free collateral available) */
  trueLiquidationPrice: number
  /** True price drop percentage required for liquidation */
  truePriceDropPercentage: number
  /** Amount of free BTC available for collateral top-up */
  freeBtcAmount: number
  /** Whether free collateral is available */
  hasFreeCollateral: boolean
  /** Current BTC price used in calculations */
  currentBtcPrice: number
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
 * Collateral management results
 */
export interface CollateralMetrics {
  /** Total BTC stack value in USD */
  totalStackValue: number
  /** Amount of BTC locked as collateral */
  lockedCollateralBtc: number
  /** Amount of free BTC available */
  freeCollateralBtc: number
  /** Collateral utilization as percentage */
  collateralUtilizationPercent: number
  /** Locked collateral value in USD */
  lockedCollateralValue: number
  /** Free collateral value in USD */
  freeCollateralValue: number
  /** Whether collateral is sufficient for current loan */
  isSufficient: boolean
}

/**
 * Loan metrics and calculations
 */
export interface LoanMetrics {
  /** Current loan amount in USD */
  currentLoanAmount: number
  /** Origination fee amount */
  originationFee: number
  /** Total loan cost including fees */
  totalLoanCost: number
  /** Maximum loan capacity based on platform limits */
  maxLoanCapacity: number
  /** Current loan utilization as percentage of max capacity */
  loanUtilizationPercent: number
  /** Available borrowing capacity remaining */
  availableBorrowingCapacity: number
  /** Available capacity as percentage */
  availableCapacityPercent: number
  /** Monthly interest payment */
  monthlyInterestPayment: number
  /** Total interest over loan term */
  totalInterestPayment: number
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
    btcAmount: { valid: boolean; message?: string }
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
   */
  calculateLiquidationMetrics(params: SimulationParams): LiquidationMetrics {
    const cacheKey = `liquidation-${JSON.stringify(params)}`
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey)
    }

    // Get platform configuration
    const platformConfig = this.getPlatformConfig(params.platform)

    // Calculate basic values (matching PriceDropToleranceCard logic)
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)
    const totalLoanCost = currentLoanAmount + originationFee

    // Calculate BTC locked as collateral for current loan
    const btcLockedAsCollateral = totalLoanCost / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice

    // Calculate free BTC available for collateral top-up
    const freeBtcAmount = Math.max(0, params.btcAmount - btcLockedAsCollateral)
    const hasFreeCollateral = freeBtcAmount > 0

    // Initialize liquidation variables
    let liquidationPrice = 0
    let priceDropPercentage = 0
    let trueLiquidationPrice = 0
    let truePriceDropPercentage = 0

    // Calculate liquidation metrics only if there's a loan
    if (currentLoanAmount > 0 && params.btcAmount > 0 && btcLockedAsCollateral > 0) {
      // Immediate liquidation price calculation (without free collateral top-up)
      // Uses platform-specific liquidation LTV instead of risk management liquidation LTV
      liquidationPrice = totalLoanCost / (platformConfig.liquidationLtv / 100) / btcLockedAsCollateral

      // Calculate immediate price drop percentage
      priceDropPercentage = Math.max(0, ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100)

      // True liquidation price calculation (with free collateral available)
      trueLiquidationPrice = hasFreeCollateral
        ? totalLoanCost / (platformConfig.liquidationLtv / 100) / params.btcAmount
        : liquidationPrice // Same as immediate liquidation if no free collateral

      // Calculate true price drop percentage
      truePriceDropPercentage = Math.max(0, ((params.initialBtcPrice - trueLiquidationPrice) / params.initialBtcPrice) * 100)
    }

    // ATH calculations (hardcoded ATH value matching PriceDropToleranceCard)
    const athPrice = 125000
    const athMetrics = this.calculateAthLiquidationMetrics(liquidationPrice, trueLiquidationPrice, athPrice)

    const result: LiquidationMetrics = {
      liquidationPrice: Math.max(0, liquidationPrice),
      priceDropPercentage: Math.max(0, Math.min(100, priceDropPercentage)),
      trueLiquidationPrice: Math.max(0, trueLiquidationPrice),
      truePriceDropPercentage: Math.max(0, Math.min(100, truePriceDropPercentage)),
      freeBtcAmount,
      hasFreeCollateral,
      currentBtcPrice: params.initialBtcPrice,
      athPrice,
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

    // Get platform configuration
    const platformConfig = this.getPlatformConfig(params.platform)

    // Calculate basic values (matching CollateralVisualizationCard logic)
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)
    const totalLoanCost = currentLoanAmount + originationFee

    // Calculate BTC locked as collateral for current loan (exact formula from component)
    const lockedCollateralBtc = params.btcAmount > 0 && totalLoanCost > 0
      ? totalLoanCost / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice
      : 0

    // Calculate free collateral (remaining BTC available)
    const freeCollateralBtc = Math.max(0, params.btcAmount - lockedCollateralBtc)

    // Calculate collateral utilization percentage (matching component logic)
    const collateralUtilizationPercent = params.btcAmount > 0
      ? (lockedCollateralBtc / params.btcAmount) * 100
      : 0

    // Calculate free collateral percentage (for compatibility with CollateralVisualizationCard)
    const freeCollateralPercentage = params.btcAmount > 0
      ? (freeCollateralBtc / params.btcAmount) * 100
      : 0

    // Calculate collateral values in USD
    const lockedCollateralValue = lockedCollateralBtc * params.initialBtcPrice
    const freeCollateralValue = freeCollateralBtc * params.initialBtcPrice

    // Check if collateral is sufficient for the current loan
    const isSufficient = lockedCollateralBtc <= params.btcAmount

    const result: CollateralMetrics = {
      totalStackValue,
      lockedCollateralBtc: Math.max(0, lockedCollateralBtc),
      freeCollateralBtc: Math.max(0, freeCollateralBtc),
      collateralUtilizationPercent: Math.max(0, Math.min(100, collateralUtilizationPercent)),
      lockedCollateralValue: Math.max(0, lockedCollateralValue),
      freeCollateralValue: Math.max(0, freeCollateralValue),
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

    // Get platform configuration
    const platformConfig = this.getPlatformConfig(params.platform)

    // Calculate basic loan values (matching LoanUsageVisualizationCard logic)
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)
    const totalLoanCost = currentLoanAmount + originationFee

    // Calculate maximum loan capacity based on platform's initial LTV limit (matching LoanUsageVisualizationCard)
    const maxLoanCapacity = totalStackValue * (platformConfig.maxInitialLtv / 100)

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

    // Calculate interest payments
    const monthlyInterestRate = params.riskManagement.annualInterestRate / 100 / 12
    const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate

    // Calculate total interest over loan term
    let totalInterestPayment = 0
    if (params.riskManagement.loanTermMonths === Infinity) {
      // For infinite term loans, calculate interest for 12 months as reference
      totalInterestPayment = monthlyInterestPayment * 12
    } else {
      totalInterestPayment = monthlyInterestPayment * params.riskManagement.loanTermMonths
    }

    const result: LoanMetrics = {
      currentLoanAmount,
      originationFee,
      totalLoanCost,
      maxLoanCapacity,
      loanUtilizationPercent: Math.max(0, Math.min(100, loanUtilizationPercent)),
      availableBorrowingCapacity,
      availableCapacityPercent: Math.max(0, Math.min(100, availableCapacityPercent)),
      monthlyInterestPayment,
      totalInterestPayment
    }

    this.calculationCache.set(cacheKey, result)
    return result
  }

  /**
   * Apply platform-specific configurations
   */
  applyPlatformConfig(params: SimulationParams): PlatformMetrics {
    const platformConfig = this.getPlatformConfig(params.platform)

    return {
      platform: platformConfig.name,
      maxInitialLtv: platformConfig.maxInitialLtv,
      liquidationLtv: platformConfig.liquidationLtv,
      originationFeePercent: platformConfig.originationFeePercent,
      appliedConfig: {
        maxLoanAmount: params.riskManagement.maxLoanAmount,
        interestRate: params.riskManagement.annualInterestRate,
        liquidationFee: platformConfig.liquidationFeePercent
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
    const btcAmountValid = params.btcAmount > 0
    if (!btcAmountValid) {
      errors.push('BTC amount must be positive')
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
    const platformValid = ['firefish', 'strike', 'custom'].includes(params.platform) || params.platform.startsWith('custom-')
    if (!platformValid) {
      errors.push('Invalid platform selection')
    }

    // Validate risk management parameters
    const riskManagementValid = this.validateRiskManagement(params.riskManagement)
    if (!riskManagementValid.valid) {
      errors.push(...riskManagementValid.errors)
    }

    // Add warnings for edge cases
    if (params.btcAmount < 0.01) {
      warnings.push('Very small BTC amount may lead to imprecise calculations')
    }

    if (params.loanAmountPercent > 50) {
      warnings.push('High loan percentage increases liquidation risk')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        btcAmount: { valid: btcAmountValid, message: btcAmountValid ? undefined : 'Must be positive' },
        initialBtcPrice: { valid: btcPriceValid, message: btcPriceValid ? undefined : 'Must be positive' },
        loanAmountPercent: { valid: loanPercentValid, message: loanPercentValid ? undefined : 'Must be 0-100%' },
        platform: { valid: platformValid, message: platformValid ? undefined : 'Invalid platform' },
        riskManagement: { valid: riskManagementValid.valid, message: riskManagementValid.errors.join(', ') || undefined }
      }
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
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.calculationCache.size,
      keys: Array.from(this.calculationCache.keys())
    }
  }

  /**
   * Get platform configuration (private helper)
   * Uses the exact same values as platformPresets.ts for consistency
   */
  private getPlatformConfig(platform: string) {
    // Built-in platform configurations matching platformPresets.ts exactly
    const PLATFORM_CONFIGS = {
      firefish: {
        id: 'firefish',
        name: 'Firefish',
        originationFeePercent: 1.5,
        liquidationLtv: 95, // Firefish: 95% liquidation LTV
        liquidationFeePercent: 5.0,
        maxInitialLtv: 60
      },
      strike: {
        id: 'strike',
        name: 'Strike',
        originationFeePercent: 0,
        liquidationLtv: 99, // Strike: 99% liquidation LTV
        liquidationFeePercent: 1.0,
        maxInitialLtv: 80
      },
      custom: {
        id: 'custom',
        name: 'Custom',
        originationFeePercent: 1.0,
        liquidationLtv: 97, // Custom: 97% liquidation LTV
        liquidationFeePercent: 3.0,
        maxInitialLtv: 75
      }
    }

    // Check for custom platforms with custom- prefix
    if (platform.startsWith('custom-')) {
      // For custom platforms, try to load from localStorage or fallback to default custom
      try {
        if (typeof localStorage !== 'undefined') {
          const customPlatforms = JSON.parse(localStorage.getItem('customPlatformConfigs') || '{}')
          if (customPlatforms[platform]) {
            return customPlatforms[platform]
          }
        }
      } catch (error) {
        console.warn('Failed to load custom platform config:', error)
      }
    }

    return PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS] || PLATFORM_CONFIGS.custom
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
    const platformConfig = this.getPlatformConfig(params.platform)

    // Calculate required collateral
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)
    const totalLoanCost = currentLoanAmount + originationFee

    const requiredCollateralBtc = totalLoanCost / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice
    const availableCollateralBtc = params.btcAmount
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
          btcAmount: { valid: false, message: 'Validation error' },
          initialBtcPrice: { valid: false, message: 'Validation error' },
          loanAmountPercent: { valid: false, message: 'Validation error' },
          platform: { valid: false, message: 'Validation error' },
          riskManagement: { valid: false, message: 'Validation error' }
        }
      }
    }
  }, [
    service,
    params.btcAmount,
    params.initialBtcPrice,
    params.loanAmountPercent,
    params.platform,
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
      // Calculate individual metrics with error handling for each
      const liquidation = service.calculateLiquidationMetrics(params)
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
            liquidationPrice: 0,
            priceDropPercentage: 0,
            trueLiquidationPrice: 0,
            truePriceDropPercentage: 0,
            freeBtcAmount: params.btcAmount,
            hasFreeCollateral: true,
            currentBtcPrice: params.initialBtcPrice
          } as LiquidationMetrics,
          collateral: {
            totalStackValue: params.btcAmount * params.initialBtcPrice,
            lockedCollateralBtc: 0,
            freeCollateralBtc: params.btcAmount,
            collateralUtilizationPercent: 0,
            lockedCollateralValue: 0,
            freeCollateralValue: params.btcAmount * params.initialBtcPrice,
            isSufficient: true
          } as CollateralMetrics,
          loan: {
            currentLoanAmount: 0,
            originationFee: 0,
            totalLoanCost: 0,
            maxLoanCapacity: 0,
            loanUtilizationPercent: 0,
            availableBorrowingCapacity: 0,
            availableCapacityPercent: 100,
            monthlyInterestPayment: 0,
            totalInterestPayment: 0
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
    params.btcAmount,
    params.initialBtcPrice,
    params.monthlyWithdrawal,
    params.btcAccumulation,
    params.loanAmountPercent,
    params.platform,
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
