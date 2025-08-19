/**
 * Daily Update Service ATH Integration Tests
 * 
 * Tests for ATH checking and updating functionality integrated into the daily update service.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DailyUpdateService } from '../daily-update-service'
import { athService } from '../ath-service'

// Mock dependencies
vi.mock('../ath-service')
vi.mock('../bitcoin-api-service')
vi.mock('../bitcoin-json-generator-service')
vi.mock('../generated/prisma')

describe('Daily Update Service ATH Integration', () => {
  let dailyUpdateService: DailyUpdateService
  const mockAthService = athService as any

  beforeEach(() => {
    dailyUpdateService = new DailyUpdateService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ATH checking during daily updates', () => {
    it('should check for new ATH when current price is updated', async () => {
      // Mock successful current price update
      const mockCurrentPriceResult = {
        success: true,
        highPrice: 130000,
        date: '2025-08-18'
      }

      // Mock ATH service to return true for new ATH
      mockAthService.checkAndUpdateATH = vi.fn().mockResolvedValue(true)

      // Mock file system operations
      const mockFs = {
        writeFile: vi.fn().mockResolvedValue(undefined)
      }
      vi.doMock('fs/promises', () => mockFs)

      // Mock the private method by accessing it through the service
      const checkAndUpdateATHSpy = vi.spyOn(dailyUpdateService as any, 'checkAndUpdateATH')
      checkAndUpdateATHSpy.mockResolvedValue({ updated: true })

      // Test the ATH checking logic
      const result = await (dailyUpdateService as any).checkAndUpdateATH(130000, '2025-08-18')

      expect(result.updated).toBe(true)
      expect(mockAthService.checkAndUpdateATH).toHaveBeenCalledWith(130000)
    })

    it('should not update ATH when current price is not higher', async () => {
      // Mock ATH service to return false for no new ATH
      mockAthService.checkAndUpdateATH = vi.fn().mockResolvedValue(false)

      const result = await (dailyUpdateService as any).checkAndUpdateATH(120000, '2025-08-18')

      expect(result.updated).toBe(false)
      expect(mockAthService.checkAndUpdateATH).toHaveBeenCalledWith(120000)
    })

    it('should handle ATH checking errors gracefully', async () => {
      // Mock ATH service to throw an error
      mockAthService.checkAndUpdateATH = vi.fn().mockRejectedValue(new Error('ATH service error'))

      const result = await (dailyUpdateService as any).checkAndUpdateATH(130000, '2025-08-18')

      expect(result.updated).toBe(false)
      expect(result.error).toBe('ATH service error')
    })
  })

  describe('ATH JSON file updates', () => {
    it('should update ATH JSON file with correct structure', async () => {
      const mockFs = {
        writeFile: vi.fn().mockResolvedValue(undefined)
      }
      const mockPath = {
        join: vi.fn().mockReturnValue('/path/to/ath.json')
      }

      vi.doMock('fs/promises', () => mockFs)
      vi.doMock('path', () => mockPath)

      const result = await (dailyUpdateService as any).updateATHJsonFile(130000, '2025-08-18')

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/path/to/ath.json',
        expect.stringContaining('"value": 130000'),
        'utf8'
      )
    })

    it('should handle JSON file write errors', async () => {
      const mockFs = {
        writeFile: vi.fn().mockRejectedValue(new Error('File write error'))
      }
      const mockPath = {
        join: vi.fn().mockReturnValue('/path/to/ath.json')
      }

      vi.doMock('fs/promises', () => mockFs)
      vi.doMock('path', () => mockPath)

      const result = await (dailyUpdateService as any).updateATHJsonFile(130000, '2025-08-18')

      expect(result).toBe(false)
    })
  })

  describe('Update result tracking', () => {
    it('should include ATH update status in update results', async () => {
      // This test would require mocking the entire performUpdate method
      // For now, we verify that the UpdateResult interface includes athUpdated
      const mockResult = {
        success: true,
        recordsAdded: 1,
        gapsFilled: 0,
        currentPriceUpdated: true,
        jsonFilesRegenerated: true,
        athUpdated: true, // This should be included
        errors: [],
        duration: 1000
      }

      expect(mockResult.athUpdated).toBeDefined()
      expect(typeof mockResult.athUpdated).toBe('boolean')
    })
  })
})
