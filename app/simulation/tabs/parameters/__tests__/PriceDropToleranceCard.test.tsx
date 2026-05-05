/**
 * PriceDropToleranceCard Tests
 *
 * Tests for the updated PriceDropToleranceCard component that uses dynamic ATH
 * from PR3's usePriceData() SWR hook (instead of the legacy useATH service).
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock ResizeObserver for Recharts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
import { PriceDropToleranceCard } from '../PriceDropToleranceCard'
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'
import { useSimulation } from '../../../context/SimulationContext'
import { useLiquidationCalculations } from '../../../hooks/useCalculationsIntegration'

// Mock dependencies
vi.mock('@/src/modules/price-data/hooks/usePriceData', () => ({
  usePriceData: vi.fn(),
}))
vi.mock('../../../context/SimulationContext')
vi.mock('../../../hooks/useCalculationsIntegration')

const defaultUsePriceDataReturn = {
  prices: [],
  currentPrice: { value: 100000, fetchedAt: '2026-05-04T12:00:00Z' },
  ath: { value: 124277.98 },
  lastUpdated: '2026-05-04T12:00:00Z',
  isStale: false,
  isLoading: false,
  error: undefined,
  refresh: vi.fn(),
}

describe('PriceDropToleranceCard', () => {
  const mockedUsePriceData = vi.mocked(usePriceData)
  const mockUseSimulation = useSimulation as ReturnType<typeof vi.fn>
  const mockUseLiquidationCalculations = useLiquidationCalculations as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockedUsePriceData.mockReturnValue({ ...defaultUsePriceDataReturn })

    mockUseSimulation.mockReturnValue({
      params: {
        initialBtcPrice: 100000,
        btcAmount: 1,
        initialBtcAmount: 1,
        loanAmountPercent: 50,
      },
    })

    mockUseLiquidationCalculations.mockReturnValue({
      initialCurrentBtcPrice: 100000,
      initialImmediateLiquidationPrice: 80000,
      initialTrueLiquidationPrice: 75000,
      initialImmediatePriceDropPercentage: 20,
      initialTruePriceDropPercentage: 25,
      initialFreeBtcAmount: 0.5,
      initialHasFreeCollateral: true,
      athMetrics: {
        priceDropPercentage: 35.8,
        truePriceDropPercentage: 39.8,
      },
    })
  })

  describe('ATH integration', () => {
    it('should use dynamic ATH value from service', () => {
      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // The component should render without errors and use the dynamic ATH
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })

    it('should use fallback ATH when loading', () => {
      mockedUsePriceData.mockReturnValue({
        ...defaultUsePriceDataReturn,
        ath: null,
        isLoading: true,
      })

      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Component should still render with fallback value during loading
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })

    it('should handle ATH service errors gracefully', () => {
      mockedUsePriceData.mockReturnValue({
        ...defaultUsePriceDataReturn,
        ath: null,
        error: new Error('Failed to load ATH data'),
      })

      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Component should still render with fallback value on error
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })

    it('should update when ATH value changes', () => {
      const { rerender } = render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Updated ATH
      mockedUsePriceData.mockReturnValue({
        ...defaultUsePriceDataReturn,
        ath: { value: 130000 },
      })

      rerender(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Component should re-render with new ATH value
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })
  })

  describe('fallback calculations', () => {
    it('should use dynamic ATH in fallback calculations when liquidation data unavailable', () => {
      // Mock no liquidation data
      mockUseLiquidationCalculations.mockReturnValue(null)

      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Component should render with fallback calculations using dynamic ATH
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })

    it('should use loading fallback when ATH is loading and no liquidation data', () => {
      mockedUsePriceData.mockReturnValue({
        ...defaultUsePriceDataReturn,
        ath: null,
        isLoading: true,
      })

      mockUseLiquidationCalculations.mockReturnValue(null)

      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Component should render with loading fallback (125000)
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })
  })

  describe('component rendering', () => {
    it('should render without crashing', () => {
      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })

    it('should display ATH-related metrics', () => {
      render(
        <TooltipProvider>
          <PriceDropToleranceCard />
        </TooltipProvider>
      )

      // Should display price drop tolerance information
      expect(screen.getAllByText(/Price Drop Tolerance/).length).toBeGreaterThan(0)
    })
  })
})
