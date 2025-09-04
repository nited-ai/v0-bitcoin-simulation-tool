import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { 
  StrategyExecutionService, 
  StrategyExecutionResult,
  StrategyParams,
  ExecutionSummary,
  StrategyMetadata
} from '../../interfaces/StrategyInterface'
import type { StrategyPriceData, StrategyPricePoint } from '../../interfaces/PriceProjectionInterface'
import type { HistoricalDataPoint, MonthlyResult } from '../../types'

describe('StrategyInterface', () => {
  let mockStrategyExecutionService: StrategyExecutionService
  let mockStrategyParams: StrategyParams
  let mockPriceProjection: StrategyPriceData
  let mockHistoricalData: HistoricalDataPoint[]

  beforeEach(() => {
    mockStrategyParams = {
      type: 'default',
      btcAmount: 1,
      initialBtcPrice: 70000,
      monthlyWithdrawalAmount: 150,
      annualInterestRate: 9.5,
      loanTermMonths: 12,
      simulationMonths: 144,
      maxLoanAmount: 15000,
      riskManagement: {
        targetLtv: 50,
        liquidationLtv: 80
      }
    }

    mockPriceProjection = {
      projectionPoints: [
        {
          timestamp: 1704067200000,
          price: 70000,
          supportPrice: 65000,
          resistancePrice: 75000,
          confidence: 0.9
        },
        {
          timestamp: 1706745600000,
          price: 72000,
          supportPrice: 67000,
          resistancePrice: 77000,
          confidence: 0.85
        }
      ],
      metadata: {
        totalMonths: 12,
        totalGrowth: 20,
        averageMonthlyGrowth: 1.67,
        confidence: 0.8,
        generatedAt: '2025-01-09T00:00:00.000Z'
      },
      supportLines: [65000, 67000],
      resistanceLines: [75000, 77000]
    }

    mockHistoricalData = [
      { time: 1640995200000, close: 50000 },
      { time: 1672531200000, close: 60000 },
      { time: 1704067200000, close: 70000 }
    ]

    mockStrategyExecutionService = {
      executeStrategy: vi.fn()
    }
  })

  describe('executeStrategy', () => {
    it('should return StrategyExecutionResult with correct structure', async () => {
      const mockMonthlyResults: MonthlyResult[] = [
        {
          month: 1,
          dateString: '2024-01-01',
          btcPrice: 70000,
          collateralValue: 70000,
          realCollateralValue: 70000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 150,
          newLoanPrincipal: 0,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1,
          freeBtc: 0.857,
          lockedBtc: 0.143,
          loanCount: 1,
          highestLtv: 14.3,
          events: []
        }
      ]

      const mockStrategyMetadata: StrategyMetadata = {
        name: 'Default Strategy',
        version: '1.0.0',
        description: 'Basic loan strategy without restrictions',
        riskLevel: 'moderate',
        complexity: 'beginner'
      }

      const mockExecutionSummary: ExecutionSummary = {
        totalMonths: 144,
        finalPortfolioValue: 150000,
        totalReturn: 80000,
        maxDrawdown: 15000,
        liquidationCount: 0,
        averageLtv: 25.5,
        successRate: 100
      }

      const expectedResult: StrategyExecutionResult = {
        monthlyResults: mockMonthlyResults,
        priceProjectionUsed: mockPriceProjection,
        strategyMetadata: mockStrategyMetadata,
        executionSummary: mockExecutionSummary
      }

      vi.mocked(mockStrategyExecutionService.executeStrategy)
        .mockResolvedValue(expectedResult)

      const result = await mockStrategyExecutionService.executeStrategy(
        mockStrategyParams,
        mockPriceProjection,
        mockHistoricalData
      )

      expect(result).toEqual(expectedResult)
      expect(result.monthlyResults).toHaveLength(1)
      expect(result.priceProjectionUsed).toEqual(mockPriceProjection)
      expect(result.strategyMetadata).toHaveProperty('name')
      expect(result.executionSummary).toHaveProperty('totalMonths')
    })

    it('should handle different strategy types', async () => {
      const strategyTypes = ['default', 'athBased', 'movingAverage', 'athCollateral']
      
      for (const strategyType of strategyTypes) {
        const params = { ...mockStrategyParams, type: strategyType as any }
        
        vi.mocked(mockStrategyExecutionService.executeStrategy)
          .mockResolvedValue({
            monthlyResults: [],
            priceProjectionUsed: mockPriceProjection,
            strategyMetadata: {
              name: `${strategyType} Strategy`,
              version: '1.0.0',
              description: `${strategyType} strategy implementation`,
              riskLevel: 'moderate',
              complexity: 'intermediate'
            },
            executionSummary: {
              totalMonths: 144,
              finalPortfolioValue: 100000,
              totalReturn: 30000,
              maxDrawdown: 5000,
              liquidationCount: 0,
              averageLtv: 20,
              successRate: 100
            }
          })

        await mockStrategyExecutionService.executeStrategy(
          params,
          mockPriceProjection,
          mockHistoricalData
        )

        expect(mockStrategyExecutionService.executeStrategy)
          .toHaveBeenCalledWith(params, mockPriceProjection, mockHistoricalData)
      }
    })

    it('should validate MonthlyResult structure', () => {
      const validMonthlyResult: MonthlyResult = {
        month: 1,
        dateString: '2024-01-01',
        btcPrice: 70000,
        collateralValue: 70000,
        realCollateralValue: 70000,
        totalDebt: 10000,
        realTotalDebt: 10000,
        withdrawalAmount: 150,
        newLoanPrincipal: 0,
        repaymentsDue: 0,
        reinvestment: 0,
        currentBtcAmount: 1,
        freeBtc: 0.857,
        lockedBtc: 0.143,
        loanCount: 1,
        highestLtv: 14.3,
        events: []
      }

      // Test required fields
      expect(validMonthlyResult.month).toBeTypeOf('number')
      expect(validMonthlyResult.dateString).toBeTypeOf('string')
      expect(validMonthlyResult.btcPrice).toBeTypeOf('number')
      expect(validMonthlyResult.collateralValue).toBeTypeOf('number')
      expect(validMonthlyResult.totalDebt).toBeTypeOf('number')
      expect(validMonthlyResult.currentBtcAmount).toBeTypeOf('number')
      expect(validMonthlyResult.events).toBeInstanceOf(Array)
      
      // Test positive values
      expect(validMonthlyResult.btcPrice).toBeGreaterThan(0)
      expect(validMonthlyResult.collateralValue).toBeGreaterThan(0)
      expect(validMonthlyResult.currentBtcAmount).toBeGreaterThan(0)
    })

    it('should validate ExecutionSummary structure', () => {
      const validSummary: ExecutionSummary = {
        totalMonths: 144,
        finalPortfolioValue: 150000,
        totalReturn: 80000,
        maxDrawdown: 15000,
        liquidationCount: 0,
        averageLtv: 25.5,
        successRate: 100
      }

      expect(validSummary.totalMonths).toBeTypeOf('number')
      expect(validSummary.finalPortfolioValue).toBeTypeOf('number')
      expect(validSummary.totalReturn).toBeTypeOf('number')
      expect(validSummary.maxDrawdown).toBeTypeOf('number')
      expect(validSummary.liquidationCount).toBeTypeOf('number')
      expect(validSummary.averageLtv).toBeTypeOf('number')
      expect(validSummary.successRate).toBeTypeOf('number')
      
      // Test ranges
      expect(validSummary.totalMonths).toBeGreaterThan(0)
      expect(validSummary.liquidationCount).toBeGreaterThanOrEqual(0)
      expect(validSummary.successRate).toBeGreaterThanOrEqual(0)
      expect(validSummary.successRate).toBeLessThanOrEqual(100)
    })
  })
})
