/**
 * Tests for the infinite-term loan semantics:
 *
 *   - At origination: only the origination fee is added to the principal;
 *     no future interest is baked into the day-zero balance.
 *   - Interest accrues monthly during the simulation loop (handled in
 *     useRollingLoanCalculations and StrategyExecutionService, not here).
 *
 * The bug this guards against: previously calculateLoanDetails treated
 * Infinity as "12 months of interest baked in once at origination", and
 * the simulation loop never accrued more. Result: a 12-year sim showed
 * the same debt at month 144 as at month 0, making infinite-term loans
 * artificially cheap and breaking the "loan term sensitivity" the user
 * empirically observed.
 */

import { describe, expect, it } from 'vitest'
import { centralizedLoanCalculationService } from '../CentralizedLoanCalculationService'

const baseParams = {
  btcAmount: 1,
  initialBtcPrice: 100_000,
  monthlyWithdrawalAmount: 0,
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  simulationMonths: 144,
  maxLoanAmount: 1_000_000,
  expectedAnnualInflation: 0,
  btcAccumulation: true,
  investmentStrategy: 'rollingLoan' as const,
  riskManagement: {
    targetLtv: 40,
    liquidationLtv: 80,
    maxLoanAmount: 1_000_000,
    liquidationFeePercent: 5,
    annualInterestRate: 6.5,
  },
}

describe('calculateLoanDetails — infinite-term loans', () => {
  it('returns ONLY origination fee at origination (no baked-in interest)', () => {
    const result = centralizedLoanCalculationService.calculateLoanDetails(
      100_000,
      250_000,
      { ...baseParams, loanTermMonths: Infinity as any }
    )

    expect(result.principal).toBe(100_000)
    expect(result.originationFee).toBe(1_500) // 1.5%
    expect(result.totalInterest).toBe(0) // ← THE FIX: no interest at origination
    expect(result.totalRepayment).toBe(101_500) // principal + fee only
  })

  it('finite-term loans still bake all term-interest into the day-zero repayment', () => {
    const result = centralizedLoanCalculationService.calculateLoanDetails(
      100_000,
      250_000,
      { ...baseParams, loanTermMonths: 12 }
    )

    expect(result.principal).toBe(100_000)
    expect(result.originationFee).toBe(1_500) // 1.5%
    // 12 × (6.5% / 12) × 100_000 = 6_500
    expect(result.totalInterest).toBe(6_500)
    expect(result.totalRepayment).toBe(108_000) // unchanged behavior for finite terms
  })

  it('24-month finite loans get twice the interest baked in', () => {
    const result = centralizedLoanCalculationService.calculateLoanDetails(
      100_000,
      250_000,
      { ...baseParams, loanTermMonths: 24 }
    )
    expect(result.totalInterest).toBe(13_000) // 2× the 12-month value
    expect(result.totalRepayment).toBe(114_500)
  })

  it('zero interest rate produces zero interest regardless of term', () => {
    const inf = centralizedLoanCalculationService.calculateLoanDetails(
      100_000,
      250_000,
      { ...baseParams, annualInterestRate: 0, loanTermMonths: Infinity as any }
    )
    const fin = centralizedLoanCalculationService.calculateLoanDetails(
      100_000,
      250_000,
      { ...baseParams, annualInterestRate: 0, loanTermMonths: 12 }
    )
    expect(inf.totalInterest).toBe(0)
    expect(fin.totalInterest).toBe(0)
    expect(inf.totalRepayment).toBe(101_500) // fee only
    expect(fin.totalRepayment).toBe(101_500) // fee only
  })
})
