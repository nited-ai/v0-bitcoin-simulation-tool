/**
 * Tests for Dynamic Rolling Loan Strategy
 * 
 * Tests the new strategy implementation that automatically selects between
 * Dynamic LTV mode (Infinity loan term) and Fixed Term mode (specific loan term)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DynamicRollingLoanStrategy } from '../DynamicRollingLoanStrategy'
import type { StrategyContext, StrategyExecutionParams, Loan } from '../../types'

describe('DynamicRollingLoanStrategy', () => {
  let strategy: DynamicRollingLoanStrategy

  beforeEach(() => {
    strategy = new DynamicRollingLoanStrategy()
  })

  describe('Basic Structure', () => {
    it('should implement InvestmentStrategyInterface', () => {
      expect(strategy.getName).toBeDefined()
      expect(strategy.getDescription).toBeDefined()
      expect(strategy.getMetadata).toBeDefined()
      expect(strategy.getDetailedDescription).toBeDefined()
      expect(strategy.getFunctionality).toBeDefined()
      expect(strategy.getSuitability).toBeDefined()
      expect(strategy.makeDecision).toBeDefined()
    })

    it('should return correct name', () => {
      expect(strategy.getName()).toBe('Dynamic Rolling Loan')
    })

    it('should return description mentioning automatic mode selection', () => {
      const description = strategy.getDescription()
      expect(description).toContain('automatic')
      expect(description.toLowerCase()).toContain('mode')
    })

    it('should return detailed description', () => {
      const detailed = strategy.getDetailedDescription()
      expect(detailed.length).toBeGreaterThan(100)
      expect(detailed.toLowerCase()).toContain('dynamic')
      expect(detailed.toLowerCase()).toContain('fixed')
    })

    it('should return functionality description', () => {
      const functionality = strategy.getFunctionality()
      expect(functionality.length).toBeGreaterThan(20)
    })

    it('should return suitability description', () => {
      const suitability = strategy.getSuitability()
      expect(suitability.length).toBeGreaterThan(20)
    })

    it('should return metadata with appropriate ratings', () => {
      const metadata = strategy.getMetadata()
      
      expect(metadata.securityRating).toBeGreaterThanOrEqual(1)
      expect(metadata.securityRating).toBeLessThanOrEqual(5)
      expect(metadata.complexityRating).toBeGreaterThanOrEqual(1)
      expect(metadata.complexityRating).toBeLessThanOrEqual(5)
      expect(Array.isArray(metadata.suitableFor)).toBe(true)
      expect(Array.isArray(metadata.criteria)).toBe(true)
    })
  })

  describe('makeDecision - Edge Cases', () => {
    it('should handle zero BTC amount', () => {
      const context = createMockContext({
        totalBtcAmount: 0,
        btcPrice: 100000
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
      expect(decision.reasoning).toContain('No BTC')
    })

    it('should handle negative BTC amount', () => {
      const context = createMockContext({
        totalBtcAmount: -1,
        btcPrice: 100000
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
    })
  })

  describe('Initial Loan Logic (Month 0)', () => {
    it('should create initial loan at Month 0 with no active loans', () => {
      const context = createMockContext({
        month: 0,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [],
        params: {
          maxLoanAmount: 150000,
          riskManagement: {
            targetLtv: 15,
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(true)
      expect(decision.investmentMultiplier).toBeGreaterThan(0)
      expect(decision.reasoning).toContain('initial loan')
    })

    it('should use maxLoanAmount for initial loan calculation', () => {
      const context = createMockContext({
        month: 0,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [],
        params: {
          maxLoanAmount: 150000,
          riskManagement: {
            targetLtv: 15,
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      // UPDATED: Investment multiplier is now 1.0 for initial loan
      // The principal already represents the correct loan amount
      // Using principal/collateralValue would apply the percentage TWICE
      expect(decision.investmentMultiplier).toBe(1.0)
      expect(decision.allowInvestment).toBe(true)
    })

    it('should support BTC accumulation mode for initial loan', () => {
      const context = createMockContext({
        month: 0,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [],
        params: {
          btcAccumulation: true,
          maxLoanAmount: 150000
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(true)
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.withdrawalAmount).toBe(0)
    })

    it('should support cash generation mode for initial loan', () => {
      const context = createMockContext({
        month: 0,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [],
        params: {
          btcAccumulation: false,
          maxLoanAmount: 150000
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(true)
      expect(decision.allowWithdrawal).toBe(true)
      expect(decision.withdrawalAmount).toBeGreaterThan(0)
    })

    it('should include LTV in reasoning for initial loan', () => {
      const context = createMockContext({
        month: 0,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: []
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('LTV')
    })
  })

  describe('Automatic Mode Selection', () => {
    it('should route to Dynamic LTV mode when loanTermMonths is Infinity', () => {
      const context = createMockContext({
        month: 1, // Not Month 0
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [],
        params: {
          loanTermMonths: Infinity // Dynamic LTV mode
        }
      })

      const decision = strategy.makeDecision(context)

      // Should call handleDynamicLtvMode and contain "Dynamic LTV" in reasoning
      expect(decision.reasoning).toContain('Dynamic LTV')
    })

    it('should route to Fixed Term mode when loanTermMonths is specific number', () => {
      const context = createMockContext({
        month: 1, // Not Month 0
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [],
        params: {
          loanTermMonths: 6 // Fixed Term mode
        }
      })

      const decision = strategy.makeDecision(context)

      // Should call handleFixedTermMode and return "No loan maturing" message
      expect(decision.reasoning).toContain('No loan maturing')
    })

    it('should handle 3-month loan term (Fixed Term mode)', () => {
      const context = createMockContext({
        month: 1,
        params: {
          loanTermMonths: 3
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('No loan maturing')
    })

    it('should handle 12-month loan term (Fixed Term mode)', () => {
      const context = createMockContext({
        month: 1,
        params: {
          loanTermMonths: 12
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('No loan maturing')
    })

    it('should handle 24-month loan term (Fixed Term mode)', () => {
      const context = createMockContext({
        month: 1,
        params: {
          loanTermMonths: 24
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('No loan maturing')
    })
  })

  describe('Dynamic LTV Mode (Infinite Loan Term)', () => {
    it('should skip Month 0 in Dynamic LTV mode (initial loan already created)', () => {
      const context = createMockContext({
        month: 0,
        params: {
          loanTermMonths: Infinity
        }
      })

      const decision = strategy.makeDecision(context)

      // Should create initial loan, not enter Dynamic LTV mode
      expect(decision.reasoning).toContain('initial loan')
    })

    it('should accrue monthly interest and then reset to target LTV', () => {
      const initialLoanAmount = 100000
      const annualRate = 0.08 // 8% annual

      const context = createMockContext({
        month: 1,
        btcPrice: 100000,
        totalBtcAmount: 10, // Collateral = 1,000,000
        activeLoans: [{
          principal: initialLoanAmount,
          repaymentAmount: initialLoanAmount,
          originationMonth: 0,
          maturityMonth: Infinity,
          interestRate: annualRate,
          originationFee: 1000,
          loanTermMonths: Infinity
        }],
        params: {
          loanTermMonths: Infinity,
          annualInterestRate: annualRate,
          riskManagement: {
            targetLtv: 15, // Target = 150,000
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: annualRate
          }
        }
      })

      const decision = strategy.makeDecision(context)

      // After Dynamic LTV mode, loan should be reset to target (150,000)
      // The interest accrual happens first, then reset to target
      const targetLoan = 1000000 * 0.15
      expect(context.activeLoans[0].repaymentAmount).toBeCloseTo(targetLoan, 0)
      expect(decision.allowInvestment).toBe(true)
    })

    it('should reset loan balance to target LTV', () => {
      const context = createMockContext({
        month: 1,
        btcPrice: 100000,
        totalBtcAmount: 10, // Collateral = 1,000,000
        activeLoans: [{
          principal: 100000,
          repaymentAmount: 100000,
          originationMonth: 0,
          maturityMonth: Infinity,
          interestRate: 0.08,
          originationFee: 1000,
          loanTermMonths: Infinity
        }],
        params: {
          loanTermMonths: Infinity,
          riskManagement: {
            targetLtv: 15, // Target = 150,000
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      // Loan balance should be reset to target LTV (150,000)
      const targetLoan = 1000000 * 0.15
      expect(context.activeLoans[0].repaymentAmount).toBeCloseTo(targetLoan, 0)
    })

    it('should calculate correct investment multiplier for Dynamic LTV mode', () => {
      const context = createMockContext({
        month: 1,
        btcPrice: 100000,
        totalBtcAmount: 10, // Collateral = 1,000,000
        activeLoans: [{
          principal: 100000,
          repaymentAmount: 100000,
          originationMonth: 0,
          maturityMonth: Infinity,
          interestRate: 0.08,
          originationFee: 1000,
          loanTermMonths: Infinity
        }],
        params: {
          loanTermMonths: Infinity,
          loanOriginationFeePercent: 1,
          riskManagement: {
            targetLtv: 15, // Target = 150,000
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      // Amount to borrow = 150,000 - 100,000 = 50,000
      // Net proceeds after 1% fee = 50,000 * 0.99 = 49,500
      // Investment multiplier = 49,500 / 1,000,000 = 0.0495
      expect(decision.investmentMultiplier).toBeGreaterThan(0.04)
      expect(decision.investmentMultiplier).toBeLessThan(0.06)
    })

    it('should not invest when current loan exceeds target LTV', () => {
      const context = createMockContext({
        month: 1,
        btcPrice: 100000,
        totalBtcAmount: 10, // Collateral = 1,000,000
        activeLoans: [{
          principal: 200000,
          repaymentAmount: 200000, // Already above target
          originationMonth: 0,
          maturityMonth: Infinity,
          interestRate: 0.08,
          originationFee: 2000,
          loanTermMonths: Infinity
        }],
        params: {
          loanTermMonths: Infinity,
          riskManagement: {
            targetLtv: 15, // Target = 150,000
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
    })

    it('should support BTC accumulation mode in Dynamic LTV', () => {
      const context = createMockContext({
        month: 1,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [{
          principal: 100000,
          repaymentAmount: 100000,
          originationMonth: 0,
          maturityMonth: Infinity,
          interestRate: 0.08,
          originationFee: 1000,
          loanTermMonths: Infinity
        }],
        params: {
          loanTermMonths: Infinity,
          btcAccumulation: true
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.withdrawalAmount).toBe(0)
    })

    it('should support cash generation mode in Dynamic LTV', () => {
      const context = createMockContext({
        month: 1,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [{
          principal: 100000,
          repaymentAmount: 100000,
          originationMonth: 0,
          maturityMonth: Infinity,
          interestRate: 0.08,
          originationFee: 1000,
          loanTermMonths: Infinity
        }],
        params: {
          loanTermMonths: Infinity,
          btcAccumulation: false,
          monthlyWithdrawalAmount: -2500 // Withdraw $2500/month
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowWithdrawal).toBe(true)
      expect(decision.withdrawalAmount).toBeGreaterThan(0)
    })
  })

  describe('Fixed Term Mode (Specific Loan Term)', () => {
    it('should skip Month 0 in Fixed Term mode (initial loan already created)', () => {
      const context = createMockContext({
        month: 0,
        params: {
          loanTermMonths: 6
        }
      })

      const decision = strategy.makeDecision(context)

      // Should create initial loan, not enter Fixed Term mode
      expect(decision.reasoning).toContain('initial loan')
    })

    it('should do nothing when no loan is maturing', () => {
      const context = createMockContext({
        month: 3, // Loan matures at month 6
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [{
          principal: 150000,
          repaymentAmount: 150000,
          originationMonth: 0,
          maturityMonth: 6, // Matures at month 6
          interestRate: 0.08,
          originationFee: 1500,
          loanTermMonths: 6
        }],
        params: {
          loanTermMonths: 6
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
      expect(decision.reasoning).toContain('No loan maturing')
    })

    it('should rollover loan at maturity month', () => {
      const context = createMockContext({
        month: 6, // Loan matures this month
        btcPrice: 100000,
        totalBtcAmount: 10, // Collateral = 1,000,000
        activeLoans: [{
          principal: 100000, // Lower principal so we can borrow more
          repaymentAmount: 100000,
          originationMonth: 0,
          maturityMonth: 6,
          interestRate: 0.08,
          originationFee: 1000,
          loanTermMonths: 6
        }],
        params: {
          loanTermMonths: 6,
          annualInterestRate: 0.08,
          maxLoanAmount: 150000,
          riskManagement: {
            targetLtv: 15, // Target = 150,000
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.allowInvestment).toBe(true)
      expect(decision.reasoning).toContain('Rollover')
    })

    it('should calculate full term interest at rollover', () => {
      const principal = 150000
      const annualRate = 0.08
      const termMonths = 6
      const termYears = termMonths / 12 // 0.5 years
      const expectedInterest = principal * annualRate * termYears // 6000

      const context = createMockContext({
        month: 6,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [{
          principal,
          repaymentAmount: principal,
          originationMonth: 0,
          maturityMonth: 6,
          interestRate: annualRate,
          originationFee: 1500,
          loanTermMonths: termMonths
        }],
        params: {
          loanTermMonths: termMonths,
          annualInterestRate: annualRate,
          riskManagement: {
            targetLtv: 15,
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: annualRate
          }
        }
      })

      const decision = strategy.makeDecision(context)

      // Should mention repayment amount (principal + interest)
      const totalRepayment = principal + expectedInterest
      expect(decision.reasoning).toContain('repaying')
      expect(decision.reasoning).toContain(Math.round(totalRepayment).toString())
    })

    it('should handle forced exceedance when collateral insufficient', () => {
      const context = createMockContext({
        month: 6,
        btcPrice: 50000, // Price dropped, collateral = 500,000
        totalBtcAmount: 10,
        activeLoans: [{
          principal: 150000,
          repaymentAmount: 150000,
          originationMonth: 0,
          maturityMonth: 6,
          interestRate: 0.08,
          originationFee: 1500,
          loanTermMonths: 6
        }],
        params: {
          loanTermMonths: 6,
          annualInterestRate: 0.08,
          riskManagement: {
            targetLtv: 15, // Target = 75,000
            liquidationLtv: 85,
            maxLoanAmount: 150000,
            liquidationFeePercent: 5,
            annualInterestRate: 0.08
          }
        }
      })

      const decision = strategy.makeDecision(context)

      // With debt > target, should be forced exceedance
      expect(decision.reasoning).toContain('insufficient collateral')
    })

    it('should support BTC accumulation mode in Fixed Term', () => {
      const context = createMockContext({
        month: 6,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [{
          principal: 150000,
          repaymentAmount: 150000,
          originationMonth: 0,
          maturityMonth: 6,
          interestRate: 0.08,
          originationFee: 1500,
          loanTermMonths: 6
        }],
        params: {
          loanTermMonths: 6,
          btcAccumulation: true
        }
      })

      const decision = strategy.makeDecision(context)

      if (decision.allowInvestment) {
        expect(decision.allowWithdrawal).toBe(false)
        expect(decision.withdrawalAmount).toBe(0)
      }
    })

    it('should support cash generation mode in Fixed Term', () => {
      const context = createMockContext({
        month: 6,
        btcPrice: 100000,
        totalBtcAmount: 10,
        activeLoans: [{
          principal: 150000,
          repaymentAmount: 150000,
          originationMonth: 0,
          maturityMonth: 6,
          interestRate: 0.08,
          originationFee: 1500,
          loanTermMonths: 6
        }],
        params: {
          loanTermMonths: 6,
          btcAccumulation: false,
          monthlyWithdrawalAmount: -2500
        }
      })

      const decision = strategy.makeDecision(context)

      if (decision.allowInvestment) {
        expect(decision.allowWithdrawal).toBe(true)
        expect(decision.withdrawalAmount).toBeGreaterThan(0)
      }
    })
  })
})

/**
 * Helper function to create mock strategy context
 */
function createMockContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  const defaultParams: StrategyExecutionParams = {
    btcAmount: 10,
    initialBtcPrice: 100000,
    monthlyWithdrawalAmount: 0,
    annualInterestRate: 0.08,
    loanOriginationFeePercent: 1,
    loanTermMonths: Infinity, // Default to Dynamic LTV mode
    simulationMonths: 120,
    maxLoanAmount: 150000,
    expectedAnnualInflation: 0.03,
    btcAccumulation: true,
    annualSavingsIncrease: 0,
    riskManagement: {
      targetLtv: 15,
      liquidationLtv: 85,
      maxLoanAmount: 150000,
      liquidationFeePercent: 5,
      annualInterestRate: 0.08
    },
    investmentStrategy: 'rollingLoan'
  }

  const defaultContext: StrategyContext = {
    month: 0,
    currentDate: new Date('2024-01-01'),
    btcPrice: 100000,
    totalBtcAmount: 10,
    activeLoans: [],
    collateralValue: 1000000,
    debtCapacity: 150000,
    historicalPriceData: [],
    params: defaultParams
  }

  return {
    ...defaultContext,
    ...overrides,
    params: {
      ...defaultParams,
      ...(overrides.params || {})
    }
  }
}

