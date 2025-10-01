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
})

