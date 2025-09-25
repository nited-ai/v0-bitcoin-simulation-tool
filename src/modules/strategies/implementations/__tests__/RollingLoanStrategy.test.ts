/**
 * Rolling Loan Strategy Tests
 * 
 * Comprehensive test suite for the RollingLoanStrategy implementation.
 * Tests both BTC accumulation enabled and disabled modes.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { RollingLoanStrategy } from '../RollingLoanStrategy'
import type { StrategyContext, StrategyDecision, InvestmentStrategyInterface } from '../../types'

describe('RollingLoanStrategy', () => {
  let strategy: InvestmentStrategyInterface
  let mockContext: StrategyContext

  beforeEach(() => {
    strategy = new RollingLoanStrategy()
    
    // Create base mock context
    mockContext = {
      month: 1,
      btcPrice: 50000,
      totalBtcAmount: 1.0,
      activeLoans: [],
      historicalData: [],
      params: {
        btcAmount: 1.0,
        initialBtcPrice: 50000,
        monthlyWithdrawalAmount: 0,
        annualInterestRate: 6.5,
        loanOriginationFeePercent: 1.5,
        loanTermMonths: 6,
        simulationMonths: 12,
        maxLoanAmount: 25000,
        expectedAnnualInflation: 3,
        btcAccumulation: true,
        riskManagement: {
          targetLtv: 50,
          liquidationLtv: 80,
          maxLoanAmount: 25000,
          liquidationFeePercent: 5,
          annualInterestRate: 6.5
        }
      }
    }
  })

  describe('Basic Strategy Interface', () => {
    test('getName returns correct strategy name', () => {
      expect(strategy.getName()).toBe('Rolling Loan Strategy')
    })

    test('getDescription returns meaningful description', () => {
      const description = strategy.getDescription()
      expect(description).toContain('Automatically rolls over')
      expect(description).toContain('Bitcoin-backed loans')
    })

    test('getMetadata returns appropriate metadata', () => {
      const metadata = strategy.getMetadata()
      expect(metadata.securityRating).toBeGreaterThanOrEqual(1)
      expect(metadata.securityRating).toBeLessThanOrEqual(5)
      expect(metadata.complexityRating).toBeGreaterThanOrEqual(1)
      expect(metadata.complexityRating).toBeLessThanOrEqual(5)
      expect(Array.isArray(metadata.suitableFor)).toBe(true)
      expect(Array.isArray(metadata.criteria)).toBe(true)
    })
  })

  describe('Initial Loan Decision - BTC Accumulation Enabled', () => {
    test('takes initial loan when no active loans exist', () => {
      mockContext.params.btcAccumulation = true
      
      const decision = strategy.makeDecision(mockContext)
      
      expect(decision.allowInvestment).toBe(true)
      expect(decision.investmentMultiplier).toBeGreaterThan(0)
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.withdrawalAmount).toBe(0)
      expect(decision.reasoning).toContain('initial loan')
    })

    test('calculates loan amount based on target LTV', () => {
      mockContext.params.btcAccumulation = true
      const collateralValue = mockContext.totalBtcAmount * mockContext.btcPrice // 50,000
      const expectedLoanAmount = collateralValue * (mockContext.params.riskManagement.targetLtv / 100) // 25,000
      
      const decision = strategy.makeDecision(mockContext)
      
      // Investment multiplier should result in approximately the target loan amount
      const actualLoanAmount = decision.investmentMultiplier * collateralValue
      expect(actualLoanAmount).toBeCloseTo(expectedLoanAmount, -2) // Within 100 units
    })
  })

  describe('Initial Loan Decision - BTC Accumulation Disabled', () => {
    test('takes initial loan for cash generation when BTC accumulation disabled', () => {
      mockContext.params.btcAccumulation = false
      
      const decision = strategy.makeDecision(mockContext)
      
      expect(decision.allowInvestment).toBe(true)
      expect(decision.investmentMultiplier).toBeGreaterThan(0)
      expect(decision.allowWithdrawal).toBe(true) // Should allow withdrawal for cash
      expect(decision.reasoning).toContain('cash generation')
    })
  })

  describe('Loan Rollover Logic', () => {
    test('rolls over maturing loan with BTC accumulation enabled', () => {
      // Setup: existing loan maturing this month
      mockContext.activeLoans = [{
        id: 1,
        month: 1,
        principal: 20000,
        maturityMonth: 1, // Maturing this month
        repaymentAmount: 20650, // Principal + interest
        lockedBtc: 0.4
      }]
      mockContext.params.btcAccumulation = true
      
      const decision = strategy.makeDecision(mockContext)
      
      expect(decision.allowInvestment).toBe(true)
      expect(decision.investmentMultiplier).toBeGreaterThan(0)
      expect(decision.reasoning).toContain('rollover')
    })

    test('handles price increase - larger loan possible', () => {
      // Setup: BTC price increased from 50k to 60k
      mockContext.btcPrice = 60000
      mockContext.activeLoans = [{
        id: 1,
        month: 1,
        principal: 20000,
        maturityMonth: 1,
        repaymentAmount: 20650,
        lockedBtc: 0.4
      }]
      
      const decision = strategy.makeDecision(mockContext)
      
      // Should be able to take larger loan due to higher collateral value
      const newCollateralValue = mockContext.totalBtcAmount * mockContext.btcPrice
      const maxPossibleLoan = newCollateralValue * (mockContext.params.riskManagement.targetLtv / 100)
      const actualLoanAmount = decision.investmentMultiplier * newCollateralValue
      
      expect(actualLoanAmount).toBeGreaterThan(20650) // More than just repayment
      expect(actualLoanAmount).toBeLessThanOrEqual(maxPossibleLoan)
    })

    test('handles price decrease - forced to exceed target LTV', () => {
      // Setup: BTC price decreased significantly, forcing higher LTV
      mockContext.btcPrice = 35000 // Severe price drop
      mockContext.activeLoans = [{
        id: 1,
        month: 1,
        principal: 25000, // Larger loan
        maturityMonth: 1,
        repaymentAmount: 25812, // Principal + interest
        lockedBtc: 0.7
      }]

      const decision = strategy.makeDecision(mockContext)

      // Should still allow investment to pay off loan, even if exceeding target LTV
      expect(decision.allowInvestment).toBe(true)
      expect(decision.targetLtvOverride).toBeGreaterThan(mockContext.params.riskManagement.targetLtv)
      expect(decision.reasoning).toContain('exceedance')
    })
  })

  describe('Insufficient Collateral Scenarios', () => {
    test('triggers liquidation when insufficient collateral for minimum loan', () => {
      // Setup: BTC price crashed, insufficient collateral for required repayment
      mockContext.btcPrice = 25000 // Severe price drop
      mockContext.totalBtcAmount = 0.8 // Some BTC was liquidated
      mockContext.activeLoans = [{
        id: 1,
        month: 1,
        principal: 20000,
        maturityMonth: 1,
        repaymentAmount: 20650,
        lockedBtc: 0.8
      }]

      const decision = strategy.makeDecision(mockContext)

      // Should not allow investment when liquidation is imminent
      expect(decision.allowInvestment).toBe(false)
      expect(decision.reasoning).toContain('Insufficient collateral')
    })
  })

  describe('Cash Flow Management', () => {
    test('handles excess loan proceeds with BTC accumulation enabled', () => {
      // Setup: loan rollover with excess proceeds
      mockContext.btcPrice = 55000 // Price increased
      mockContext.activeLoans = [{
        id: 1,
        month: 1,
        principal: 20000,
        maturityMonth: 1,
        repaymentAmount: 20650,
        lockedBtc: 0.4
      }]
      mockContext.params.btcAccumulation = true

      const decision = strategy.makeDecision(mockContext)

      // Should reinvest excess proceeds into more BTC
      expect(decision.allowInvestment).toBe(true)
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.reasoning).toContain('reinvest excess')
    })

    test('handles excess loan proceeds with BTC accumulation disabled', () => {
      // Setup: loan rollover with excess proceeds, accumulation disabled
      mockContext.btcPrice = 55000
      mockContext.activeLoans = [{
        id: 1,
        month: 1,
        principal: 20000,
        maturityMonth: 1,
        repaymentAmount: 20650,
        lockedBtc: 0.4
      }]
      mockContext.params.btcAccumulation = false

      const decision = strategy.makeDecision(mockContext)

      // Should take excess proceeds as cash
      expect(decision.allowInvestment).toBe(true)
      expect(decision.allowWithdrawal).toBe(true)
      expect(decision.withdrawalAmount).toBeGreaterThan(0)
      expect(decision.reasoning).toContain('cash generation')
    })
  })

  describe('Risk Management Integration', () => {
    test('respects maximum loan amount limits', () => {
      // Setup: very high BTC price that would allow huge loan
      mockContext.btcPrice = 100000
      mockContext.params.maxLoanAmount = 30000

      const decision = strategy.makeDecision(mockContext)

      const actualLoanAmount = decision.investmentMultiplier * mockContext.totalBtcAmount * mockContext.btcPrice
      expect(actualLoanAmount).toBeLessThanOrEqual(mockContext.params.maxLoanAmount)
    })

    test('provides detailed reasoning for decisions', () => {
      const decision = strategy.makeDecision(mockContext)

      expect(decision.reasoning).toBeDefined()
      expect(decision.reasoning!.length).toBeGreaterThan(10)
    })
  })

  describe('Edge Cases', () => {
    test('handles zero BTC amount gracefully', () => {
      mockContext.totalBtcAmount = 0

      const decision = strategy.makeDecision(mockContext)

      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
    })

    test('handles multiple active loans', () => {
      mockContext.activeLoans = [
        {
          id: 1,
          month: 1,
          principal: 10000,
          maturityMonth: 1,
          repaymentAmount: 10325,
          lockedBtc: 0.2
        },
        {
          id: 2,
          month: 2,
          principal: 15000,
          maturityMonth: 3, // Not maturing this month
          repaymentAmount: 15487,
          lockedBtc: 0.3
        }
      ]

      const decision = strategy.makeDecision(mockContext)

      // Should only consider maturing loans for rollover
      expect(decision.allowInvestment).toBe(true)
      expect(decision.reasoning).toContain('rollover')
    })
  })
})
