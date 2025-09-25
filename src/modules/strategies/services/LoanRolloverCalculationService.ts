/**
 * Loan Rollover Calculation Service
 * 
 * Provides comprehensive loan rollover calculations including:
 * - Minimum loan amount calculation (principal + interest + platform fees)
 * - Maximum loan amount calculation (target percentage of BTC stack)
 * - Excess loan proceeds calculation
 * - Conflict resolution when minimum exceeds target percentage
 * - Insufficient collateral detection and liquidation triggers
 */

import type { 
  LoanRolloverParams, 
  LoanRolloverResult, 
  InsufficientCollateralResult,
  PlatformFeeResult,
  PlatformFeeConfig
} from './types'

export class LoanRolloverCalculationService {
  
  /**
   * Calculate minimum loan amount needed to pay off previous loan
   * Formula: (principal + interest + platform fees) / (1 - origination fee %)
   */
  calculateMinimumLoanAmount(params: LoanRolloverParams): number {
    const { previousLoanPrincipal, accruedInterest, platformFeeConfig, loanOriginationFeePercent } = params
    
    // Calculate platform-specific fees
    const platformFees = this.calculatePlatformFees(previousLoanPrincipal, platformFeeConfig, params.loanTermMonths)
    
    // Total repayment due = principal + interest + platform fees
    const totalRepaymentDue = previousLoanPrincipal + accruedInterest + platformFees.amount
    
    // Account for origination fee on new loan
    // New loan amount = repayment due / (1 - origination fee %)
    const originationFeeDecimal = loanOriginationFeePercent / 100
    const minimumLoanAmount = totalRepaymentDue / (1 - originationFeeDecimal)
    
    return minimumLoanAmount
  }
  
  /**
   * Calculate maximum loan amount based on target LTV percentage
   */
  calculateMaximumLoanAmount(btcStackValue: number, targetLtvPercent: number): number {
    return btcStackValue * (targetLtvPercent / 100)
  }
  
  /**
   * Calculate excess proceeds from loan rollover
   */
  calculateExcessProceeds(newLoanAmount: number, totalRepaymentDue: number): number {
    return Math.max(0, newLoanAmount - totalRepaymentDue)
  }
  
  /**
   * Detect insufficient collateral for minimum loan requirements
   */
  detectInsufficientCollateral(
    minimumLoanNeeded: number, 
    btcStackValue: number, 
    liquidationLtvPercent: number
  ): InsufficientCollateralResult {
    const maxPossibleLoan = btcStackValue * (liquidationLtvPercent / 100)
    const hasInsufficientCollateral = minimumLoanNeeded > maxPossibleLoan
    
    return {
      hasInsufficientCollateral,
      maxPossibleLoan,
      shortfall: hasInsufficientCollateral ? minimumLoanNeeded - maxPossibleLoan : undefined
    }
  }
  
  /**
   * Calculate platform-specific fees
   */
  private calculatePlatformFees(
    loanPrincipal: number, 
    feeConfig: PlatformFeeConfig, 
    loanTermMonths?: number
  ): PlatformFeeResult {
    switch (feeConfig.type) {
      case 'none':
        return {
          amount: 0,
          type: 'none',
          description: 'No platform fees'
        }
      
      case 'one-time':
        return {
          amount: loanPrincipal * (feeConfig.percent / 100),
          type: 'one-time',
          description: `One-time fee: ${feeConfig.percent}%`
        }
      
      case 'annual':
        if (!loanTermMonths) {
          throw new Error('Loan term months required for annual fee calculation')
        }
        const annualFee = loanPrincipal * (feeConfig.percent / 100)
        const loanTermYears = loanTermMonths === Infinity ? 1 : loanTermMonths / 12
        return {
          amount: annualFee * loanTermYears,
          type: 'annual',
          description: `Annual fee: ${feeConfig.percent}% for ${loanTermYears} years`
        }
      
      default:
        throw new Error(`Unsupported platform fee type: ${feeConfig.type}`)
    }
  }
  
  /**
   * Complete loan rollover calculation with conflict resolution
   */
  calculateLoanRollover(params: LoanRolloverParams): LoanRolloverResult {
    const { 
      previousLoanPrincipal, 
      accruedInterest, 
      platformFeeConfig,
      btcStackValue = 0,
      targetLtvPercent = 0,
      liquidationLtvPercent = 95
    } = params
    
    // Calculate minimum loan needed
    const minimumLoanNeeded = this.calculateMinimumLoanAmount(params)
    
    // Calculate maximum loan based on target
    const maximumLoanAmount = this.calculateMaximumLoanAmount(btcStackValue, targetLtvPercent)
    
    // Calculate total repayment due
    const platformFees = this.calculatePlatformFees(previousLoanPrincipal, platformFeeConfig, params.loanTermMonths)
    const totalRepaymentDue = previousLoanPrincipal + accruedInterest + platformFees.amount
    
    // Check for insufficient collateral
    const collateralCheck = this.detectInsufficientCollateral(minimumLoanNeeded, btcStackValue, liquidationLtvPercent)
    
    if (collateralCheck.hasInsufficientCollateral) {
      return {
        success: false,
        minimumLoanNeeded,
        maximumLoanAmount,
        actualLoanAmount: 0,
        excessProceeds: 0,
        conflictResolution: 'liquidation',
        totalRepaymentDue,
        platformFees: platformFees.amount,
        insufficientCollateral: collateralCheck,
        reasoning: `Insufficient collateral for minimum loan of $${Math.round(minimumLoanNeeded)}. Maximum possible: $${Math.round(collateralCheck.maxPossibleLoan)}. Shortfall: $${Math.round(collateralCheck.shortfall || 0)}.`
      }
    }
    
    // Determine actual loan amount and conflict resolution
    let actualLoanAmount: number
    let conflictResolution: 'none' | 'forced_exceedance' | 'liquidation'
    let reasoning: string
    
    if (minimumLoanNeeded <= maximumLoanAmount) {
      // No conflict - use target amount
      actualLoanAmount = maximumLoanAmount
      conflictResolution = 'none'
      reasoning = `Loan rollover successful: $${Math.round(actualLoanAmount)} (target: $${Math.round(maximumLoanAmount)}, minimum: $${Math.round(minimumLoanNeeded)})`
    } else {
      // Conflict - minimum exceeds target, force exceedance
      actualLoanAmount = minimumLoanNeeded
      conflictResolution = 'forced_exceedance'
      reasoning = `Forced LTV exceedance: $${Math.round(actualLoanAmount)} (minimum required exceeds target of $${Math.round(maximumLoanAmount)})`
    }
    
    // Calculate excess proceeds
    const excessProceeds = this.calculateExcessProceeds(actualLoanAmount, totalRepaymentDue)
    
    return {
      success: true,
      minimumLoanNeeded,
      maximumLoanAmount,
      actualLoanAmount,
      excessProceeds,
      conflictResolution,
      totalRepaymentDue,
      platformFees: platformFees.amount,
      reasoning
    }
  }
}
