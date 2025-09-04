import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { 
  PriceProjectionService, 
  StrategyPriceData, 
  StrategyPricePoint,
  PriceLineOptions 
} from '../../interfaces/PriceProjectionInterface'
import type { PriceModelParams, PriceProjectionResult } from '../../types'
import type { HistoricalDataPoint } from '../../types'

describe('PriceProjectionInterface', () => {
  let mockPriceProjectionService: PriceProjectionService
  let mockHistoricalData: HistoricalDataPoint[]
  let mockParams: PriceModelParams

  beforeEach(() => {
    mockHistoricalData = [
      { time: 1640995200000, close: 50000 }, // 2022-01-01
      { time: 1672531200000, close: 60000 }, // 2023-01-01
      { time: 1704067200000, close: 70000 }  // 2024-01-01
    ]

    mockParams = {
      startPrice: 70000,
      projectionMonths: 12,
      modelSpecificParams: {
        annualGrowthRates: [20, 15, 10, 8, 5]
      }
    }

    mockPriceProjectionService = {
      generateProjectionForStrategy: vi.fn(),
      getAvailablePriceLines: vi.fn()
    }
  })

  describe('generateProjectionForStrategy', () => {
    it('should return StrategyPriceData with correct structure', async () => {
      const expectedResult: StrategyPriceData = {
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

      vi.mocked(mockPriceProjectionService.generateProjectionForStrategy)
        .mockResolvedValue(expectedResult)

      const result = await mockPriceProjectionService.generateProjectionForStrategy(
        'manual',
        mockParams,
        mockHistoricalData
      )

      expect(result).toEqual(expectedResult)
      expect(result.projectionPoints).toHaveLength(2)
      expect(result.projectionPoints[0]).toHaveProperty('timestamp')
      expect(result.projectionPoints[0]).toHaveProperty('price')
      expect(result.projectionPoints[0]).toHaveProperty('confidence')
    })

    it('should handle different model IDs', async () => {
      const modelIds = ['manual', 'powerLaw', 'cycleRepeat', 'enhancedCycleRepeat']
      
      for (const modelId of modelIds) {
        vi.mocked(mockPriceProjectionService.generateProjectionForStrategy)
          .mockResolvedValue({
            projectionPoints: [],
            metadata: {
              totalMonths: 12,
              totalGrowth: 0,
              averageMonthlyGrowth: 0,
              confidence: 0.5,
              generatedAt: '2025-01-09T00:00:00.000Z'
            }
          })

        await mockPriceProjectionService.generateProjectionForStrategy(
          modelId,
          mockParams,
          mockHistoricalData
        )

        expect(mockPriceProjectionService.generateProjectionForStrategy)
          .toHaveBeenCalledWith(modelId, mockParams, mockHistoricalData)
      }
    })

    it('should validate StrategyPricePoint structure', () => {
      const validPoint: StrategyPricePoint = {
        timestamp: 1704067200000,
        price: 70000,
        supportPrice: 65000,
        resistancePrice: 75000,
        confidence: 0.9
      }

      // Test required fields
      expect(validPoint.timestamp).toBeTypeOf('number')
      expect(validPoint.price).toBeTypeOf('number')
      expect(validPoint.confidence).toBeTypeOf('number')
      
      // Test optional fields
      expect(validPoint.supportPrice).toBeTypeOf('number')
      expect(validPoint.resistancePrice).toBeTypeOf('number')
      
      // Test confidence range
      expect(validPoint.confidence).toBeGreaterThanOrEqual(0)
      expect(validPoint.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('getAvailablePriceLines', () => {
    it('should return PriceLineOptions with all line types', () => {
      const mockProjectionResult: PriceProjectionResult = {
        modelName: 'Manual Growth',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: 1704067200000,
            price: 70000,
            support: 65000,
            resistance: 75000,
            confidence: 0.9,
            metadata: {}
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 20,
          averageMonthlyGrowth: 1.67,
          confidence: 0.8,
          generatedAt: '2025-01-09T00:00:00.000Z'
        }
      }

      const expectedOptions: PriceLineOptions = {
        volatile: { available: true, description: 'Main projected price with full volatility' },
        average: { available: true, description: 'Average of volatile, support, and resistance' },
        support: { available: true, description: 'Conservative support line estimate' },
        resistance: { available: true, description: 'Optimistic resistance line estimate' }
      }

      vi.mocked(mockPriceProjectionService.getAvailablePriceLines)
        .mockReturnValue(expectedOptions)

      const result = mockPriceProjectionService.getAvailablePriceLines(mockProjectionResult)

      expect(result).toEqual(expectedOptions)
      expect(result.volatile.available).toBe(true)
      expect(result.support.available).toBe(true)
      expect(result.resistance.available).toBe(true)
      expect(result.average.available).toBe(true)
    })
  })
})
