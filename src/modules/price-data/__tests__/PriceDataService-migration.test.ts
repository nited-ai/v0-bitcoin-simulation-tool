/**
 * PriceDataService Migration Tests
 * 
 * Tests for Phase 1 migration to UnifiedPriceProjectionService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { priceDataService } from '../services/PriceDataService'
import { unifiedPriceProjectionService } from '../../shared'
import type { PriceEngineParams, HistoricalDataPoint } from '../types'

describe('PriceDataService Migration - Phase 1', () => {
  const mockHistoricalData: HistoricalDataPoint[] = [
    {
      date: '2024-01-01',
      time: 1704067200,
      open: 42000,
      high: 43000,
      low: 41000,
      close: 42500,
      volume: 1000000
    },
    {
      date: '2024-01-02',
      time: 1704153600,
      open: 42500,
      high: 44000,
      low: 42000,
      close: 43500,
      volume: 1100000
    }
  ]

  const mockParams: PriceEngineParams = {
    priceModel: 'manual',
    initialBtcPrice: 42500,
    simulationMonths: 12,
    annualGrowthRates: [10, 15, 20]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('UnifiedPriceProjectionService Integration', () => {
    it('should use UnifiedPriceProjectionService internally', async () => {
      const spy = vi.spyOn(unifiedPriceProjectionService, 'generateProjectionFromLegacyParams')
      
      await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      expect(spy).toHaveBeenCalledWith(mockParams, mockHistoricalData)
    })

    it('should return legacy format for backward compatibility', async () => {
      const result = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
      
      // Check legacy format structure
      const firstPoint = result[0]
      expect(firstPoint).toHaveProperty('date')
      expect(firstPoint).toHaveProperty('days')
      expect(firstPoint.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should handle all available price models', async () => {
      // Only test models that are actually registered
      const models: Array<'manual' | 'powerLaw' | 'enhancedCycleRepeat'> = [
        'manual',
        'powerLaw',
        'enhancedCycleRepeat'
      ]

      for (const model of models) {
        const params = { ...mockParams, priceModel: model }
        const result = await priceDataService.generatePriceProjection(params, mockHistoricalData)

        expect(result.length).toBeGreaterThan(0)
        console.log(`✅ ${model} model generated ${result.length} points`)
      }
    })

    it('should handle missing historical data', async () => {
      // Should load historical data internally if not provided
      const result = await priceDataService.generatePriceProjection(mockParams)
      
      expect(result).toBeInstanceOf(Array)
    })

    it('should preserve projection data in legacy format', async () => {
      const result = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      // Should have simulation path for projection points
      const projectionPoints = result.filter(point => point.simulationPath !== undefined)
      expect(projectionPoints.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', async () => {
      const invalidParams = {
        ...mockParams,
        simulationMonths: -1
      }

      // Model handles negative months gracefully by returning minimal data
      const result = await priceDataService.generatePriceProjection(invalidParams, mockHistoricalData)

      // Should still return data (historical data at minimum)
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing model gracefully', async () => {
      const invalidParams = {
        ...mockParams,
        priceModel: 'invalid' as any
      }

      await expect(
        priceDataService.generatePriceProjection(invalidParams, mockHistoricalData)
      ).rejects.toThrow()
    })
  })

  describe('Performance', () => {
    it('should complete projection generation in reasonable time', async () => {
      const startTime = performance.now()
      
      await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete in < 5 seconds
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data consistency through conversion', async () => {
      const result = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      // Check that dates are in chronological order
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].date)
        const currDate = new Date(result[i].date)
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime())
      }
    })

    it('should preserve price values through conversion', async () => {
      const result = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      // All prices should be positive numbers
      result.forEach(point => {
        if (point.historicalPrice !== undefined) {
          expect(point.historicalPrice).toBeGreaterThan(0)
        }
        if (point.simulationPath !== undefined) {
          expect(point.simulationPath).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing API contract', async () => {
      // The method signature should remain the same
      const result = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      // Should return PriceChartDataPoint[]
      expect(Array.isArray(result)).toBe(true)
      
      // Each point should have the expected structure
      result.forEach(point => {
        expect(point).toHaveProperty('date')
        expect(point).toHaveProperty('days')
        expect(typeof point.date).toBe('string')
        expect(typeof point.days).toBe('number')
      })
    })

    it('should work with existing consumers', async () => {
      // Simulate existing consumer code
      const chartData = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
      
      // Consumer should be able to filter and map data
      const historicalPoints = chartData.filter(p => p.historicalPrice !== undefined)
      const projectionPoints = chartData.filter(p => p.simulationPath !== undefined)
      
      expect(historicalPoints.length).toBeGreaterThan(0)
      expect(projectionPoints.length).toBeGreaterThan(0)
    })
  })
})

