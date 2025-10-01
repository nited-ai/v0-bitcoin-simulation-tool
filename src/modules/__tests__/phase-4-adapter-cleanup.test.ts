/**
 * Phase 4 Adapter Cleanup Verification Tests
 * 
 * Tests to verify legacy conversion methods can be safely removed
 */

import { describe, it, expect } from 'vitest'
import { PriceProjectionAdapter, isNewPriceProjectionResult } from '../shared/adapters/PriceProjectionAdapter'
import type { PriceProjectionResult } from '@/app/simulation/price-models/types'

describe('Phase 4: Adapter Cleanup Verification', () => {
  describe('Adapter Core Functionality', () => {
    it('should have toStrategyFormat method', () => {
      expect(typeof PriceProjectionAdapter.toStrategyFormat).toBe('function')
    })

    it('should have toResultsFormat method', () => {
      expect(typeof PriceProjectionAdapter.toResultsFormat).toBe('function')
    })

    it('should have type guard isNewPriceProjectionResult', () => {
      expect(typeof isNewPriceProjectionResult).toBe('function')
    })
  })

  describe('Strategy Format Conversion', () => {
    it('should convert new format to strategy format', () => {
      const projection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { timestamp: 1704067200000, price: 50000, confidence: 0.95 },
          { timestamp: 1706745600000, price: 55000, confidence: 0.95 }
        ],
        metadata: {
          totalMonths: 2,
          totalGrowth: 10,
          averageMonthlyGrowth: 5,
          confidence: 0.95,
          generatedAt: '2025-01-01'
        }
      }

      const strategyData = PriceProjectionAdapter.toStrategyFormat(projection)

      expect(strategyData.modelName).toBe('manual')
      expect(strategyData.pricePoints).toHaveLength(2)
      expect(strategyData.pricePoints[0].price).toBe(50000)
      expect(strategyData.metadata.totalMonths).toBe(2)
    })

    it('should handle empty projection points', () => {
      const projection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [],
        metadata: {
          totalMonths: 0,
          totalGrowth: 0,
          averageMonthlyGrowth: 0,
          confidence: 0.95,
          generatedAt: '2025-01-01'
        }
      }

      const strategyData = PriceProjectionAdapter.toStrategyFormat(projection)

      expect(strategyData.pricePoints).toHaveLength(0)
      expect(strategyData.metadata.totalMonths).toBe(0)
    })
  })

  describe('Results Format Conversion', () => {
    it('should convert new format to results format with analytics', () => {
      const projection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { timestamp: 1704067200000, price: 50000, confidence: 0.95 },
          { timestamp: 1706745600000, price: 55000, confidence: 0.95 }
        ],
        metadata: {
          totalMonths: 2,
          totalGrowth: 10,
          averageMonthlyGrowth: 5,
          maxDecline: -5,
          volatility: 0.2,
          confidence: 0.95,
          generatedAt: '2025-01-01'
        }
      }

      const resultsData = PriceProjectionAdapter.toResultsFormat(projection)

      expect(resultsData.modelName).toBe('manual')
      expect(resultsData.pricePoints).toHaveLength(2)
      expect(resultsData.analytics.totalGrowth).toBe(10)
      expect(resultsData.analytics.averageMonthlyGrowth).toBe(5)
      expect(resultsData.analytics.maxDecline).toBe(-5)
      expect(resultsData.analytics.volatility).toBe(0.2)
    })

    it('should use default values for missing analytics', () => {
      const projection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { timestamp: 1704067200000, price: 50000, confidence: 0.95 }
        ],
        metadata: {
          totalMonths: 1,
          totalGrowth: 0,
          averageMonthlyGrowth: 0,
          confidence: 0.95,
          generatedAt: '2025-01-01'
        }
      }

      const resultsData = PriceProjectionAdapter.toResultsFormat(projection)

      expect(resultsData.analytics.maxDecline).toBe(0)
      expect(resultsData.analytics.volatility).toBe(0)
    })
  })

  describe('Type Guards', () => {
    it('should correctly identify new format', () => {
      const projection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [],
        metadata: {
          totalMonths: 0,
          totalGrowth: 0,
          averageMonthlyGrowth: 0,
          confidence: 0.95,
          generatedAt: '2025-01-01'
        }
      }

      expect(isNewPriceProjectionResult(projection)).toBe(true)
    })

    it('should reject invalid objects', () => {
      expect(isNewPriceProjectionResult(null)).toBe(false)
      expect(isNewPriceProjectionResult(undefined)).toBe(false)
      expect(isNewPriceProjectionResult({})).toBe(false)
      expect(isNewPriceProjectionResult({ modelName: 'test' })).toBe(false)
    })
  })

  describe('Legacy Methods (Deprecated)', () => {
    it('should have toLegacyFormat for backward compatibility with deprecated services', () => {
      // toLegacyFormat is kept ONLY for deprecated PriceDataService
      // It should NOT be used in new code
      expect(typeof PriceProjectionAdapter.toLegacyFormat).toBe('function')
    })
  })

  describe('Removed Legacy Methods', () => {
    it('should not have fromOldFormat method', () => {
      expect((PriceProjectionAdapter as any).fromOldFormat).toBeUndefined()
    })

    it('should not have fromLegacyFormat method', () => {
      expect((PriceProjectionAdapter as any).fromLegacyFormat).toBeUndefined()
    })

    it('should not export isOldPriceProjectionResult type guard', async () => {
      // This should be removed from exports
      const module = await import('../shared/adapters/PriceProjectionAdapter')
      expect((module as any).isOldPriceProjectionResult).toBeUndefined()
    })
  })

  describe('Adapter Completeness', () => {
    it('should only export necessary functions', async () => {
      const module = await import('../shared/adapters/PriceProjectionAdapter')

      // Should have these
      expect(module.PriceProjectionAdapter).toBeDefined()
      expect(module.isNewPriceProjectionResult).toBeDefined()

      // Should NOT have these (legacy)
      expect((module as any).isOldPriceProjectionResult).toBeUndefined()
    })

    it('should work with all current price models', () => {
      const models = ['manual', 'powerLaw', 'cycleRepeat', 'enhancedCycleRepeat']
      
      models.forEach(modelName => {
        const projection: PriceProjectionResult = {
          modelName,
          modelVersion: '1.0.0',
          projectionPoints: [
            { timestamp: Date.now(), price: 50000, confidence: 0.95 }
          ],
          metadata: {
            totalMonths: 1,
            totalGrowth: 0,
            averageMonthlyGrowth: 0,
            confidence: 0.95,
            generatedAt: new Date().toISOString()
          }
        }

        const strategyData = PriceProjectionAdapter.toStrategyFormat(projection)
        const resultsData = PriceProjectionAdapter.toResultsFormat(projection)

        expect(strategyData.modelName).toBe(modelName)
        expect(resultsData.modelName).toBe(modelName)
      })
    })
  })

  describe('Cleanup Status', () => {
    it('fromOldFormat has been removed', () => {
      expect((PriceProjectionAdapter as any).fromOldFormat).toBeUndefined()
    })

    it('fromLegacyFormat has been removed', () => {
      expect((PriceProjectionAdapter as any).fromLegacyFormat).toBeUndefined()
    })

    it('isOldPriceProjectionResult has been removed from exports', async () => {
      const module = await import('../shared/adapters/PriceProjectionAdapter')
      expect((module as any).isOldPriceProjectionResult).toBeUndefined()
    })

    it('toLegacyFormat is kept only for deprecated PriceDataService', () => {
      // This will be removed when PriceDataService is fully deprecated
      expect(typeof PriceProjectionAdapter.toLegacyFormat).toBe('function')
    })
  })
})

