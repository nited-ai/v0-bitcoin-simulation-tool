/**
 * Phase 1 Integration Tests
 * 
 * Comprehensive integration tests to verify Phase 1 migration is working correctly.
 * Tests the complete flow from PriceDataService through UnifiedPriceProjectionService
 * to ensure backward compatibility and correct format handling.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { PriceDataService } from '../price-data/services/PriceDataService'
import {
  unifiedPriceProjectionService,
  PriceProjectionAdapter,
  validateNewFormat,
  detectFormat,
  MigrationPhase,
  logMigrationProgress
} from '../shared'
import type { PriceEngineParams } from '../price-data/types'

describe('Phase 1 Integration Tests', () => {
  let priceDataService: PriceDataService

  beforeAll(() => {
    priceDataService = PriceDataService.getInstance()
    logMigrationProgress(
      'Phase 1 Integration Tests',
      MigrationPhase.PHASE_1_FOUNDATION,
      'Starting integration test suite'
    )
  })

  // Helper function to create valid PriceEngineParams
  function createTestParams(overrides: Partial<PriceEngineParams> = {}): PriceEngineParams {
    return {
      priceModel: 'manual',
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [10, 15, 20],
      powerLawSettings: { selectedLine: 'fit' },
      ...overrides
    }
  }

  describe('End-to-End Flow', () => {
    it('should generate projection through complete pipeline', async () => {
      const params = createTestParams()

      // Generate projection through PriceDataService
      const result = await priceDataService.generatePriceProjection(params)

      // Verify result is in legacy format (backward compatibility)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('days')

      // Verify projection data exists
      const projectionPoints = result.filter(p => p.simulationPath !== undefined)
      expect(projectionPoints.length).toBeGreaterThan(0)

      logMigrationProgress(
        'End-to-End Flow',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Complete pipeline test passed',
        { pointsGenerated: result.length }
      )
    })

    it('should handle all available models', async () => {
      const models = unifiedPriceProjectionService.getAvailableModels()
      expect(models.length).toBeGreaterThan(0)

      for (const modelId of models) {
        // Skip models that aren't actually registered
        if (!unifiedPriceProjectionService.isModelAvailable(modelId)) {
          console.log(`⏭️  Skipping ${modelId} - not registered`)
          continue
        }

        const params = createTestParams({ priceModel: modelId })

        try {
          const result = await priceDataService.generatePriceProjection(params)
          expect(Array.isArray(result)).toBe(true)
          expect(result.length).toBeGreaterThan(0)

          logMigrationProgress(
            'Model Testing',
            MigrationPhase.PHASE_1_FOUNDATION,
            `Model ${modelId} tested successfully`,
            { pointsGenerated: result.length }
          )
        } catch (error) {
          // Some models (like enhancedCycleRepeat) require historical data
          // Skip them if they fail due to missing data
          if (error instanceof Error && error.message.includes('historical data')) {
            console.log(`⏭️  Skipping ${modelId} - requires historical data`)
            continue
          }
          throw error
        }
      }
    })
  })

  describe('Format Conversion', () => {
    it('should generate new format directly (Phase 4: legacy conversion removed)', async () => {
      const params = createTestParams()

      // Load historical data
      const historicalData = await priceDataService.loadHistoricalData({ useCache: true })

      // Phase 4: All services now generate new format directly
      const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
        params,
        historicalData
      )

      // Verify it's new format
      expect(detectFormat(projection)).toBe('new')

      // Validate new format
      const validation = validateNewFormat(projection)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      // Verify projection has correct structure
      expect(projection.modelName).toBeDefined()
      expect(projection.projectionPoints.length).toBeGreaterThan(0)

      logMigrationProgress(
        'Format Generation',
        MigrationPhase.PHASE_4_CLEANUP,
        'Direct new format generation successful'
      )
    })

    it('should preserve price values in new format (Phase 4: no conversion needed)', async () => {
      const params = createTestParams({ simulationMonths: 6 })

      // Load historical data
      const historicalData = await priceDataService.loadHistoricalData({ useCache: true })

      // Generate projection in new format
      const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
        params,
        historicalData
      )

      // Verify all projection points have valid prices
      expect(projection.projectionPoints.length).toBeGreaterThan(0)
      projection.projectionPoints.forEach(point => {
        expect(point.price).toBeGreaterThan(0)
        expect(typeof point.price).toBe('number')
        expect(isFinite(point.price)).toBe(true)
      })

      // Verify metadata calculations
      expect(projection.metadata.totalMonths).toBe(6)

      logMigrationProgress(
        'Data Integrity',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Price values preserved through conversion'
      )
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing API contracts', async () => {
      const params = createTestParams()

      // Call with same parameters as before migration
      const result = await priceDataService.generatePriceProjection(params)

      // Verify return type matches legacy format
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('days')
      expect(result[0]).toHaveProperty('simulationPath')

      // Verify structure matches what consumers expect
      const projectionPoint = result.find(p => p.simulationPath !== undefined)
      expect(projectionPoint).toBeDefined()
      expect(typeof projectionPoint!.date).toBe('string')
      expect(typeof projectionPoint!.days).toBe('number')
      expect(typeof projectionPoint!.simulationPath).toBe('number')

      logMigrationProgress(
        'Backward Compatibility',
        MigrationPhase.PHASE_1_FOUNDATION,
        'API contract maintained'
      )
    })

    it('should work with existing consumer patterns', async () => {
      const params = createTestParams()

      const chartData = await priceDataService.generatePriceProjection(params)

      // Simulate existing consumer code patterns
      const projectionData = chartData.filter(point => point.simulationPath !== undefined)
      expect(projectionData.length).toBeGreaterThan(0)

      const prices = projectionData.map(point => point.simulationPath!)
      expect(prices.every(price => typeof price === 'number')).toBe(true)

      const dates = projectionData.map(point => point.date)
      expect(dates.every(date => typeof date === 'string')).toBe(true)

      logMigrationProgress(
        'Consumer Patterns',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Existing patterns still work'
      )
    })
  })

  describe('UnifiedPriceProjectionService Integration', () => {
    it('should be accessible through PriceDataService', async () => {
      const params = createTestParams()

      // This should internally use UnifiedPriceProjectionService
      const result = await priceDataService.generatePriceProjection(params)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      logMigrationProgress(
        'Service Integration',
        MigrationPhase.PHASE_1_FOUNDATION,
        'UnifiedPriceProjectionService integrated successfully'
      )
    })

    it('should handle model availability checks', () => {
      const availableModels = unifiedPriceProjectionService.getAvailableModels()
      expect(availableModels.length).toBeGreaterThan(0)

      // Filter to only actually registered models
      const registeredModels = availableModels.filter(modelId =>
        unifiedPriceProjectionService.isModelAvailable(modelId)
      )

      expect(registeredModels.length).toBeGreaterThan(0)

      registeredModels.forEach(modelId => {
        expect(unifiedPriceProjectionService.isModelAvailable(modelId)).toBe(true)
        const info = unifiedPriceProjectionService.getModelInfo(modelId)
        expect(info).toBeDefined()
        expect(info?.name).toBeDefined()
        expect(info?.version).toBeDefined()
      })

      logMigrationProgress(
        'Model Registry',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Model availability checks working',
        { modelsAvailable: registeredModels.length, totalListed: availableModels.length }
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid model gracefully', async () => {
      const params = createTestParams({ priceModel: 'invalid-model' as any })

      await expect(
        priceDataService.generatePriceProjection(params)
      ).rejects.toThrow()

      logMigrationProgress(
        'Error Handling',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Invalid model handled correctly'
      )
    })

    it('should handle invalid parameters gracefully', async () => {
      const params = createTestParams({ simulationMonths: -1 }) // Invalid

      // Should not throw, but handle gracefully
      const result = await priceDataService.generatePriceProjection(params)
      expect(result).toBeDefined()

      logMigrationProgress(
        'Error Handling',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Invalid parameters handled gracefully'
      )
    })
  })

  describe('Performance', () => {
    it('should complete projections in reasonable time', async () => {
      const params = createTestParams({ simulationMonths: 120 }) // 10 years

      const startTime = performance.now()
      const result = await priceDataService.generatePriceProjection(params)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(1000) // Should complete in less than 1 second
      expect(result.length).toBeGreaterThan(0)

      logMigrationProgress(
        'Performance',
        MigrationPhase.PHASE_1_FOUNDATION,
        'Performance test passed',
        { duration: `${duration.toFixed(2)}ms`, points: result.length }
      )
    })
  })
})

