/**
 * Tests for VolatilityService - Cycle Repeat Volatility implementation
 * Reference: docs/ROLLING LOAN STRATEGY.html
 */

import { VolatilityService } from '../price-models/services/VolatilityService'
import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'

// Mock Power Law calculation function
const mockGetPowerLawPrice = (date: Date, prognosisLine: 'fit' | 'support' | 'resistance'): number => {
  const GENESIS_DATE = new Date('2009-01-03')
  const days = Math.ceil((date.getTime() - GENESIS_DATE.getTime()) / (1000 * 60 * 60 * 24))
  
  // Simplified Power Law calculation for testing
  const slope = 5.844
  const intercept = prognosisLine === 'fit' ? -17.01 : prognosisLine === 'support' ? -17.46 : -13.5
  const logPrice = slope * Math.log10(days) + intercept
  return Math.pow(10, logPrice)
}

describe('VolatilityService', () => {
  let volatilityService: VolatilityService

  beforeEach(() => {
    volatilityService = new VolatilityService()
  })

  describe('extractDeviationPattern', () => {
    it('should calculate price-to-PowerLaw ratios correctly', () => {
      const historicalData: HistoricalDataPoint[] = [
        { time: new Date('2023-01-01').getTime() / 1000, date: '2023-01-01', open: 19500, high: 21000, low: 19000, close: 20000, volume: 1000 },
        { time: new Date('2023-02-01').getTime() / 1000, date: '2023-02-01', open: 20000, high: 26000, low: 24000, close: 25000, volume: 1000 },
        { time: new Date('2023-03-01').getTime() / 1000, date: '2023-03-01', open: 25000, high: 31000, low: 29000, close: 30000, volume: 1000 }
      ]

      const pattern = volatilityService.extractDeviationPattern(
        historicalData,
        3,
        'fit',
        mockGetPowerLawPrice
      )

      expect(pattern).toHaveLength(3)
      expect(pattern.every(ratio => ratio > 0)).toBe(true)
      
      // Each ratio should be actual price / power law price
      historicalData.forEach((point, index) => {
        const date = new Date(point.time * 1000)
        const powerLawPrice = mockGetPowerLawPrice(date, 'fit')
        const expectedRatio = point.close / powerLawPrice
        expect(pattern[index]).toBeCloseTo(expectedRatio, 5)
      })
    })

    it('should handle insufficient historical data gracefully', () => {
      const historicalData: HistoricalDataPoint[] = [
        { time: new Date('2023-01-01').getTime() / 1000, date: '2023-01-01', open: 19500, high: 21000, low: 19000, close: 20000, volume: 1000 }
      ]

      const pattern = volatilityService.extractDeviationPattern(
        historicalData,
        96, // Request 96 months but only have 1
        'fit',
        mockGetPowerLawPrice
      )

      // After resampling, should return 96 monthly deviation ratios (repeating the single value)
      expect(pattern).toHaveLength(96)
      expect(pattern[0]).toBeGreaterThan(0)
      // All values should be the same since we only have 1 data point
      expect(pattern.every(v => v === pattern[0])).toBe(true)
    })

    it('should work with different prognosis lines', () => {
      const historicalData: HistoricalDataPoint[] = [
        { time: new Date('2023-01-01').getTime() / 1000, date: '2023-01-01', open: 19500, high: 21000, low: 19000, close: 20000, volume: 1000 }
      ]

      const fitPattern = volatilityService.extractDeviationPattern(historicalData, 1, 'fit', mockGetPowerLawPrice)
      const supportPattern = volatilityService.extractDeviationPattern(historicalData, 1, 'support', mockGetPowerLawPrice)
      const resistancePattern = volatilityService.extractDeviationPattern(historicalData, 1, 'resistance', mockGetPowerLawPrice)

      expect(fitPattern).toHaveLength(1)
      expect(supportPattern).toHaveLength(1)
      expect(resistancePattern).toHaveLength(1)
      
      // Different prognosis lines should produce different ratios
      expect(fitPattern[0]).not.toBe(supportPattern[0])
      expect(fitPattern[0]).not.toBe(resistancePattern[0])
    })
  })

  describe('applyVolatility', () => {
    it('should apply deviation pattern with modulo cycling', () => {
      const basePrice = 50000
      const deviationPattern = [1.2, 0.8, 1.5, 0.9] // 4 patterns
      const diminishingFactor = 1.0 // No diminishing

      // Test cycling through pattern
      const result0 = volatilityService.applyVolatility(basePrice, deviationPattern, 0, diminishingFactor)
      const result1 = volatilityService.applyVolatility(basePrice, deviationPattern, 1, diminishingFactor)
      const result4 = volatilityService.applyVolatility(basePrice, deviationPattern, 4, diminishingFactor) // Should cycle back to index 0
      const result5 = volatilityService.applyVolatility(basePrice, deviationPattern, 5, diminishingFactor) // Should cycle to index 1

      expect(result0).toBeCloseTo(basePrice * 1.2)
      expect(result1).toBeCloseTo(basePrice * 0.8)
      expect(result4).toBeCloseTo(result0) // Cycled back to index 0
      expect(result5).toBeCloseTo(result1) // Cycled to index 1
    })

    it('should apply diminishing factor exponentially over time', () => {
      const basePrice = 50000
      const deviationPattern = [2.0] // Strong deviation
      
      // Test different diminishing factors
      const noDiminishing = volatilityService.applyVolatility(basePrice, deviationPattern, 12, 1.0) // 1 year, no diminishing
      const halfDiminishing = volatilityService.applyVolatility(basePrice, deviationPattern, 12, 0.5) // 1 year, 50% diminishing per year
      
      // With diminishing factor 0.5 after 1 year: diminishingMultiplier = 0.5^(12/12) = 0.5
      // volatilityMultiplier = 1 + (2.0 - 1) * 0.5 = 1 + 1 * 0.5 = 1.5
      const expectedDiminished = basePrice * 1.5
      
      expect(noDiminishing).toBeCloseTo(basePrice * 2.0) // Full volatility
      expect(halfDiminishing).toBeCloseTo(expectedDiminished) // Reduced volatility
      expect(halfDiminishing).toBeLessThan(noDiminishing) // Should be less volatile
    })

    it('should handle edge cases correctly', () => {
      const basePrice = 50000
      const deviationPattern = [1.0] // No deviation
      const diminishingFactor = 1.0

      const result = volatilityService.applyVolatility(basePrice, deviationPattern, 0, diminishingFactor)
      expect(result).toBeCloseTo(basePrice) // Should return base price when no deviation
    })
  })

  describe('validateParameters', () => {
    it('should validate pattern length range (24-120 months)', () => {
      expect(volatilityService.validateParameters(24, 1.0)).toBe(true)
      expect(volatilityService.validateParameters(96, 1.0)).toBe(true)
      expect(volatilityService.validateParameters(120, 1.0)).toBe(true)
      
      expect(volatilityService.validateParameters(23, 1.0)).toBe(false) // Too low
      expect(volatilityService.validateParameters(121, 1.0)).toBe(false) // Too high
    })

    it('should validate diminishing factor range (0.5-1.0)', () => {
      expect(volatilityService.validateParameters(96, 0.5)).toBe(true)
      expect(volatilityService.validateParameters(96, 0.75)).toBe(true)
      expect(volatilityService.validateParameters(96, 1.0)).toBe(true)
      
      expect(volatilityService.validateParameters(96, 0.49)).toBe(false) // Too low
      expect(volatilityService.validateParameters(96, 1.01)).toBe(false) // Too high
    })

    it('should reject invalid parameters', () => {
      expect(volatilityService.validateParameters(-1, 1.0)).toBe(false)
      expect(volatilityService.validateParameters(96, -0.5)).toBe(false)
      expect(volatilityService.validateParameters(NaN, 1.0)).toBe(false)
      expect(volatilityService.validateParameters(96, NaN)).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle empty historical data', () => {
      const pattern = volatilityService.extractDeviationPattern([], 96, 'fit', mockGetPowerLawPrice)
      expect(pattern).toHaveLength(0)
    })

    it('should handle empty deviation pattern in applyVolatility', () => {
      const result = volatilityService.applyVolatility(50000, [], 0, 1.0)
      expect(result).toBe(50000) // Should return base price when no pattern
    })
  })
})
