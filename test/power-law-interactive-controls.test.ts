/**
 * Test suite for Power Law Interactive Controls
 * 
 * Tests the new slope and intercept adjustment controls for the Power Law model
 * including unified and individual control modes.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getPowerLawPrice } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Interactive Controls', () => {
  const testDate = new Date('2024-01-01')
  
  // Default parameters for reference
  const defaultParams = {
    fit: { slope: 5.844, intercept: -17.01 },
    support: { slope: 5.844, intercept: -17.461735 },
    resistance: { slope: 5.844, intercept: -15.941731 }
  }

  describe('Default Power Law Calculation', () => {
    it('should calculate correct prices with default parameters', () => {
      const fitPrice = getPowerLawPrice(testDate, 'fit')
      const supportPrice = getPowerLawPrice(testDate, 'support')
      const resistancePrice = getPowerLawPrice(testDate, 'resistance')

      expect(fitPrice).toBeGreaterThan(0)
      expect(supportPrice).toBeGreaterThan(0)
      expect(resistancePrice).toBeGreaterThan(0)
      
      // Resistance should be higher than fit, fit higher than support
      expect(resistancePrice).toBeGreaterThan(fitPrice)
      expect(fitPrice).toBeGreaterThan(supportPrice)
    })
  })

  describe('Unified Control Mode', () => {
    it('should apply unified slope changes to all lines with relative offsets', () => {
      const customParams = {
        controlMode: 'unified' as const,
        unifiedSlope: 6.0, // Increased from default 5.844 (within new range 5.2-6.2)
        unifiedIntercept: -17.01, // Same as default
        individualParams: defaultParams
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', customParams)
      const supportPrice = getPowerLawPrice(testDate, 'support', customParams)
      const resistancePrice = getPowerLawPrice(testDate, 'resistance', customParams)

      // All prices should be different from defaults due to slope change
      const defaultFitPrice = getPowerLawPrice(testDate, 'fit')
      const defaultSupportPrice = getPowerLawPrice(testDate, 'support')
      const defaultResistancePrice = getPowerLawPrice(testDate, 'resistance')

      expect(fitPrice).not.toEqual(defaultFitPrice)
      expect(supportPrice).not.toEqual(defaultSupportPrice)
      expect(resistancePrice).not.toEqual(defaultResistancePrice)

      // Relative order should be maintained
      expect(resistancePrice).toBeGreaterThan(fitPrice)
      expect(fitPrice).toBeGreaterThan(supportPrice)
    })

    it('should apply unified intercept changes to all lines with relative offsets', () => {
      const customParams = {
        controlMode: 'unified' as const,
        unifiedSlope: 5.844, // Same as default
        unifiedIntercept: -14.5, // Increased from default -17.01 (within new range -15.0 to -14.0)
        individualParams: defaultParams
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', customParams)
      const supportPrice = getPowerLawPrice(testDate, 'support', customParams)
      const resistancePrice = getPowerLawPrice(testDate, 'resistance', customParams)

      // All prices should be higher than defaults due to intercept increase
      const defaultFitPrice = getPowerLawPrice(testDate, 'fit')
      const defaultSupportPrice = getPowerLawPrice(testDate, 'support')
      const defaultResistancePrice = getPowerLawPrice(testDate, 'resistance')

      expect(fitPrice).toBeGreaterThan(defaultFitPrice)
      expect(supportPrice).toBeGreaterThan(defaultSupportPrice)
      expect(resistancePrice).toBeGreaterThan(defaultResistancePrice)
    })
  })

  describe('Individual Control Mode', () => {
    it('should use individual parameters for each line', () => {
      const customParams = {
        controlMode: 'individual' as const,
        unifiedSlope: 5.844,
        unifiedIntercept: -17.01,
        individualParams: {
          fit: { slope: 6.0, intercept: -14.5 }, // Modified (within new ranges)
          support: { slope: 5.844, intercept: -17.461735 }, // Default
          resistance: { slope: 5.5, intercept: -14.2 } // Modified (within new ranges)
        }
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', customParams)
      const supportPrice = getPowerLawPrice(testDate, 'support', customParams)
      const resistancePrice = getPowerLawPrice(testDate, 'resistance', customParams)

      // Fit and resistance should be different from defaults
      const defaultFitPrice = getPowerLawPrice(testDate, 'fit')
      const defaultSupportPrice = getPowerLawPrice(testDate, 'support')
      const defaultResistancePrice = getPowerLawPrice(testDate, 'resistance')

      expect(fitPrice).not.toEqual(defaultFitPrice)
      expect(supportPrice).toEqual(defaultSupportPrice) // Should be same as default
      expect(resistancePrice).not.toEqual(defaultResistancePrice)
    })

    it('should allow independent adjustment of each line', () => {
      const customParams = {
        controlMode: 'individual' as const,
        unifiedSlope: 5.844,
        unifiedIntercept: -17.01,
        individualParams: {
          fit: { slope: 5.844, intercept: -17.01 }, // Default
          support: { slope: 6.1, intercept: -14.8 }, // Higher slope, higher intercept (within new ranges)
          resistance: { slope: 5.4, intercept: -14.3 } // Lower slope, higher intercept (within new ranges)
        }
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', customParams)
      const supportPrice = getPowerLawPrice(testDate, 'support', customParams)
      const resistancePrice = getPowerLawPrice(testDate, 'resistance', customParams)

      // Each line should behave according to its individual parameters
      expect(fitPrice).toBeGreaterThan(0)
      expect(supportPrice).toBeGreaterThan(0)
      expect(resistancePrice).toBeGreaterThan(0)

      // With these specific parameters, the traditional order might change
      // This tests that individual control truly works independently
      const defaultFitPrice = getPowerLawPrice(testDate, 'fit')
      expect(fitPrice).toEqual(defaultFitPrice) // Fit unchanged
    })
  })

  describe('Fallback Behavior', () => {
    it('should fallback to default parameters when custom params are incomplete', () => {
      const incompleteParams = {
        controlMode: 'unified' as const,
        // Missing unifiedSlope and unifiedIntercept
        individualParams: defaultParams
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', incompleteParams)
      const defaultFitPrice = getPowerLawPrice(testDate, 'fit')

      expect(fitPrice).toEqual(defaultFitPrice)
    })

    it('should fallback to default parameters when no custom params provided', () => {
      const fitPrice = getPowerLawPrice(testDate, 'fit')
      const fitPriceWithUndefined = getPowerLawPrice(testDate, 'fit', undefined)

      expect(fitPrice).toEqual(fitPriceWithUndefined)
    })
  })

  describe('Parameter Validation', () => {
    it('should handle extreme slope values gracefully', () => {
      const extremeParams = {
        controlMode: 'unified' as const,
        unifiedSlope: 6.2, // Maximum slope in new range
        unifiedIntercept: -17.01,
        individualParams: defaultParams
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', extremeParams)
      expect(fitPrice).toBeGreaterThan(0)
      expect(Number.isFinite(fitPrice)).toBe(true)
    })

    it('should handle extreme intercept values gracefully', () => {
      const extremeParams = {
        controlMode: 'unified' as const,
        unifiedSlope: 5.844,
        unifiedIntercept: -15.0, // Minimum intercept in new range
        individualParams: defaultParams
      }

      const fitPrice = getPowerLawPrice(testDate, 'fit', extremeParams)
      expect(fitPrice).toBeGreaterThan(0)
      expect(Number.isFinite(fitPrice)).toBe(true)
    })
  })

  describe('Real-time Updates', () => {
    it('should produce different results when parameters change', () => {
      const params1 = {
        controlMode: 'unified' as const,
        unifiedSlope: 5.5,
        unifiedIntercept: -14.8,
        individualParams: defaultParams
      }

      const params2 = {
        controlMode: 'unified' as const,
        unifiedSlope: 6.0,
        unifiedIntercept: -14.3,
        individualParams: defaultParams
      }

      const price1 = getPowerLawPrice(testDate, 'fit', params1)
      const price2 = getPowerLawPrice(testDate, 'fit', params2)

      expect(price1).not.toEqual(price2)
      expect(price2).toBeGreaterThan(price1) // Higher slope and intercept should give higher price
    })
  })
})
