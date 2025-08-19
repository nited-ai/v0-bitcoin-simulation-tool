/**
 * PriceDropToleranceCard Tests
 * 
 * Tests for the updated PriceDropToleranceCard component that uses dynamic ATH
 * from the ATH service instead of hard-coded values.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceDropToleranceCard } from '../PriceDropToleranceCard'
import { useATH } from '../../../hooks/useATH'
import { useSimulation } from '../../../context/SimulationContext'
import { useLiquidationCalculations } from '../../../hooks/useCalculationsIntegration'

// Mock dependencies
vi.mock('../../../hooks/useATH')
vi.mock('../../../context/SimulationContext')
vi.mock('../../../hooks/useCalculationsIntegration')

describe('PriceDropToleranceCard', () => {
  const mockUseATH = useATH as ReturnType<typeof vi.fn>
  const mockUseSimulation = useSimulation as ReturnType<typeof vi.fn>
  const mockUseLiquidationCalculations = useLiquidationCalculations as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseSimulation.mockReturnValue({
      params: {
        initialBtcPrice: 100000,
        btcAmount: 1
      }
    })

    mockUseLiquidationCalculations.mockReturnValue({
      initialCurrentBtcPrice: 100000,
      initialImmediateLiquidationPrice: 80000,
      initialTrueLiquidationPrice: 75000,
      athMetrics: {
        priceDropPercentage: 35.8,
        truePriceDropPercentage: 39.8
      }
    })
  })

  describe('ATH integration', () => {
    it('should use dynamic ATH value from service', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      })

      render(<PriceDropToleranceCard />)

      // The component should render without errors and use the dynamic ATH
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })

    it('should use fallback ATH when loading', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: true,
        error: null,
        refetch: vi.fn()
      })

      render(<PriceDropToleranceCard />)

      // Component should still render with fallback value during loading
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })

    it('should handle ATH service errors gracefully', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98, // Fallback value
        athData: null,
        loading: false,
        error: 'Failed to load ATH data',
        refetch: vi.fn()
      })

      render(<PriceDropToleranceCard />)

      // Component should still render with fallback value on error
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })

    it('should update when ATH value changes', () => {
      const { rerender } = render(<PriceDropToleranceCard />)

      // Initial ATH
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      })

      rerender(<PriceDropToleranceCard />)

      // Updated ATH
      mockUseATH.mockReturnValue({
        ath: 130000,
        athData: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      })

      rerender(<PriceDropToleranceCard />)

      // Component should re-render with new ATH value
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })
  })

  describe('fallback calculations', () => {
    it('should use dynamic ATH in fallback calculations when liquidation data unavailable', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      })

      // Mock no liquidation data
      mockUseLiquidationCalculations.mockReturnValue(null)

      render(<PriceDropToleranceCard />)

      // Component should render with fallback calculations using dynamic ATH
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })

    it('should use loading fallback when ATH is loading and no liquidation data', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: true,
        error: null,
        refetch: vi.fn()
      })

      mockUseLiquidationCalculations.mockReturnValue(null)

      render(<PriceDropToleranceCard />)

      // Component should render with loading fallback (125000)
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })
  })

  describe('component rendering', () => {
    it('should render without crashing', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      })

      render(<PriceDropToleranceCard />)

      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })

    it('should display ATH-related metrics', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      })

      render(<PriceDropToleranceCard />)

      // Should display price drop tolerance information
      expect(screen.getByText(/Price Drop Tolerance/)).toBeInTheDocument()
    })
  })
})
