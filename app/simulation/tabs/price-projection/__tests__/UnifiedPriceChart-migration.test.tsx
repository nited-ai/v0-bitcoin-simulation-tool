/**
 * UnifiedPriceChart Migration Tests
 *
 * Tests for Phase 3 migration of UnifiedPriceChart to integrate with SimulationContext.priceProjection
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UnifiedPriceChart from '../UnifiedPriceChart'
import type { PriceProjectionResult } from '@/app/simulation/price-models/types'

// Mock ResizeObserver for Recharts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock dependencies
const mockSetPriceProjection = vi.fn()
const mockOnProjectionChange = vi.fn()

vi.mock('../../../context/SimulationContext', () => ({
  useSimulation: () => ({
    params: {
      priceModel: 'manual',
      initialBtcPrice: 50000,
      simulationMonths: 12,
      annualGrowthRates: [10, 15, 20],
      powerLawSettings: { prognosisLine: 'fit' }
    },
    setParams: vi.fn(),
    priceProjection: null,
    setPriceProjection: mockSetPriceProjection
  })
}))

vi.mock('../../../hooks/useCentralizedData', () => ({
  useCentralizedData: () => ({
    historicalData: [
      { time: 1704067200, close: 42500, open: 42000, high: 43000, low: 41000, volume: 1000, date: '2024-01-01', source: 'json' }
    ],
    isHistoricalDataLoaded: true,
    isLoadingHistoricalData: false,
    refreshHistoricalData: vi.fn()
  })
}))

vi.mock('../../../hooks/useCalculationsIntegration', () => ({
  useLiquidationCalculations: () => ({
    liquidationPrices: null,
    isCalculating: false
  })
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=price-projection')
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' })
}))

vi.mock('../../../price-models/PriceModelRegistry', () => ({
  priceModelRegistry: {
    generateProjection: vi.fn().mockResolvedValue({
      modelName: 'manual',
      modelVersion: '1.0.0',
      projectionPoints: [
        { month: 0, date: '2025-01-01', price: 50000 },
        { month: 1, date: '2025-02-01', price: 55000 },
        { month: 2, date: '2025-03-01', price: 60000 }
      ],
      metadata: {
        totalMonths: 12,
        totalGrowth: 20,
        averageMonthlyGrowth: 1.67,
        maxDecline: 0,
        volatility: 0,
        confidence: 0.95,
        generatedAt: Date.now()
      }
    }),
    getAvailableModels: vi.fn().mockReturnValue(['manual', 'powerLaw', 'cycleRepeat']),
    getModelInfo: vi.fn().mockReturnValue({ name: 'Manual Growth', version: '1.0.0', description: 'Manual growth model' })
  }
}))

describe('UnifiedPriceChart - Phase 3 Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Context Integration', () => {
    it('should render without errors', () => {
      render(<UnifiedPriceChart />)
      expect(screen.getByText('Bitcoin Price Forecast')).toBeInTheDocument()
    })

    it('should call onProjectionChange when projection is generated', async () => {
      render(<UnifiedPriceChart onProjectionChange={mockOnProjectionChange} />)

      await waitFor(() => {
        expect(mockOnProjectionChange).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should pass PriceProjectionResult to onProjectionChange callback', async () => {
      render(<UnifiedPriceChart onProjectionChange={mockOnProjectionChange} />)

      await waitFor(() => {
        expect(mockOnProjectionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            modelName: expect.any(String),
            modelVersion: expect.any(String),
            projectionPoints: expect.any(Array),
            metadata: expect.objectContaining({
              totalMonths: expect.any(Number),
              generatedAt: expect.any(Number)
            })
          })
        )
      }, { timeout: 3000 })
    })
  })

  describe('Projection Generation', () => {
    it('should generate projection on mount', async () => {
      const { priceModelRegistry } = await import('../../../price-models/PriceModelRegistry')
      
      render(<UnifiedPriceChart />)

      await waitFor(() => {
        expect(priceModelRegistry.generateProjection).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should use correct model parameters', async () => {
      const { priceModelRegistry } = await import('../../../price-models/PriceModelRegistry')
      
      render(<UnifiedPriceChart />)

      await waitFor(() => {
        expect(priceModelRegistry.generateProjection).toHaveBeenCalledWith(
          'manual',
          expect.any(Array),
          expect.objectContaining({
            startPrice: 50000,
            projectionMonths: 12
          })
        )
      }, { timeout: 3000 })
    })

    it('should handle projection generation errors gracefully', async () => {
      const { priceModelRegistry } = await import('../../../price-models/PriceModelRegistry')
      priceModelRegistry.generateProjection = vi.fn().mockRejectedValue(new Error('Generation failed'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<UnifiedPriceChart />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      }, { timeout: 3000 })

      consoleSpy.mockRestore()
    })
  })

  describe('Chart Rendering', () => {
    it('should display loading state initially', () => {
      render(<UnifiedPriceChart />)
      expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
    })

    it('should render chart controls', () => {
      render(<UnifiedPriceChart />)

      // Check for scale buttons
      expect(screen.getByTitle('Linear scale for both axes')).toBeInTheDocument()
      expect(screen.getByTitle('Logarithmic Y-axis, linear time axis')).toBeInTheDocument()
    })

    it('should render export button', () => {
      render(<UnifiedPriceChart />)
      // CSV button exists (check by text content)
      expect(screen.getByText('CSV')).toBeInTheDocument()
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without onProjectionChange callback', async () => {
      const { priceModelRegistry } = await import('../../../price-models/PriceModelRegistry')
      
      render(<UnifiedPriceChart />)

      await waitFor(() => {
        expect(priceModelRegistry.generateProjection).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Should not throw error
      expect(screen.getByText('Bitcoin Price Forecast')).toBeInTheDocument()
    })

    it('should handle null projection gracefully', () => {
      render(<UnifiedPriceChart onProjectionChange={mockOnProjectionChange} />)
      
      // Should render loading state without errors
      expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
    })
  })

  describe('Migration Logging', () => {
    it('should log Phase 3 migration messages', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      render(<UnifiedPriceChart />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      }, { timeout: 3000 })

      consoleSpy.mockRestore()
    })
  })

  describe('Type Safety', () => {
    it('should accept valid onProjectionChange callback', () => {
      const validCallback = (projection: PriceProjectionResult | null) => {
        expect(projection).toBeDefined()
      }

      render(<UnifiedPriceChart onProjectionChange={validCallback} />)
      expect(screen.getByText('Bitcoin Price Forecast')).toBeInTheDocument()
    })

    it('should accept className prop', () => {
      const { container } = render(<UnifiedPriceChart className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})

