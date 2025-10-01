/**
 * usePriceProjection Hook Migration Tests
 * 
 * Tests for Phase 2 migration of usePriceProjection hook to use new standard format.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePriceProjection } from '../hooks/usePriceProjection'
import type { PriceEngineParams } from '../types'
import { priceDataService } from '../services/PriceDataService'

// Mock the priceDataService
vi.mock('../services/PriceDataService', () => ({
  priceDataService: {
    generatePriceProjection: vi.fn()
  }
}))

describe('usePriceProjection - Phase 2 Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should initialize with empty projection data', () => {
      const { result } = renderHook(() => usePriceProjection())

      expect(result.current.projectionData).toEqual([])
      expect(result.current.currentParams).toBeNull()
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should generate projection successfully', async () => {
      const mockData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 },
        { date: '2025-02-01', days: 30, simulationPath: 55000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.projectionData).toEqual(mockData)
        expect(result.current.currentParams).toEqual(params)
        expect(result.current.isGenerating).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle generation errors', async () => {
      const errorMessage = 'Failed to generate projection'
      vi.mocked(priceDataService.generatePriceProjection).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage)
        expect(result.current.isGenerating).toBe(false)
        expect(result.current.projectionData).toEqual([])
      })
    })

    it('should clear projection data', async () => {
      const mockData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.projectionData.length).toBeGreaterThan(0)
      })

      act(() => {
        result.current.clearProjection()
      })

      expect(result.current.projectionData).toEqual([])
      expect(result.current.currentParams).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('Computed Values', () => {
    it('should calculate projection range correctly', async () => {
      const mockData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 },
        { date: '2025-02-01', days: 30, simulationPath: 55000 },
        { date: '2025-03-01', days: 60, simulationPath: 45000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.projectionRange).toEqual({ min: 45000, max: 55000 })
      })
    })

    it('should calculate projection length correctly', async () => {
      const mockData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 },
        { date: '2025-02-01', days: 30, simulationPath: 55000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.projectionLength).toBe(2)
      })
    })

    it('should detect historical data presence', async () => {
      const mockData = [
        { date: '2025-01-01', days: 0, historicalPrice: 50000, simulationPath: 50000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.hasHistoricalData).toBe(true)
      })
    })

    it('should detect projection data presence', async () => {
      const mockData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(result.current.hasProjectionData).toBe(true)
      })
    })
  })

  describe('Loading States', () => {
    it('should set isGenerating to true during generation', async () => {
      let resolveGeneration: (value: any) => void
      const generationPromise = new Promise((resolve) => {
        resolveGeneration = resolve
      })

      vi.mocked(priceDataService.generatePriceProjection).mockReturnValue(generationPromise as any)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      act(() => {
        result.current.generateProjection(params)
      })

      // Should be generating
      expect(result.current.isGenerating).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolveGeneration!([])
        await generationPromise
      })

      // Should no longer be generating
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false)
      })
    })
  })

  describe('Options', () => {
    it('should pass historical data to service', async () => {
      const historicalData = [
        { timestamp: Date.now() / 1000, price: 50000, date: '2025-01-01' }
      ]

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue([])

      const { result } = renderHook(() => usePriceProjection({ historicalData }))

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(priceDataService.generatePriceProjection).toHaveBeenCalledWith(params, historicalData)
      })
    })
  })

  describe('Migration Logging', () => {
    it('should log Phase 2 migration messages', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue([])

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating projection for model'))
      })

      consoleSpy.mockRestore()
    })
  })
})

