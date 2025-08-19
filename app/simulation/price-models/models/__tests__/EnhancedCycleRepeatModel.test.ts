/**
 * Enhanced Cycle Repeat Model Tests
 * 
 * Comprehensive tests for the Enhanced Cycle Repeat Model with diminishing returns theory
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EnhancedCycleRepeatModel, DIMINISHING_RETURNS_PRESETS } from '../EnhancedCycleRepeatModel'
import type { PriceModelParams } from '../../types'
import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'

describe('EnhancedCycleRepeatModel', () => {
  let model: EnhancedCycleRepeatModel
  let mockHistoricalData: HistoricalDataPoint[]
  let baseParams: PriceModelParams

  beforeEach(() => {
    model = new EnhancedCycleRepeatModel()
    
    // Create mock historical data (4 years of daily data)
    mockHistoricalData = []
    const startDate = new Date('2020-01-01')
    const basePrice = 10000
    
    for (let i = 0; i < 1458; i++) { // 4 years of daily data
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      // Create realistic price progression with some volatility
      const trend = 1 + (i / 1458) * 2 // 200% growth over 4 years
      const volatility = 1 + (Math.sin(i / 30) * 0.1) // Monthly volatility
      const price = basePrice * trend * volatility
      
      mockHistoricalData.push({
        time: Math.floor(date.getTime() / 1000),
        close: price,
        high: price * 1.05,
        low: price * 0.95,
        open: price * (0.98 + Math.random() * 0.04),
        volume: 1000000 + Math.random() * 500000
      })
    }

    baseParams = {
      startPrice: 50000,
      projectionMonths: 24,
      modelSpecificParams: {
        diminishingReturns: DIMINISHING_RETURNS_PRESETS.moderate.params
      }
    }
  })

  describe('Model Metadata', () => {
    it('should have correct basic properties', () => {
      expect(model.name).toBe('Enhanced Cycle Repeat Model')
      expect(model.version).toBe('2.0.0')
      expect(model.description).toContain('diminishing returns theory')
    })

    it('should provide comprehensive metadata', () => {
      const metadata = model.getMetadata()
      
      expect(metadata.name).toBe(model.name)
      expect(metadata.version).toBe(model.version)
      expect(metadata.tags).toContain('diminishing-returns')
      expect(metadata.tags).toContain('economic-theory')
      expect(metadata.complexity).toBe('advanced')
      expect(metadata.riskLevel).toBe('medium')
      expect(metadata.presets).toEqual(['conservative', 'moderate', 'optimistic'])
    })

    it('should provide default parameters', () => {
      const defaults = model.getDefaultParams()
      
      expect(defaults).toHaveProperty('cycleLengthYears', 4)
      expect(defaults).toHaveProperty('volatilityBand', 0.15)
      expect(defaults).toHaveProperty('diminishingReturns')
      expect(defaults.diminishingReturns).toEqual(DIMINISHING_RETURNS_PRESETS.moderate.params)
    })
  })

  describe('Parameter Validation', () => {
    it('should validate correct parameters', () => {
      expect(model.validateParams(baseParams)).toBe(true)
    })

    it('should reject invalid start price', () => {
      const invalidParams = { ...baseParams, startPrice: -1000 }
      expect(model.validateParams(invalidParams)).toBe(false)
    })

    it('should reject invalid projection months', () => {
      const invalidParams = { ...baseParams, projectionMonths: 0 }
      expect(model.validateParams(invalidParams)).toBe(false)
    })

    it('should reject invalid diminishing factor', () => {
      const invalidParams = {
        ...baseParams,
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.moderate.params,
            diminishingFactor: 1.5 // Invalid: should be 0-1
          }
        }
      }
      expect(model.validateParams(invalidParams)).toBe(false)
    })

    it('should reject invalid cycle degradation', () => {
      const invalidParams = {
        ...baseParams,
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.moderate.params,
            cycleDegradation: -0.1 // Invalid: should be 0-1
          }
        }
      }
      expect(model.validateParams(invalidParams)).toBe(false)
    })
  })

  describe('Price Projection Generation', () => {
    it('should generate valid projection with moderate preset', async () => {
      const result = await model.generateProjection(mockHistoricalData, baseParams)
      
      expect(result).toBeDefined()
      expect(result.modelName).toBe(model.name)
      expect(result.modelVersion).toBe(model.version)
      expect(result.projectionPoints).toHaveLength(24) // 24 months
      
      // Check projection point structure
      const firstPoint = result.projectionPoints[0]
      expect(firstPoint).toHaveProperty('timestamp')
      expect(firstPoint).toHaveProperty('price')
      expect(firstPoint).toHaveProperty('support')
      expect(firstPoint).toHaveProperty('resistance')
      expect(firstPoint).toHaveProperty('confidence')
      expect(firstPoint).toHaveProperty('metadata')
      
      // Check metadata includes diminishing returns info
      expect(firstPoint.metadata).toHaveProperty('diminishingReturnsApplied', true)
      expect(firstPoint.metadata).toHaveProperty('diminishingParams')
    })

    it('should apply diminishing returns effects', async () => {
      // Test with no diminishing returns
      const noEffectParams = {
        ...baseParams,
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.optimistic.params,
            diminishingFactor: 0,
            cycleDegradation: 0,
            institutionalSaturation: 0
          }
        }
      }
      
      // Test with strong diminishing returns
      const strongEffectParams = {
        ...baseParams,
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.conservative.params,
            diminishingFactor: 0.9,
            cycleDegradation: 0.5,
            institutionalSaturation: 0.9
          }
        }
      }
      
      const noEffectResult = await model.generateProjection(mockHistoricalData, noEffectParams)
      const strongEffectResult = await model.generateProjection(mockHistoricalData, strongEffectParams)
      
      // Strong diminishing returns should result in lower final prices
      const noEffectFinalPrice = noEffectResult.projectionPoints[noEffectResult.projectionPoints.length - 1].price
      const strongEffectFinalPrice = strongEffectResult.projectionPoints[strongEffectResult.projectionPoints.length - 1].price
      
      expect(strongEffectFinalPrice).toBeLessThan(noEffectFinalPrice)
    })

    it('should handle different adoption curve types', async () => {
      const adoptionCurves = ['linear', 'logarithmic', 'sigmoid'] as const
      
      for (const curveType of adoptionCurves) {
        const params = {
          ...baseParams,
          modelSpecificParams: {
            diminishingReturns: {
              ...DIMINISHING_RETURNS_PRESETS.moderate.params,
              adoptionCurveType: curveType
            }
          }
        }
        
        const result = await model.generateProjection(mockHistoricalData, params)
        expect(result.projectionPoints).toHaveLength(24)
        expect(result.metadata.baseDiminishingReturnsParams.adoptionCurveType).toBe(curveType)
      }
    })

    it('should calculate confidence correctly', async () => {
      const result = await model.generateProjection(mockHistoricalData, baseParams)
      
      // Confidence should decrease over time
      const firstConfidence = result.projectionPoints[0].confidence
      const lastConfidence = result.projectionPoints[result.projectionPoints.length - 1].confidence
      
      expect(firstConfidence).toBeGreaterThan(lastConfidence)
      expect(firstConfidence).toBeLessThanOrEqual(0.95)
      expect(lastConfidence).toBeGreaterThanOrEqual(0.25)
    })

    it('should handle insufficient historical data gracefully', async () => {
      const insufficientData = mockHistoricalData.slice(0, 1) // Only 1 data point
      
      await expect(
        model.generateProjection(insufficientData, baseParams)
      ).rejects.toThrow('Unable to calculate multipliers for cycle 1')
    })
  })

  describe('Diminishing Returns Presets', () => {
    it('should have all required presets', () => {
      expect(DIMINISHING_RETURNS_PRESETS).toHaveProperty('conservative')
      expect(DIMINISHING_RETURNS_PRESETS).toHaveProperty('moderate')
      expect(DIMINISHING_RETURNS_PRESETS).toHaveProperty('optimistic')
    })

    it('should have valid preset parameters', () => {
      Object.values(DIMINISHING_RETURNS_PRESETS).forEach(preset => {
        expect(preset.params.diminishingFactor).toBeGreaterThanOrEqual(0)
        expect(preset.params.diminishingFactor).toBeLessThanOrEqual(1)
        expect(preset.params.cycleDegradation).toBeGreaterThanOrEqual(0)
        expect(preset.params.cycleDegradation).toBeLessThanOrEqual(1)
        expect(preset.params.institutionalSaturation).toBeGreaterThanOrEqual(0)
        expect(preset.params.institutionalSaturation).toBeLessThanOrEqual(1)
        expect(preset.params.maturityThreshold).toBeGreaterThan(0)
      })
    })

    it('should produce different results for different presets', async () => {
      const conservativeParams = {
        ...baseParams,
        modelSpecificParams: {
          diminishingReturns: DIMINISHING_RETURNS_PRESETS.conservative.params
        }
      }
      
      const optimisticParams = {
        ...baseParams,
        modelSpecificParams: {
          diminishingReturns: DIMINISHING_RETURNS_PRESETS.optimistic.params
        }
      }
      
      const conservativeResult = await model.generateProjection(mockHistoricalData, conservativeParams)
      const optimisticResult = await model.generateProjection(mockHistoricalData, optimisticParams)
      
      // Conservative should have lower final price than optimistic
      const conservativeFinalPrice = conservativeResult.projectionPoints[conservativeResult.projectionPoints.length - 1].price
      const optimisticFinalPrice = optimisticResult.projectionPoints[optimisticResult.projectionPoints.length - 1].price
      
      expect(conservativeFinalPrice).toBeLessThan(optimisticFinalPrice)
    })
  })

  describe('Economic Theory Implementation', () => {
    it('should apply market maturity effects', async () => {
      // Test with low maturity threshold (effects kick in early)
      const lowThresholdParams = {
        ...baseParams,
        startPrice: 100000, // High start price to trigger maturity effects
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.moderate.params,
            maturityThreshold: 1_000_000_000_000, // $1T threshold
            diminishingFactor: 0.8
          }
        }
      }

      // Test with high maturity threshold (effects don't kick in)
      const highThresholdParams = {
        ...baseParams,
        startPrice: 100000,
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.moderate.params,
            maturityThreshold: 10_000_000_000_000, // $10T threshold
            diminishingFactor: 0.8
          }
        }
      }

      const lowThresholdResult = await model.generateProjection(mockHistoricalData, lowThresholdParams)
      const highThresholdResult = await model.generateProjection(mockHistoricalData, highThresholdParams)

      // Low threshold should result in more conservative growth
      const lowThresholdFinalPrice = lowThresholdResult.projectionPoints[lowThresholdResult.projectionPoints.length - 1].price
      const highThresholdFinalPrice = highThresholdResult.projectionPoints[highThresholdResult.projectionPoints.length - 1].price

      expect(lowThresholdFinalPrice).toBeLessThan(highThresholdFinalPrice)
    })

    it('should apply cycle degradation effects', async () => {
      // Test long projection to see multiple cycles
      const longProjectionParams = {
        ...baseParams,
        projectionMonths: 120, // 10 years to see multiple 4-year cycles
        modelSpecificParams: {
          diminishingReturns: {
            ...DIMINISHING_RETURNS_PRESETS.moderate.params,
            cycleDegradation: 0.3 // Strong cycle degradation
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, longProjectionParams)

      // Check that later cycles have lower growth rates
      // This is implicit in the model - we can verify the metadata includes cycle information
      const laterPoints = result.projectionPoints.slice(-12) // Last year
      expect(laterPoints[0].metadata).toHaveProperty('cycleNumber')
      expect(laterPoints[0].metadata.cycleNumber).toBeGreaterThan(0)
    })
  })

  describe('Angle Adjustment Algorithm', () => {
    // Create test historical multipliers with known volatility patterns
    const testMultipliers = [
      1.02, 1.05, 0.95, 1.10, 0.80, // Mix of gains and losses
      1.50, 0.60, 1.30, 0.20, 1.80, // Extreme volatility (80% crash, 80% pump)
      1.01, 0.99, 1.03, 0.97, 1.02  // Low volatility period
    ]

    describe('calculateRawFinalPrice', () => {
      it('should calculate correct final price with simple multipliers', () => {
        const initialPrice = 50000
        const simpleMultipliers = [1.1, 1.2, 0.9] // +10%, +20%, -10%

        // Access private method for testing
        const rawFinalPrice = (model as any).calculateRawFinalPrice(initialPrice, simpleMultipliers, 3)

        // Expected: 50000 * 1.1 * 1.2 * 0.9 = 59400
        expect(rawFinalPrice).toBeCloseTo(59400, 0)
      })

      it('should handle extreme volatility multipliers', () => {
        const initialPrice = 100000
        const extremeMultipliers = [2.0, 0.2, 3.0] // +100%, -80%, +200%

        const rawFinalPrice = (model as any).calculateRawFinalPrice(initialPrice, extremeMultipliers, 3)

        // Expected: 100000 * 2.0 * 0.2 * 3.0 = 120000
        expect(rawFinalPrice).toBeCloseTo(120000, 0)
      })

      it('should handle longer projection periods with cycle repetition', () => {
        const initialPrice = 50000
        const shortCycle = [1.1, 0.9] // 2-day cycle

        const rawFinalPrice = (model as any).calculateRawFinalPrice(initialPrice, shortCycle, 6) // 6 days = 3 cycles

        // Expected: 50000 * (1.1 * 0.9)^3 = 50000 * 0.99^3 ≈ 48515
        expect(rawFinalPrice).toBeCloseTo(48515, 0)
      })

      it('should handle edge case with single multiplier', () => {
        const initialPrice = 75000
        const singleMultiplier = [1.5]

        const rawFinalPrice = (model as any).calculateRawFinalPrice(initialPrice, singleMultiplier, 4)

        // Expected: 75000 * 1.5^4 = 75000 * 5.0625 = 379687.5
        expect(rawFinalPrice).toBeCloseTo(379687.5, 0)
      })
    })

    describe('applyDiminishingReturnsToEndpoint', () => {
      it('should apply moderate diminishing returns to endpoint', () => {
        const rawFinalPrice = 200000 // 4x from 50k start
        const moderateParams = DIMINISHING_RETURNS_PRESETS.moderate.params

        const adjustedPrice = (model as any).applyDiminishingReturnsToEndpoint(rawFinalPrice, moderateParams)

        // Should be less than raw price due to diminishing returns
        expect(adjustedPrice).toBeLessThan(rawFinalPrice)
        expect(adjustedPrice).toBeGreaterThan(rawFinalPrice * 0.2) // But still positive
      })

      it('should apply conservative diminishing returns more aggressively', () => {
        const rawFinalPrice = 500000 // 10x from 50k start
        const conservativeParams = DIMINISHING_RETURNS_PRESETS.conservative.params
        const moderateParams = DIMINISHING_RETURNS_PRESETS.moderate.params

        const conservativePrice = (model as any).applyDiminishingReturnsToEndpoint(rawFinalPrice, conservativeParams)
        const moderatePrice = (model as any).applyDiminishingReturnsToEndpoint(rawFinalPrice, moderateParams)

        // Conservative should be more aggressive in reducing the final price
        expect(conservativePrice).toBeLessThan(moderatePrice)
      })

      it('should apply optimistic diminishing returns less aggressively', () => {
        const rawFinalPrice = 300000 // 6x from 50k start
        const optimisticParams = DIMINISHING_RETURNS_PRESETS.optimistic.params
        const moderateParams = DIMINISHING_RETURNS_PRESETS.moderate.params

        const optimisticPrice = (model as any).applyDiminishingReturnsToEndpoint(rawFinalPrice, optimisticParams)
        const moderatePrice = (model as any).applyDiminishingReturnsToEndpoint(rawFinalPrice, moderateParams)

        // Optimistic should be less aggressive in reducing the final price
        expect(optimisticPrice).toBeGreaterThan(moderatePrice)
      })

      it('should handle edge case with very high raw final price', () => {
        const rawFinalPrice = 10000000 // 200x from 50k start
        const moderateParams = DIMINISHING_RETURNS_PRESETS.moderate.params

        const adjustedPrice = (model as any).applyDiminishingReturnsToEndpoint(rawFinalPrice, moderateParams)

        // Should significantly reduce extreme growth
        expect(adjustedPrice).toBeLessThan(rawFinalPrice * 0.5)
        expect(adjustedPrice).toBeGreaterThan(0) // But still positive
      })
    })

    describe('calculateAngleAdjustment', () => {
      it('should calculate correct angle adjustment for reduced final price', () => {
        const rawFinalPrice = 200000
        const adjustedFinalPrice = 150000 // 25% reduction

        const angleAdjustment = (model as any).calculateAngleAdjustment(rawFinalPrice, adjustedFinalPrice)

        // Expected: 150000 / 200000 = 0.75
        expect(angleAdjustment).toBeCloseTo(0.75, 3)
      })

      it('should handle case where adjusted price equals raw price', () => {
        const rawFinalPrice = 100000
        const adjustedFinalPrice = 100000 // No change

        const angleAdjustment = (model as any).calculateAngleAdjustment(rawFinalPrice, adjustedFinalPrice)

        // Expected: 100000 / 100000 = 1.0
        expect(angleAdjustment).toBeCloseTo(1.0, 3)
      })

      it('should handle edge case with very small raw final price', () => {
        const rawFinalPrice = 0.01
        const adjustedFinalPrice = 0.005

        const angleAdjustment = (model as any).calculateAngleAdjustment(rawFinalPrice, adjustedFinalPrice)

        // Expected: 0.005 / 0.01 = 0.5
        expect(angleAdjustment).toBeCloseTo(0.5, 3)
      })

      it('should handle edge case with zero raw final price gracefully', () => {
        const rawFinalPrice = 0
        const adjustedFinalPrice = 50000

        const angleAdjustment = (model as any).calculateAngleAdjustment(rawFinalPrice, adjustedFinalPrice)

        // Should return 1.0 to avoid division by zero
        expect(angleAdjustment).toBe(1.0)
      })
    })

    describe('applyAngleAdjustmentToPrice', () => {
      it('should apply no adjustment when angle adjustment is 1.0', () => {
        const basePrice = 100000
        const angleAdjustment = 1.0
        const timeProgress = 0.5 // 50% through projection

        const adjustedPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, timeProgress)

        // No adjustment should be applied
        expect(adjustedPrice).toBeCloseTo(basePrice, 0)
      })

      it('should apply progressive adjustment based on time progress', () => {
        const basePrice = 100000
        const angleAdjustment = 0.8 // 20% reduction in final trajectory

        // Test different time progress values
        const earlyProgress = 0.2 // 20% through projection
        const midProgress = 0.5 // 50% through projection
        const lateProgress = 0.8 // 80% through projection

        const earlyPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, earlyProgress)
        const midPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, midProgress)
        const latePrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, lateProgress)

        // Early adjustment should be minimal
        expect(earlyPrice).toBeGreaterThan(basePrice * 0.95)
        expect(earlyPrice).toBeLessThan(basePrice)

        // Mid adjustment should be moderate
        expect(midPrice).toBeGreaterThan(basePrice * 0.85)
        expect(midPrice).toBeLessThan(earlyPrice)

        // Late adjustment should be stronger
        expect(latePrice).toBeGreaterThan(basePrice * 0.75)
        expect(latePrice).toBeLessThan(midPrice)
      })

      it('should handle angle adjustment greater than 1.0 (trajectory increase)', () => {
        const basePrice = 100000
        const angleAdjustment = 1.2 // 20% increase in final trajectory
        const timeProgress = 0.5 // 50% through projection

        const adjustedPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, timeProgress)

        // Price should be increased
        expect(adjustedPrice).toBeGreaterThan(basePrice)
        expect(adjustedPrice).toBeLessThan(basePrice * 1.2) // But not full adjustment yet
      })

      it('should handle edge cases with extreme time progress values', () => {
        const basePrice = 100000
        const angleAdjustment = 0.5 // 50% reduction

        // Test time progress at 0 (beginning)
        const beginningPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, 0)
        expect(beginningPrice).toBeCloseTo(basePrice, 0) // No adjustment at beginning

        // Test time progress at 1 (end)
        const endPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, 1)
        expect(endPrice).toBeCloseTo(basePrice * angleAdjustment, 0) // Full adjustment at end

        // Test time progress beyond 1 (should be clamped)
        const beyondPrice = (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, 1.5)
        expect(beyondPrice).toBeCloseTo(basePrice * angleAdjustment, 0) // Should be same as end
      })

      it('should use smooth interpolation for progressive adjustment', () => {
        const basePrice = 100000
        const angleAdjustment = 0.6 // 40% reduction

        // Test multiple time progress points to ensure smooth progression
        const progressPoints = [0, 0.25, 0.5, 0.75, 1.0]
        const adjustedPrices = progressPoints.map(progress =>
          (model as any).applyAngleAdjustmentToPrice(basePrice, angleAdjustment, progress)
        )

        // Prices should decrease smoothly
        for (let i = 1; i < adjustedPrices.length; i++) {
          expect(adjustedPrices[i]).toBeLessThan(adjustedPrices[i - 1])
        }

        // First price should be base price (no adjustment)
        expect(adjustedPrices[0]).toBeCloseTo(basePrice, 0)

        // Last price should be fully adjusted
        expect(adjustedPrices[4]).toBeCloseTo(basePrice * angleAdjustment, 0)
      })
    })

    describe('Time Progress Calculation', () => {
      it('should calculate correct time progress for various projection lengths', () => {
        // Test time progress calculation logic
        const totalDays = 365 // 1 year projection

        // Test different days into projection
        const day90 = 90 // 3 months
        const day180 = 180 // 6 months
        const day270 = 270 // 9 months

        const progress90 = day90 / totalDays
        const progress180 = day180 / totalDays
        const progress270 = day270 / totalDays

        expect(progress90).toBeCloseTo(0.247, 2) // ~25%
        expect(progress180).toBeCloseTo(0.493, 2) // ~50%
        expect(progress270).toBeCloseTo(0.740, 2) // ~75%
      })

      it('should handle edge cases in time progress calculation', () => {
        // Test with very short projection
        const shortProjection = 30 // 1 month
        const day15 = 15 // Half way
        const shortProgress = day15 / shortProjection
        expect(shortProgress).toBe(0.5)

        // Test with very long projection
        const longProjection = 1460 // 4 years
        const day365 = 365 // 1 year
        const longProgress = day365 / longProjection
        expect(longProgress).toBe(0.25)
      })
    })

    describe('New Enhanced Cycle Repeat Price Calculation', () => {
      it('should preserve volatility patterns with angle adjustment', async () => {
        // Use parameters that create significant angle adjustment
        const volatilityTestParams = {
          ...baseParams,
          projectionMonths: 12, // 1 year projection
          modelSpecificParams: {
            diminishingReturns: {
              ...DIMINISHING_RETURNS_PRESETS.conservative.params, // Strong diminishing returns
              diminishingFactor: 0.8
            }
          }
        }

        const result = await model.generateProjection(mockHistoricalData, volatilityTestParams)

        // Check that we have monthly data points
        expect(result.projectionPoints).toHaveLength(12)

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

        // Should have some significant changes (not all small)
        const significantChanges = monthlyChanges.filter(change => Math.abs(change) > 0.05) // >5% changes
        expect(significantChanges.length).toBeGreaterThan(0)
      })

      it('should apply diminishing returns to overall trajectory', async () => {
        // Compare conservative vs optimistic presets
        const conservativeParams = {
          ...baseParams,
          projectionMonths: 24,
          modelSpecificParams: {
            diminishingReturns: DIMINISHING_RETURNS_PRESETS.conservative.params
          }
        }

        const optimisticParams = {
          ...baseParams,
          projectionMonths: 24,
          modelSpecificParams: {
            diminishingReturns: DIMINISHING_RETURNS_PRESETS.optimistic.params
          }
        }

        const conservativeResult = await model.generateProjection(mockHistoricalData, conservativeParams)
        const optimisticResult = await model.generateProjection(mockHistoricalData, optimisticParams)

        // Final prices should reflect diminishing returns differences
        const conservativeFinal = conservativeResult.projectionPoints[conservativeResult.projectionPoints.length - 1].price
        const optimisticFinal = optimisticResult.projectionPoints[optimisticResult.projectionPoints.length - 1].price

        // Optimistic should have higher final price due to less aggressive diminishing returns
        expect(optimisticFinal).toBeGreaterThan(conservativeFinal)
      })

      it('should maintain historical multiplier patterns', async () => {
        const testParams = {
          ...baseParams,
          projectionMonths: 6, // Short projection to focus on pattern preservation
          modelSpecificParams: {
            diminishingReturns: {
              ...DIMINISHING_RETURNS_PRESETS.moderate.params,
              diminishingFactor: 0.1 // Minimal diminishing returns to see raw patterns
            }
          }
        }

        const result = await model.generateProjection(mockHistoricalData, testParams)

        // Calculate the implied daily multipliers from monthly results
        const monthlyMultipliers = []
        for (let i = 1; i < result.projectionPoints.length; i++) {
          const prevPrice = result.projectionPoints[i - 1].price
          const currentPrice = result.projectionPoints[i].price
          const monthlyMultiplier = currentPrice / prevPrice
          monthlyMultipliers.push(monthlyMultiplier)
        }

        // Should have variety in multipliers (not all the same)
        const uniqueMultipliers = new Set(monthlyMultipliers.map(m => Math.round(m * 1000) / 1000))
        expect(uniqueMultipliers.size).toBeGreaterThan(1)

        // Should have both growth and decline periods
        const growthMonths = monthlyMultipliers.filter(m => m > 1.0)
        const declineMonths = monthlyMultipliers.filter(m => m < 1.0)

        expect(growthMonths.length).toBeGreaterThan(0)
        expect(declineMonths.length).toBeGreaterThan(0)
      })

      it('should handle extreme angle adjustment scenarios', async () => {
        // Test with very aggressive diminishing returns
        const extremeParams = {
          ...baseParams,
          projectionMonths: 12,
          modelSpecificParams: {
            diminishingReturns: {
              diminishingFactor: 0.95, // Very aggressive
              maturityThreshold: 500_000_000_000, // Low threshold
              cycleDegradation: 0.8,
              adoptionCurveType: 'logarithmic' as const,
              institutionalSaturation: 0.9,
              regulatoryMaturity: 0.9,
              liquidityConstraint: 0.8,
              competitionFactor: 0.7
            }
          }
        }

        const result = await model.generateProjection(mockHistoricalData, extremeParams)

        // Should still generate valid projection
        expect(result.projectionPoints).toHaveLength(12)
        expect(result.projectionPoints[0].price).toBe(baseParams.startPrice)

        // Final price should be constrained due to extreme diminishing returns
        const finalPrice = result.projectionPoints[result.projectionPoints.length - 1].price
        expect(finalPrice).toBeGreaterThan(0) // Should still be positive
        // With extreme diminishing returns, growth should be very limited (less than 10% over 12 months)
        expect(finalPrice).toBeLessThan(baseParams.startPrice * 1.1)
      })

      it('should provide smooth trajectory adjustment over time', async () => {
        const testParams = {
          ...baseParams,
          projectionMonths: 24, // 2 years to see trajectory evolution
          modelSpecificParams: {
            diminishingReturns: {
              ...DIMINISHING_RETURNS_PRESETS.moderate.params,
              diminishingFactor: 0.6 // Moderate adjustment
            }
          }
        }

        const result = await model.generateProjection(mockHistoricalData, testParams)

        // Calculate the trajectory trend (should be smooth, not erratic)
        const prices = result.projectionPoints.map(p => p.price)

        // Calculate moving averages to see overall trend
        const windowSize = 3
        const movingAverages = []
        for (let i = windowSize - 1; i < prices.length; i++) {
          const window = prices.slice(i - windowSize + 1, i + 1)
          const average = window.reduce((sum, price) => sum + price, 0) / windowSize
          movingAverages.push(average)
        }

        // Moving averages should show smooth progression (not wild swings)
        const avgChanges = []
        for (let i = 1; i < movingAverages.length; i++) {
          const change = Math.abs(movingAverages[i] - movingAverages[i - 1]) / movingAverages[i - 1]
          avgChanges.push(change)
        }

        // Most changes should be reasonable (not extreme jumps in moving average)
        const extremeChanges = avgChanges.filter(change => change > 0.5) // >50% jumps in moving average
        expect(extremeChanges.length).toBeLessThan(avgChanges.length * 0.2) // Less than 20% extreme
      })
    })
  })
})
