/**
 * Tests for BTC Accumulation Chart Component
 * 
 * Tests the BTC accumulation visualization for rolling loan strategy results
 * including price projection integration and dual-axis chart functionality.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BTCAccumulationChart } from '../BTCAccumulationChart'
import type { MonthlyResult } from '../../../../types/simulation'
import type { PriceProjectionResult } from '../../../../../price-models/types'

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="composed-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}))

// Mock simulation context
const mockSimulationContext = {
  results: [] as MonthlyResult[],
  params: {
    investmentStrategy: 'rollingLoan',
    btcAccumulation: true,
    initialBtcAmount: 1.0
  },
  priceProjection: null as PriceProjectionResult | null
}

vi.mock('../../../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext
}))

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback
  })
}))

describe('BTCAccumulationChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimulationContext.results = []
    mockSimulationContext.priceProjection = null
  })

  describe('Basic Rendering', () => {
    it('should render chart container when no data is available', () => {
      render(<BTCAccumulationChart />)
      
      expect(screen.getByText(/BTC Accumulation Over Time/i)).toBeInTheDocument()
      expect(screen.getByText(/Run simulation to see BTC accumulation/i)).toBeInTheDocument()
    })

    it('should render chart components when data is available', () => {
      // Setup mock data
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.1,
          totalDebt: 22500,
          collateralValue: 49500,
          ltv: 45.45,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 4500,
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      mockSimulationContext.priceProjection = {
        modelName: 'Manual Growth',
        modelVersion: '1.0',
        projectionPoints: [
          { timestamp: Date.parse('2024-01-01'), price: 45000, date: '2024-01-01' }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 20,
          averageMonthlyGrowth: 1.67,
          confidence: 0.8,
          generatedAt: '2024-01-01T00:00:00Z'
        }
      }

      render(<BTCAccumulationChart />)
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Data Transformation', () => {
    it('should transform monthly results into chart data correctly', () => {
      const mockResults: MonthlyResult[] = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 0,
          collateralValue: 45000,
          ltv: 0,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 0,
          events: []
        },
        {
          month: 2,
          date: '2024-02-01',
          btcPrice: 47000,
          totalBtcAmount: 1.1,
          totalDebt: 22500,
          collateralValue: 51700,
          ltv: 43.52,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 4700,
          totalPrincipal: 4700,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 43.52,
          events: []
        }
      ]

      mockSimulationContext.results = mockResults
      
      render(<BTCAccumulationChart />)
      
      // Chart should render with transformed data
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      expect(screen.getAllByTestId('area')).toHaveLength(2) // Two area charts (original + accumulated)
      expect(screen.getAllByTestId('line')).toHaveLength(2) // Two lines (total BTC + price)
    })
  })

  describe('Price Projection Integration', () => {
    it('should display price projection data when available', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.1,
          totalDebt: 22500,
          collateralValue: 49500,
          ltv: 45.45,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 4500,
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      mockSimulationContext.priceProjection = {
        modelName: 'Power Law',
        modelVersion: '1.0',
        projectionPoints: [
          { timestamp: Date.parse('2024-01-01'), price: 45000, date: '2024-01-01' }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 25,
          averageMonthlyGrowth: 2.08,
          confidence: 0.9,
          generatedAt: '2024-01-01T00:00:00Z'
        }
      }

      render(<BTCAccumulationChart />)
      
      // Should show price model information
      expect(screen.getByText(/Power Law/i)).toBeInTheDocument()
    })

    it('should handle missing price projection gracefully', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.1,
          totalDebt: 22500,
          collateralValue: 49500,
          ltv: 45.45,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 4500,
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      mockSimulationContext.priceProjection = null

      render(<BTCAccumulationChart />)
      
      // Should still render chart without price projection overlay
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('BTC Accumulation Mode', () => {
    it('should show accumulation-specific data when BTC accumulation is enabled', () => {
      mockSimulationContext.params.btcAccumulation = true
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.1,
          totalDebt: 22500,
          collateralValue: 49500,
          ltv: 45.45,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 4500,
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<BTCAccumulationChart />)
      
      expect(screen.getByText(/BTC Accumulation Over Time/i)).toBeInTheDocument()
    })

    it('should show different messaging when BTC accumulation is disabled', () => {
      mockSimulationContext.params.btcAccumulation = false
      
      render(<BTCAccumulationChart />)
      
      expect(screen.getByText(/BTC accumulation is disabled/i)).toBeInTheDocument()
    })
  })

  describe('Chart Interactivity', () => {
    it('should render tooltip and legend components when BTC accumulation is enabled', () => {
      mockSimulationContext.params.btcAccumulation = true
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.1,
          totalDebt: 22500,
          collateralValue: 49500,
          ltv: 45.45,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 4500,
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<BTCAccumulationChart />)

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })
  })
})
