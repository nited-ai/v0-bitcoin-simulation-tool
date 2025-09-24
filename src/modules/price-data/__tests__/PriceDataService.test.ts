/**
 * PriceDataService Tests
 *
 * Comprehensive test suite for the main PriceDataService.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PriceDataService } from '../services/PriceDataService'
import type { PriceEngineParams, HistoricalDataPoint } from '../types'
import { createTestEnvironment } from './helpers/mockServices'

// Mock the external dependencies
vi.mock('../../../lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    loadHistoricalData: vi.fn(),
  }
}))

vi.mock('../../../lib/services/bitcoin-api-service', () => ({
  enhancedBitcoinApiService: {
    getCurrentPrice: vi.fn(),
  }
}))

describe('PriceDataService', () => {
  let service: PriceDataService
  let testEnv: ReturnType<typeof createTestEnvironment>

  beforeEach(() => {
    // Setup test environment with mocks
    testEnv = createTestEnvironment()

    // Reset singleton instance before each test
    ;(PriceDataService as any).instance = null
    service = PriceDataService.getInstance()
  })

  afterEach(() => {
    testEnv.cleanup()
    vi.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PriceDataService.getInstance()
      const instance2 = PriceDataService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('loadHistoricalData', () => {
    const mockHistoricalData: HistoricalDataPoint[] = [
      {
        time: 1609459200, // 2021-01-01
        date: '2021-01-01',
        open: 29000,
        high: 30000,
        low: 28000,
        close: 29500,
        source: 'test'
      },
      {
        time: 1609545600, // 2021-01-02
        date: '2021-01-02',
        open: 29500,
        high: 31000,
        low: 29000,
        close: 30500,
        source: 'test'
      }
    ]

    it('should load historical data successfully', async () => {
      // Use the mocked service from test environment
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataSuccess(mockHistoricalData)

      const result = await service.loadHistoricalData()

      expect(result).toEqual(mockHistoricalData)
      expect(testEnv.mocks.centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(1)
    })

    it('should handle loading errors', async () => {
      const error = new Error('Failed to load data')
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataError(error)

      await expect(service.loadHistoricalData()).rejects.toThrow('Failed to load data')
    })

    it('should use cache when available', async () => {
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataSuccess(mockHistoricalData)

      // First call should load from service
      const result1 = await service.loadHistoricalData({ useCache: true })
      expect(result1).toEqual(mockHistoricalData)
      expect(centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await service.loadHistoricalData({ useCache: true })
      expect(result2).toEqual(mockHistoricalData)
      expect(testEnv.mocks.centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should bypass cache when useCache is false', async () => {
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataSuccess(mockHistoricalData)

      // First call
      await service.loadHistoricalData({ useCache: true })
      expect(testEnv.mocks.centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(1)

      // Second call with useCache: false should bypass cache
      await service.loadHistoricalData({ useCache: false })
      expect(testEnv.mocks.centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(2)
    })
  })

  describe('getCurrentPrice', () => {
    it('should fetch current price successfully', async () => {
      const mockPrice = 45000
      testEnv.mocks.enhancedBitcoinApiService.mockGetCurrentPriceSuccess(mockPrice)

      const result = await service.getCurrentPrice()

      expect(result).toBe(mockPrice)
      expect(testEnv.mocks.enhancedBitcoinApiService.getCurrentPrice).toHaveBeenCalledTimes(1)
    })

    it('should handle price fetch errors', async () => {
      const error = new Error('API error')
      testEnv.mocks.enhancedBitcoinApiService.mockGetCurrentPriceError(error)

      await expect(service.getCurrentPrice()).rejects.toThrow('API error')
    })

    it('should validate price data', async () => {
      testEnv.mocks.enhancedBitcoinApiService.getCurrentPrice.mockResolvedValue(null as any)

      await expect(service.getCurrentPrice()).rejects.toThrow('Invalid price data received')
    })

    it('should use cache for current price', async () => {
      const mockPrice = 45000
      testEnv.mocks.enhancedBitcoinApiService.mockGetCurrentPriceSuccess(mockPrice)

      // First call should fetch from API
      const result1 = await service.getCurrentPrice({ useCache: true })
      expect(result1).toBe(mockPrice)
      expect(enhancedBitcoinApiService.getCurrentPrice).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await service.getCurrentPrice({ useCache: true })
      expect(result2).toBe(mockPrice)
      expect(testEnv.mocks.enhancedBitcoinApiService.getCurrentPrice).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should bypass cache when preferLive is true', async () => {
      const mockPrice = 45000
      testEnv.mocks.enhancedBitcoinApiService.mockGetCurrentPriceSuccess(mockPrice)

      // First call with cache
      await service.getCurrentPrice({ useCache: true })
      expect(testEnv.mocks.enhancedBitcoinApiService.getCurrentPrice).toHaveBeenCalledTimes(1)

      // Second call with preferLive should bypass cache
      await service.getCurrentPrice({ preferLive: true, useCache: true })
      expect(testEnv.mocks.enhancedBitcoinApiService.getCurrentPrice).toHaveBeenCalledTimes(2)
    })
  })

  describe('generatePriceProjection', () => {
    const mockParams: PriceEngineParams = {
      priceModel: 'manual',
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [10, 15, 20],
      powerLawSettings: {
        prognosisLine: 'fit'
      }
    }

    const mockHistoricalData: HistoricalDataPoint[] = [
      {
        time: 1609459200,
        date: '2021-01-01',
        open: 29000,
        high: 30000,
        low: 28000,
        close: 29500,
        source: 'test'
      }
    ]

    it('should generate price projection successfully', async () => {
      const result = await service.generatePriceProjection(mockParams, mockHistoricalData)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      
      // Check that result has proper structure
      const firstPoint = result[0]
      expect(firstPoint).toHaveProperty('date')
      expect(firstPoint).toHaveProperty('days')
      expect(typeof firstPoint.date).toBe('string')
      expect(typeof firstPoint.days).toBe('number')
    })

    it('should handle projection generation errors', async () => {
      const invalidParams = { ...mockParams, priceModel: 'invalid' as any }

      await expect(service.generatePriceProjection(invalidParams, mockHistoricalData))
        .rejects.toThrow()
    })

    it('should load historical data if not provided', async () => {
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataSuccess(mockHistoricalData)

      const result = await service.generatePriceProjection(mockParams)

      expect(result).toBeDefined()
      expect(testEnv.mocks.centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cache Management', () => {
    it('should clear cache successfully', () => {
      expect(() => service.clearCache()).not.toThrow()
    })

    it('should return cache stats', () => {
      const stats = service.getCacheStats()

      expect(stats).toHaveProperty('hitRate')
      expect(stats).toHaveProperty('totalRequests')
      expect(stats).toHaveProperty('cacheHits')
      expect(stats).toHaveProperty('cacheMisses')
      expect(stats).toHaveProperty('cacheSize')
      expect(stats).toHaveProperty('lastUpdated')

      expect(typeof stats.hitRate).toBe('number')
      expect(typeof stats.totalRequests).toBe('number')
      expect(typeof stats.cacheHits).toBe('number')
      expect(typeof stats.cacheMisses).toBe('number')
      expect(typeof stats.cacheSize).toBe('number')
      expect(stats.lastUpdated instanceof Date).toBe(true)
    })
  })

  describe('Data Validation', () => {
    it('should validate historical data correctly', () => {
      const validData: HistoricalDataPoint[] = [
        {
          time: 1609459200,
          date: '2021-01-01',
          open: 29000,
          high: 30000,
          low: 28000,
          close: 29500,
          source: 'test'
        }
      ]

      const result = service.validateHistoricalData(validData)
      expect(result).toBe(true)
    })

    it('should reject invalid historical data', () => {
      const invalidData = [
        { time: 'invalid', close: -100 }
      ] as any

      const result = service.validateHistoricalData(invalidData)
      expect(result).toBe(false)
    })

    it('should reject empty data', () => {
      const result = service.validateHistoricalData([])
      expect(result).toBe(false)
    })

    it('should reject null data', () => {
      const result = service.validateHistoricalData(null as any)
      expect(result).toBe(false)
    })
  })

  describe('Performance Metrics', () => {
    it('should return performance metrics', () => {
      const metrics = service.getPerformanceMetrics()
      expect(metrics).toBeDefined()
      expect(metrics instanceof Map).toBe(true)
    })
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataSuccess([])

      await expect(service.initialize()).resolves.not.toThrow()
      expect(testEnv.mocks.centralizedDataService.loadHistoricalData).toHaveBeenCalledTimes(1)
    })

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed')
      testEnv.mocks.centralizedDataService.mockLoadHistoricalDataError(error)

      await expect(service.initialize()).rejects.toThrow('Initialization failed')
    })
  })
})
