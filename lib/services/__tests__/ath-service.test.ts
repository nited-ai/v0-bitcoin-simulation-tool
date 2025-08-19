/**
 * ATH Service Tests
 *
 * Tests for the ATH (All-Time High) service that manages Bitcoin ATH data
 * from server-side JSON file with fallback to constant.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ATHService } from '../ath-service'

// Mock fetch globally
global.fetch = vi.fn()

describe('ATHService', () => {
  let athService: ATHService
  const mockFetch = fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    athService = new ATHService()
    mockFetch.mockClear()
  })

  describe('getCurrentATH', () => {
    it('should return correct initial value from JSON file', async () => {
      const mockATHData = {
        meta: {
          lastUpdated: '2025-08-18T16:06:26.679Z',
          source: 'historical_analysis',
          version: '1.0.0'
        },
        ath: {
          value: 124277.98,
          date: '2024-03-14',
          timestamp: 1710374400000
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockATHData
      } as Response)

      const ath = await athService.getCurrentATH()
      expect(ath).toBe(124277.98)
      expect(mockFetch).toHaveBeenCalledWith('/data/bitcoin/ath.json')
    })

    it('should fall back to constant when JSON file unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const ath = await athService.getCurrentATH()
      expect(ath).toBe(124277.98) // Fallback constant
    })

    it('should fall back to constant when JSON file has invalid structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' })
      } as Response)

      const ath = await athService.getCurrentATH()
      expect(ath).toBe(124277.98) // Fallback constant
    })

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      const ath = await athService.getCurrentATH()
      expect(ath).toBe(124277.98) // Fallback constant
    })
  })

  describe('checkAndUpdateATH', () => {
    it('should return false when current price is lower than ATH', async () => {
      const mockATHData = {
        meta: {
          lastUpdated: '2025-08-18T16:06:26.679Z',
          source: 'historical_analysis',
          version: '1.0.0'
        },
        ath: {
          value: 124277.98,
          date: '2024-03-14',
          timestamp: 1710374400000
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockATHData
      } as Response)

      const result = await athService.checkAndUpdateATH(120000)
      expect(result).toBe(false)
    })

    it('should return true when current price exceeds ATH', async () => {
      const mockATHData = {
        meta: {
          lastUpdated: '2025-08-18T16:06:26.679Z',
          source: 'historical_analysis',
          version: '1.0.0'
        },
        ath: {
          value: 124277.98,
          date: '2024-03-14',
          timestamp: 1710374400000
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockATHData
      } as Response)

      const result = await athService.checkAndUpdateATH(130000)
      expect(result).toBe(true)
    })

    it('should handle errors gracefully and still detect ATH', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Even with network error, it should fall back to constant (124277.98) and detect 130000 as new ATH
      const result = await athService.checkAndUpdateATH(130000)
      expect(result).toBe(true) // 130000 > 124277.98 (fallback)
    })
  })

  describe('JSON file structure validation', () => {
    it('should validate correct JSON structure', async () => {
      const validATHData = {
        meta: {
          lastUpdated: '2025-08-18T16:06:26.679Z',
          source: 'historical_analysis',
          version: '1.0.0'
        },
        ath: {
          value: 124277.98,
          date: '2024-03-14',
          timestamp: 1710374400000
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validATHData
      } as Response)

      const ath = await athService.getCurrentATH()
      expect(ath).toBe(124277.98)
    })

    it('should reject invalid JSON structure', async () => {
      const invalidATHData = {
        wrongStructure: true
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidATHData
      } as Response)

      const ath = await athService.getCurrentATH()
      expect(ath).toBe(124277.98) // Should fall back to constant
    })
  })
})
