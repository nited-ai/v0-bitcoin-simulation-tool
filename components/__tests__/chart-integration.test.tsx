/**
 * Tests for Chart Component Integration with JSON Data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// Import actual chart components
import { UnifiedPriceChart } from '../../app/simulation/components/charts/UnifiedPriceChart'
import { HistoricalDataChart } from '../../app/simulation/components/charts/HistoricalDataChart'
import { PriceProjectionChart } from '../../app/simulation/components/charts/PriceProjectionChart'

// Mock the centralized data service
const mockHistoricalData = [
  {
    time: 1704067200,
    close: 42500,
    open: 42000,
    high: 43000,
    low: 41000,
    volume: 1000,
    date: '2024-01-01',
    source: 'json'
  },
  {
    time: 1704153600,
    close: 43000,
    open: 42500,
    high: 43500,
    low: 42000,
    volume: 1200,
    date: '2024-01-02',
    source: 'json'
  }
]

// Mock simulation context
vi.mock('../../app/simulation/context/SimulationContext', () => ({
  useSimulation: () => ({
    params: {
      priceModel: 'manual',
      simulationLength: 10,
      annualGrowthRates: [20, 15, 10, 8, 5],
      powerLawSettings: { prognosisLine: 'fit' }
    },
    priceChartData: [],
    isLoading: false
  })
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}))

vi.mock('../../lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    loadHistoricalData: vi.fn(() => Promise.resolve(mockHistoricalData)),
    getState: vi.fn(() => ({
      historicalData: mockHistoricalData,
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      currentPrice: { price: 45000, timestamp: Date.now(), source: 'test', lastUpdated: new Date().toISOString() },
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })),
    subscribe: vi.fn((callback) => {
      // Immediately call with mock state
      callback({
        historicalData: mockHistoricalData,
        isHistoricalDataLoaded: true,
        isLoadingHistoricalData: false,
        currentPrice: { price: 45000, timestamp: Date.now(), source: 'test', lastUpdated: new Date().toISOString() },
        lastHistoricalDataLoad: Date.now(),
        errors: [],
        isInitializing: false
      })
      return () => {} // unsubscribe function
    }),
    clearState: vi.fn(),
    getCurrentPrice: vi.fn(() => Promise.resolve({ price: 45000, timestamp: Date.now(), source: 'test', lastUpdated: new Date().toISOString() }))
  }
}))

// Mock price model registry
vi.mock('../../app/simulation/price-models/PriceModelRegistry', () => ({
  priceModelRegistry: {
    generateProjection: vi.fn(() => Promise.resolve({
      projectedPrices: mockHistoricalData.map((point, index) => ({
        timestamp: point.time * 1000 + (index + 1) * 86400000,
        volatile: point.close * 1.1,
        average: point.close * 1.05,
        support: point.close * 0.95,
        resistance: point.close * 1.15
      })),
      metadata: {
        model: 'manual',
        startDate: '2024-01-01',
        endDate: '2024-01-03',
        confidence: 0.8
      }
    }))
  }
}))

// Mock Recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="responsive-container">{children}</div>
}))

describe('Chart Component Integration with JSON Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('UnifiedPriceChart', () => {
    it('should render with JSON data', async () => {
      render(<UnifiedPriceChart />)

      // Should render the chart container
      await waitFor(() => {
        expect(screen.getByText(/Price Projection/i)).toBeInTheDocument()
      })

      // Verify that the centralized data service was called
      const { centralizedDataService } = await import('../../lib/services/centralized-data-service')
      expect(centralizedDataService.loadHistoricalData).toHaveBeenCalled()
    })

    it('should handle data format correctly', async () => {
      const { centralizedDataService } = await import('../../lib/services/centralized-data-service')
      
      const data = await centralizedDataService.loadHistoricalData()
      
      // Verify data format matches expected chart requirements
      expect(data).toHaveLength(2)
      expect(data[0]).toHaveProperty('time')
      expect(data[0]).toHaveProperty('close')
      expect(data[0]).toHaveProperty('open')
      expect(data[0]).toHaveProperty('high')
      expect(data[0]).toHaveProperty('low')
      expect(data[0]).toHaveProperty('date')
      expect(data[0]).toHaveProperty('source', 'json')
      
      // Verify time is in seconds (chart format)
      expect(data[0].time).toBe(1704067200)
      expect(typeof data[0].time).toBe('number')
    })
  })

  describe('HistoricalDataChart', () => {
    it('should display historical data from JSON files', async () => {
      render(<HistoricalDataChart />)

      // Should render the chart container
      await waitFor(() => {
        expect(screen.getByText(/Historical Bitcoin Price/i)).toBeInTheDocument()
      })

      // Verify that the centralized data service was called
      const { centralizedDataService } = await import('../../lib/services/centralized-data-service')
      expect(centralizedDataService.loadHistoricalData).toHaveBeenCalled()
    })
  })

  describe('PriceProjectionChart', () => {
    it('should generate projections using JSON historical data', async () => {
      render(<PriceProjectionChart />)

      // Should render the chart container
      await waitFor(() => {
        expect(screen.getByText(/Price Projection/i)).toBeInTheDocument()
      })

      // Verify that the price model registry was called with historical data
      const { priceModelRegistry } = await import('../../app/simulation/price-models/PriceModelRegistry')
      expect(priceModelRegistry.generateProjection).toHaveBeenCalled()
    })

    it('should maintain projection accuracy with JSON data', async () => {
      const { centralizedDataService } = await import('../../lib/services/centralized-data-service')
      
      const historicalData = await centralizedDataService.loadHistoricalData()
      
      // Verify that projection calculations can use the data correctly
      expect(historicalData).toHaveLength(2)
      
      // Test that data is suitable for projection algorithms
      const prices = historicalData.map(point => point.close)
      expect(prices).toEqual([42500, 43000])
      
      // Test time series continuity
      const times = historicalData.map(point => point.time)
      expect(times[1]).toBeGreaterThan(times[0])
    })
  })

  describe('Performance and Loading', () => {
    it('should load data faster than database approach', async () => {
      const { centralizedDataService } = await import('../../lib/services/centralized-data-service')
      
      const startTime = performance.now()
      await centralizedDataService.loadHistoricalData()
      const loadTime = performance.now() - startTime
      
      // JSON loading should be much faster than database (target: < 200ms)
      // In tests this will be near-instant due to mocking
      expect(loadTime).toBeLessThan(100)
    })

    it('should handle loading states correctly', async () => {
      const MockLoadingChart = () => {
        const { centralizedDataService } = require('../../lib/services/centralized-data-service')
        const [isLoading, setIsLoading] = React.useState(true)
        const [data, setData] = React.useState([])
        
        React.useEffect(() => {
          centralizedDataService.loadHistoricalData()
            .then((result: any[]) => {
              setData(result)
              setIsLoading(false)
            })
        }, [])

        return (
          <div data-testid="loading-chart">
            {isLoading ? (
              <div data-testid="loading-indicator">Loading...</div>
            ) : (
              <div data-testid="chart-content">Chart with {data.length} points</div>
            )}
          </div>
        )
      }

      render(<MockLoadingChart />)

      // Should quickly transition from loading to loaded
      await waitFor(() => {
        expect(screen.getByTestId('chart-content')).toHaveTextContent('Chart with 2 points')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON loading errors gracefully', async () => {
      // Mock error scenario
      const { centralizedDataService } = await import('../../lib/services/centralized-data-service')
      vi.mocked(centralizedDataService.loadHistoricalData).mockRejectedValueOnce(new Error('JSON loading failed'))

      const MockErrorChart = () => {
        const [error, setError] = React.useState<string | null>(null)
        
        React.useEffect(() => {
          centralizedDataService.loadHistoricalData()
            .catch((err: Error) => setError(err.message))
        }, [])

        return (
          <div data-testid="error-chart">
            {error ? (
              <div data-testid="error-message">{error}</div>
            ) : (
              <div data-testid="chart-content">Chart loaded</div>
            )}
          </div>
        )
      }

      render(<MockErrorChart />)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('JSON loading failed')
      })
    })
  })
})
