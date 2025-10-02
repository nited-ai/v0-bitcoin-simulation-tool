/**
 * Test to verify that Power Law parameters are correctly passed from UI to model
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PowerLawModel } from '../price-models/models/PowerLawModel'
import type { PriceModelParams } from '../price-models/types'
import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'

describe('Power Law Parameter Passing', () => {
  let model: PowerLawModel
  let mockHistoricalData: HistoricalDataPoint[]

  beforeEach(() => {
    model = new PowerLawModel()
    
    // Create mock historical data (12 months)
    mockHistoricalData = Array.from({ length: 12 }, (_, i) => ({
      time: Date.now() - (12 - i) * 30 * 24 * 60 * 60 * 1000, // 12 months ago to now
      date: new Date(Date.now() - (12 - i) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open: 50000 + i * 1000,
      high: 52000 + i * 1000,
      low: 48000 + i * 1000,
      close: 51000 + i * 1000,
      source: 'test'
    }))
  })

  describe('Price Projection Parameters', () => {
    it('should use custom priceProjectionParams when provided', async () => {
      const customParams = { slope: 6.0, intercept: -18.0 }
      
      const params: PriceModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          priceProjectionParams: customParams
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.metadata.customProjectionParams).toEqual(customParams)
      expect(result.projectionPoints).toHaveLength(6)
      
      // Verify that custom parameters were used (prices should be different from default fit line)
      const firstPoint = result.projectionPoints[0]
      expect(firstPoint.price).toBeDefined()
      expect(firstPoint.metadata?.basePrice).toBeDefined()
    })

    it('should fall back to prognosisLine when no custom params provided', async () => {
      const params: PriceModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'support'
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.metadata.customProjectionParams).toBeUndefined()
      expect(result.metadata.prognosisLine).toBe('support')
      expect(result.projectionPoints).toHaveLength(6)
    })
  })

  describe('Cycle Repeat Volatility Parameters', () => {
    it('should apply volatility when enabled with correct parameters', async () => {
      const volatilitySettings = {
        enabled: true,
        patternLengthMonths: 12,
        diminishingFactor: 0.8
      }
      
      const params: PriceModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: volatilitySettings
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.metadata.volatilityApplied).toBe(true)
      expect(result.metadata.volatilitySettings).toEqual(volatilitySettings)
      expect(result.projectionPoints).toHaveLength(6)
      
      // Verify that volatility was applied (should have deviation pattern)
      expect(result.metadata.deviationPatternLength).toBeGreaterThan(0)
    })

    it('should not apply volatility when disabled', async () => {
      const params: PriceModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: false,
            patternLengthMonths: 12,
            diminishingFactor: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      expect(result.metadata.volatilityApplied).toBe(false)
      expect(result.metadata.volatilitySettings).toBeUndefined()
      expect(result.metadata.deviationPatternLength).toBe(0)
    })
  })

  describe('Combined Parameters', () => {
    it('should handle both custom projection params and volatility together', async () => {
      const customParams = { slope: 6.2, intercept: -19.0 }
      const volatilitySettings = {
        enabled: true,
        patternLengthMonths: 12,
        diminishingFactor: 0.9
      }
      
      const params: PriceModelParams = {
        startPrice: 50000,
        projectionMonths: 6,
        modelSpecificParams: {
          prognosisLine: 'fit',
          priceProjectionParams: customParams,
          cycleRepeatVolatility: volatilitySettings
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      // Both features should be active
      expect(result.metadata.customProjectionParams).toEqual(customParams)
      expect(result.metadata.volatilityApplied).toBe(true)
      expect(result.metadata.volatilitySettings).toEqual(volatilitySettings)
      expect(result.projectionPoints).toHaveLength(6)
      
      // Verify regression lines remain pure mathematical curves
      result.projectionPoints.forEach(point => {
        expect(point.support).toBeDefined()
        expect(point.resistance).toBeDefined()
        expect(typeof point.support).toBe('number')
        expect(typeof point.resistance).toBe('number')
      })
    })
  })
})
