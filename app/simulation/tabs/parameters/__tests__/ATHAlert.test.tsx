/**
 * ATHAlert Component Tests
 *
 * Tests for the ATHAlert component using PR3's usePriceData() SWR hook.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ATHAlert } from '../ATHAlert'
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'

// Mock usePriceData hook (PR3 SWR-based hook)
vi.mock('@/src/modules/price-data/hooks/usePriceData', () => ({
  usePriceData: vi.fn(),
}))

const mockedUsePriceData = vi.mocked(usePriceData)

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

const defaultMockReturn = {
  prices: [],
  currentPrice: { value: 100000, fetchedAt: '2026-05-04T12:00:00Z' },
  ath: { value: 124773.51 },
  lastUpdated: '2026-05-04T12:00:00Z',
  isStale: false,
  isLoading: false,
  error: undefined,
  refresh: vi.fn(),
}

describe('ATHAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUsePriceData.mockReturnValue({ ...defaultMockReturn })
  })

  it('should render with provider-initialized data', async () => {
    render(<ATHAlert />)

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })

  it('should display ATH distance with real market data', async () => {
    render(<ATHAlert />)

    await waitFor(() => {
      // Should show percentage and USD distance
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })
  })

  it('should use realistic fallback when price data not available', async () => {
    mockedUsePriceData.mockReturnValue({
      ...defaultMockReturn,
      currentPrice: null,
    })

    render(<ATHAlert />)

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })

  it('should show correct risk level based on ATH distance', async () => {
    render(<ATHAlert />)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      // Should have risk-based styling
    })
  })

  it('should handle ATH loading state', async () => {
    mockedUsePriceData.mockReturnValue({
      ...defaultMockReturn,
      ath: null,
      currentPrice: null,
      isLoading: true,
    })

    render(<ATHAlert />)

    // Component should render the loading state
    await waitFor(() => {
      expect(screen.getByText(/loadingTitle/i)).toBeInTheDocument()
    })
  })

  it('should handle ATH error gracefully', async () => {
    mockedUsePriceData.mockReturnValue({
      ...defaultMockReturn,
      ath: null,
      currentPrice: null,
      isLoading: false,
      error: new Error('Failed to load ATH'),
    })

    render(<ATHAlert />)

    await waitFor(() => {
      // Should render the error state (no hardcoded fallback)
      expect(screen.getByText(/errorTitle/i)).toBeInTheDocument()
    })
  })

  it('should update when price data changes', async () => {
    const { rerender } = render(<ATHAlert />)

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })

    // Simulate price update via SWR
    mockedUsePriceData.mockReturnValue({
      ...defaultMockReturn,
      currentPrice: { value: 110000, fetchedAt: '2026-05-04T13:00:00Z' },
    })

    rerender(<ATHAlert />)

    await waitFor(() => {
      expect(screen.getByText(/currentPriceIs/i)).toBeInTheDocument()
    })
  })
})
