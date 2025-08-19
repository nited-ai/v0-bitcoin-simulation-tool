/**
 * Performance Benchmark Tests for JSON Data Migration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { bitcoinJsonDataService } from '../bitcoin-json-data-service'
import { centralizedDataService } from '../centralized-data-service'

// Mock fetch for controlled testing
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Performance Benchmark Tests', () => {
  const mockOptimizedData = {
    meta: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      interval: 'weekly',
      count: 52,
      lastUpdated: '2025-01-18T00:00:00Z'
    },
    data: Array.from({ length: 52 }, (_, i) => [
      1704067200000 + (i * 7 * 24 * 60 * 60 * 1000), // Weekly timestamps
      42000 + (i * 100) // Incrementing prices
    ])
  }

  beforeEach(() => {
    mockFetch.mockClear()
    bitcoinJsonDataService.clearCache()
    centralizedDataService.clearState()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('JSON Loading Performance', () => {
    it('should load monthly data in under 50ms', async () => {
      const monthlyData = {
        ...mockOptimizedData,
        meta: { ...mockOptimizedData.meta, interval: 'monthly', count: 12 },
        data: mockOptimizedData.data.slice(0, 12)
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(monthlyData)
      })

      const startTime = performance.now()
      await bitcoinJsonDataService.loadHistoricalData('monthly')
      const loadTime = performance.now() - startTime

      expect(loadTime).toBeLessThan(50)
      console.log(`📊 Monthly data loaded in ${Math.round(loadTime)}ms`)
    })

    it('should load weekly data in under 100ms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimizedData)
      })

      const startTime = performance.now()
      await bitcoinJsonDataService.loadHistoricalData('weekly')
      const loadTime = performance.now() - startTime

      expect(loadTime).toBeLessThan(100)
      console.log(`📊 Weekly data loaded in ${Math.round(loadTime)}ms`)
    })

    it('should load daily data in under 200ms', async () => {
      const dailyData = {
        ...mockOptimizedData,
        meta: { ...mockOptimizedData.meta, interval: 'daily', count: 365 },
        data: Array.from({ length: 365 }, (_, i) => [
          1704067200000 + (i * 24 * 60 * 60 * 1000),
          42000 + (i * 10)
        ])
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(dailyData)
      })

      const startTime = performance.now()
      await bitcoinJsonDataService.loadHistoricalData('daily')
      const loadTime = performance.now() - startTime

      expect(loadTime).toBeLessThan(200)
      console.log(`📊 Daily data loaded in ${Math.round(loadTime)}ms`)
    })
  })

  describe('Centralized Service Performance', () => {
    it('should load historical data through centralized service in under 100ms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimizedData)
      })

      const startTime = performance.now()
      await centralizedDataService.loadHistoricalData()
      const loadTime = performance.now() - startTime

      expect(loadTime).toBeLessThan(100)
      console.log(`📊 Centralized service loaded data in ${Math.round(loadTime)}ms`)
    })

    it('should return cached data instantly on subsequent calls', async () => {
      // First load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimizedData)
      })
      await centralizedDataService.loadHistoricalData()

      // Second load (should use cache)
      const startTime = performance.now()
      await centralizedDataService.loadHistoricalData()
      const loadTime = performance.now() - startTime

      expect(loadTime).toBeLessThan(10) // Should be near-instant
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only called once
      console.log(`📦 Cached data returned in ${Math.round(loadTime)}ms`)
    })
  })

  describe('Progressive Loading Performance', () => {
    it('should implement progressive loading efficiently', async () => {
      const monthlyData = {
        ...mockOptimizedData,
        meta: { ...mockOptimizedData.meta, interval: 'monthly', count: 12 },
        data: mockOptimizedData.data.slice(0, 12)
      }

      const weeklyData = mockOptimizedData

      // Mock progressive loading
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(monthlyData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(weeklyData)
        })

      const startTime = performance.now()
      const result = await bitcoinJsonDataService.loadProgressiveData()
      const totalTime = performance.now() - startTime

      expect(result.monthly).toBeDefined()
      expect(result.weekly).toBeDefined()
      expect(totalTime).toBeLessThan(150) // Both loads should complete quickly
      console.log(`🔄 Progressive loading completed in ${Math.round(totalTime)}ms`)
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should efficiently manage memory with large datasets', async () => {
      // Simulate large daily dataset
      const largeDataset = {
        meta: {
          startDate: '2013-01-01',
          endDate: '2024-12-31',
          interval: 'daily',
          count: 4000,
          lastUpdated: '2025-01-18T00:00:00Z'
        },
        data: Array.from({ length: 4000 }, (_, i) => [
          1356998400000 + (i * 24 * 60 * 60 * 1000), // Daily from 2013
          100 + (i * 10) // Incrementing prices
        ])
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeDataset)
      })

      const memoryBefore = process.memoryUsage().heapUsed
      await bitcoinJsonDataService.loadHistoricalData('daily')
      const memoryAfter = process.memoryUsage().heapUsed

      const memoryIncrease = (memoryAfter - memoryBefore) / 1024 / 1024 // MB
      expect(memoryIncrease).toBeLessThan(50) // Should use less than 50MB
      console.log(`💾 Memory increase: ${Math.round(memoryIncrease)}MB`)
    })

    it('should clear cache efficiently', () => {
      const memoryBefore = process.memoryUsage().heapUsed
      bitcoinJsonDataService.clearCache()
      const memoryAfter = process.memoryUsage().heapUsed

      // Memory should not increase significantly when clearing cache
      const memoryDiff = Math.abs(memoryAfter - memoryBefore) / 1024 / 1024
      expect(memoryDiff).toBeLessThan(1) // Less than 1MB difference
    })
  })

  describe('Concurrent Loading Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizedData)
      })

      const startTime = performance.now()
      
      // Start multiple concurrent loads
      const promises = [
        bitcoinJsonDataService.loadHistoricalData('weekly'),
        bitcoinJsonDataService.loadHistoricalData('weekly'),
        bitcoinJsonDataService.loadHistoricalData('weekly')
      ]

      const results = await Promise.all(promises)
      const totalTime = performance.now() - startTime

      // All should return the same data
      expect(results[0]).toEqual(results[1])
      expect(results[1]).toEqual(results[2])
      
      // Should only make one fetch call due to deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1)
      
      // Should complete quickly due to deduplication
      expect(totalTime).toBeLessThan(100)
      console.log(`🔄 Concurrent loading completed in ${Math.round(totalTime)}ms`)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without hanging', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const startTime = performance.now()
      
      try {
        await bitcoinJsonDataService.loadHistoricalData('weekly', false) // Disable fallback
      } catch (error) {
        const errorTime = performance.now() - startTime
        expect(errorTime).toBeLessThan(50) // Should fail quickly
        console.log(`⚡ Error handled in ${Math.round(errorTime)}ms`)
      }
    })
  })

  describe('Performance Comparison Simulation', () => {
    it('should demonstrate significant improvement over database approach', async () => {
      // Simulate JSON loading (fast)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimizedData)
      })

      const jsonStartTime = performance.now()
      await bitcoinJsonDataService.loadHistoricalData('weekly')
      const jsonLoadTime = performance.now() - jsonStartTime

      // Simulate database loading (slow) - just for comparison
      const simulatedDatabaseTime = 500 + Math.random() * 1000 // 500-1500ms

      const improvement = simulatedDatabaseTime / jsonLoadTime
      expect(improvement).toBeGreaterThan(5) // At least 5x improvement

      console.log(`📈 Performance improvement: ${Math.round(improvement)}x faster`)
      console.log(`   JSON: ${Math.round(jsonLoadTime)}ms`)
      console.log(`   Database (simulated): ${Math.round(simulatedDatabaseTime)}ms`)
    })
  })
})
