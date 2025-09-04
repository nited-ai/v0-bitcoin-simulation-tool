import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StrategyExecutionService } from '../../services/StrategyExecutionService'
import type { 
  StrategyExecutionRequest,
  StrategyExecutionResponse,
  StrategyEngineParams,
  StrategyPriceData,
  InvestmentStrategy
} from '../../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

describe('StrategyExecutionService', () => {
  let service: StrategyExecutionService
  let mockRequest: StrategyExecutionRequest
  let mockParams: StrategyEngineParams
  let mockPriceData: StrategyPriceData[]
  let mockHistoricalData: HistoricalDataPoint[]

  beforeEach(() => {
    service = new StrategyExecutionService()
    
    mockHistoricalData = [
      { time: 1640995200000, close: 50000 },
      { time: 1672531200000, close: 60000 },
      { time: 1704067200000, close: 70000 }
    ]

    mockPriceData = [
      {
        timestamp: 1704067200000,
        price: 70000,
        support: 65000,
        resistance: 75000,
        confidence: 0.9,
        metadata: { month: 0 }
      },
      {
        timestamp: 1706745600000,
        price: 72000,
        support: 67000,
        resistance: 77000,
        confidence: 0.85,
        metadata: { month: 1 }
      }
    ]

    mockParams = {
      btcAmount: 1.0,
      initialBtcPrice: 70000,
      monthlyWithdrawalAmount: -2000,
      annualInterestRate: 6.5,
      loanOriginationFeePercent: 1.5,
      loanTermMonths: 6,
      simulationMonths: 12,
      maxLoanAmount: 50000,
      expectedAnnualInflation: 3.0,
      btcAccumulation: true,
      riskManagement: {
        targetLtv: 50,
        liquidationLtv: 95
      },
      investmentStrategy: 'default'
    }

    mockRequest = {
      strategyId: 'default',
      params: mockParams,
      priceData: mockPriceData,
      historicalData: mockHistoricalData
    }
  })

  describe('Strategy Registry', () => {
    it('should have default strategies registered', () => {
      const strategies = service.getAvailableStrategies()
      
      expect(strategies.length).toBeGreaterThan(0)
      expect(strategies.some(s => s.id === 'default')).toBe(true)
    })

    it('should return enabled strategies only', () => {
      const strategies = service.getAvailableStrategies()
      
      strategies.forEach(strategy => {
        expect(strategy.enabled).toBe(true)
      })
    })

    it('should return strategies sorted by priority', () => {
      const strategies = service.getAvailableStrategies()
      
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].priority).toBeGreaterThanOrEqual(strategies[i].priority)
      }
    })
  })

  describe('Strategy Execution', () => {
    it('should execute default strategy successfully', async () => {
      const response = await service.executeStrategy(mockRequest)
      
      expect(response.success).toBe(true)
      expect(response.results).toBeDefined()
      expect(response.results!.length).toBeGreaterThan(0)
      expect(response.strategyId).toBe('default')
      expect(response.executionTime).toBeGreaterThan(0)
    })

    it('should return error for invalid strategy', async () => {
      const invalidRequest = {
        ...mockRequest,
        strategyId: 'nonexistent' as InvestmentStrategy
      }
      
      const response = await service.executeStrategy(invalidRequest)
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Strategy not found')
      expect(response.results).toBeUndefined()
    })

    it('should validate parameters before execution', async () => {
      const invalidRequest = {
        ...mockRequest,
        params: {
          ...mockParams,
          btcAmount: -1 // Invalid negative amount
        }
      }
      
      const response = await service.executeStrategy(invalidRequest)
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid parameters')
    })

    it('should handle execution errors gracefully', async () => {
      // Create a request that will cause validation to fail
      const errorRequest = {
        ...mockRequest,
        params: {
          ...mockParams,
          simulationMonths: -1 // Invalid negative simulation months
        }
      }

      const response = await service.executeStrategy(errorRequest)

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.executionTime).toBeGreaterThan(0)
    })
  })

  describe('Parameter Validation', () => {
    it('should validate correct parameters', () => {
      const validation = service.validateStrategyParams('default', mockParams)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.strategyId).toBe('default')
    })

    it('should detect invalid BTC amount', () => {
      const invalidParams = {
        ...mockParams,
        btcAmount: -1
      }
      
      const validation = service.validateStrategyParams('default', invalidParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('BTC amount'))).toBe(true)
    })

    it('should detect invalid interest rate', () => {
      const invalidParams = {
        ...mockParams,
        annualInterestRate: -5
      }
      
      const validation = service.validateStrategyParams('default', invalidParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('interest rate'))).toBe(true)
    })

    it('should detect invalid LTV values', () => {
      const invalidParams = {
        ...mockParams,
        riskManagement: {
          targetLtv: 150, // Invalid high LTV
          liquidationLtv: 95
        }
      }
      
      const validation = service.validateStrategyParams('default', invalidParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('LTV'))).toBe(true)
    })

    it('should validate strategy-specific parameters', () => {
      const athParams = {
        ...mockParams,
        investmentStrategy: 'athBased' as InvestmentStrategy,
        athBasedParams: {
          athThresholdPercent: 150 // Invalid threshold
        }
      }
      
      const validation = service.validateStrategyParams('athBased', athParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.parameterErrors.length).toBeGreaterThan(0)
    })
  })

  describe('Strategy Metadata', () => {
    it('should return metadata for valid strategy', () => {
      const metadata = service.getStrategyMetadata('default')
      
      expect(metadata).toBeDefined()
      expect(metadata!.securityRating).toBeGreaterThan(0)
      expect(metadata!.complexityRating).toBeGreaterThan(0)
      expect(metadata!.suitableFor).toBeInstanceOf(Array)
      expect(metadata!.criteria).toBeInstanceOf(Array)
    })

    it('should return null for invalid strategy', () => {
      const metadata = service.getStrategyMetadata('nonexistent' as InvestmentStrategy)
      
      expect(metadata).toBeNull()
    })
  })

  describe('Performance Metrics', () => {
    it('should track execution metrics', async () => {
      // Execute a strategy to generate metrics
      await service.executeStrategy(mockRequest)
      
      const metrics = service.getPerformanceMetrics()
      
      expect(metrics.length).toBeGreaterThan(0)
      
      const defaultMetrics = metrics.find(m => m.strategyId === 'default')
      expect(defaultMetrics).toBeDefined()
      expect(defaultMetrics!.totalExecutions).toBeGreaterThan(0)
      expect(defaultMetrics!.averageExecutionTime).toBeGreaterThan(0)
      expect(defaultMetrics!.lastExecution).toBeInstanceOf(Date)
    })

    it('should track success rate correctly', async () => {
      // Execute successful request
      await service.executeStrategy(mockRequest)
      
      // Execute failed request
      const failedRequest = {
        ...mockRequest,
        strategyId: 'nonexistent' as InvestmentStrategy
      }
      await service.executeStrategy(failedRequest)
      
      const metrics = service.getPerformanceMetrics()
      const defaultMetrics = metrics.find(m => m.strategyId === 'default')
      
      expect(defaultMetrics!.successRate).toBe(1.0) // 100% success for default strategy
    })

    it('should track errors in metrics', async () => {
      // Execute request that will fail
      const errorRequest = {
        ...mockRequest,
        params: {
          ...mockParams,
          btcAmount: -1 // Invalid
        }
      }
      
      await service.executeStrategy(errorRequest)
      
      const metrics = service.getPerformanceMetrics()
      const defaultMetrics = metrics.find(m => m.strategyId === 'default')
      
      expect(defaultMetrics!.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Simulation Results', () => {
    it('should return properly formatted monthly results', async () => {
      const response = await service.executeStrategy(mockRequest)
      
      expect(response.success).toBe(true)
      expect(response.results).toBeDefined()
      
      const results = response.results!
      expect(results.length).toBe(mockParams.simulationMonths)
      
      // Check first result structure
      const firstResult = results[0]
      expect(firstResult).toHaveProperty('month')
      expect(firstResult).toHaveProperty('dateString')
      expect(firstResult).toHaveProperty('btcPrice')
      expect(firstResult).toHaveProperty('collateralValue')
      expect(firstResult).toHaveProperty('totalDebt')
      expect(firstResult).toHaveProperty('currentBtcAmount')
      expect(firstResult).toHaveProperty('events')
      
      expect(firstResult.month).toBe(1)
      expect(firstResult.btcPrice).toBeGreaterThan(0)
      expect(firstResult.events).toBeInstanceOf(Array)
    })

    it('should handle different simulation lengths', async () => {
      const shortRequest = {
        ...mockRequest,
        params: {
          ...mockParams,
          simulationMonths: 3
        }
      }
      
      const response = await service.executeStrategy(shortRequest)
      
      expect(response.success).toBe(true)
      expect(response.results!.length).toBe(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero BTC amount', async () => {
      const zeroRequest = {
        ...mockRequest,
        params: {
          ...mockParams,
          btcAmount: 0
        }
      }
      
      const response = await service.executeStrategy(zeroRequest)
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('BTC amount')
    })

    it('should handle very long simulations', async () => {
      const longRequest = {
        ...mockRequest,
        params: {
          ...mockParams,
          simulationMonths: 120 // 10 years
        }
      }
      
      const response = await service.executeStrategy(longRequest)
      
      expect(response.success).toBe(true)
      expect(response.results!.length).toBe(120)
      expect(response.executionTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle missing price data gracefully', async () => {
      const noPriceRequest = {
        ...mockRequest,
        priceData: []
      }
      
      const response = await service.executeStrategy(noPriceRequest)
      
      // Should either succeed with fallback prices or fail gracefully
      expect(typeof response.success).toBe('boolean')
      if (!response.success) {
        expect(response.error).toBeDefined()
      }
    })
  })
})
