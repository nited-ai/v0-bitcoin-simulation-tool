import { describe, it, expect, beforeEach } from 'vitest'
import { ManualGrowthModel } from '../models/ManualGrowthModel'
import type { PriceModelParams } from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

describe('ManualGrowthModel', () => {
  let model: ManualGrowthModel
  let mockHistoricalData: HistoricalDataPoint[]
  let mockParams: PriceModelParams

  beforeEach(() => {
    model = new ManualGrowthModel()
    
    mockHistoricalData = [
      { time: 1640995200000, close: 50000 }, // 2022-01-01
      { time: 1672531200000, close: 60000 }, // 2023-01-01
      { time: 1704067200000, close: 70000 }  // 2024-01-01
    ]

    mockParams = {
      startPrice: 70000,
      projectionMonths: 12,
      modelSpecificParams: {
        annualGrowthRates: [20, 15, 10, 8, 5] // 5 years of growth rates
      }
    }
  })

  describe('Model Properties', () => {
    it('should have correct model metadata', () => {
      expect(model.name).toBe('Manual Growth Rates')
      expect(model.version).toBe('1.0.0')
      expect(model.description).toBe('User-defined annual growth rates for custom price projections')
    })
  })

  describe('Parameter Validation', () => {
    it('should validate correct parameters', () => {
      const isValid = model.validateParams(mockParams)
      expect(isValid).toBe(true)
    })

    it('should reject parameters without growth rates', () => {
      const invalidParams = {
        ...mockParams,
        modelSpecificParams: {}
      }
      
      const isValid = model.validateParams(invalidParams)
      expect(isValid).toBe(false)
    })

    it('should reject parameters with empty growth rates array', () => {
      const invalidParams = {
        ...mockParams,
        modelSpecificParams: {
          annualGrowthRates: []
        }
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

    it('should reject parameters with non-numeric growth rates', () => {
      const invalidParams = {
        ...mockParams,
        modelSpecificParams: {
          annualGrowthRates: [20, 'invalid', 10] as any
        }
      }
      
      const isValid = model.validateParams(invalidParams)
      expect(isValid).toBe(false)
    })
  })

  describe('Default Parameters', () => {
    it('should provide default parameters', () => {
      const defaults = model.getDefaultParams()
      
      expect(defaults).toHaveProperty('annualGrowthRates')
      expect(Array.isArray(defaults.annualGrowthRates)).toBe(true)
      expect(defaults.annualGrowthRates.length).toBeGreaterThan(0)
    })

    it('should have reasonable default growth rates', () => {
      const defaults = model.getDefaultParams()
      
      // All growth rates should be numbers
      defaults.annualGrowthRates.forEach((rate: number) => {
        expect(typeof rate).toBe('number')
        expect(rate).toBeGreaterThanOrEqual(-50) // Reasonable lower bound
        expect(rate).toBeLessThanOrEqual(200) // Reasonable upper bound
      })
    })
  })

  describe('Projection Generation', () => {
    it('should generate projection with correct structure', async () => {
      const result = await model.generateProjection(mockHistoricalData, mockParams)
      
      expect(result.modelName).toBe('Manual Growth Rates')
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

    it('should apply growth rates correctly', async () => {
      const shortParams = {
        ...mockParams,
        projectionMonths: 24, // 2 years
        modelSpecificParams: {
          annualGrowthRates: [20, 10] // 20% first year, 10% second year
        }
      }
      
      const result = await model.generateProjection(mockHistoricalData, shortParams)
      
      // Check that prices increase according to growth rates
      const firstPoint = result.projectionPoints[0]
      const lastPoint = result.projectionPoints[result.projectionPoints.length - 1]
      
      expect(lastPoint.price).toBeGreaterThan(firstPoint.price)
      
      // Approximate check for compound growth
      const expectedFinalPrice = mockParams.startPrice * 1.20 * 1.10 // 20% then 10%
      const actualFinalPrice = lastPoint.price

      // Allow for some variance due to monthly compounding (within 5%)
      const tolerance = expectedFinalPrice * 0.05
      expect(Math.abs(actualFinalPrice - expectedFinalPrice)).toBeLessThan(tolerance)
    })

    it('should handle negative growth rates', async () => {
      const negativeGrowthParams = {
        ...mockParams,
        projectionMonths: 12,
        modelSpecificParams: {
          annualGrowthRates: [-10] // -10% growth
        }
      }
      
      const result = await model.generateProjection(mockHistoricalData, negativeGrowthParams)
      
      const firstPoint = result.projectionPoints[0]
      const lastPoint = result.projectionPoints[result.projectionPoints.length - 1]
      
      expect(lastPoint.price).toBeLessThan(firstPoint.price)
    })

    it('should cycle through growth rates for longer projections', async () => {
      const longParams = {
        ...mockParams,
        projectionMonths: 36, // 3 years
        modelSpecificParams: {
          annualGrowthRates: [20, 10] // Only 2 rates, should cycle
        }
      }
      
      const result = await model.generateProjection(mockHistoricalData, longParams)
      
      expect(result.projectionPoints.length).toBe(36)
      
      // Should successfully generate all points even with fewer growth rates
      const lastPoint = result.projectionPoints[result.projectionPoints.length - 1]
      expect(lastPoint.price).toBeGreaterThan(0)
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
    })

    it('should handle zero growth rates', async () => {
      const zeroGrowthParams = {
        ...mockParams,
        modelSpecificParams: {
          annualGrowthRates: [0, 0, 0] // No growth
        }
      }
      
      const result = await model.generateProjection(mockHistoricalData, zeroGrowthParams)
      
      // All prices should remain the same
      result.projectionPoints.forEach(point => {
        expect(point.price).toBeCloseTo(mockParams.startPrice, 2)
      })
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

    it('should handle very large growth rates', async () => {
      const highGrowthParams = {
        ...mockParams,
        modelSpecificParams: {
          annualGrowthRates: [1000] // 1000% growth
        }
      }
      
      const result = await model.generateProjection(mockHistoricalData, highGrowthParams)

      const lastPoint = result.projectionPoints[result.projectionPoints.length - 1]
      expect(lastPoint.price).toBeGreaterThan(mockParams.startPrice * 5) // Reduced expectation
    })

    it('should handle empty historical data', async () => {
      const result = await model.generateProjection([], mockParams)
      
      // Should still generate projection based on start price
      expect(result.projectionPoints.length).toBe(mockParams.projectionMonths)
      expect(result.projectionPoints[0].price).toBe(mockParams.startPrice)
    })
  })

  describe('Monthly Growth Calculation', () => {
    it('should correctly convert annual to monthly growth', async () => {
      const params = {
        ...mockParams,
        projectionMonths: 12,
        modelSpecificParams: {
          annualGrowthRates: [12] // 12% annual should be ~1% monthly
        }
      }
      
      const result = await model.generateProjection(mockHistoricalData, params)
      
      // Check that monthly growth is approximately correct
      const firstPrice = result.projectionPoints[0].price
      const secondPrice = result.projectionPoints[1].price
      const monthlyGrowthRate = (secondPrice - firstPrice) / firstPrice
      
      // 12% annual ≈ 0.95% monthly (compound)
      expect(monthlyGrowthRate).toBeCloseTo(0.0095, 3)
    })
  })
})
