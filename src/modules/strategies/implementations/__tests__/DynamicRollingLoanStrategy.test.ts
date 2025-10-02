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

      // Investment multiplier should be principal / collateralValue
      // With maxLoanAmount = 150000 and collateral = 1000000
      // Expected multiplier ≈ 0.15 (15%)
      expect(decision.investmentMultiplier).toBeGreaterThan(0.10)
      expect(decision.investmentMultiplier).toBeLessThan(0.20)
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

      // Should call handleDynamicLtvMode (currently returns placeholder)
      expect(decision.reasoning).toContain('Dynamic LTV mode')
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

      // Should call handleFixedTermMode (currently returns placeholder)
      expect(decision.reasoning).toContain('Fixed Term mode')
    })

    it('should handle 3-month loan term (Fixed Term mode)', () => {
      const context = createMockContext({
        month: 1,
        params: {
          loanTermMonths: 3
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('Fixed Term mode')
    })

    it('should handle 12-month loan term (Fixed Term mode)', () => {
      const context = createMockContext({
        month: 1,
        params: {
          loanTermMonths: 12
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('Fixed Term mode')
    })

    it('should handle 24-month loan term (Fixed Term mode)', () => {
      const context = createMockContext({
        month: 1,
        params: {
          loanTermMonths: 24
        }
      })

      const decision = strategy.makeDecision(context)

      expect(decision.reasoning).toContain('Fixed Term mode')
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

