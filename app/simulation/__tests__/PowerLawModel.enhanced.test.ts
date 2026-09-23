/**
 * Tests for enhanced PowerLawModel with volatility support
 */

import { PowerLawModel } from '../price-models/models/PowerLawModel'
import type { PowerLawModelParams } from '../price-models/types'
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'

describe('Enhanced PowerLawModel', () => {
  let model: PowerLawModel
  let mockHistoricalData: HistoricalDataPoint[]

  beforeEach(() => {
    model = new PowerLawModel()
    
    // Create mock historical data (last 12 months)
    mockHistoricalData = []
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (12 - i))
      const closePrice = 50000 + Math.random() * 20000 // Random price between 50k-70k
      mockHistoricalData.push({
        time: date.getTime() / 1000,
        date: date.toISOString().split('T')[0],
        open: closePrice * 0.98,
        high: closePrice * 1.05,
        low: closePrice * 0.95,
        close: closePrice,
        volume: 1000
      })
    }
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing behavior when volatility disabled', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit'
          // No volatility settings - should work as before
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.projectionPoints).toHaveLength(13)
      expect(result.modelName).toBe('Power Law Model')
      expect(result.projectionPoints[0].price).toBeGreaterThan(0)
      
      // Should not have volatility applied (prices should follow smooth Power Law curve)
      const prices = result.projectionPoints.map(p => p.price)
      expect(prices.every(p => p > 0)).toBe(true)
    })

    it('should work with all prognosis lines', async () => {
      const prognosisLines: Array<'fit' | 'support' | 'resistance'> = ['fit', 'support', 'resistance']

      for (const line of prognosisLines) {
        const params: PowerLawModelParams = {
          startPrice: 50000,
          projectionMonths: 6,
          modelSpecificParams: {
            prognosisLine: line
          }
        }

        const result = await model.generateProjection(mockHistoricalData, params)
        
        expect(result.projectionPoints).toHaveLength(7)
        expect(result.metadata.prognosisLine).toBe(line)
      }
    })
  })

  describe('Price Projection Parameters', () => {
    it('should use custom price projection parameters when provided', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          priceProjectionParams: {
            slope: 6.0,
            intercept: -18.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.projectionPoints).toHaveLength(7)
      expect(result.metadata.customProjectionParams).toEqual({
        slope: 6.0,
        intercept: -18.0
      })
    })

    it('should fall back to prognosis line when no custom parameters provided', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit'
          // No priceProjectionParams - should use fit line parameters
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.projectionPoints).toHaveLength(7)
      expect(result.metadata.customProjectionParams).toBeUndefined()
    })
  })

  describe('Cycle Repeat Volatility', () => {
    it('should apply volatility when enabled', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 12, // Use all available historical data
            diminishingFactor: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.projectionPoints).toHaveLength(13)
      expect(result.metadata.volatilityApplied).toBe(true)
      expect(result.metadata.volatilitySettings).toEqual({
        enabled: true,
        patternLengthMonths: 12,
        diminishingFactor: 1.0
      })
    })

    it('should not apply volatility when disabled', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: false,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.projectionPoints).toHaveLength(13)
      expect(result.metadata.volatilityApplied).toBe(false)
    })

    it('should handle insufficient historical data gracefully', async () => {
      const limitedData = mockHistoricalData.slice(0, 2) // Only 2 months of data

      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96, // Request more than available
            diminishingFactor: 1.0
          }
        }
      }

      const result = await model.generateProjection(limitedData, params)

      expect(result.projectionPoints).toHaveLength(7)
      // Should still work but with limited pattern
      expect(result.metadata.volatilityApplied).toBe(true)
    })
  })

  describe('Regression Lines Preservation', () => {
    it('should keep support/resistance lines as pure mathematical curves', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 12,
            diminishingFactor: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      // Check that support and resistance lines are present and mathematical
      result.projectionPoints.forEach(point => {
        expect(point.support).toBeGreaterThan(0)
        expect(point.resistance).toBeGreaterThan(0)
        expect(point.resistance).toBeGreaterThan(point.support) // Resistance should be higher than support
      })

      // Support and resistance should follow smooth mathematical curves (no volatility)
      const supportPrices = result.projectionPoints.map(p => p.support!)
      const resistancePrices = result.projectionPoints.map(p => p.resistance!)
      
      // Check that they're monotonically increasing (smooth Power Law growth)
      for (let i = 1; i < supportPrices.length; i++) {
        expect(supportPrices[i]).toBeGreaterThan(supportPrices[i - 1])
        expect(resistancePrices[i]).toBeGreaterThan(resistancePrices[i - 1])
      }
    })
  })

  describe('Parameter Validation', () => {
    it('should validate volatility parameters', () => {
      const validParams: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      expect(model.validateParams(validParams)).toBe(true)
    })

    it('should reject invalid volatility parameters', () => {
      const invalidParams: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 200, // Too high
            diminishingFactor: 0.3    // Too low
          }
        }
      }

      expect(model.validateParams(invalidParams)).toBe(false)
    })
  })

  describe('Caching and Performance', () => {
    it('should cache deviation patterns to avoid recalculation', async () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 12,
            diminishingFactor: 1.0
          }
        }
      }

      // First call
      const result1 = await model.generateProjection(mockHistoricalData, params)
      
      // Second call with same parameters should use cached pattern
      const result2 = await model.generateProjection(mockHistoricalData, params)

      expect(result1.projectionPoints).toHaveLength(7)
      expect(result2.projectionPoints).toHaveLength(7)
      // Results should be identical due to caching
      expect(result1.projectionPoints[0].price).toBe(result2.projectionPoints[0].price)
    })
  })
})
