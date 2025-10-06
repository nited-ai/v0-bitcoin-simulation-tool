/**
 * Bitcoin JSON Data Service Tests
 *
 * Comprehensive tests for the Bitcoin JSON data service that loads price data from JSON files
 * and provides fallback mechanisms when data is missing or stale.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BitcoinJsonDataService } from '../bitcoin-json-data-service'
import type { HistoricalDataPoint } from '../centralized-data-service'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('BitcoinJsonDataService', () => {
  let service: BitcoinJsonDataService
  
  const mockMonthlyData = {
    meta: {
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      interval: 'monthly',
      count: 3,
      lastUpdated: '2025-01-18T00:00:00Z'
    },
    data: [
      [1704067200000, 42500],
      [1706745600000, 45000],
      [1709251200000, 48000]
    ]
  }

  const mockWeeklyData = {
    meta: {
      startDate: '2024-01-01',
      endDate: '2024-01-21',
      interval: 'weekly',
      count: 3,
      lastUpdated: '2025-01-18T00:00:00Z'
    },
    data: [
      [1704067200000, 42500],
      [1704672000000, 43500],
      [1705276800000, 44500]
    ]
  }

  const mockDailyData = {
    meta: {
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      interval: 'daily',
      count: 3,
      lastUpdated: '2025-01-18T00:00:00Z'
    },
    data: [
      [1704067200000, 42500],
      [1704153600000, 43000],
      [1704240000000, 43500]
    ]
  }

  beforeEach(() => {
    service = new BitcoinJsonDataService()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('loadHistoricalData', () => {
    it('should load monthly data by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMonthlyData)
      })

      const result = await service.loadHistoricalData()

      expect(mockFetch).toHaveBeenCalledWith('/data/bitcoin/monthly.json')
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        time: 1704067200, // timestamp in seconds
        close: 42500,
        open: 42500,
        high: 42500,
        low: 42500,
        volume: 0,
        date: '2024-01-01',
        source: 'json'
      })
    })

    it('should load weekly data when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeeklyData)
      })

      const result = await service.loadHistoricalData('weekly')

      expect(mockFetch).toHaveBeenCalledWith('/data/bitcoin/weekly.json')
      expect(result).toHaveLength(3)
    })

    it('should load daily data when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDailyData)
      })

      const result = await service.loadHistoricalData('daily')

      expect(mockFetch).toHaveBeenCalledWith('/data/bitcoin/daily.json')
      expect(result).toHaveLength(3)
    })

    it('should handle network errors with fallback disabled', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.loadHistoricalData('monthly', false)).rejects.toThrow('Failed to load JSON data: Network error')
    })

    it('should handle invalid JSON response with fallback disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(service.loadHistoricalData('monthly', false)).rejects.toThrow('Failed to parse JSON data: Invalid JSON')
    })

    it('should handle HTTP errors with fallback disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(service.loadHistoricalData('monthly', false)).rejects.toThrow('HTTP error: 404 Not Found')
    })

    it('should fallback to database API when JSON loading fails', async () => {
      // First call fails (JSON)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Second call succeeds (database API)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            {
              date: '2024-01-01',
              timestamp: 1704067200000,
              open: 42000,
              high: 43000,
              low: 41000,
              close: 42500,
              volume: 1000,
              source: 'database'
            }
          ]
        })
      })

      const result = await service.loadHistoricalData('monthly', true)

      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('database')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('validateDataIntegrity', () => {
    it('should validate correct data structure', () => {
      expect(() => service.validateDataIntegrity(mockMonthlyData)).not.toThrow()
    })

    it('should throw error for missing metadata', () => {
      const invalidData = { data: [[1704067200000, 42500]] }
      expect(() => service.validateDataIntegrity(invalidData as any)).toThrow('Invalid data structure: missing meta or data')
    })

    it('should throw error for invalid data format', () => {
      const invalidData = {
        meta: { ...mockMonthlyData.meta, count: 1 }, // Fix count to match data length
        data: [[1704067200000]] // Missing close price
      }
      expect(() => service.validateDataIntegrity(invalidData as any)).toThrow('Invalid data point format')
    })

    it('should throw error for count mismatch', () => {
      const invalidData = {
        meta: { ...mockMonthlyData.meta, count: 5 },
        data: mockMonthlyData.data
      }
      expect(() => service.validateDataIntegrity(invalidData)).toThrow('Data count mismatch')
    })
  })

  describe('convertToHistoricalDataPoints', () => {
    it('should convert optimized format to HistoricalDataPoint format', () => {
      const result = service.convertToHistoricalDataPoints(mockMonthlyData)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        time: 1704067200, // timestamp in seconds
        close: 42500,
        open: 42500,
        high: 42500,
        low: 42500,
        volume: 0,
        date: '2024-01-01',
        source: 'json'
      })
    })

    it('should handle empty data', () => {
      const emptyData = {
        meta: { ...mockMonthlyData.meta, count: 0 },
        data: []
      }
      const result = service.convertToHistoricalDataPoints(emptyData)

      expect(result).toHaveLength(0)
    })
  })

  describe('caching', () => {
    it('should cache loaded data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMonthlyData)
      })

      // First call
      await service.loadHistoricalData('monthly')
      
      // Second call should use cache
      const result = await service.loadHistoricalData('monthly')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(3)
    })

    it('should clear cache when requested', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMonthlyData)
      })

      // Load data
      await service.loadHistoricalData('monthly')
      
      // Clear cache
      service.clearCache()
      
      // Load again should make new request
      await service.loadHistoricalData('monthly')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('performance monitoring', () => {
    it('should track loading performance', async () => {
      const performanceSpy = vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMonthlyData)
      })

      await service.loadHistoricalData('monthly')

      expect(performanceSpy).toHaveBeenCalledTimes(2)
    })
  })
})
