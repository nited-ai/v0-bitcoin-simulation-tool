/**
 * JSON Historical Backfill Service Tests
 * 
 * Tests for the JSON historical backfill service that populates missing
 * Bitcoin price data directly to JSON files without database dependencies.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { JsonHistoricalBackfillService } from '../json-historical-backfill-service'
import { enhancedBitcoinApiService } from '../bitcoin-api-service'
import * as fs from 'fs/promises'

// Mock dependencies
vi.mock('../bitcoin-api-service')
vi.mock('fs/promises')

describe('JsonHistoricalBackfillService', () => {
  let service: JsonHistoricalBackfillService
  const mockEnhancedBitcoinApiService = enhancedBitcoinApiService as any
  const mockFs = fs as any

  const mockHistoricalData = [
    {
      date: '2025-08-19',
      timestamp: 1755562018562,
      close: 113170,
      high: 113500,
      open: 112800,
      low: 112500,
      volume: 1000000
    },
    {
      date: '2025-08-20',
      timestamp: 1755648144721,
      close: 114250,
      high: 114800,
      open: 113200,
      low: 113000,
      volume: 1100000
    },
    {
      date: '2025-08-21',
      timestamp: 1755734270880,
      close: 115300,
      high: 115800,
      open: 114300,
      low: 114000,
      volume: 1200000
    }
  ]

  const mockExistingDailyData = {
    meta: {
      startDate: '2025-10-05',
      endDate: '2025-10-05',
      interval: 'daily',
      count: 1,
      lastUpdated: '2025-10-05T12:00:00.000Z'
    },
    data: [[1759652469931, 122000]]
  }

  const mockATHData = {
    meta: {
      lastUpdated: '2025-08-18T12:00:00.000Z',
      source: 'manual',
      version: '1.0.0'
    },
    ath: {
      value: 124277.98,
      date: '2024-03-14',
      timestamp: 1710374400000,
      source: 'historical'
    }
  }

  beforeEach(() => {
    service = new (JsonHistoricalBackfillService as any)()
    vi.clearAllMocks()

    // Mock successful API response
    mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
      success: true,
      data: mockHistoricalData,
      source: 'CoinGecko'
    })

    // Mock file system operations
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.readFile
      .mockResolvedValueOnce(JSON.stringify(mockExistingDailyData)) // daily.json
      .mockResolvedValueOnce(JSON.stringify(mockATHData)) // ath.json
    mockFs.writeFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('backfillDateRange', () => {
    it('should successfully backfill historical data for date range', async () => {
      const result = await service.backfillDateRange('2025-08-19', '2025-08-21')

      expect(result.success).toBe(true)
      expect(result.recordsAdded).toBe(3)
      expect(result.dateRange.startDate).toBe('2025-08-19')
      expect(result.dateRange.endDate).toBe('2025-08-21')
      expect(result.errors).toHaveLength(0)
    })

    it('should handle API failure gracefully', async () => {
      mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
        success: false,
        data: [],
        source: 'none',
        error: 'All APIs failed'
      })

      const result = await service.backfillDateRange('2025-08-19', '2025-08-21')

      expect(result.success).toBe(false)
      expect(result.recordsAdded).toBe(0)
      expect(result.errors).toContain('No historical data retrieved from APIs')
    })

    it('should detect and update ATH during backfill', async () => {
      const highPriceData = [
        ...mockHistoricalData,
        {
          date: '2025-08-22',
          timestamp: 1755820397039,
          close: 125500,
          high: 126000,
          open: 125000,
          low: 124800,
          volume: 1300000
        }
      ]

      mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
        success: true,
        data: highPriceData,
        source: 'CoinGecko'
      })

      const result = await service.backfillDateRange('2025-08-19', '2025-08-22')

      expect(result.athUpdated).toBe(true)
      expect(result.newATH).toBe(126000) // Should use the high price
    })

    it('should not update ATH when no higher prices found', async () => {
      const lowPriceData = mockHistoricalData.map(item => ({
        ...item,
        close: 120000,
        high: 120500
      }))

      mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
        success: true,
        data: lowPriceData,
        source: 'CoinGecko'
      })

      const result = await service.backfillDateRange('2025-08-19', '2025-08-21')

      expect(result.athUpdated).toBe(false)
      expect(result.newATH).toBeUndefined()
    })
  })

  describe('backfillMissingData', () => {
    it('should backfill data from August 19, 2025 to current date', async () => {
      const result = await service.backfillMissingData()

      expect(result.success).toBe(true)
      expect(result.dateRange.startDate).toBe('2025-08-19')
      expect(result.dateRange.endDate).toBe(new Date().toISOString().split('T')[0])
      expect(mockEnhancedBitcoinApiService.fetchHistoricalData).toHaveBeenCalledWith(
        '2025-08-19',
        expect.any(String)
      )
    })
  })

  describe('fetchHistoricalDataFromAPIs', () => {
    it('should fetch and format historical data correctly', async () => {
      const result = await service.fetchHistoricalDataFromAPIs('2025-08-19', '2025-08-21')

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        timestamp: 1755562018562,
        date: '2025-08-19',
        close: 113170,
        high: 113500
      })
    })

    it('should sort historical data by date', async () => {
      const unsortedData = [mockHistoricalData[2], mockHistoricalData[0], mockHistoricalData[1]]
      
      mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
        success: true,
        data: unsortedData,
        source: 'CoinGecko'
      })

      const result = await service.fetchHistoricalDataFromAPIs('2025-08-19', '2025-08-21')

      expect(result[0].date).toBe('2025-08-19')
      expect(result[1].date).toBe('2025-08-20')
      expect(result[2].date).toBe('2025-08-21')
    })

    it('should handle API errors', async () => {
      mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
        success: false,
        data: [],
        source: 'none',
        error: 'API error'
      })

      await expect(service.fetchHistoricalDataFromAPIs('2025-08-19', '2025-08-21'))
        .rejects.toThrow('Failed to fetch historical data from external APIs')
    })
  })

  describe('loadExistingDailyData', () => {
    it('should load existing daily data from JSON file', async () => {
      const result = await service.loadExistingDailyData()

      expect(result).toEqual([[1759652469931, 122000]])
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('daily.json'),
        'utf8'
      )
    })

    it('should return empty array when no existing data', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const result = await service.loadExistingDailyData()

      expect(result).toEqual([])
    })
  })

  describe('mergeHistoricalData', () => {
    it('should merge new data with existing data without duplicates', async () => {
      const existingData: [number, number][] = [[1759652469931, 122000]]
      const newData = mockHistoricalData

      const result = await service.mergeHistoricalData(existingData, newData)

      expect(result).toHaveLength(4) // 1 existing + 3 new
      expect(result[0][1]).toBe(113170) // First should be earliest date
      expect(result[3][1]).toBe(122000) // Last should be latest date
    })

    it('should avoid duplicate entries for same date', async () => {
      const existingData: [number, number][] = [[1755562018562, 112000]]
      const newData = [mockHistoricalData[0]] // Same date as existing

      const result = await service.mergeHistoricalData(existingData, newData)

      expect(result).toHaveLength(1) // Should not add duplicate
      expect(result[0][1]).toBe(112000) // Should keep existing value
    })

    it('should sort merged data by timestamp', async () => {
      const existingData: [number, number][] = [[1755734270880, 115000]] // Latest date
      const newData = [mockHistoricalData[0], mockHistoricalData[1]] // Earlier dates

      const result = await service.mergeHistoricalData(existingData, newData)

      expect(result[0][0]).toBeLessThan(result[1][0])
      expect(result[1][0]).toBeLessThan(result[2][0])
    })
  })

  describe('updateDailyJsonFile', () => {
    it('should update daily JSON file with merged data', async () => {
      const testData: [number, number][] = [
        [1755562018562, 113170],
        [1755648144721, 114250]
      ]

      await service.updateDailyJsonFile(testData)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('daily.json'),
        expect.stringContaining('"count": 2')
      )
    })
  })

  describe('updateAggregatedJsonFiles', () => {
    it('should generate weekly and monthly aggregated files', async () => {
      const testData: [number, number][] = Array.from({ length: 100 }, (_, i) => [
        1755562018562 + i * 24 * 60 * 60 * 1000,
        113000 + i * 100
      ])

      await service.updateAggregatedJsonFiles(testData)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('weekly.json'),
        expect.any(String)
      )
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('monthly.json'),
        expect.any(String)
      )
    })
  })

  describe('checkForNewATHInData', () => {
    it('should detect new ATH in historical data', async () => {
      const highPriceData = [
        {
          timestamp: 1755562018562,
          date: '2025-08-19',
          close: 125000,
          high: 126000
        }
      ]

      const result = await service.checkForNewATHInData(highPriceData)

      expect(result.updated).toBe(true)
      expect(result.newATH).toBe(126000)
    })

    it('should not update ATH when prices are lower', async () => {
      const lowPriceData = [
        {
          timestamp: 1755562018562,
          date: '2025-08-19',
          close: 120000,
          high: 120500
        }
      ]

      const result = await service.checkForNewATHInData(lowPriceData)

      expect(result.updated).toBe(false)
      expect(result.newATH).toBeUndefined()
    })

    it('should handle missing ATH file gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ATH file not found'))

      const highPriceData = [
        {
          timestamp: 1755562018562,
          date: '2025-08-19',
          close: 125000,
          high: 126000
        }
      ]

      const result = await service.checkForNewATHInData(highPriceData)

      expect(result.updated).toBe(true) // Should use fallback ATH value
      expect(result.newATH).toBe(126000)
    })
  })

  describe('error handling', () => {
    it('should handle file system errors during backfill', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'))

      const result = await service.backfillDateRange('2025-08-19', '2025-08-21')

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Disk full'))
    })

    it('should handle directory creation errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'))

      const result = await service.backfillDateRange('2025-08-19', '2025-08-21')

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Permission denied'))
    })
  })

  describe('data integrity', () => {
    it('should validate historical data format', async () => {
      const invalidData = [
        {
          date: '2025-08-19',
          // Missing required fields
          close: 113170
        }
      ]

      mockEnhancedBitcoinApiService.fetchHistoricalData.mockResolvedValue({
        success: true,
        data: invalidData,
        source: 'CoinGecko'
      })

      const result = await service.backfillDateRange('2025-08-19', '2025-08-19')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
