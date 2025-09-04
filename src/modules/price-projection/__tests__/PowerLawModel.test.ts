import { describe, it, expect, beforeEach } from 'vitest'
import { PowerLawModel } from '../models/PowerLawModel'
import type { PriceModelParams } from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

describe('PowerLawModel', () => {
  let model: PowerLawModel
  let mockHistoricalData: HistoricalDataPoint[]
  let mockParams: PriceModelParams

  beforeEach(() => {
    model = new PowerLawModel()
    
    mockHistoricalData = [
      { time: 1640995200000, close: 50000 }, // 2022-01-01
      { time: 1672531200000, close: 60000 }, // 2023-01-01
      { time: 1704067200000, close: 70000 }  // 2024-01-01
    ]

    mockParams = {
      startPrice: 70000,
      projectionMonths: 12,
      modelSpecificParams: {
        prognosis: 'fit' // fit, support, or resistance
      }
    }
  })

  describe('Model Properties', () => {
    it('should have correct model metadata', () => {
      expect(model.name).toBe('Power Law Model')
      expect(model.version).toBe('1.0.0')
      expect(model.description).toBe('Bitcoin price prediction based on logarithmic regression since genesis')
    })
  })

  describe('Parameter Validation', () => {
    it('should validate correct parameters', () => {
      const isValid = model.validateParams(mockParams)
      expect(isValid).toBe(true)
    })

    it('should validate parameters with support prognosis', () => {
      const supportParams = {
        ...mockParams,
        modelSpecificParams: {
          prognosis: 'support'
        }
      }
      
      const isValid = model.validateParams(supportParams)
      expect(isValid).toBe(true)
    })

    it('should validate parameters with resistance prognosis', () => {
      const resistanceParams = {
        ...mockParams,
        modelSpecificParams: {
          prognosis: 'resistance'
        }
      }
      
      const isValid = model.validateParams(resistanceParams)
      expect(isValid).toBe(true)
    })

    it('should reject parameters with invalid prognosis', () => {
      const invalidParams = {
        ...mockParams,
        modelSpecificParams: {
          prognosis: 'invalid'
        }
      }
      
      const isValid = model.validateParams(invalidParams)
      expect(isValid).toBe(false)
    })

    it('should reject parameters without prognosis', () => {
      const invalidParams = {
        ...mockParams,
        modelSpecificParams: {}
      }
      
      const isValid = model.validateParams(invalidParams)
      expect(isValid).toBe(false)
    })

    it('should reject parameters with invalid start price', () => {
      const invalidParams = {
        ...mockParams,
        startPrice: -1000
      }
      
      const isValid = model.validateParams(invalidParams)
      expect(isValid).toBe(false)
    })

    it('should reject parameters with invalid projection months', () => {
      const invalidParams = {
        ...mockParams,
        projectionMonths: -12
      }
      
      const isValid = model.validateParams(invalidParams)
      expect(isValid).toBe(false)
    })
  })

  describe('Default Parameters', () => {
    it('should provide default parameters', () => {
      const defaults = model.getDefaultParams()
      
      expect(defaults).toHaveProperty('prognosis')
      expect(['fit', 'support', 'resistance']).toContain(defaults.prognosis)
    })

    it('should default to fit prognosis', () => {
      const defaults = model.getDefaultParams()
      expect(defaults.prognosis).toBe('fit')
    })
  })

  describe('Projection Generation', () => {
    it('should generate projection with correct structure', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      expect(result.modelName).toBe('Power Law Model')
      expect(result.modelVersion).toBe('1.0.0')
      expect(result.projectionPoints).toBeDefined()
      expect(result.metadata).toBeDefined()
    })

    it('should generate correct number of projection points', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      // Should have one point per month
      expect(result.projectionPoints.length).toBe(mockParams.projectionMonths)
    })

    it('should start projection from correct price', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      const firstPoint = result.projectionPoints[0]
      expect(firstPoint.price).toBe(mockParams.startPrice)
    })

    it('should generate increasing prices over time', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      const firstPoint = result.projectionPoints[0]
      const lastPoint = result.projectionPoints[result.projectionPoints.length - 1]
      
      // Power law should generally show growth over time
      expect(lastPoint.price).toBeGreaterThan(firstPoint.price)
    })

    it('should include support and resistance lines', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      result.projectionPoints.forEach(point => {
        expect(point.support).toBeDefined()
        expect(point.resistance).toBeDefined()
        expect(point.support).toBeGreaterThan(0)
        expect(point.resistance).toBeGreaterThan(0)
        expect(point.resistance).toBeGreaterThan(point.support)
      })
    })

    it('should generate different projections for different prognosis types', async () => {
      const fitResult = await model.generateProjection(mockHistoricalData, {
        ...mockParams,
        modelSpecificParams: { prognosis: 'fit' }
      })
      
      const supportResult = await model.generateProjection(mockHistoricalData, {
        ...mockParams,
        modelSpecificParams: { prognosis: 'support' }
      })
      
      const resistanceResult = await model.generateProjection(mockHistoricalData, {
        ...mockParams,
        modelSpecificParams: { prognosis: 'resistance' }
      })
      
      const fitLastPrice = fitResult.projectionPoints[fitResult.projectionPoints.length - 1].price
      const supportLastPrice = supportResult.projectionPoints[supportResult.projectionPoints.length - 1].price
      const resistanceLastPrice = resistanceResult.projectionPoints[resistanceResult.projectionPoints.length - 1].price
      
      // Support should be lowest, resistance highest
      expect(supportLastPrice).toBeLessThan(fitLastPrice)
      expect(fitLastPrice).toBeLessThan(resistanceLastPrice)
    })

    it('should include confidence scores', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      result.projectionPoints.forEach(point => {
        expect(point.confidence).toBeGreaterThanOrEqual(0)
        expect(point.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should include proper metadata', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      expect(result.metadata.totalMonths).toBe(mockParams.projectionMonths)
      expect(result.metadata.totalGrowth).toBeGreaterThan(0)
      expect(result.metadata.averageMonthlyGrowth).toBeGreaterThan(0)
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0)
      expect(result.metadata.confidence).toBeLessThanOrEqual(1)
      expect(result.metadata.generatedAt).toBeDefined()
      expect(result.metadata.prognosis).toBe(mockParams.modelSpecificParams?.prognosis)
    })

    it('should include max decline in metadata', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      // Power Law model should have 0% max decline (non-volatile)
      expect(result.metadata.maxDecline).toBe(0)
    })
  })

  describe('Power Law Calculations', () => {
    it('should calculate prices based on days since genesis', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      // All prices should be positive and reasonable
      result.projectionPoints.forEach(point => {
        expect(point.price).toBeGreaterThan(0)
        expect(point.price).toBeLessThan(10000000) // Reasonable upper bound
      })
    })

    it('should maintain mathematical consistency', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      // Check that the power law relationship holds
      for (let i = 1; i < result.projectionPoints.length; i++) {
        const currentPoint = result.projectionPoints[i]
        const previousPoint = result.projectionPoints[i - 1]

        // Prices should generally increase (power law growth)
        expect(currentPoint.price).toBeGreaterThanOrEqual(previousPoint.price * 0.99) // Allow for small variations
      }
    })

    it('should handle edge case of genesis date', async () => {
      // Test with a date very close to genesis
      const earlyParams = {
        ...mockParams,
        startPrice: 0.01 // Very early Bitcoin price
      }
      
      const result = await model.generateProjection(mockHistoricalData, earlyParams)
      
      expect(result.projectionPoints.length).toBe(mockParams.projectionMonths)
      expect(result.projectionPoints[0].price).toBe(0.01)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small projection periods', async () => {
      const shortParams = {
        ...mockParams,
        projectionMonths: 1
      }
      
      const result = await model.generateProjection(mockHistoricalData, shortParams)
      
      expect(result.projectionPoints.length).toBe(1)
      expect(result.projectionPoints[0].price).toBe(mockParams.startPrice)
    })

    it('should handle very long projection periods', async () => {
      const longParams = {
        ...mockParams,
        projectionMonths: 120 // 10 years
      }
      
      const result = await model.generateProjection(mockHistoricalData, longParams)
      
      expect(result.projectionPoints.length).toBe(120)
      
      // Should show significant growth over 10 years
      const firstPrice = result.projectionPoints[0].price
      const lastPrice = result.projectionPoints[result.projectionPoints.length - 1].price
      expect(lastPrice).toBeGreaterThan(firstPrice * 2) // At least 2x growth
    })

    it('should handle empty historical data', async () => {
      const result = await model.generateProjection([], mockParams)
      
      // Should still generate projection based on power law
      expect(result.projectionPoints.length).toBe(mockParams.projectionMonths)
      expect(result.projectionPoints[0].price).toBe(mockParams.startPrice)
    })

    it('should handle future dates correctly', async () => {
      // Test with dates far in the future
      const futureParams = {
        ...mockParams,
        projectionMonths: 240 // 20 years
      }
      
      const result = await model.generateProjection(mockHistoricalData, futureParams)
      
      // Should generate reasonable future prices
      const lastPoint = result.projectionPoints[result.projectionPoints.length - 1]
      expect(lastPoint.price).toBeGreaterThan(mockParams.startPrice)
      expect(lastPoint.price).toBeLessThan(100000000) // Reasonable upper bound
    })
  })

  describe('Prognosis Line Relationships', () => {
    it('should maintain correct relationships between prognosis lines', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      result.projectionPoints.forEach(point => {
        // Support < Fit < Resistance
        expect(point.support).toBeLessThan(point.price) // Fit line
        expect(point.price).toBeLessThan(point.resistance)
      })
    })

    it('should use selected prognosis as main price line', async () => {
      const supportResult = await model.generateProjection(mockHistoricalData, {
        ...mockParams,
        modelSpecificParams: { prognosis: 'support' }
      })

      // When prognosis is 'support', main price should follow support line (except first point which uses startPrice)
      supportResult.projectionPoints.forEach((point, index) => {
        if (index === 0) {
          // First point uses the provided start price
          expect(point.price).toBe(mockParams.startPrice)
        } else {
          // Subsequent points should follow the support line
          expect(point.price).toBeCloseTo(point.support!, 2)
        }
      })
    })
  })
})
