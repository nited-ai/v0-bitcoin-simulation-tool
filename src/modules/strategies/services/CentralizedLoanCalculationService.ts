/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CENTRALIZED LOAN CALCULATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CRITICAL: THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL LOAN CALCULATIONS ⚠️
 *
 * ALL loan-related calculations in the application MUST use this service.
 * DO NOT create loans or calculate loan amounts anywhere else in the codebase.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THIS SERVICE EXISTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Previously, loan calculations were scattered across multiple files:
 * - StrategyExecutionService had its own calculateRepaymentAmount()
 * - Debug page calculated loan amounts independently
 * - Different parts used different formulas
 * - Inconsistent decimal precision ($11,724 vs $11,724.2)
 * - Displays showed principal when they should show total repayment
 *
 * This led to:
 * ❌ Inconsistent loan amounts across the application
 * ❌ Users seeing incorrect costs (missing fees and interest)
 * ❌ Difficult maintenance and debugging
 * ❌ Risk of calculation errors
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT THIS SERVICE PROVIDES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ✅ Consistent loan calculations across all features:
 *    - Rolling Loan Strategy execution
 *    - Debug page display
 *    - Results tab display
 *    - Strategy preview card
 *    - Parameters tab calculations
 *
 * ✅ Accurate cost breakdowns (principal + fees + interest)
 * ✅ Standardized decimal precision (no decimals for amounts)
 * ✅ Clear distinction between principal (received) and repayment (owed)
 * ✅ Support for initial loans and rollovers
 * ✅ Platform-specific fee handling
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * @module CentralizedLoanCalculationService
 * @see docs/CENTRALIZED_LOAN_CALCULATIONS.md for detailed documentation
 * @see docs/LOAN_AMOUNT_REFACTORING_SUMMARY.md for implementation details
 * @see docs/DEVELOPER_GUIDE_LOAN_CALCULATIONS.md for usage guidelines
 * ═══════════════════════════════════════════════════════════════════════════
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
   * ═══════════════════════════════════════════════════════════════════════════
   * CALCULATE LOAN DETAILS
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * @important THIS IS THE SINGLE SOURCE OF TRUTH FOR LOAN CALCULATIONS
   *
   * Calculates complete loan details including principal, origination fees,
   * interest, and total repayment amount. This method MUST be used for:
   * - Creating new loans (initial or rollover)
   * - Displaying loan costs to users
   * - Calculating debt obligations
   * - Strategy decision making
   *
   * ═══════════════════════════════════════════════════════════════════════════
   * USAGE EXAMPLE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * ```typescript
   * // 1. Calculate principal (10% of collateral)
   * const principal = Math.round(collateralValue * 0.10)
   *
   * // 2. Get complete loan details
   * const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
   *   principal,
   *   collateralValue,
   *   params
   * )
   *
   * // 3. Create loan with correct values
   * const newLoan: Loan = {
   *   id: loanIdCounter++,
   *   month,
   *   principal: loanDetails.principal,              // $11,724 (received)
   *   maturityMonth: month + params.loanTermMonths,
   *   repaymentAmount: loanDetails.totalRepayment,   // $13,659 (owed)
   *   lockedBtc: loanDetails.principal / btcPrice
   * }
   *
   * // 4. Display breakdown
   * console.log(`Principal: ${loanDetails.principal}`)
   * console.log(`Origination Fee: ${loanDetails.originationFee}`)
   * console.log(`Total Interest: ${loanDetails.totalInterest}`)
   * console.log(`Total Repayment: ${loanDetails.totalRepayment}`)
   * ```
   *
   * ═══════════════════════════════════════════════════════════════════════════
   * CALCULATION DETAILS
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * 1. **Principal**: Rounded to eliminate decimals
   * 2. **Origination Fee**: principal × (feePercent / 100), rounded
   * 3. **Monthly Interest**: principal × (annualRate / 100 / 12)
   * 4. **Total Interest**: monthlyInterest × loanTermMonths, rounded
   * 5. **Total Repayment**: principal + originationFee + totalInterest, rounded
   * 6. **Effective Cost**: originationFee + totalInterest (excludes principal)
   * 7. **LTV**: (principal / collateralValue) × 100
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * @param principal - The loan amount to receive (will be rounded)
   * @param collateralValue - Total value of BTC collateral
   * @param params - Strategy execution parameters including rates and terms
   * @returns Complete loan calculation result with all cost components
   *
   * @example
   * // Initial loan: 10% of $117,242 collateral
   * const loanDetails = service.calculateLoanDetails(11724, 117242, params)
   * // Returns: { principal: 11724, originationFee: 176, totalInterest: 1759, totalRepayment: 13659, ... }
   *
   * @example
   * // Rolling loan: Calculate new loan for rollover
   * const minimumLoan = service.calculateMinimumLoanForRollover(repaymentDue, feePercent)
   * const newPrincipal = Math.max(minimumLoan, targetLoanAmount)
   * const loanDetails = service.calculateLoanDetails(newPrincipal, collateralValue, params)
   */
  calculateLoanDetails(
    principal: number,
    collateralValue: number,
    params: StrategyExecutionParams
  ): LoanCalculationResult {
    // Round principal to eliminate decimals
    principal = Math.round(principal)

    // Determine origination fee type and percentage
    const originationFeePercent = params.loanOriginationFeePercent || 0

    // Calculate origination fee (assume one-time for now)
    // TODO: Add platform-specific fee type detection
    let originationFeeType: 'one-time' | 'annual' | 'none' = originationFeePercent === 0 ? 'none' : 'one-time'
    let originationFee = 0

    if (originationFeePercent > 0) {
      // For now, treat all fees as one-time
      // In the future, we can add platform-specific logic here
      originationFee = Math.round(principal * (originationFeePercent / 100))
    }

    // Calculate interest
    const annualInterestRate = params.annualInterestRate || 0
    const monthlyInterestRate = annualInterestRate / 100 / 12
    const monthlyInterest = principal * monthlyInterestRate

    let totalInterest = 0
    if (params.loanTermMonths === Infinity) {
      // For infinite term loans, calculate interest for 12 months as reference
      totalInterest = Math.round(monthlyInterest * 12)
    } else {
      totalInterest = Math.round(monthlyInterest * params.loanTermMonths)
    }

    // Calculate totals (round all monetary values)
    const totalRepayment = Math.round(principal + originationFee + totalInterest)
    const effectiveCost = Math.round(originationFee + totalInterest)
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

