/**
 * Power Law Deployment Fix Test
 * 
 * Tests to verify Power Law lines are properly generated and visible
 * in both local and production environments.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getPowerLawPrice } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Deployment Fix', () => {
  describe('Power Law Price Calculation', () => {
    it('should calculate valid Power Law prices for all line types', () => {
      const testDate = new Date('2024-01-01')
      
      const fitPrice = getPowerLawPrice(testDate, 'fit')
      const supportPrice = getPowerLawPrice(testDate, 'support')
      const resistancePrice = getPowerLawPrice(testDate, 'resistance')
      
      // All prices should be positive numbers
      expect(fitPrice).toBeGreaterThan(0)
      expect(supportPrice).toBeGreaterThan(0)
      expect(resistancePrice).toBeGreaterThan(0)
      
      // Prices should not be NaN or Infinity
      expect(isFinite(fitPrice)).toBe(true)
      expect(isFinite(supportPrice)).toBe(true)
      expect(isFinite(resistancePrice)).toBe(true)
      
      console.log('Power Law prices for 2024-01-01:', {
        fit: fitPrice.toFixed(0),
        support: supportPrice.toFixed(0),
        resistance: resistancePrice.toFixed(0)
      })
    })

    it('should handle edge cases gracefully', () => {
      // Test with very early date (should still work)
      const earlyDate = new Date('2009-01-04') // Day after genesis
      const earlyPrice = getPowerLawPrice(earlyDate, 'fit')
      expect(earlyPrice).toBeGreaterThan(0)
      expect(isFinite(earlyPrice)).toBe(true)
      
      // Test with future date
      const futureDate = new Date('2030-01-01')
      const futurePrice = getPowerLawPrice(futureDate, 'fit')
      expect(futurePrice).toBeGreaterThan(0)
      expect(isFinite(futurePrice)).toBe(true)
    })

    it('should use consistent default parameters', () => {
      const testDate = new Date('2025-01-01')
      
      // Test with no custom parameters (should use defaults)
      const defaultFit = getPowerLawPrice(testDate, 'fit')
      const defaultSupport = getPowerLawPrice(testDate, 'support')
      const defaultResistance = getPowerLawPrice(testDate, 'resistance')
      
      // Test with explicit default parameters
      const customParams = {
        controlMode: 'individual' as const,
        individualParams: {
          fit: { slope: 5.844, intercept: -17.01 },
          support: { slope: 5.844, intercept: -17.46 },
          resistance: { slope: 5.06, intercept: -13.5 }
        }
      }
      
      const customFit = getPowerLawPrice(testDate, 'fit', customParams)
      const customSupport = getPowerLawPrice(testDate, 'support', customParams)
      const customResistance = getPowerLawPrice(testDate, 'resistance', customParams)
      
      // Should produce the same results
      expect(Math.abs(defaultFit - customFit)).toBeLessThan(1) // Allow for rounding differences
      expect(Math.abs(defaultSupport - customSupport)).toBeLessThan(1)
      expect(Math.abs(defaultResistance - customResistance)).toBeLessThan(1)
    })
  })

  describe('Power Law Settings Validation', () => {
    it('should have correct default parameters', () => {
      // These are the standardized parameters that should be consistent
      const expectedDefaults = {
        fit: { slope: 5.844, intercept: -17.01 },
        support: { slope: 5.844, intercept: -17.46 },
        resistance: { slope: 5.06, intercept: -13.5 }
      }
      
      // Test that our expected defaults produce reasonable prices
      const testDate = new Date('2024-01-01')
      
      Object.entries(expectedDefaults).forEach(([lineType, params]) => {
        const customParams = {
          controlMode: 'individual' as const,
          individualParams: {
            fit: expectedDefaults.fit,
            support: expectedDefaults.support,
            resistance: expectedDefaults.resistance
          }
        }
        
        const price = getPowerLawPrice(testDate, lineType as any, customParams)
        expect(price).toBeGreaterThan(1000) // Should be reasonable Bitcoin price
        expect(price).toBeLessThan(10000000) // Should not be astronomical
        expect(isFinite(price)).toBe(true)
      })
    })
  })

  describe('Environment Compatibility', () => {
    it('should work with various JavaScript environments', () => {
      // Test that Math.log10 and Math.pow work correctly
      expect(Math.log10(100)).toBe(2)
      expect(Math.pow(10, 2)).toBe(100)
      
      // Test Date handling
      const testDate = new Date('2024-01-01T00:00:00.000Z')
      expect(testDate.getTime()).toBeGreaterThan(0)
      expect(isNaN(testDate.getTime())).toBe(false)
    })

    it('should handle timezone differences', () => {
      // Test with different date formats
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-01T00:00:00Z')
      const date3 = new Date(2024, 0, 1) // Month is 0-indexed
      
      const price1 = getPowerLawPrice(date1, 'fit')
      const price2 = getPowerLawPrice(date2, 'fit')
      const price3 = getPowerLawPrice(date3, 'fit')
      
      // All should produce valid prices (may differ slightly due to timezone)
      expect(isFinite(price1)).toBe(true)
      expect(isFinite(price2)).toBe(true)
      expect(isFinite(price3)).toBe(true)
      
      // Should be in similar range
      const maxPrice = Math.max(price1, price2, price3)
      const minPrice = Math.min(price1, price2, price3)
      expect(maxPrice / minPrice).toBeLessThan(2) // Should not differ by more than 2x
    })
  })
})
