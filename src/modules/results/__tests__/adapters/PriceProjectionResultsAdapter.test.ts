import { describe, it, expect, beforeEach } from 'vitest'
import { PriceProjectionResultsAdapter } from '../../adapters/PriceProjectionResultsAdapter'
import type { 
  EnhancedMonthlyResult,
  ProjectionComparisonResult
} from '../../types'
import type { MonthlyResult } from '@/modules/strategies/types'
import type { PriceProjectionResult } from '@/modules/price-projection/types'

describe('PriceProjectionResultsAdapter', () => {
  let adapter: PriceProjectionResultsAdapter
  let mockResults: MonthlyResult[]
  let mockProjection: PriceProjectionResult

  beforeEach(() => {
    adapter = new PriceProjectionResultsAdapter()
    
    mockResults = [
      {
        month: 1,
        dateString: '01/2024',
        btcPrice: 70000,
        collateralValue: 70000,
        realCollateralValue: 70000,
        totalDebt: 35000,
        realTotalDebt: 35000,
        withdrawalAmount: 2000,
        newLoanPrincipal: 37000,
        repaymentsDue: 0,
        reinvestment: 35000,
        currentBtcAmount: 1.0,
        freeBtc: 0.5,
        lockedBtc: 0.5,
        loanCount: 1,
        highestLtv: 50,
        events: []
      },
      {
        month: 2,
        dateString: '02/2024',
        btcPrice: 72000,
        collateralValue: 72000,
        realCollateralValue: 71640,
        totalDebt: 35200,
        realTotalDebt: 35024,
        withdrawalAmount: 2000,
        newLoanPrincipal: 2000,
        repaymentsDue: 0,
        reinvestment: 0,
        currentBtcAmount: 1.0,
        freeBtc: 0.5,
        lockedBtc: 0.5,
        loanCount: 2,
        highestLtv: 48.9,
        events: []
      },
      {
        month: 3,
        dateString: '03/2024',
        btcPrice: 68000,
        collateralValue: 68000,
        realCollateralValue: 67320,
        totalDebt: 35400,
        realTotalDebt: 35048,
        withdrawalAmount: 2000,
        newLoanPrincipal: 2000,
        repaymentsDue: 0,
        reinvestment: 0,
        currentBtcAmount: 1.0,
        freeBtc: 0.5,
        lockedBtc: 0.5,
        loanCount: 3,
        highestLtv: 52.1,
        events: []
      }
    ]

    mockProjection = {
      modelName: 'Test Model',
      modelVersion: '1.0.0',
      projectionPoints: [
        {
          timestamp: 1704067200000, // 2024-01-01
          price: 70000,
          support: 65000,
          resistance: 75000,
          confidence: 0.9,
          metadata: { month: 1 }
        },
        {
          timestamp: 1706745600000, // 2024-02-01
          price: 71000, // Slightly different from actual
          support: 66000,
          resistance: 76000,
          confidence: 0.85,
          metadata: { month: 2 }
        },
        {
          timestamp: 1709251200000, // 2024-03-01
          price: 69000, // Different from actual
          support: 64000,
          resistance: 74000,
          confidence: 0.8,
          metadata: { month: 3 }
        }
      ],
      metadata: {
        totalMonths: 3,
        totalGrowth: -1.43,
        averageMonthlyGrowth: -0.48,
        confidence: 0.85,
        generatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })

  describe('Projection Context Enhancement', () => {
    it('should enhance results with projection context', () => {
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, mockProjection)
      
      expect(enhanced).toHaveLength(3)
      
      const firstResult = enhanced[0]
      expect(firstResult.projectionContext).toBeDefined()
      expect(firstResult.projectionContext!.modelName).toBe('Test Model')
      expect(firstResult.projectionContext!.confidence).toBe(0.9)
      expect(firstResult.projectionContext!.supportPrice).toBe(65000)
      expect(firstResult.projectionContext!.resistancePrice).toBe(75000)
    })

    it('should calculate price deviations correctly', () => {
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, mockProjection)
      
      const firstResult = enhanced[0]
      expect(firstResult.projectionContext!.priceDeviation).toBe(0) // 70000 - 70000
      
      const secondResult = enhanced[1]
      expect(secondResult.projectionContext!.priceDeviation).toBe(1000) // 72000 - 71000
      
      const thirdResult = enhanced[2]
      expect(thirdResult.projectionContext!.priceDeviation).toBe(-1000) // 68000 - 69000
    })

    it('should handle missing projection points gracefully', () => {
      const incompleteProjection = {
        ...mockProjection,
        projectionPoints: [mockProjection.projectionPoints[0]] // Only first point
      }
      
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, incompleteProjection)
      
      expect(enhanced).toHaveLength(3)
      expect(enhanced[0].projectionContext).toBeDefined()
      expect(enhanced[1].projectionContext).toBeUndefined() // No matching projection point
      expect(enhanced[2].projectionContext).toBeUndefined()
    })

    it('should handle projection points without support/resistance', () => {
      const basicProjection = {
        ...mockProjection,
        projectionPoints: mockProjection.projectionPoints.map(point => ({
          timestamp: point.timestamp,
          price: point.price,
          confidence: point.confidence,
          metadata: point.metadata
        }))
      }
      
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, basicProjection)
      
      const firstResult = enhanced[0]
      expect(firstResult.projectionContext!.supportPrice).toBeUndefined()
      expect(firstResult.projectionContext!.resistancePrice).toBeUndefined()
      expect(firstResult.projectionContext!.priceDeviation).toBe(0)
    })
  })

  describe('Projection Accuracy Calculation', () => {
    it('should calculate overall accuracy metrics', () => {
      const comparison = adapter.calculateProjectionAccuracy(mockResults, mockProjection)
      
      expect(comparison.accuracy).toBeGreaterThan(0)
      expect(comparison.accuracy).toBeLessThanOrEqual(100)
      expect(comparison.averageDeviation).toBeGreaterThanOrEqual(0)
      expect(comparison.maxDeviation).toBeGreaterThanOrEqual(comparison.averageDeviation)
      expect(comparison.correlationCoefficient).toBeGreaterThanOrEqual(-1)
      expect(comparison.correlationCoefficient).toBeLessThanOrEqual(1)
    })

    it('should provide detailed monthly deviations', () => {
      const comparison = adapter.calculateProjectionAccuracy(mockResults, mockProjection)
      
      expect(comparison.deviationsByMonth).toHaveLength(3)
      
      const firstMonth = comparison.deviationsByMonth[0]
      expect(firstMonth.month).toBe(1)
      expect(firstMonth.actualPrice).toBe(70000)
      expect(firstMonth.projectedPrice).toBe(70000)
      expect(firstMonth.deviation).toBe(0)
      expect(firstMonth.deviationPercent).toBe(0)
      
      const secondMonth = comparison.deviationsByMonth[1]
      expect(secondMonth.month).toBe(2)
      expect(secondMonth.actualPrice).toBe(72000)
      expect(secondMonth.projectedPrice).toBe(71000)
      expect(secondMonth.deviation).toBe(1000)
      expect(secondMonth.deviationPercent).toBeCloseTo(1.39, 2) // 1000/72000 * 100
    })

    it('should calculate correlation coefficient correctly', () => {
      // Create perfectly correlated data
      const perfectProjection = {
        ...mockProjection,
        projectionPoints: mockResults.map((result, index) => ({
          timestamp: 1704067200000 + (index * 2678400000), // Monthly intervals
          price: result.btcPrice,
          confidence: 1.0,
          metadata: { month: result.month }
        }))
      }
      
      const comparison = adapter.calculateProjectionAccuracy(mockResults, perfectProjection)
      expect(comparison.correlationCoefficient).toBeCloseTo(1.0, 2)
      expect(comparison.accuracy).toBe(100)
    })

    it('should handle edge cases in accuracy calculation', () => {
      // Test with single data point
      const singleResult = [mockResults[0]]
      const singleProjection = {
        ...mockProjection,
        projectionPoints: [mockProjection.projectionPoints[0]]
      }
      
      const comparison = adapter.calculateProjectionAccuracy(singleResult, singleProjection)
      expect(comparison.deviationsByMonth).toHaveLength(1)
      expect(comparison.correlationCoefficient).toBe(0) // Cannot calculate correlation with single point
    })
  })

  describe('Projection Alignment Validation', () => {
    it('should validate correct projection alignment', () => {
      const validation = adapter.validateProjectionAlignment(mockResults, mockProjection)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect misaligned time periods', () => {
      const misalignedProjection = {
        ...mockProjection,
        projectionPoints: [
          {
            timestamp: 1672531200000, // Wrong year
            price: 70000,
            confidence: 0.9,
            metadata: { month: 99 } // Month that doesn't exist in results
          }
        ]
      }

      const validation = adapter.validateProjectionAlignment(mockResults, misalignedProjection)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('alignment'))).toBe(true)
    })

    it('should detect insufficient projection data', () => {
      const insufficientProjection = {
        ...mockProjection,
        projectionPoints: [] // No data points
      }
      
      const validation = adapter.validateProjectionAlignment(mockResults, insufficientProjection)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('projection point'))).toBe(true)
    })

    it('should validate projection point data integrity', () => {
      const invalidProjection = {
        ...mockProjection,
        projectionPoints: [
          {
            timestamp: 1704067200000,
            price: -1000, // Invalid negative price
            confidence: 1.5, // Invalid confidence > 1
            metadata: { month: 1 }
          }
        ]
      }
      
      const validation = adapter.validateProjectionAlignment(mockResults, invalidProjection)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Data Transformation', () => {
    it('should preserve all original result data', () => {
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, mockProjection)
      
      enhanced.forEach((result, index) => {
        const original = mockResults[index]
        
        // Check that all original properties are preserved
        expect(result.month).toBe(original.month)
        expect(result.dateString).toBe(original.dateString)
        expect(result.btcPrice).toBe(original.btcPrice)
        expect(result.collateralValue).toBe(original.collateralValue)
        expect(result.totalDebt).toBe(original.totalDebt)
        expect(result.currentBtcAmount).toBe(original.currentBtcAmount)
        expect(result.events).toEqual(original.events)
      })
    })

    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        ...mockResults[0],
        month: i + 1,
        btcPrice: 70000 + (i * 100)
      }))
      
      const largeProjection = {
        ...mockProjection,
        projectionPoints: Array.from({ length: 1000 }, (_, i) => ({
          timestamp: 1704067200000 + (i * 86400000), // Daily
          price: 70000 + (i * 100),
          confidence: 0.9,
          metadata: { month: i + 1 }
        }))
      }
      
      const startTime = performance.now()
      const enhanced = adapter.enhanceWithProjectionContext(largeResults, largeProjection)
      const endTime = performance.now()
      
      expect(enhanced).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Error Handling', () => {
    it('should handle empty results array', () => {
      const enhanced = adapter.enhanceWithProjectionContext([], mockProjection)
      expect(enhanced).toHaveLength(0)
    })

    it('should handle empty projection', () => {
      const emptyProjection = {
        ...mockProjection,
        projectionPoints: []
      }
      
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, emptyProjection)
      
      expect(enhanced).toHaveLength(3)
      enhanced.forEach(result => {
        expect(result.projectionContext).toBeUndefined()
      })
    })

    it('should handle malformed projection data', () => {
      const malformedProjection = {
        ...mockProjection,
        projectionPoints: [
          {
            timestamp: 'invalid',
            price: 'not a number',
            confidence: null
          } as any
        ]
      }
      
      expect(() => {
        adapter.enhanceWithProjectionContext(mockResults, malformedProjection)
      }).not.toThrow() // Should handle gracefully
    })
  })

  describe('Performance Metrics', () => {
    it('should complete enhancement within performance threshold', () => {
      const startTime = performance.now()
      const enhanced = adapter.enhanceWithProjectionContext(mockResults, mockProjection)
      const endTime = performance.now()
      
      expect(enhanced).toHaveLength(3)
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })

    it('should complete accuracy calculation within performance threshold', () => {
      const startTime = performance.now()
      const comparison = adapter.calculateProjectionAccuracy(mockResults, mockProjection)
      const endTime = performance.now()
      
      expect(comparison.deviationsByMonth).toHaveLength(3)
      expect(endTime - startTime).toBeLessThan(50) // Should complete within 50ms
    })
  })
})
