/**
 * Centralized Loan Calculation Service
 * 
 * Single source of truth for all loan-related calculations across the application.
 * This service ensures consistency between:
 * - Rolling Loan Strategy execution
 * - Debug page display
 * - Results tab display
 * - Strategy preview card
 * - Parameters tab calculations
 */

import type { StrategyExecutionParams } from '../types'

export interface LoanCalculationResult {
  /** Principal loan amount (before fees and interest) */
  principal: number
  /** Origination fee amount */
  originationFee: number
  /** Origination fee percentage */
  originationFeePercent: number
  /** Origination fee type */
  originationFeeType: 'one-time' | 'annual' | 'none'
  /** Total interest cost over loan term */
  totalInterest: number
  /** Monthly interest payment */
  monthlyInterest: number
  /** Annual interest rate percentage */
  annualInterestRate: number
  /** Total repayment amount (principal + fees + interest) */
  totalRepayment: number
  /** Effective cost (fees + interest) */
  effectiveCost: number
  /** Effective cost as percentage of principal */
  effectiveCostPercent: number
  /** Loan term in months */
  loanTermMonths: number
  /** Collateral value */
  collateralValue: number
  /** Loan-to-Value ratio */
  ltv: number
}

export class CentralizedLoanCalculationService {
  /**
   * Calculate complete loan details including principal, fees, and interest
   * 
   * This is the SINGLE SOURCE OF TRUTH for loan calculations.
   * All other parts of the application should use this method.
   */
  calculateLoanDetails(
    principal: number,
    collateralValue: number,
    params: StrategyExecutionParams
  ): LoanCalculationResult {
    // Determine origination fee type and percentage
    const originationFeePercent = params.loanOriginationFeePercent || 0

    // Calculate origination fee (assume one-time for now)
    // TODO: Add platform-specific fee type detection
    let originationFeeType: 'one-time' | 'annual' | 'none' = originationFeePercent === 0 ? 'none' : 'one-time'
    let originationFee = 0

    if (originationFeePercent > 0) {
      // For now, treat all fees as one-time
      // In the future, we can add platform-specific logic here
      originationFee = principal * (originationFeePercent / 100)
    }
    
    // Calculate interest
    const annualInterestRate = params.annualInterestRate || 0
    const monthlyInterestRate = annualInterestRate / 100 / 12
    const monthlyInterest = principal * monthlyInterestRate
    
    let totalInterest = 0
    if (params.loanTermMonths === Infinity) {
      // For infinite term loans, calculate interest for 12 months as reference
      totalInterest = monthlyInterest * 12
    } else {
      totalInterest = monthlyInterest * params.loanTermMonths
    }
    
    // Calculate totals
    const totalRepayment = principal + originationFee + totalInterest
    const effectiveCost = originationFee + totalInterest
    const effectiveCostPercent = principal > 0 ? (effectiveCost / principal) * 100 : 0
    const ltv = collateralValue > 0 ? (principal / collateralValue) * 100 : 0
    
    return {
      principal,
      originationFee,
      originationFeePercent,
      originationFeeType,
      totalInterest,
      monthlyInterest,
      annualInterestRate,
      totalRepayment,
      effectiveCost,
      effectiveCostPercent,
      loanTermMonths: params.loanTermMonths,
      collateralValue,
      ltv
    }
  }
  
  /**
   * Calculate investment multiplier for strategy execution
   * 
   * The investment multiplier represents how much BTC can be purchased
   * with the loan proceeds after accounting for all costs.
   */
  calculateInvestmentMultiplier(
    loanDetails: LoanCalculationResult,
    collateralValue: number
  ): number {
    // For BTC accumulation, we use the principal amount (the actual loan proceeds)
    // The fees and interest are paid from the collateral or future proceeds
    return loanDetails.principal / collateralValue
  }
  
  /**
   * Calculate minimum loan needed to cover repayment
   * 
   * When rolling over a loan, we need to borrow enough to cover:
   * 1. The previous loan repayment
   * 2. The origination fee on the new loan
   */
  calculateMinimumLoanForRollover(
    repaymentDue: number,
    originationFeePercent: number
  ): number {
    // New loan amount = repayment due / (1 - origination fee %)
    const originationFeeDecimal = originationFeePercent / 100
    return repaymentDue / (1 - originationFeeDecimal)
  }
  
  /**
   * Calculate loan repayment amount for a given principal
   * 
   * This includes the principal plus all accrued interest over the loan term.
   * Origination fees are typically paid upfront and not included in repayment.
   */
  calculateRepaymentAmount(
    principal: number,
    params: StrategyExecutionParams
  ): number {
    const monthlyInterestRate = params.annualInterestRate / 100 / 12
    const termMonths = params.loanTermMonths
    
    if (termMonths === Infinity || termMonths <= 0) {
      // Interest-only loan - repay principal plus one month of interest
      return principal * (1 + monthlyInterestRate)
    }
    
    // Calculate total interest over the loan term
    const totalInterest = principal * monthlyInterestRate * termMonths
    
    // Total repayment = principal + total interest
    return principal + totalInterest
  }
  
  /**
   * Format loan calculation for display
   */
  formatLoanCalculation(loanDetails: LoanCalculationResult): {
    principalFormatted: string
    originationFeeFormatted: string
    totalInterestFormatted: string
    totalRepaymentFormatted: string
    effectiveCostFormatted: string
    effectiveCostPercentFormatted: string
    ltvFormatted: string
  } {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    return {
      principalFormatted: formatter.format(loanDetails.principal),
      originationFeeFormatted: formatter.format(loanDetails.originationFee),
      totalInterestFormatted: formatter.format(loanDetails.totalInterest),
      totalRepaymentFormatted: formatter.format(loanDetails.totalRepayment),
      effectiveCostFormatted: formatter.format(loanDetails.effectiveCost),
      effectiveCostPercentFormatted: `${loanDetails.effectiveCostPercent.toFixed(2)}%`,
      ltvFormatted: `${loanDetails.ltv.toFixed(1)}%`
    }
  }
  
  /**
   * Validate loan calculation parameters
   */
  validateParameters(
    principal: number,
    collateralValue: number,
    params: StrategyExecutionParams
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (principal <= 0) {
      errors.push('Principal must be greater than 0')
    }
    
    if (collateralValue <= 0) {
      errors.push('Collateral value must be greater than 0')
    }
    
    if (principal > collateralValue) {
      errors.push('Principal cannot exceed collateral value')
    }
    
    if (params.annualInterestRate < 0) {
      errors.push('Interest rate cannot be negative')
    }
    
    if (params.loanOriginationFeePercent < 0) {
      errors.push('Origination fee cannot be negative')
    }
    
    if (params.loanTermMonths <= 0 && params.loanTermMonths !== Infinity) {
      errors.push('Loan term must be positive or Infinity')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const centralizedLoanCalculationService = new CentralizedLoanCalculationService()

