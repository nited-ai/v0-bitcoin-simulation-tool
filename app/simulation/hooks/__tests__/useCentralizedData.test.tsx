/**
 * useCentralizedData Hook Tests
 * 
 * Tests for the updated useCentralizedData hook that works with
 * the DataServiceProvider for centralized initialization.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCentralizedData } from '../useCentralizedData'
import { DataServiceProvider } from '../../providers/DataServiceProvider'
import { centralizedDataService } from '@/lib/services/centralized-data-service'

// Mock the centralized data service
vi.mock('@/lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    initialize: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
    reset: vi.fn(),
    loadHistoricalData: vi.fn(),
    getCurrentPrice: vi.fn(),
  }
}))

// Mock SimulationContext
vi.mock('../../context/SimulationContext', () => ({
  useSimulation: () => ({
    setIsLoading: vi.fn(),
    setErrors: vi.fn(),
    setHistoricalPriceData: vi.fn(),
    setParams: vi.fn(),
    setInitialDataLoaded: vi.fn(),
  }),
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('useCentralizedData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [
        { timestamp: 1000, close: 50000, high: 51000, low: 49000, open: 50000 }
      ],
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })
    ;(centralizedDataService.subscribe as any).mockReturnValue(() => {})
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
    ;(centralizedDataService.loadHistoricalData as any).mockResolvedValue([])
    ;(centralizedDataService.getCurrentPrice as any).mockResolvedValue({
      price: 50000,
      timestamp: Date.now() / 1000,
      source: 'test'
    })
  })

  it('should return data service state', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCentralizedData(false), { wrapper })

    await waitFor(() => {
      expect(result.current.historicalData).toHaveLength(1)
      expect(result.current.currentPrice?.price).toBe(50000)
      expect(result.current.isHistoricalDataLoaded).toBe(true)
    })
  })

  it('should subscribe to data service state changes', async () => {
    const mockSubscribe = vi.fn().mockReturnValue(() => {})
    ;(centralizedDataService.subscribe as any).mockImplementation(mockSubscribe)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    renderHook(() => useCentralizedData(false), { wrapper })

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })
  })

  it('should handle enabled parameter for backward compatibility', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCentralizedData(true), { wrapper })

    await waitFor(() => {
      expect(result.current.isHistoricalDataLoaded).toBe(true)
    })
  })

  it('should provide refresh functions', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCentralizedData(false), { wrapper })

    await waitFor(() => {
      expect(result.current.refreshHistoricalData).toBeDefined()
      expect(result.current.refreshCurrentPrice).toBeDefined()
      expect(typeof result.current.refreshHistoricalData).toBe('function')
      expect(typeof result.current.refreshCurrentPrice).toBe('function')
    })
  })

  it('should handle errors from data service', async () => {
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: null,
      isHistoricalDataLoaded: false,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: 0,
      errors: ['Failed to load data'],
      isInitializing: false
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCentralizedData(false), { wrapper })

    await waitFor(() => {
      expect(result.current.errors).toContain('Failed to load data')
    })
  })

  it('should work without DataServiceProvider (backward compatibility)', () => {
    const { result } = renderHook(() => useCentralizedData(false))

    // Should not crash, should return default state
    expect(result.current).toBeDefined()
    expect(result.current.historicalData).toBeDefined()
  })

  it('should update when data service state changes', async () => {
    const callbacks: any[] = []
    ;(centralizedDataService.subscribe as any).mockImplementation((callback: any) => {
      callbacks.push(callback)
      callback(centralizedDataService.getState())
      return () => {}
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCentralizedData(false), { wrapper })

    await waitFor(() => {
      expect(result.current.currentPrice?.price).toBe(50000)
    })

    // Simulate state update
    const newState = {
      historicalData: [],
      currentPrice: { price: 55000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    }
    ;(centralizedDataService.getState as any).mockReturnValue(newState)
    callbacks.forEach(cb => cb(newState))

    await waitFor(() => {
      expect(result.current.currentPrice?.price).toBe(55000)
    })
  })
})

