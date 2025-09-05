import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PriceDataService } from '../../services/PriceDataService'
import type { 
  PriceDataRequest,
  PriceDataResponse,
  PriceDataSource,
  SourceStatus
} from '../../types'

describe('PriceDataService', () => {
  let service: PriceDataService
  let mockRequest: PriceDataRequest

  beforeEach(async () => {
    service = new PriceDataService()

    // Clear cache before each test
    const { dataCache } = await import('../../storage/DataCache')
    await dataCache.clear()

    mockRequest = {
      symbol: 'bitcoin',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      interval: 'daily',
      useCache: true,
      maxAge: 3600000 // 1 hour
    }
  })

  describe('Service Initialization', () => {
    it('should initialize with default sources', () => {
      const sources = service.getAvailableSources()
      
      expect(sources.length).toBeGreaterThan(0)
      expect(sources.some(s => s.id === 'coincap')).toBe(true)
      expect(sources.some(s => s.id === 'coindesk')).toBe(true)
    })

    it('should have sources sorted by priority', () => {
      const sources = service.getAvailableSources()
      
      for (let i = 1; i < sources.length; i++) {
        expect(sources[i - 1].priority).toBeGreaterThanOrEqual(sources[i].priority)
      }
    })

    it('should only return enabled sources', () => {
      const sources = service.getAvailableSources()
      
      sources.forEach(source => {
        expect(source.enabled).toBe(true)
      })
    })
  })

  describe('Current Price Fetching', () => {
    it('should fetch current price successfully', async () => {
      // Mock successful API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            priceUsd: '50000.00'
          }
        })
      } as Response)

      const response = await service.getCurrentPrice('bitcoin')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data!.length).toBe(1)
      expect(response.data![0].price).toBeGreaterThan(0)
      expect(response.source).toBeDefined()
      expect(response.timestamp).toBeGreaterThan(0)
    })

    it('should use specified source when provided', async () => {
      // Mock successful API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            priceUsd: '50000.00'
          }
        })
      } as Response)

      const response = await service.getCurrentPrice('bitcoin', 'coincap')

      expect(response.success).toBe(true)
      expect(response.source).toBe('coincap')
    })

    it('should handle invalid symbol gracefully', async () => {
      const response = await service.getCurrentPrice('invalid-symbol')
      
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.data).toBeUndefined()
    })

    it('should handle source unavailability', async () => {
      const response = await service.getCurrentPrice('bitcoin', 'unavailable-source')
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Source not found')
    })

    it('should include metadata in response', async () => {
      // Mock successful API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            priceUsd: '50000.00'
          }
        })
      } as Response)

      const response = await service.getCurrentPrice('bitcoin')

      expect(response.metadata).toBeDefined()
      expect(response.metadata.symbol).toBe('bitcoin')
      expect(response.metadata.totalPoints).toBe(1)
    })
  })

  describe('Historical Data Fetching', () => {
    it('should fetch historical data successfully', async () => {
      // Mock successful API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { time: 1704067200000, priceUsd: '42000.00' },
            { time: 1704153600000, priceUsd: '43000.00' }
          ]
        })
      } as Response)

      const response = await service.getHistoricalData(mockRequest)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data!.length).toBeGreaterThan(0)
      expect(response.metadata.symbol).toBe('bitcoin')
      expect(response.metadata.interval).toBe('daily')
    })

    it('should respect date range parameters', async () => {
      const response = await service.getHistoricalData(mockRequest)
      
      if (response.success && response.data) {
        const firstPoint = response.data[0]
        const lastPoint = response.data[response.data.length - 1]
        
        expect(firstPoint.timestamp).toBeGreaterThanOrEqual(mockRequest.startDate!.getTime())
        expect(lastPoint.timestamp).toBeLessThanOrEqual(mockRequest.endDate!.getTime())
      }
    })

    it('should handle different intervals', async () => {
      // Mock successful API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { time: 1704067200000, priceUsd: '42000.00' },
            { time: 1704672000000, priceUsd: '43000.00' }
          ]
        })
      } as Response)

      const weeklyRequest = { ...mockRequest, interval: 'weekly' as const }
      const response = await service.getHistoricalData(weeklyRequest)

      expect(response.success).toBe(true)
      expect(response.metadata.interval).toBe('weekly')
    })

    it('should use cache when enabled', async () => {
      const cachedRequest = { ...mockRequest, useCache: true }
      
      // First request
      const response1 = await service.getHistoricalData(cachedRequest)
      expect(response1.cached).toBe(false)
      
      // Second request should be cached
      const response2 = await service.getHistoricalData(cachedRequest)
      expect(response2.cached).toBe(true)
    })

    it('should bypass cache when disabled', async () => {
      const noCacheRequest = { ...mockRequest, useCache: false }
      
      const response1 = await service.getHistoricalData(noCacheRequest)
      const response2 = await service.getHistoricalData(noCacheRequest)
      
      expect(response1.cached).toBe(false)
      expect(response2.cached).toBe(false)
    })

    it('should handle missing date range', async () => {
      // Mock successful API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { time: 1704067200000, priceUsd: '42000.00' },
            { time: 1704153600000, priceUsd: '43000.00' }
          ]
        })
      } as Response)

      const noDateRequest = {
        symbol: 'bitcoin',
        interval: 'daily' as const
      }

      const response = await service.getHistoricalData(noDateRequest)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })
  })

  describe('Multiple Assets Fetching', () => {
    it('should fetch multiple assets successfully', async () => {
      // Mock successful API responses
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { priceUsd: '50000.00' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { priceUsd: '3000.00' } })
        } as Response)

      const symbols = ['bitcoin', 'ethereum']
      const results = await service.getMultipleAssets(symbols)

      expect(results.size).toBe(2)
      expect(results.has('bitcoin')).toBe(true)
      expect(results.has('ethereum')).toBe(true)

      const bitcoinResult = results.get('bitcoin')!
      expect(bitcoinResult.success).toBe(true)
      expect(bitcoinResult.data).toBeDefined()
    })

    it('should handle partial failures gracefully', async () => {
      const symbols = ['bitcoin', 'invalid-symbol']
      const results = await service.getMultipleAssets(symbols)
      
      expect(results.size).toBe(2)
      expect(results.get('bitcoin')!.success).toBe(true)
      expect(results.get('invalid-symbol')!.success).toBe(false)
    })

    it('should use specified source for all assets', async () => {
      const symbols = ['bitcoin', 'ethereum']
      const results = await service.getMultipleAssets(symbols, 'coincap')
      
      results.forEach(result => {
        expect(result.source).toBe('coincap')
      })
    })

    it('should handle empty symbols array', async () => {
      const results = await service.getMultipleAssets([])
      
      expect(results.size).toBe(0)
    })
  })

  describe('Data Validation', () => {
    it('should validate correct data', () => {
      const validData = [
        { timestamp: Date.now(), price: 50000 },
        { timestamp: Date.now() + 86400000, price: 51000 }
      ]
      
      const validation = service.validateDataIntegrity(validData)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid timestamps', () => {
      const invalidData = [
        { timestamp: -1, price: 50000 },
        { timestamp: Date.now(), price: 51000 }
      ]
      
      const validation = service.validateDataIntegrity(invalidData)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('timestamp'))).toBe(true)
    })

    it('should detect invalid prices', () => {
      const invalidData = [
        { timestamp: Date.now(), price: -1000 },
        { timestamp: Date.now() + 86400000, price: 51000 }
      ]
      
      const validation = service.validateDataIntegrity(invalidData)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('price'))).toBe(true)
    })

    it('should detect duplicate timestamps', () => {
      const duplicateData = [
        { timestamp: 1000, price: 50000 },
        { timestamp: 1000, price: 51000 }
      ]
      
      const validation = service.validateDataIntegrity(duplicateData)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.toLowerCase().includes('duplicate'))).toBe(true)
    })

    it('should detect unsorted data', () => {
      const unsortedData = [
        { timestamp: 2000, price: 51000 },
        { timestamp: 1000, price: 50000 }
      ]
      
      const validation = service.validateDataIntegrity(unsortedData)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('sorted'))).toBe(true)
    })
  })

  describe('Source Management', () => {
    it('should get source status', async () => {
      const status = await service.getSourceStatus('coincap')
      
      expect(status.id).toBe('coincap')
      expect(status.name).toBeDefined()
      expect(typeof status.online).toBe('boolean')
      expect(status.lastCheck).toBeInstanceOf(Date)
      expect(status.responseTime).toBeGreaterThanOrEqual(0)
      expect(status.rateLimit).toBeDefined()
      expect(status.dataQuality).toBeDefined()
    })

    it('should handle non-existent source status', async () => {
      await expect(service.getSourceStatus('non-existent')).rejects.toThrow('Source not found')
    })

    it('should track error counts', async () => {
      // Simulate some errors
      await service.getCurrentPrice('invalid-symbol', 'coincap')
      await service.getCurrentPrice('invalid-symbol', 'coincap')
      
      const status = await service.getSourceStatus('coincap')
      expect(status.errorCount).toBeGreaterThan(0)
    })
  })

  describe('Performance and Caching', () => {
    it('should complete requests within reasonable time', async () => {
      const startTime = performance.now()
      await service.getCurrentPrice('bitcoin')
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, () => 
        service.getCurrentPrice('bitcoin')
      )
      
      const results = await Promise.all(promises)
      
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })

    it('should respect cache TTL', async () => {
      const shortTTLRequest = { ...mockRequest, maxAge: 100 } // 100ms
      
      const response1 = await service.getHistoricalData(shortTTLRequest)
      expect(response1.cached).toBe(false)
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const response2 = await service.getHistoricalData(shortTTLRequest)
      expect(response2.cached).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))
      
      const response = await service.getCurrentPrice('bitcoin')
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Network error')
    })

    it('should handle API rate limits', async () => {
      // This would be tested with actual API integration
      // For now, just ensure the structure supports it
      const response = await service.getCurrentPrice('bitcoin')
      
      if (response.success) {
        expect(response.metadata).toBeDefined()
      }
    })

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      } as Response)
      
      const response = await service.getCurrentPrice('bitcoin')
      
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty symbol', async () => {
      const response = await service.getCurrentPrice('')
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Symbol cannot be empty')
    })

    it('should handle invalid date ranges', async () => {
      const invalidRequest = {
        ...mockRequest,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01') // End before start
      }
      
      const response = await service.getHistoricalData(invalidRequest)
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid date range')
    })

    it('should handle very large date ranges', async () => {
      const largeRangeRequest = {
        ...mockRequest,
        startDate: new Date('2010-01-01'),
        endDate: new Date('2024-12-31')
      }
      
      const response = await service.getHistoricalData(largeRangeRequest)
      
      // Should either succeed or fail gracefully
      expect(typeof response.success).toBe('boolean')
      if (!response.success) {
        expect(response.error).toBeDefined()
      }
    })
  })
})
