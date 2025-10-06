/**
 * JSON-Only Daily Update Service Tests
 * 
 * Tests for the JSON-only daily update service that updates Bitcoin price data
 * directly to JSON files without database dependencies.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { JsonOnlyDailyUpdateService } from '../json-only-daily-update-service'
import { enhancedBitcoinApiService } from '../bitcoin-api-service'
import { athService } from '../ath-service'
import * as fs from 'fs/promises'
import * as path from 'path'

// Mock dependencies
vi.mock('../bitcoin-api-service')
vi.mock('../ath-service')
vi.mock('fs/promises')

describe('JsonOnlyDailyUpdateService', () => {
  let service: JsonOnlyDailyUpdateService
  const mockEnhancedBitcoinApiService = enhancedBitcoinApiService as any
  const mockAthService = athService as any
  const mockFs = fs as any

  const mockPriceData = {
    timestamp: 1759738869931,
    date: '2025-10-06',
    open: 123000,
    high: 124000,
    low: 122000,
    close: 123500,
    volume: 1000000,
    source: 'CoinGecko'
  }

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

  beforeEach(() => {
    service = new (JsonOnlyDailyUpdateService as any)()
    vi.clearAllMocks()

    // Mock successful API response
    mockEnhancedBitcoinApiService.fetchCurrentPrice.mockResolvedValue({
      success: true,
      data: [mockPriceData],
      source: 'CoinGecko'
    })

    // Mock ATH service
    mockAthService.checkAndUpdateATH.mockResolvedValue(false)

    // Mock file system operations
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue(JSON.stringify(mockExistingDailyData))
    mockFs.writeFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('performUpdate', () => {
    it('should successfully fetch current price and update JSON files', async () => {
      const result = await service.performUpdate()

      expect(result.success).toBe(true)
      expect(result.currentPriceUpdated).toBe(true)
      expect(result.currentPrice).toBe(123500)
      expect(result.jsonFilesUpdated).toContain('daily.json')
      expect(result.jsonFilesUpdated).toContain('weekly.json')
      expect(result.jsonFilesUpdated).toContain('monthly.json')
      expect(result.jsonFilesUpdated).toContain('current-price.json')
      expect(result.errors).toHaveLength(0)
    })

    it('should handle API failure gracefully', async () => {
      mockEnhancedBitcoinApiService.fetchCurrentPrice.mockResolvedValue({
        success: false,
        data: [],
        source: 'none',
        error: 'All APIs failed'
      })

      const result = await service.performUpdate()

      expect(result.success).toBe(false)
      expect(result.currentPriceUpdated).toBe(false)
      expect(result.errors).toContain('Failed to fetch current price from external APIs')
    })

    it('should detect and update ATH when current price is higher', async () => {
      mockAthService.checkAndUpdateATH.mockResolvedValue(true)

      const result = await service.performUpdate()

      expect(result.athUpdated).toBe(true)
      expect(result.newATH).toBe(123500)
      expect(result.jsonFilesUpdated).toContain('ath.json')
      expect(mockAthService.checkAndUpdateATH).toHaveBeenCalledWith(123500)
    })

    it('should handle file system errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'))

      const result = await service.performUpdate()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('updateDailyJsonFile', () => {
    it('should create new daily data file when none exists', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      await service.updateDailyJsonFile(mockPriceData)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('daily.json'),
        expect.stringContaining('"count": 1')
      )
    })

    it('should append new data to existing daily file', async () => {
      await service.updateDailyJsonFile(mockPriceData)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('daily.json'),
        expect.stringContaining('"count": 2')
      )
    })

    it('should update existing entry for the same date', async () => {
      // Mock existing data with same date as mockPriceData
      const existingDataSameDate = {
        meta: {
          startDate: '2025-10-06',
          endDate: '2025-10-06',
          interval: 'daily',
          count: 1,
          lastUpdated: '2025-10-05T12:00:00.000Z'
        },
        data: [[mockPriceData.timestamp, 120000]] // Same timestamp, different price
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingDataSameDate))

      const sameDateData = { ...mockPriceData, close: 125000 }

      await service.updateDailyJsonFile(sameDateData)

      const writeCall = mockFs.writeFile.mock.calls[0]
      const writtenData = JSON.parse(writeCall[1])

      expect(writtenData.meta.count).toBe(1) // Should not increase count
      expect(writtenData.data[0][1]).toBe(125000) // Should update price
    })
  })

  describe('updateAggregatedJsonFiles', () => {
    it('should generate weekly and monthly aggregated data', async () => {
      const largeDailyData = {
        ...mockExistingDailyData,
        data: Array.from({ length: 100 }, (_, i) => [
          1759652469931 + i * 24 * 60 * 60 * 1000,
          122000 + i * 100
        ])
      }
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(largeDailyData))

      await service.updateAggregatedJsonFiles()

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

  describe('checkAndUpdateATH', () => {
    it('should update ATH JSON file when new ATH is detected', async () => {
      mockAthService.checkAndUpdateATH.mockResolvedValue(true)

      const result = await service.checkAndUpdateATH(125000, '2025-10-06')

      expect(result.updated).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ath.json'),
        expect.stringContaining('"value": 125000')
      )
    })

    it('should not update ATH JSON file when price is not new ATH', async () => {
      mockAthService.checkAndUpdateATH.mockResolvedValue(false)

      const result = await service.checkAndUpdateATH(120000, '2025-10-06')

      expect(result.updated).toBe(false)
    })

    it('should handle ATH service errors', async () => {
      mockAthService.checkAndUpdateATH.mockRejectedValue(new Error('ATH service error'))

      const result = await service.checkAndUpdateATH(125000, '2025-10-06')

      expect(result.updated).toBe(false)
      expect(result.error).toContain('ATH service error')
    })
  })

  describe('updateCurrentPriceJsonFile', () => {
    it('should create current price JSON file with correct structure', async () => {
      await service.updateCurrentPriceJsonFile(mockPriceData)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('current-price.json'),
        expect.stringMatching(/"price": 123500/)
      )
    })
  })

  describe('service lifecycle', () => {
    it('should start service and schedule updates', async () => {
      vi.spyOn(service, 'performUpdate').mockResolvedValue({
        success: true,
        currentPriceUpdated: true,
        athUpdated: false,
        jsonFilesUpdated: ['daily.json'],
        errors: [],
        duration: 1000
      })

      await service.start()

      expect(service.getStatus().isRunning).toBe(true)
      expect(service.performUpdate).toHaveBeenCalled()
    })

    it('should stop service and clear intervals', async () => {
      await service.start()
      await service.stop()

      expect(service.getStatus().isRunning).toBe(false)
    })

    it('should not start service twice', async () => {
      await service.start()
      const consoleSpy = vi.spyOn(console, 'log')
      
      await service.start()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      )
    })
  })

  describe('error handling', () => {
    it('should handle directory creation errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'))

      await expect(service.start()).rejects.toThrow('Permission denied')
    })

    it('should continue operation when some JSON files fail to update', async () => {
      mockFs.writeFile
        .mockResolvedValueOnce(undefined) // daily.json succeeds
        .mockRejectedValueOnce(new Error('Weekly file error')) // weekly.json fails
        .mockResolvedValueOnce(undefined) // monthly.json succeeds
        .mockResolvedValueOnce(undefined) // current-price.json succeeds

      const result = await service.performUpdate()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.jsonFilesUpdated).toContain('daily.json')
    })
  })

  describe('data validation', () => {
    it('should validate price data before processing', async () => {
      // Mock API returning no data (empty array)
      mockEnhancedBitcoinApiService.fetchCurrentPrice.mockResolvedValue({
        success: true,
        data: [], // Empty data array should cause validation failure
        source: 'CoinGecko'
      })

      const result = await service.performUpdate()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to fetch current price from external APIs')
    })
  })
})
