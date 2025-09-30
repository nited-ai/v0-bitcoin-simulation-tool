/**
 * SimulationContext Migration Tests
 * 
 * Tests for Phase 3 migration of SimulationContext to support new price projection format.
 * @jest-environment jsdom
 */

import React, { ReactNode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { SimulationProvider, useSimulation } from '../context/SimulationContext'
import { DEFAULT_PARAMS } from '../types/simulation'
import type { PriceProjectionResult } from '@/app/simulation/price-models/types'
import { vi } from 'vitest'

// Mock wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulationProvider>{children}</SimulationProvider>
)

describe('SimulationContext - Phase 3 Migration', () => {
  describe('New Price Projection State', () => {
    it('should initialize with null priceProjection', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      expect(result.current.priceProjection).toBeNull()
    })

    it('should provide setPriceProjection method', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      expect(typeof result.current.setPriceProjection).toBe('function')
    })

    it('should update priceProjection state', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      const mockProjection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { month: 0, date: '2025-01-01', price: 50000 },
          { month: 1, date: '2025-02-01', price: 55000 }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 10,
          averageMonthlyGrowth: 0.83,
          maxDecline: 0,
          volatility: 0,
          confidence: 0.95,
          generatedAt: Date.now()
        }
      }

      act(() => {
        result.current.setPriceProjection(mockProjection)
      })

      expect(result.current.priceProjection).toEqual(mockProjection)
    })

    it('should clear priceProjection when set to null', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      const mockProjection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { month: 0, date: '2025-01-01', price: 50000 }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 10,
          averageMonthlyGrowth: 0.83,
          maxDecline: 0,
          volatility: 0,
          confidence: 0.95,
          generatedAt: Date.now()
        }
      }

      act(() => {
        result.current.setPriceProjection(mockProjection)
      })

      expect(result.current.priceProjection).not.toBeNull()

      act(() => {
        result.current.setPriceProjection(null)
      })

      expect(result.current.priceProjection).toBeNull()
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain legacy priceChartData field', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      expect(result.current.priceChartData).toBeDefined()
      expect(Array.isArray(result.current.priceChartData)).toBe(true)
    })

    it('should maintain setPriceChartData method', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      expect(typeof result.current.setPriceChartData).toBe('function')
    })

    it('should allow both priceProjection and priceChartData to coexist', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      const mockProjection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { month: 0, date: '2025-01-01', price: 50000 }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 10,
          averageMonthlyGrowth: 0.83,
          maxDecline: 0,
          volatility: 0,
          confidence: 0.95,
          generatedAt: Date.now()
        }
      }

      const mockChartData = [
        { date: '2025-01-01', days: 0, simulationPath: 50000 }
      ]

      act(() => {
        result.current.setPriceProjection(mockProjection)
        result.current.setPriceChartData(mockChartData)
      })

      expect(result.current.priceProjection).toEqual(mockProjection)
      expect(result.current.priceChartData).toEqual(mockChartData)
    })
  })

  describe('Existing Functionality', () => {
    it('should maintain all existing context fields', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      // Core State
      expect(result.current.params).toBeDefined()
      expect(result.current.setParams).toBeDefined()
      expect(result.current.results).toBeDefined()
      expect(result.current.setResults).toBeDefined()

      // Loading States
      expect(result.current.isLoading).toBeDefined()
      expect(result.current.setIsLoading).toBeDefined()
      expect(result.current.chartLoading).toBeDefined()
      expect(result.current.setChartLoading).toBeDefined()

      // Data States
      expect(result.current.historicalPriceData).toBeDefined()
      expect(result.current.setHistoricalPriceData).toBeDefined()
      expect(result.current.priceChartData).toBeDefined()
      expect(result.current.setPriceChartData).toBeDefined()

      // UI States
      expect(result.current.errors).toBeDefined()
      expect(result.current.setErrors).toBeDefined()

      // Actions
      expect(result.current.resetParams).toBeDefined()
      expect(result.current.clearErrors).toBeDefined()
      expect(result.current.addError).toBeDefined()
    })

    it('should still update parameters correctly', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      act(() => {
        result.current.setParams({
          ...DEFAULT_PARAMS,
          btcAmount: 2,
          initialBtcPrice: 50000,
        })
      })

      expect(result.current.params.btcAmount).toBe(2)
      expect(result.current.params.initialBtcPrice).toBe(50000)
    })

    it('should still manage errors correctly', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      act(() => {
        result.current.addError('Test error')
      })

      expect(result.current.errors).toContain('Test error')

      act(() => {
        result.current.clearErrors()
      })

      expect(result.current.errors).toEqual([])
    })
  })

  describe('Migration Logging', () => {
    it('should log Phase 3 migration messages when setting priceProjection', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const { result } = renderHook(() => useSimulation(), { wrapper })

      const mockProjection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [
          { month: 0, date: '2025-01-01', price: 50000 }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 10,
          averageMonthlyGrowth: 0.83,
          maxDecline: 0,
          volatility: 0,
          confidence: 0.95,
          generatedAt: Date.now()
        }
      }

      act(() => {
        result.current.setPriceProjection(mockProjection)
      })

      // Check if migration logging is present
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Type Safety', () => {
    it('should accept valid PriceProjectionResult', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      const validProjection: PriceProjectionResult = {
        modelName: 'manual',
        modelVersion: '1.0.0',
        projectionPoints: [],
        metadata: {
          totalMonths: 0,
          totalGrowth: 0,
          averageMonthlyGrowth: 0,
          maxDecline: 0,
          volatility: 0,
          confidence: 0,
          generatedAt: Date.now()
        }
      }

      act(() => {
        result.current.setPriceProjection(validProjection)
      })

      expect(result.current.priceProjection).toEqual(validProjection)
    })

    it('should accept null', () => {
      const { result } = renderHook(() => useSimulation(), { wrapper })

      act(() => {
        result.current.setPriceProjection(null)
      })

      expect(result.current.priceProjection).toBeNull()
    })
  })
})

