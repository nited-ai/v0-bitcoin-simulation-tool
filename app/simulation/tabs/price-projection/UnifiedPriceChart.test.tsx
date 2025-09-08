import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import UnifiedPriceChart from './UnifiedPriceChart'

// Mock historical data loader
const mockHistoricalData = [
  { timestamp: 1640995200000, date: '2022-01-01', open: 47000, high: 48000, low: 46000, close: 47500 },
  { timestamp: 1641081600000, date: '2022-01-02', open: 47500, high: 49000, low: 47000, close: 48200 },
  { timestamp: 1641168000000, date: '2022-01-03', open: 48200, high: 50000, low: 47500, close: 49800 },
]

vi.mock('../../data/historicalDataLoader', () => ({
  loadHistoricalData: vi.fn(() => Promise.resolve(mockHistoricalData)),
  convertToEur: vi.fn((data) => data),
}))

// Mock price model registry
const mockProjection = {
  projectionPoints: [
    { timestamp: 1704067200000, price: 52000, support: 48000, resistance: 56000, confidence: 0.8 },
    { timestamp: 1706745600000, price: 55000, support: 51000, resistance: 59000, confidence: 0.75 },
    { timestamp: 1709251200000, price: 58000, support: 54000, resistance: 62000, confidence: 0.7 },
  ],
  metadata: { model: 'manual', confidence: 0.75 }
}

const mockRegistry = {
  generateProjection: vi.fn(() => Promise.resolve(mockProjection)),
}

vi.mock('../../price-models/PriceModelRegistry', () => ({
  priceModelRegistry: mockRegistry,
}))

// Mock simulation context
const mockSimulationContext = {
  params: {
    priceModel: 'manual',
    initialBtcPrice: 50000,
    simulationMonths: 144,
    annualGrowthRates: [20, 15, 10, 8, 5, 3, 2, 1, 0, -1, -2, -3],
  },
}

vi.mock('../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext,
}))

describe('UnifiedPriceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chart container with title', () => {
    render(<UnifiedPriceChart />)
    
    expect(screen.getByText('Bitcoin Price Forecast')).toBeInTheDocument()
    expect(screen.getByText(/Historical and projected Bitcoin price/)).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<UnifiedPriceChart />)
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
  })

  it('loads historical data on mount', async () => {
    render(<UnifiedPriceChart />)
    
    await waitFor(() => {
      expect(require('../../data/historicalDataLoader').loadHistoricalData).toHaveBeenCalled()
    })
  })

  it('generates projection when price model changes', async () => {
    render(<UnifiedPriceChart />)
    
    await waitFor(() => {
      expect(mockRegistry.generateProjection).toHaveBeenCalledWith(
        'manual',
        expect.any(Array),
        expect.objectContaining({
          startPrice: 50000,
          projectionMonths: 144,
        })
      )
    })
  })

  it('displays chart with historical and projected data', async () => {
    render(<UnifiedPriceChart />)
    
    await waitFor(() => {
      // Chart should be rendered (ResponsiveContainer creates a div)
      const chartContainer = screen.getByRole('img', { hidden: true }) // Recharts creates an SVG
      expect(chartContainer).toBeInTheDocument()
    })
  })

  it('shows visual separator between historical and projected data', async () => {
    render(<UnifiedPriceChart />)
    
    await waitFor(() => {
      // Look for separator line or text
      expect(screen.getByText(/Current Date/)).toBeInTheDocument()
    })
  })

  it('handles error state gracefully', async () => {
    // Mock error in data loading
    vi.mocked(require('../../data/historicalDataLoader').loadHistoricalData)
      .mockRejectedValueOnce(new Error('Failed to load data'))
    
    render(<UnifiedPriceChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading chart data/)).toBeInTheDocument()
    })
  })

  it('updates chart when simulation parameters change', async () => {
    const { rerender } = render(<UnifiedPriceChart />)
    
    // Change mock context
    mockSimulationContext.params.priceModel = 'powerLaw'
    
    rerender(<UnifiedPriceChart />)
    
    await waitFor(() => {
      expect(mockRegistry.generateProjection).toHaveBeenCalledWith(
        'powerLaw',
        expect.any(Array),
        expect.any(Object)
      )
    })
  })

  it('scales Y-axis appropriately for combined data', async () => {
    render(<UnifiedPriceChart />)
    
    await waitFor(() => {
      // Check that chart renders without errors (proper scaling)
      const chartContainer = screen.getByRole('img', { hidden: true })
      expect(chartContainer).toBeInTheDocument()
    })
  })

  it('is responsive to different screen sizes', () => {
    render(<UnifiedPriceChart />)
    
    // ResponsiveContainer should be present
    const container = screen.getByText('Bitcoin Price Forecast').closest('.h-96')
    expect(container).toBeInTheDocument()
  })
})
