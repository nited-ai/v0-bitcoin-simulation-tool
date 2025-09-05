/**
 * Tests for Centralized Data Service Integration with JSON Data Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { centralizedDataService } from '../centralized-data-service'
import type { HistoricalDataPoint } from '../centralized-data-service'

// Mock the JSON data service
vi.mock('../bitcoin-json-data-service', () => ({
  bitcoinJsonDataService: {
    loadHistoricalData: vi.fn(),
    clearCache: vi.fn(),
    getCacheStatus: vi.fn(() => [])
  }
}))

// Mock the enhanced bitcoin API service
vi.mock('../bitcoin-api-service', () => ({
  enhancedBitcoinApiService: {
    fetchCurrentPrice: vi.fn()
  }
}))

// Mock fetch for current price API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Centralized Data Service Integration', () => {
  const mockHistoricalData: HistoricalDataPoint[] = [
    {
      time: 1704067200,
      close: 42500,
      open: 42000,
      high: 43000,
      low: 41000,
      volume: 1000,
      date: '2024-01-01',
      source: 'json'
    },
    {
      time: 1704153600,
      close: 43000,
      open: 42500,
      high: 43500,
      low: 42000,
      volume: 1200,
      date: '2024-01-02',
      source: 'json'
    }
  ]

  beforeEach(() => {
    // Reset service state
    centralizedDataService.clearState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('loadHistoricalData', () => {
    it('should load historical data using JSON service', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      const result = await centralizedDataService.loadHistoricalData()

      expect(bitcoinJsonDataService.loadHistoricalData).toHaveBeenCalledWith('weekly')
      expect(result).toEqual(mockHistoricalData)
      expect(result).toHaveLength(2)
    })

    it('should support different intervals', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      await centralizedDataService.loadHistoricalData(false, 'daily')

      expect(bitcoinJsonDataService.loadHistoricalData).toHaveBeenCalledWith('daily')
    })

    it('should cache loaded data', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      // First call
      const result1 = await centralizedDataService.loadHistoricalData()
      
      // Second call should use cache
      const result2 = await centralizedDataService.loadHistoricalData()

      expect(bitcoinJsonDataService.loadHistoricalData).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })

    it('should handle loading errors gracefully', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockRejectedValueOnce(new Error('JSON loading failed'))

      await expect(centralizedDataService.loadHistoricalData()).rejects.toThrow('JSON loading failed')
    })

    it('should prevent multiple simultaneous loads', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      
      // Mock a slow loading process
      let resolveLoad: (value: HistoricalDataPoint[]) => void
      const loadPromise = new Promise<HistoricalDataPoint[]>((resolve) => {
        resolveLoad = resolve
      })
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockReturnValueOnce(loadPromise)

      // Start two loads simultaneously
      const load1Promise = centralizedDataService.loadHistoricalData()
      const load2Promise = centralizedDataService.loadHistoricalData()

      // Resolve the mock
      resolveLoad!(mockHistoricalData)

      const [result1, result2] = await Promise.all([load1Promise, load2Promise])

      expect(bitcoinJsonDataService.loadHistoricalData).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })
  })

  describe('getCurrentPrice', () => {
    it('should continue using live API for current price', async () => {
      const { enhancedBitcoinApiService } = await import('../bitcoin-api-service')
      vi.mocked(enhancedBitcoinApiService.fetchCurrentPrice).mockResolvedValueOnce({
        success: true,
        data: [{
          close: 45000,
          timestamp: Date.now(),
          open: 44000,
          high: 46000,
          low: 43000,
          volume: 1000,
          date: '2024-01-01',
          source: 'test'
        }],
        source: 'test-api'
      })

      const result = await centralizedDataService.getCurrentPrice()

      expect(enhancedBitcoinApiService.fetchCurrentPrice).toHaveBeenCalled()
      expect(result.price).toBe(45000)
      expect(result.source).toBe('test-api')
    })
  })

  describe('state management', () => {
    it('should maintain existing state structure', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      await centralizedDataService.loadHistoricalData()

      const state = centralizedDataService.getState()
      
      expect(state.historicalData).toEqual(mockHistoricalData)
      expect(state.isHistoricalDataLoaded).toBe(true)
      expect(state.isLoadingHistoricalData).toBe(false)
    })

    it('should notify subscribers of data changes', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      const mockSubscriber = vi.fn()
      centralizedDataService.subscribe(mockSubscriber)

      await centralizedDataService.loadHistoricalData()

      expect(mockSubscriber).toHaveBeenCalled()
    })
  })

  describe('backward compatibility', () => {
    it('should maintain identical interface for existing consumers', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      // Test that all existing methods are still available
      expect(typeof centralizedDataService.loadHistoricalData).toBe('function')
      expect(typeof centralizedDataService.getCurrentPrice).toBe('function')
      expect(typeof centralizedDataService.getState).toBe('function')
      expect(typeof centralizedDataService.subscribe).toBe('function')
      expect(typeof centralizedDataService.unsubscribe).toBe('function')
      expect(typeof centralizedDataService.clearState).toBe('function')

      // Test that the interface works as expected
      const result = await centralizedDataService.loadHistoricalData()
      expect(result).toEqual(mockHistoricalData)
    })

    it('should return data in the same format as before', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockResolvedValueOnce(mockHistoricalData)

      const result = await centralizedDataService.loadHistoricalData()

      // Verify the data structure matches HistoricalDataPoint interface
      expect(result[0]).toHaveProperty('time')
      expect(result[0]).toHaveProperty('close')
      expect(result[0]).toHaveProperty('open')
      expect(result[0]).toHaveProperty('high')
      expect(result[0]).toHaveProperty('low')
      expect(result[0]).toHaveProperty('volume')
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('source')
      
      expect(typeof result[0].time).toBe('number')
      expect(typeof result[0].close).toBe('number')
    })
  })

  describe('error handling', () => {
    it('should handle JSON service errors and maintain error state', async () => {
      const { bitcoinJsonDataService } = await import('../bitcoin-json-data-service')
      vi.mocked(bitcoinJsonDataService.loadHistoricalData).mockRejectedValueOnce(new Error('Network error'))

      await expect(centralizedDataService.loadHistoricalData()).rejects.toThrow('Network error')

      const state = centralizedDataService.getState()
      expect(state.errors).toContain('Failed to load historical data: Network error')
      expect(state.isLoadingHistoricalData).toBe(false)
    })
  })
})
