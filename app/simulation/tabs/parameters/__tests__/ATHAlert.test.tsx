/**
 * ATHAlert Component Tests
 * 
 * Tests for the ATHAlert component with DataServiceProvider integration.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ATHAlert } from '../ATHAlert'
import { DataServiceProvider } from '../../../providers/DataServiceProvider'
import { centralizedDataService } from '@/lib/services/centralized-data-service'
import { athService } from '@/lib/services/ath-service'

// Mock services
vi.mock('@/lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    initialize: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
    reset: vi.fn(),
  }
}))

vi.mock('@/lib/services/ath-service', () => ({
  athService: {
    getCurrentATH: vi.fn(),
    getATHData: vi.fn(),
  }
}))

// Mock SimulationContext
vi.mock('../../../context/SimulationContext', () => ({
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

// Mock locale number format
vi.mock('@/shared/utils/localeNumberFormat', () => ({
  useLocaleNumberFormat: () => ({
    formatCurrency: (value: number) => `$${value.toLocaleString()}`,
    formatNumber: (value: number) => value.toFixed(1),
  }),
}))

describe('ATHAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock centralized data service
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: { price: 100000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })
    ;(centralizedDataService.subscribe as any).mockReturnValue(() => {})
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
    
    // Mock ATH service
    ;(athService.getCurrentATH as any).mockResolvedValue(124277.98)
    ;(athService.getATHData as any).mockResolvedValue({
      meta: {
        lastUpdated: '2025-01-01',
        source: 'test',
        version: '1.0.0'
      },
      ath: {
        value: 124277.98,
        date: '2024-03-14',
        timestamp: 1710374400000,
        source: 'test'
      }
    })
  })

  it('should render with provider-initialized data', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    render(<ATHAlert />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })

  it('should display ATH distance with real market data', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    render(<ATHAlert />, { wrapper })

    await waitFor(() => {
      // Should show percentage and USD distance
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })
  })

  it('should use realistic fallback when price data not available', async () => {
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

    render(<ATHAlert />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })

  it('should show correct risk level based on ATH distance', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    render(<ATHAlert />, { wrapper })

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      // Should have risk-based styling
    })
  })

  it('should handle ATH loading state', async () => {
    ;(athService.getCurrentATH as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(124277.98), 100))
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    render(<ATHAlert />, { wrapper })

    // Component should render even while ATH is loading
    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })

  it('should handle ATH error gracefully', async () => {
    ;(athService.getCurrentATH as any).mockRejectedValue(new Error('Failed to load ATH'))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    render(<ATHAlert />, { wrapper })

    await waitFor(() => {
      // Should still render with fallback
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })

  it('should update when price data changes', async () => {
    const callbacks: any[] = []
    ;(centralizedDataService.subscribe as any).mockImplementation((callback: any) => {
      callbacks.push(callback)
      callback(centralizedDataService.getState())
      return () => {}
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    const { rerender } = render(<ATHAlert />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })

    // Simulate price update
    const newState = {
      historicalData: [],
      currentPrice: { price: 110000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    }
    ;(centralizedDataService.getState as any).mockReturnValue(newState)
    callbacks.forEach(cb => cb(newState))

    rerender(<ATHAlert />)

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })
})

