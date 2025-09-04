import { describe, it, expect, beforeEach } from 'vitest'
import { DefaultStrategy } from '../../implementations/DefaultStrategy'
import type { 
  StrategyContext, 
  StrategyDecision, 
  StrategyEngineParams,
  Loan,
  RiskManagement,
  StrategyPriceData
} from '../../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

describe('DefaultStrategy', () => {
  let strategy: DefaultStrategy
  let mockContext: StrategyContext
  let mockParams: StrategyEngineParams
  let mockHistoricalData: HistoricalDataPoint[]
  let mockStrategyPriceData: StrategyPriceData[]

  beforeEach(() => {
    strategy = new DefaultStrategy()
    
    mockHistoricalData = [
      { time: 1640995200000, close: 50000 },
      { time: 1672531200000, close: 60000 },
      { time: 1704067200000, close: 70000 }
    ]

    mockStrategyPriceData = [
      {
        timestamp: 1704067200000,
        price: 70000,
        confidence: 0.9,
        metadata: {}
      }
    ]

    const mockRiskManagement: RiskManagement = {
      targetLtv: 50,
      liquidationLtv: 95
    }

    mockParams = {
      btcAmount: 1.0,
      initialBtcPrice: 70000,
      monthlyWithdrawalAmount: -2000, // Negative = withdrawal
      annualInterestRate: 6.5,
      loanOriginationFeePercent: 1.5,
      loanTermMonths: 6,
      simulationMonths: 12,
      maxLoanAmount: 50000,
      expectedAnnualInflation: 3.0,
      btcAccumulation: true,
      riskManagement: mockRiskManagement,
      investmentStrategy: 'default'
    }

    mockContext = {
      month: 1,
      currentDate: new Date('2024-01-01'),
      btcPrice: 70000,
      totalBtcAmount: 1.0,
      activeLoans: [],
      collateralValue: 70000,
      debtCapacity: 35000, // 50% of collateral
      historicalPriceData: mockHistoricalData,
      strategyPriceData: mockStrategyPriceData,
      params: mockParams
    }
  })

  describe('Strategy Metadata', () => {
    it('should have correct name and description', () => {
      expect(strategy.getName()).toBe('Default Strategy')
      expect(strategy.getDescription()).toBe('Standard investment approach with no additional restrictions. Invests up to target LTV.')
    })

    it('should have appropriate metadata', () => {
      const metadata = strategy.getMetadata()
      
      expect(metadata.securityRating).toBe(3)
      expect(metadata.complexityRating).toBe(1)
      expect(metadata.suitableFor).toContain('beginners')
      expect(metadata.criteria).toContain('target_ltv')
    })

    it('should provide detailed descriptions', () => {
      expect(strategy.getDetailedDescription()).toContain('simplest investment approach')
      expect(strategy.getFunctionality()).toContain('invests the maximum available amount')
      expect(strategy.getSuitability()).toContain('Ideal for beginners')
    })
  })

  describe('Investment Decisions', () => {
    it('should allow investment when BTC accumulation is enabled', () => {
      const decision = strategy.makeDecision(mockContext)
      
      expect(decision.allowInvestment).toBe(true)
      expect(decision.investmentMultiplier).toBe(1.0)
      expect(decision.reasoning).toContain('BTC Accumulation enabled')
    })

    it('should not allow investment when BTC accumulation is disabled', () => {
      const contextWithoutAccumulation = {
        ...mockContext,
        params: {
          ...mockParams,
          btcAccumulation: false
        }
      }
      
      const decision = strategy.makeDecision(contextWithoutAccumulation)
      
      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
      expect(decision.reasoning).toContain('BTC Accumulation disabled')
    })

    it('should handle positive monthly amount (savings) correctly', () => {
      const contextWithSavings = {
        ...mockContext,
        params: {
          ...mockParams,
          monthlyWithdrawalAmount: 1000, // Positive = savings
          btcAccumulation: false
        }
      }
      
      const decision = strategy.makeDecision(contextWithSavings)
      
      expect(decision.allowInvestment).toBe(false)
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.withdrawalAmount).toBe(0)
    })
  })

  describe('Withdrawal Decisions', () => {
    it('should allow withdrawal when monthly amount is negative', () => {
      const decision = strategy.makeDecision(mockContext)
      
      expect(decision.allowWithdrawal).toBe(true)
      expect(decision.withdrawalAmount).toBe(2000) // Absolute value of -2000
    })

    it('should not allow withdrawal when monthly amount is positive', () => {
      const contextWithSavings = {
        ...mockContext,
        params: {
          ...mockParams,
          monthlyWithdrawalAmount: 1000 // Positive = savings
        }
      }
      
      const decision = strategy.makeDecision(contextWithSavings)
      
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.withdrawalAmount).toBe(0)
    })

    it('should not allow withdrawal when monthly amount is zero', () => {
      const contextWithZero = {
        ...mockContext,
        params: {
          ...mockParams,
          monthlyWithdrawalAmount: 0
        }
      }
      
      const decision = strategy.makeDecision(contextWithZero)
      
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.withdrawalAmount).toBe(0)
    })
  })

  describe('Debt Capacity Management', () => {
    it('should handle insufficient debt capacity for needs', () => {
      // Create context where debt capacity is insufficient
      const contextWithHighDebt = {
        ...mockContext,
        debtCapacity: 1000, // Very low capacity
        params: {
          ...mockParams,
          monthlyWithdrawalAmount: -5000 // High withdrawal need
        }
      }
      
      const decision = strategy.makeDecision(contextWithHighDebt)
      
      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
      expect(decision.reasoning).toContain('Can cover loan repayments but not withdrawal')
    })

    it('should handle case where only repayments can be covered', () => {
      const activeLoans: Loan[] = [
        {
          id: 1,
          month: 1,
          principal: 10000,
          maturityMonth: 1, // Maturing this month
          repaymentAmount: 10500,
          lockedBtc: 0.15
        }
      ]

      const contextWithMaturingLoan = {
        ...mockContext,
        activeLoans,
        debtCapacity: 11000, // Just enough for repayment but not withdrawal
        params: {
          ...mockParams,
          monthlyWithdrawalAmount: -3000
        }
      }
      
      const decision = strategy.makeDecision(contextWithMaturingLoan)
      
      expect(decision.allowWithdrawal).toBe(false)
      expect(decision.reasoning).toContain('Can cover loan repayments but not withdrawal')
    })
  })

  describe('Loan Calculations', () => {
    it('should calculate principal needs correctly with origination fees', () => {
      const activeLoans: Loan[] = [
        {
          id: 1,
          month: 1,
          principal: 5000,
          maturityMonth: 1,
          repaymentAmount: 5200,
          lockedBtc: 0.074
        }
      ]

      const contextWithLoan = {
        ...mockContext,
        activeLoans
      }
      
      const decision = strategy.makeDecision(contextWithLoan)
      
      // Should account for both repayment and withdrawal needs
      expect(decision.allowInvestment).toBe(true)
      expect(decision.allowWithdrawal).toBe(true)
    })

    it('should handle multiple active loans correctly', () => {
      const activeLoans: Loan[] = [
        {
          id: 1,
          month: 1,
          principal: 5000,
          maturityMonth: 1, // Maturing
          repaymentAmount: 5200,
          lockedBtc: 0.074
        },
        {
          id: 2,
          month: 1,
          principal: 3000,
          maturityMonth: 3, // Not maturing
          repaymentAmount: 3120,
          lockedBtc: 0.045
        }
      ]

      const contextWithMultipleLoans = {
        ...mockContext,
        activeLoans
      }
      
      const decision = strategy.makeDecision(contextWithMultipleLoans)
      
      // Should only consider maturing loan for repayment calculation
      expect(decision.allowInvestment).toBe(true)
      expect(decision.allowWithdrawal).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero collateral value', () => {
      const contextWithZeroCollateral = {
        ...mockContext,
        totalBtcAmount: 0,
        collateralValue: 0,
        debtCapacity: 0
      }
      
      const decision = strategy.makeDecision(contextWithZeroCollateral)
      
      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
    })

    it('should handle very high BTC price', () => {
      const contextWithHighPrice = {
        ...mockContext,
        btcPrice: 1000000,
        collateralValue: 1000000,
        debtCapacity: 500000
      }
      
      const decision = strategy.makeDecision(contextWithHighPrice)
      
      expect(decision.allowInvestment).toBe(true)
      expect(decision.investmentMultiplier).toBe(1.0)
    })

    it('should handle negative debt capacity gracefully', () => {
      const contextWithNegativeCapacity = {
        ...mockContext,
        debtCapacity: -1000 // Negative capacity
      }
      
      const decision = strategy.makeDecision(contextWithNegativeCapacity)
      
      expect(decision.allowInvestment).toBe(false)
      expect(decision.investmentMultiplier).toBe(0)
    })
  })

  describe('Strategy Consistency', () => {
    it('should make consistent decisions with same context', () => {
      const decision1 = strategy.makeDecision(mockContext)
      const decision2 = strategy.makeDecision(mockContext)
      
      expect(decision1).toEqual(decision2)
    })

    it('should provide reasoning for all decisions', () => {
      const decision = strategy.makeDecision(mockContext)
      
      expect(decision.reasoning).toBeDefined()
      expect(decision.reasoning).toBeTruthy()
      expect(typeof decision.reasoning).toBe('string')
    })
  })
})
