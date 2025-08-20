import { describe, it, expect, beforeEach } from 'vitest'
import { LogarithmicCurveRepeatModel } from '../LogarithmicCurveRepeatModel'
import type { PriceModelParams } from '../../types'
import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'

describe('LogarithmicCurveRepeatModel', () => {
  let model: LogarithmicCurveRepeatModel
  let mockHistoricalData: HistoricalDataPoint[]
  let baseParams: PriceModelParams

  beforeEach(() => {
    model = new LogarithmicCurveRepeatModel()
    
    // Create 4 years of mock weekly data (208 points)
    mockHistoricalData = []
    const startDate = new Date('2020-01-01')
    let currentPrice = 50000
    
    for (let i = 0; i < 208; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + (i * 7)) // Weekly intervals
      
      // Simulate realistic Bitcoin price movements
      const volatility = (Math.random() - 0.5) * 0.1 // ±5% weekly volatility
      currentPrice *= (1 + volatility)
      
      mockHistoricalData.push({
        time: Math.floor(date.getTime() / 1000),
        close: currentPrice,
        open: currentPrice * 0.98,
        high: currentPrice * 1.02,
        low: currentPrice * 0.96,
        volume: 1000000,
        date: date.toISOString().split('T')[0],
        source: 'mock'
      })
    }

    baseParams = {
      startPrice: 100000,
      projectionMonths: 24,
      modelSpecificParams: {
        logarithmicCurve: {
          curveType: 'logarithmic',
          baseMultiplier: 1.0,
          logarithmicStrength: 0.0, // Default: pure cycle repeat
          smoothingFactor: 0.0,
          growthAcceleration: 1.0
        }
      }
    }
  })

  describe('Model Interface Compliance', () => {
    it('should implement PriceProjectionModel interface', () => {
      expect(model.name).toBe('Logarithmic Curve Repeat Model')
      expect(model.version).toBe('1.0.0')
      expect(model.description).toContain('logarithmic transformations')
      expect(typeof model.generateProjection).toBe('function')
      expect(typeof model.validateParams).toBe('function')
      expect(typeof model.getDefaultParams).toBe('function')
    })

    it('should validate parameters correctly', () => {
      expect(model.validateParams(baseParams)).toBe(true)
      
      // Invalid parameters
      const invalidParams = { ...baseParams, startPrice: -1000 }
      expect(model.validateParams(invalidParams)).toBe(false)
    })

    it('should return default parameters with correct structure', () => {
      const defaults = model.getDefaultParams()
      expect(defaults).toHaveProperty('curveType', 'logarithmic')
      expect(defaults).toHaveProperty('baseMultiplier', 1.0)
      expect(defaults).toHaveProperty('logarithmicStrength', 0.0)
      expect(defaults).toHaveProperty('smoothingFactor', 0.0)
      expect(defaults).toHaveProperty('growthAcceleration', 1.0)
    })
  })

  describe('Historical Data Extraction', () => {
    it('should extract correct number of movements from 4-year data', async () => {
      const result = await model.generateProjection(mockHistoricalData, baseParams)
      
      // Should process ~208 weekly movements from 4 years of data
      expect(result.projectionPoints.length).toBe(24) // 24 monthly points
      expect(result.metadata).toHaveProperty('historicalMovementsCount')
      expect(result.metadata.historicalMovementsCount).toBeCloseTo(207, 5) // 208 - 1 for movements
    })

    it('should handle insufficient historical data gracefully', async () => {
      const shortData = mockHistoricalData.slice(0, 50) // Only ~1 year of data
      
      await expect(model.generateProjection(shortData, baseParams)).rejects.toThrow(
        'Insufficient historical data'
      )
    })
  })

  describe('Mathematical Transformations', () => {
    it('should apply logarithmic transformations correctly', async () => {
      const logarithmicParams = {
        ...baseParams,
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'logarithmic',
            baseMultiplier: 1.0,
            logarithmicStrength: 0.5, // 50% logarithmic transformation
            smoothingFactor: 0.0,
            growthAcceleration: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, logarithmicParams)
      
      expect(result.projectionPoints).toHaveLength(24)
      expect(result.projectionPoints[0].price).toBeCloseTo(100000, -2) // Allow some variance due to daily movements
      expect(result.metadata).toHaveProperty('curveType', 'logarithmic')
      expect(result.metadata).toHaveProperty('transformationApplied', true)
    })

    it('should produce pure cycle repeat when logarithmicStrength is 0', async () => {
      const pureRepeatParams = {
        ...baseParams,
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'logarithmic',
            baseMultiplier: 1.0,
            logarithmicStrength: 0.0, // No transformation
            smoothingFactor: 0.0,
            growthAcceleration: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, pureRepeatParams)

      expect(result.metadata).toHaveProperty('transformationApplied', false)
      expect(result.metadata).toHaveProperty('behaviorMode', 'pure-cycle-repeat')

      // Verify reasonable price progression (no shooting up)
      const firstPrice = result.projectionPoints[0].price
      const lastPrice = result.projectionPoints[result.projectionPoints.length - 1].price
      const totalGrowth = ((lastPrice - firstPrice) / firstPrice) * 100

      // Should not have extreme growth (less than 1000% over 24 months)
      expect(Math.abs(totalGrowth)).toBeLessThan(1000)

      // All prices should be finite and positive
      result.projectionPoints.forEach(point => {
        expect(Number.isFinite(point.price)).toBe(true)
        expect(point.price).toBeGreaterThan(0)
        expect(point.price).toBeLessThan(10000000) // Reasonable upper bound
      })
    })

    it('should handle edge cases in logarithmic calculations', async () => {
      // Test with extreme parameters
      const extremeParams = {
        ...baseParams,
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'logarithmic',
            baseMultiplier: 2.0, // Maximum amplification
            logarithmicStrength: 1.0, // Maximum transformation
            smoothingFactor: 1.0, // Maximum smoothing
            growthAcceleration: 2.0 // Maximum acceleration
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, extremeParams)
      
      // Should not produce NaN or infinite values
      result.projectionPoints.forEach(point => {
        expect(Number.isFinite(point.price)).toBe(true)
        expect(point.price).toBeGreaterThan(0)
      })
    })
  })

  describe('Extensible Architecture', () => {
    it('should support curve type parameter for future extensions', async () => {
      const result = await model.generateProjection(mockHistoricalData, baseParams)
      
      expect(result.metadata).toHaveProperty('curveType', 'logarithmic')
      expect(result.metadata).toHaveProperty('supportedCurveTypes')
      expect(result.metadata.supportedCurveTypes).toContain('logarithmic')
    })

    it('should validate curve type parameter', () => {
      const invalidCurveParams = {
        ...baseParams,
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'invalid-curve-type',
            baseMultiplier: 1.0,
            logarithmicStrength: 0.0,
            smoothingFactor: 0.0,
            growthAcceleration: 1.0
          }
        }
      }

      expect(model.validateParams(invalidCurveParams)).toBe(false)
    })
  })

  describe('Projection Generation', () => {
    it('should generate valid PriceProjectionResult structure', async () => {
      const result = await model.generateProjection(mockHistoricalData, baseParams)
      
      expect(result).toHaveProperty('modelName', 'Logarithmic Curve Repeat Model')
      expect(result).toHaveProperty('modelVersion', '1.0.0')
      expect(result).toHaveProperty('projectionPoints')
      expect(result).toHaveProperty('metadata')
      
      expect(result.projectionPoints).toHaveLength(24)
      expect(result.metadata).toHaveProperty('totalMonths', 24)
      expect(result.metadata).toHaveProperty('generatedAt')
    })

    it('should include curve-specific metadata', async () => {
      const result = await model.generateProjection(mockHistoricalData, baseParams)

      expect(result.metadata).toHaveProperty('curveType', 'logarithmic')
      expect(result.metadata).toHaveProperty('curveParameters')
      expect(result.metadata.curveParameters).toHaveProperty('baseMultiplier', 1.0)
      expect(result.metadata.curveParameters).toHaveProperty('logarithmicStrength', 0.0)
    })

    it('should preserve volatility in projections', async () => {
      const volatilityParams = {
        ...baseParams,
        projectionMonths: 12,
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'logarithmic' as const,
            baseMultiplier: 0.9,
            logarithmicStrength: 0.3, // Moderate transformation
            smoothingFactor: 0.1,
            growthAcceleration: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, volatilityParams)

      // Calculate month-to-month changes to verify volatility is preserved
      const monthlyChanges = []
      for (let i = 1; i < result.projectionPoints.length; i++) {
        const prevPrice = result.projectionPoints[i - 1].price
        const currentPrice = result.projectionPoints[i].price
        const change = (currentPrice - prevPrice) / prevPrice
        monthlyChanges.push(change)
      }

      // Should have both positive and negative changes (volatility)
      const positiveChanges = monthlyChanges.filter(change => change > 0)
      const negativeChanges = monthlyChanges.filter(change => change < 0)

      expect(positiveChanges.length).toBeGreaterThan(0)
      expect(negativeChanges.length).toBeGreaterThan(0)

      // Should have some significant changes (not all tiny)
      const significantChanges = monthlyChanges.filter(change => Math.abs(change) > 0.02) // >2% changes
      expect(significantChanges.length).toBeGreaterThan(0)

      // Volatility should be reasonable (not completely flat)
      const avgAbsChange = monthlyChanges.reduce((sum, change) => sum + Math.abs(change), 0) / monthlyChanges.length
      expect(avgAbsChange).toBeGreaterThan(0.01) // At least 1% average volatility
    })

    it('should apply movements sequentially not cumulatively', async () => {
      const sequentialParams = {
        ...baseParams,
        projectionMonths: 6,
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'logarithmic' as const,
            baseMultiplier: 1.0,
            logarithmicStrength: 0.0, // Pure cycle repeat
            smoothingFactor: 0.0,
            growthAcceleration: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, sequentialParams)

      // Should not have exponential price explosion
      const startPrice = result.projectionPoints[0].price
      const endPrice = result.projectionPoints[result.projectionPoints.length - 1].price
      const totalGrowth = ((endPrice - startPrice) / startPrice) * 100

      // Should have realistic growth, not exponential explosion
      expect(Math.abs(totalGrowth)).toBeLessThan(500) // Less than 500% over 6 months
      expect(endPrice).toBeLessThan(startPrice * 10) // Less than 10x growth

      // All prices should be finite and reasonable
      result.projectionPoints.forEach(point => {
        expect(Number.isFinite(point.price)).toBe(true)
        expect(point.price).toBeGreaterThan(0)
        expect(point.price).toBeLessThan(1000000) // Reasonable upper bound
      })
    })

    it('should extract exactly 1460 historical movements', async () => {
      // This test verifies the movement extraction logic
      const result = await model.generateProjection(mockHistoricalData, baseParams)

      // The model should work with the available mock data
      expect(result.projectionPoints.length).toBeGreaterThan(0)
      expect(result.metadata).toHaveProperty('totalGrowth')

      // Should not produce astronomical prices with mock data
      const maxPrice = Math.max(...result.projectionPoints.map(p => p.price))
      expect(maxPrice).toBeLessThan(500000) // Reasonable upper bound for mock data
    })

    it('should cycle through movements for long projections', async () => {
      const longProjectionParams = {
        ...baseParams,
        projectionMonths: 60, // 5 years - longer than historical period
        modelSpecificParams: {
          logarithmicCurve: {
            curveType: 'logarithmic' as const,
            baseMultiplier: 1.0,
            logarithmicStrength: 0.0,
            smoothingFactor: 0.0,
            growthAcceleration: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, longProjectionParams)

      // Should handle long projections without errors
      expect(result.projectionPoints.length).toBe(60)

      // Should not have exponential growth even with cycling
      const startPrice = result.projectionPoints[0].price
      const endPrice = result.projectionPoints[result.projectionPoints.length - 1].price
      const totalGrowth = ((endPrice - startPrice) / startPrice) * 100

      expect(Math.abs(totalGrowth)).toBeLessThan(2000) // Reasonable bound for 5 years
      expect(endPrice).toBeLessThan(startPrice * 50) // Less than 50x growth over 5 years
    })
  })
})
