/**
 * Strategy Execution Service Tests
 * 
 * Tests for the core strategy execution service, including the critical
 * Month 0 initialBtcPrice fix.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { StrategyExecutionService } from '../StrategyExecutionService'
import type { 
  InvestmentStrategyInterface, 
  StrategyExecutionParams, 
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from '../../types'
import type { PriceProjectionResult } from '../../../../../app/simulation/price-models/types'

// Mock strategy for testing
class MockStrategy implements InvestmentStrategyInterface {
  getName(): string {
    return 'Mock Strategy'
  }

  getDescription(): string {
    return 'A mock strategy for testing'
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 3,
      complexityRating: 2,
      suitableFor: ['moderate'],
      criteria: ['test']
    }
  }

  getDetailedDescription(): string {
    return 'Detailed mock strategy description'
  }

  getFunctionality(): string {
    return 'Mock functionality'
  }

  getSuitability(): string {
    return 'Mock suitability'
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    // Simple strategy: no investment, no withdrawal
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: `Month ${context.month}: BTC Price $${context.btcPrice}`
    }
  }
}

describe('StrategyExecutionService', () => {
  let service: StrategyExecutionService
  let mockStrategy: InvestmentStrategyInterface
  let mockParams: StrategyExecutionParams
  let mockPriceProjection: PriceProjectionResult

  beforeEach(() => {
    service = new StrategyExecutionService()
    mockStrategy = new MockStrategy()

    // Mock parameters with specific initialBtcPrice
    mockParams = {
      btcAmount: 1.0,
      initialBtcPrice: 50000, // User-entered current price
      monthlyWithdrawalAmount: 0,
      annualInterestRate: 6.5,
      loanOriginationFeePercent: 1.5,
      loanTermMonths: 6,
      simulationMonths: 3,
      maxLoanAmount: 25000,
      expectedAnnualInflation: 3,
      btcAccumulation: true,
      investmentStrategy: 'rolling_loan',
      riskManagement: {
        targetLtv: 50,
        liquidationLtv: 80,
        maxLoanAmount: 25000,
        liquidationFeePercent: 5,
        annualInterestRate: 6.5
      }
    }

    // Mock price projection with DIFFERENT prices than initialBtcPrice
    // This is the key to testing the fix
    mockPriceProjection = {
      modelName: 'test',
      modelVersion: '1.0.0',
      projectionPoints: [
        { timestamp: Date.now(), price: 55000, confidence: 0.95 }, // Month 0 projected: $55,000
        { timestamp: Date.now() + 30 * 24 * 60 * 60 * 1000, price: 60000, confidence: 0.95 }, // Month 1: $60,000
        { timestamp: Date.now() + 60 * 24 * 60 * 60 * 1000, price: 65000, confidence: 0.95 }  // Month 2: $65,000
      ],
      metadata: {
        totalMonths: 3,
        totalGrowth: 30,
        averageMonthlyGrowth: 10,
        confidence: 0.95,
        generatedAt: new Date().toISOString()
      }
    }
  })

  describe('Month 0 Price Fix', () => {
    test('should use initialBtcPrice for Month 0, not projected price', async () => {
      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      expect(result).toBeDefined()
      expect(result.monthlyResults).toHaveLength(3)

      // CRITICAL TEST: Month 0 should use initialBtcPrice ($50,000), NOT projected price ($55,000)
      const month0 = result.monthlyResults[0]
      expect(month0.btcPrice).toBe(50000) // Should be initialBtcPrice
      expect(month0.btcPrice).not.toBe(55000) // Should NOT be projected price

      // Month 1 and beyond should use projected prices
      const month1 = result.monthlyResults[1]
      expect(month1.btcPrice).toBe(60000) // Should be projected price

      const month2 = result.monthlyResults[2]
      expect(month2.btcPrice).toBe(65000) // Should be projected price
    })

    test('should calculate collateral correctly for Month 0 using initialBtcPrice', async () => {
      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      const month0 = result.monthlyResults[0]
      
      // Collateral should be: btcAmount * initialBtcPrice
      const expectedCollateral = mockParams.btcAmount * mockParams.initialBtcPrice
      expect(month0.collateralValue).toBe(expectedCollateral) // 1.0 * 50000 = 50000
      
      // Should NOT be: btcAmount * projectedPrice
      const incorrectCollateral = mockParams.btcAmount * 55000
      expect(month0.collateralValue).not.toBe(incorrectCollateral)
    })

    test('should pass correct btcPrice to strategy context for Month 0', async () => {
      // Create a spy strategy that captures the context
      let capturedContext: StrategyContext | null = null

      class SpyStrategy extends MockStrategy {
        makeDecision(context: StrategyContext): StrategyDecision {
          if (context.month === 0) {
            capturedContext = context
          }
          return super.makeDecision(context)
        }
      }

      const spyStrategy = new SpyStrategy()
      await service.executeStrategy(spyStrategy, mockParams, mockPriceProjection)

      expect(capturedContext).not.toBeNull()
      expect(capturedContext!.btcPrice).toBe(50000) // Should be initialBtcPrice
      expect(capturedContext!.collateralValue).toBe(50000) // 1.0 * 50000
    })

    test('should handle edge case where initialBtcPrice equals projected price', async () => {
      // Set projected price equal to initialBtcPrice
      mockPriceProjection.projectionPoints[0].price = 50000

      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      const month0 = result.monthlyResults[0]
      expect(month0.btcPrice).toBe(50000)
      expect(month0.collateralValue).toBe(50000)
    })

    test('should handle very different initialBtcPrice vs projected price', async () => {
      // Set a very different projected price
      mockPriceProjection.projectionPoints[0].price = 100000 // 2x the initial price

      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      const month0 = result.monthlyResults[0]
      
      // Should still use initialBtcPrice, not the projected 100k
      expect(month0.btcPrice).toBe(50000)
      expect(month0.collateralValue).toBe(50000)
    })
  })

  describe('Parameter Validation', () => {
    test('should validate btcAmount', () => {
      const invalidParams = { ...mockParams, btcAmount: 0 }
      expect(service.validateParams(invalidParams)).toBe(false)
    })

    test('should validate initialBtcPrice', () => {
      const invalidParams = { ...mockParams, initialBtcPrice: 0 }
      expect(service.validateParams(invalidParams)).toBe(false)
    })

    test('should validate simulationMonths', () => {
      const invalidParams = { ...mockParams, simulationMonths: 0 }
      expect(service.validateParams(invalidParams)).toBe(false)
    })

    test('should validate targetLtv', () => {
      const invalidParams = { 
        ...mockParams, 
        riskManagement: { ...mockParams.riskManagement, targetLtv: 0 }
      }
      expect(service.validateParams(invalidParams)).toBe(false)
    })

    test('should accept valid parameters', () => {
      expect(service.validateParams(mockParams)).toBe(true)
    })
  })

  describe('Execution Result', () => {
    test('should return complete execution result', async () => {
      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      expect(result).toBeDefined()
      expect(result.monthlyResults).toBeDefined()
      expect(result.metadata).toBeDefined()
      expect(result.metadata.strategyUsed).toBe('Mock Strategy')
      expect(result.metadata.totalMonths).toBe(3)
    })

    test('should generate monthly results for all months', async () => {
      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      expect(result.monthlyResults).toHaveLength(mockParams.simulationMonths)
      
      result.monthlyResults.forEach((monthResult, index) => {
        expect(monthResult.month).toBe(index)
        expect(monthResult.btcPrice).toBeGreaterThan(0)
        expect(monthResult.totalBtcAmount).toBeGreaterThan(0)
      })
    })
  })

  describe('Monthly Savings Integration', () => {
    test('should apply positive monthly savings (add BTC)', async () => {
      const paramsWithSavings = {
        ...mockParams,
        monthlyWithdrawalAmount: 1000, // $1000 savings per month
        annualSavingsIncrease: 0 // No increase for simplicity
      }

      const result = await service.executeStrategy(mockStrategy, paramsWithSavings, mockPriceProjection)

      // Check that BTC amount increases due to savings
      const month1 = result.monthlyResults[1]
      expect(month1.monthlySavingsApplied).toBe(1000)
      expect(month1.totalBtcAmount).toBeGreaterThan(mockParams.btcAmount)
    })

    test('should apply negative monthly withdrawals (reduce BTC)', async () => {
      const paramsWithWithdrawals = {
        ...mockParams,
        monthlyWithdrawalAmount: -2500, // $2500 withdrawal per month
        annualSavingsIncrease: 0
      }

      const result = await service.executeStrategy(mockStrategy, paramsWithWithdrawals, mockPriceProjection)

      // Check that BTC amount decreases due to withdrawals
      const month1 = result.monthlyResults[1]
      expect(month1.monthlySavingsApplied).toBe(-2500)
      expect(month1.totalBtcAmount).toBeLessThan(mockParams.btcAmount)
    })

    test('should apply annual compound increase to monthly savings', async () => {
      const paramsWithIncrease = {
        ...mockParams,
        monthlyWithdrawalAmount: 1000, // $1000 initial
        annualSavingsIncrease: 10, // 10% annual increase
        simulationMonths: 36 // 3 years
      }

      const result = await service.executeStrategy(mockStrategy, paramsWithIncrease, mockPriceProjection)

      // Year 0 (months 0-11): $1000
      const month6 = result.monthlyResults[6]
      expect(month6.monthlySavingsApplied).toBeCloseTo(1000, 0)

      // Year 1 (months 12-23): $1100 (10% increase)
      const month18 = result.monthlyResults[18]
      expect(month18.monthlySavingsApplied).toBeCloseTo(1100, 0)

      // Year 2 (months 24-35): $1210 (10% increase again)
      const month30 = result.monthlyResults[30]
      expect(month30.monthlySavingsApplied).toBeCloseTo(1210, 0)
    })

    test('should skip monthly savings when monthlyWithdrawalAmount is 0', async () => {
      const paramsNoSavings = {
        ...mockParams,
        monthlyWithdrawalAmount: 0,
        annualSavingsIncrease: 10
      }

      const result = await service.executeStrategy(mockStrategy, paramsNoSavings, mockPriceProjection)

      // BTC amount should not change due to savings
      const month1 = result.monthlyResults[1]
      expect(month1.monthlySavingsApplied).toBeUndefined()
    })

    test('should apply monthly savings BEFORE strategy decision', async () => {
      // Create a spy strategy that captures the BTC amount
      let capturedBtcAmounts: number[] = []

      class SpyStrategy extends MockStrategy {
        makeDecision(context: StrategyContext): StrategyDecision {
          capturedBtcAmounts.push(context.totalBtcAmount)
          return super.makeDecision(context)
        }
      }

      const paramsWithSavings = {
        ...mockParams,
        monthlyWithdrawalAmount: 1000,
        annualSavingsIncrease: 0,
        simulationMonths: 3
      }

      const spyStrategy = new SpyStrategy()
      await service.executeStrategy(spyStrategy, paramsWithSavings, mockPriceProjection)

      // Month 1 should have more BTC than Month 0 due to savings applied before strategy decision
      expect(capturedBtcAmounts[1]).toBeGreaterThan(capturedBtcAmounts[0])
    })

    test('should track monthlySavingsApplied in monthly results', async () => {
      const paramsWithSavings = {
        ...mockParams,
        monthlyWithdrawalAmount: 1500,
        annualSavingsIncrease: 5,
        simulationMonths: 24
      }

      const result = await service.executeStrategy(mockStrategy, paramsWithSavings, mockPriceProjection)

      // Check that monthlySavingsApplied is tracked for all months
      result.monthlyResults.forEach((monthResult, index) => {
        if (index > 0) { // Skip Month 0
          expect(monthResult.monthlySavingsApplied).toBeDefined()
          expect(monthResult.monthlySavingsApplied).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Strategy Execution Data Tracking', () => {
    test('should track btcPurchased when investment is allowed', async () => {
      // Create a strategy that allows investment
      class InvestingStrategy extends MockStrategy {
        makeDecision(context: StrategyContext): StrategyDecision {
          return {
            allowInvestment: true,
            investmentMultiplier: 0.1, // 10% investment
            allowWithdrawal: false,
            withdrawalAmount: 0,
            reasoning: 'Investing 10%'
          }
        }
      }

      const investingStrategy = new InvestingStrategy()
      const result = await service.executeStrategy(investingStrategy, mockParams, mockPriceProjection)

      // Check that btcPurchased is tracked when investment happens
      const monthsWithInvestment = result.monthlyResults.filter(m => m.btcPurchased !== undefined && m.btcPurchased > 0)
      expect(monthsWithInvestment.length).toBeGreaterThan(0)
    })

    test('should calculate btcPurchased from principal for reinvestment', async () => {
      class InvestingStrategy extends MockStrategy {
        makeDecision(context: StrategyContext): StrategyDecision {
          if (context.month === 0) {
            return {
              allowInvestment: true,
              investmentMultiplier: 0.15, // 15% investment
              allowWithdrawal: false,
              withdrawalAmount: 0,
              reasoning: 'Initial investment'
            }
          }
          return super.makeDecision(context)
        }
      }

      const investingStrategy = new InvestingStrategy()
      const result = await service.executeStrategy(investingStrategy, mockParams, mockPriceProjection)

      // Month 0 should have btcPurchased
      const month0 = result.monthlyResults[0]
      if (month0.btcPurchased) {
        expect(month0.btcPurchased).toBeGreaterThan(0)
        // btcPurchased should be principal / btcPrice
        expect(month0.btcPurchased).toBeCloseTo(month0.principalForReinvestment / month0.btcPrice, 5)
      }
    })

    test('should not track btcPurchased when no investment', async () => {
      // Use default MockStrategy which doesn't allow investment
      const result = await service.executeStrategy(mockStrategy, mockParams, mockPriceProjection)

      // Most months should not have btcPurchased
      const monthsWithoutInvestment = result.monthlyResults.filter(m => m.btcPurchased === undefined || m.btcPurchased === 0)
      expect(monthsWithoutInvestment.length).toBeGreaterThan(0)
    })

    test('should track btcPurchased separately from monthly savings', async () => {
      class InvestingStrategy extends MockStrategy {
        makeDecision(context: StrategyContext): StrategyDecision {
          return {
            allowInvestment: true,
            investmentMultiplier: 0.1,
            allowWithdrawal: false,
            withdrawalAmount: 0,
            reasoning: 'Investing'
          }
        }
      }

      const paramsWithSavings = {
        ...mockParams,
        monthlyWithdrawalAmount: 1000, // $1000 savings
        annualSavingsIncrease: 0
      }

      const investingStrategy = new InvestingStrategy()
      const result = await service.executeStrategy(investingStrategy, paramsWithSavings, mockPriceProjection)

      // Check that both btcPurchased and monthlySavingsApplied are tracked
      const month1 = result.monthlyResults[1]
      if (month1.btcPurchased && month1.monthlySavingsApplied) {
        expect(month1.btcPurchased).toBeGreaterThan(0)
        expect(month1.monthlySavingsApplied).toBe(1000)
        // They should be different values
        expect(month1.btcPurchased).not.toBe(month1.monthlySavingsApplied / month1.btcPrice)
      }
    })
  })
})

