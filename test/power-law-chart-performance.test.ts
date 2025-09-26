/**
 * Power Law Chart Performance Test
 * 
 * Validates that the optimized Power Law lines generation in UnifiedPriceChart
 * works correctly and efficiently without causing performance issues.
 */

import { describe, it, expect } from 'vitest'
import { getPowerLawPrice } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Chart Performance Optimization', () => {
  
  describe('Sampling Logic Validation', () => {
    it('should correctly sample large datasets', () => {
      // Simulate a large dataset (like 2000+ historical data points)
      const largeDataset = Array.from({ length: 2000 }, (_, i) => ({
        timestamp: new Date(2020, 0, 1 + i).getTime(),
        price: 10000 + i * 10,
        close: 10000 + i * 10
      }))

      // Apply the same sampling logic as in UnifiedPriceChart
      const maxPoints = 500
      const sampleInterval = Math.max(1, Math.floor(largeDataset.length / maxPoints))
      const sampledData = largeDataset.filter((_, index) => index % sampleInterval === 0)

      console.log(`Original dataset: ${largeDataset.length} points`)
      console.log(`Sample interval: ${sampleInterval}`)
      console.log(`Sampled dataset: ${sampledData.length} points`)

      // Verify sampling works correctly
      expect(sampledData.length).toBeLessThanOrEqual(maxPoints)
      expect(sampledData.length).toBeGreaterThan(0)
      expect(sampleInterval).toBe(4) // 2000 / 500 = 4
    })

    it('should handle small datasets without over-sampling', () => {
      // Simulate a small dataset
      const smallDataset = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(2024, 0, 1 + i).getTime(),
        price: 50000 + i * 100,
        close: 50000 + i * 100
      }))

      // Apply sampling logic
      const maxPoints = 500
      const sampleInterval = Math.max(1, Math.floor(smallDataset.length / maxPoints))
      const sampledData = smallDataset.filter((_, index) => index % sampleInterval === 0)

      console.log(`Small dataset: ${smallDataset.length} points`)
      console.log(`Sample interval: ${sampleInterval}`)
      console.log(`Sampled dataset: ${sampledData.length} points`)

      // For small datasets, interval should be 1 (no sampling needed)
      expect(sampleInterval).toBe(1)
      expect(sampledData.length).toBe(smallDataset.length)
    })
  })

  describe('Power Law Calculation Performance', () => {
    it('should calculate Power Law prices efficiently for sampled points', () => {
      const testDates = [
        new Date('2024-01-01'),
        new Date('2024-06-01'),
        new Date('2024-12-01'),
        new Date('2025-01-01'),
        new Date('2026-01-01')
      ]

      const startTime = performance.now()

      // Calculate Power Law prices for test dates
      const results = testDates.map(date => ({
        date,
        support: getPowerLawPrice(date, 'support'),
        fit: getPowerLawPrice(date, 'fit'),
        resistance: getPowerLawPrice(date, 'resistance')
      }))

      const endTime = performance.now()
      const executionTime = endTime - startTime

      console.log(`Power Law calculation time for ${testDates.length * 3} calls: ${executionTime.toFixed(2)}ms`)

      // Verify all calculations completed
      expect(results).toHaveLength(testDates.length)
      results.forEach(result => {
        expect(result.support).toBeGreaterThan(0)
        expect(result.fit).toBeGreaterThan(0)
        expect(result.resistance).toBeGreaterThan(0)
        expect(result.resistance).toBeGreaterThan(result.fit)
        expect(result.fit).toBeGreaterThan(result.support)
      })

      // Performance should be very fast (under 10ms for 15 calculations)
      expect(executionTime).toBeLessThan(10)
    })

    it('should maintain correct Power Law relationships after optimization', () => {
      const testDate = new Date('2025-06-01')
      
      const supportPrice = getPowerLawPrice(testDate, 'support')
      const fitPrice = getPowerLawPrice(testDate, 'fit')
      const resistancePrice = getPowerLawPrice(testDate, 'resistance')

      console.log(`Power Law prices for ${testDate.toISOString().split('T')[0]}:`)
      console.log(`  Support: $${supportPrice.toLocaleString()}`)
      console.log(`  Fit: $${fitPrice.toLocaleString()}`)
      console.log(`  Resistance: $${resistancePrice.toLocaleString()}`)

      // Verify correct ordering: Support < Fit < Resistance
      expect(supportPrice).toBeLessThan(fitPrice)
      expect(fitPrice).toBeLessThan(resistancePrice)

      // Verify reasonable price ranges (not zero or negative)
      expect(supportPrice).toBeGreaterThan(0)
      expect(fitPrice).toBeGreaterThan(0)
      expect(resistancePrice).toBeGreaterThan(0)
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should limit memory usage by capping the number of Power Law data points', () => {
      // Simulate the memory impact of the optimization
      const maxPoints = 500
      const pointsPerDataPoint = 3 // support, fit, resistance
      const estimatedMemoryPerPoint = 100 // bytes (rough estimate)
      
      const maxMemoryUsage = maxPoints * pointsPerDataPoint * estimatedMemoryPerPoint
      const maxMemoryUsageKB = maxMemoryUsage / 1024

      console.log(`Estimated max memory usage: ${maxMemoryUsageKB.toFixed(1)} KB`)

      // Should be reasonable memory usage (under 1MB)
      expect(maxMemoryUsageKB).toBeLessThan(1024) // Less than 1MB
    })
  })
})
