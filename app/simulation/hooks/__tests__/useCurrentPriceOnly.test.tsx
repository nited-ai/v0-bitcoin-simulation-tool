/**
 * useCurrentPriceOnly Hook Tests
 * 
 * Tests for the useCurrentPriceOnly hook that works with
 * the DataServiceProvider for centralized initialization.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentPriceOnly } from '../useCentralizedData'
import { DataServiceProvider } from '../../providers/DataServiceProvider'
import { centralizedDataService } from '@/lib/services/centralized-data-service'

// Mock the centralized data service
vi.mock('@/lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    initialize: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
    reset: vi.fn(),
    getCurrentPrice: vi.fn(),
  }
}))

describe('useCurrentPriceOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })
    ;(centralizedDataService.subscribe as any).mockReturnValue(() => {})
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
    ;(centralizedDataService.getCurrentPrice as any).mockResolvedValue({
      price: 50000,
      timestamp: Date.now() / 1000,
      source: 'test'
    })
  })

  it('should return current price from provider-initialized service', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCurrentPriceOnly(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentPrice?.price).toBe(50000)
    })
  })

  it('should provide refresh function', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCurrentPriceOnly(), { wrapper })

    await waitFor(() => {
      expect(result.current.refreshPrice).toBeDefined()
      expect(typeof result.current.refreshPrice).toBe('function')
    })
  })

  it('should handle refresh price call', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCurrentPriceOnly(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentPrice).toBeDefined()
    })

    // Call refresh
    await result.current.refreshPrice()

    expect(centralizedDataService.getCurrentPrice).toHaveBeenCalled()
  })

  it('should maintain existing API contract', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCurrentPriceOnly(), { wrapper })

    await waitFor(() => {
      expect(result.current).toHaveProperty('currentPrice')
      expect(result.current).toHaveProperty('refreshPrice')
      expect(result.current).toHaveProperty('isLoading')
    })
  })

  it('should work without provider (backward compatibility)', () => {
    const { result } = renderHook(() => useCurrentPriceOnly())

    expect(result.current).toBeDefined()
    expect(result.current.currentPrice).toBeDefined()
  })

  it('should handle null current price', async () => {
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: null,
      isHistoricalDataLoaded: false,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: 0,
      errors: [],
      isInitializing: false
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCurrentPriceOnly(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentPrice).toBeNull()
    })
  })

  it('should update when price changes', async () => {
    const callbacks: any[] = []
    ;(centralizedDataService.subscribe as any).mockImplementation((callback: any) => {
      callbacks.push(callback)
      callback(centralizedDataService.getState())
      return () => {}
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { result } = renderHook(() => useCurrentPriceOnly(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentPrice?.price).toBe(50000)
    })

    // Simulate price update
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

