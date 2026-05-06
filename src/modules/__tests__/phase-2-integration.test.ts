/**
 * Phase 2 Integration Tests
 * 
 * Tests for Phase 2 migration: Hook & State Management integration
 * Verifies that all hooks work correctly with the migrated service layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePriceProjection, useProjectionComparison } from '../price-data/hooks/usePriceProjection'
import { priceDataService } from '../price-data/services/PriceDataService'
import type { PriceEngineParams, HistoricalDataPoint } from '../price-data/types'

// Mock the priceDataService
vi.mock('../price-data/services/PriceDataService', () => ({
  priceDataService: {
    generatePriceProjection: vi.fn(),
    loadHistoricalData: vi.fn(),
    getCurrentPrice: vi.fn(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(),
    getPerformanceMetrics: vi.fn()
  }
}))

describe('Phase 2 Integration Tests', () => {
  const mockHistoricalData: HistoricalDataPoint[] = [
    { timestamp: Date.now() / 1000 - 86400, price: 50000, date: '2025-01-01' },
    { timestamp: Date.now() / 1000, price: 51000, date: '2025-01-02' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(priceDataService.getCacheStats).mockReturnValue({
      size: 0,
      maxSize: 100,
      hitRate: 0,
      hits: 0,
      misses: 0
    })
    vi.mocked(priceDataService.getPerformanceMetrics).mockReturnValue({})
  })

  describe('Hook to Service Integration', () => {
    it('should integrate usePriceProjection with priceDataService', async () => {
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
        expect(priceDataService.generatePriceProjection).toHaveBeenCalledWith(params, undefined)
        expect(result.current.projectionData).toEqual(mockData)
        expect(result.current.error).toBeNull()
      })
    })

    it('should integrate useProjectionComparison with priceDataService', async () => {
      const mockManualData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 }
      ]
      const mockPowerLawData = [
        { date: '2025-01-01', days: 0, simulationPath: 52000 }
      ]

      vi.mocked(priceDataService.generatePriceProjection)
        .mockResolvedValueOnce(mockManualData)
        .mockResolvedValueOnce(mockPowerLawData)

      const baseParams = {
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      const { result } = renderHook(() => 
        useProjectionComparison(baseParams, ['manual', 'powerLaw'])
      )

      await act(async () => {
        await result.current.generateAllProjections()
      })

      await waitFor(() => {
        expect(result.current.projections.size).toBe(2)
        expect(result.current.getProjectionForModel('manual')).toEqual(mockManualData)
        expect(result.current.getProjectionForModel('powerLaw')).toEqual(mockPowerLawData)
      })
    })
  })

  describe('Data Flow Through Application', () => {
    it('should maintain data consistency through hook chain', async () => {
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
        // Verify data structure
        expect(result.current.projectionData).toHaveLength(2)
        expect(result.current.projectionData[0]).toHaveProperty('date')
        expect(result.current.projectionData[0]).toHaveProperty('simulationPath')
        
        // Verify computed values
        expect(result.current.projectionLength).toBe(2)
        expect(result.current.hasProjectionData).toBe(true)
        expect(result.current.projectionRange).toEqual({ min: 50000, max: 55000 })
      })
    })

    it('should handle errors consistently across hooks', async () => {
      const errorMessage = 'Service error'
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
        expect(result.current.projectionData).toEqual([])
        expect(result.current.isGenerating).toBe(false)
      })
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain legacy PriceChartDataPoint format in hooks', async () => {
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
        // Verify legacy format structure
        const data = result.current.projectionData
        expect(data[0]).toHaveProperty('date')
        expect(data[0]).toHaveProperty('days')
        expect(data[0]).toHaveProperty('simulationPath')
        
        // Should NOT have new format properties
        expect(data[0]).not.toHaveProperty('timestamp')
        expect(data[0]).not.toHaveProperty('metadata')
      })
    })
  })

  describe('Performance', () => {
    it('should complete projection generation within acceptable time', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-${String(i + 1).padStart(2, '0')}-01`,
        days: i * 30,
        simulationPath: 50000 + i * 1000
      }))

      vi.mocked(priceDataService.generatePriceProjection).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePriceProjection())

      const params: PriceEngineParams = {
        priceModel: 'manual',
        simulationMonths: 100,
        initialBtcPrice: 50000,
        annualGrowthRates: [10, 15, 20]
      }

      const startTime = performance.now()

      await act(async () => {
        await result.current.generateProjection(params)
      })

      await waitFor(() => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Should complete within 1 second (generous for test environment)
        expect(duration).toBeLessThan(1000)
        expect(result.current.projectionData).toHaveLength(100)
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
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating projection'))
      })

      consoleSpy.mockRestore()
    })
  })
})

