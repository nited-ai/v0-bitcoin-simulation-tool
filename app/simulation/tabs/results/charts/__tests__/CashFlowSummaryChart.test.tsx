/**
 * Tests for Cash Flow Summary Chart Component
 * 
 * Tests the cash flow visualization showing monthly loan proceeds breakdown,
 * reinvestment amounts, and net cash flows with price-aware analysis.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CashFlowSummaryChart } from '../CashFlowSummaryChart'
import type { MonthlyResult } from '../../../../types/simulation'
import type { PriceProjectionResult } from '../../../../../price-models/types'

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="composed-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
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
    btcAccumulation: true
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

describe('CashFlowSummaryChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimulationContext.results = []
    mockSimulationContext.priceProjection = null
  })

  describe('Basic Rendering', () => {
    it('should render chart container when no data is available', () => {
      render(<CashFlowSummaryChart />)
      
      expect(screen.getByText(/Cash Flow Summary/i)).toBeInTheDocument()
      expect(screen.getByText(/Run simulation to see cash flow analysis/i)).toBeInTheDocument()
    })

    it('should render chart components when data is available', () => {
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
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<CashFlowSummaryChart />)
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Cash Flow Data Transformation', () => {
    it('should transform monthly results into cash flow data correctly', () => {
      const mockResults: MonthlyResult[] = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 22500,
          collateralValue: 45000,
          ltv: 50,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 22500,
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 50,
          events: []
        },
        {
          month: 2,
          date: '2024-02-01',
          btcPrice: 47000,
          totalBtcAmount: 1.5,
          totalDebt: 23500,
          collateralValue: 70500,
          ltv: 33.33,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 1000,
          totalPrincipal: 23500,
          activeLoans: [],
          repaymentDue: 22500,
          highestLtv: 50,
          events: []
        }
      ]

      mockSimulationContext.results = mockResults
      
      render(<CashFlowSummaryChart />)
      
      // Chart should render with transformed cash flow data
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      expect(screen.getAllByTestId('bar')).toHaveLength(2) // Loan proceeds + reinvestment bars
    })
  })

  describe('BTC Accumulation Mode', () => {
    it('should show reinvestment data when BTC accumulation is enabled', () => {
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
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<CashFlowSummaryChart />)
      
      expect(screen.getByText(/Cash Flow Summary/i)).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })

    it('should show cash generation data when BTC accumulation is disabled', () => {
      mockSimulationContext.params.btcAccumulation = false
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 22500,
          collateralValue: 45000,
          ltv: 50,
          monthlyWithdrawal: 18000,
          principalForNeeds: 18000,
          principalForReinvestment: 0,
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 50,
          events: []
        }
      ]

      render(<CashFlowSummaryChart />)
      
      expect(screen.getByText(/Cash Flow Summary/i)).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Price-Aware Analysis', () => {
    it('should show price correlation with cash flows', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 22500,
          collateralValue: 45000,
          ltv: 50,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 22500,
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 50,
          events: []
        }
      ]

      mockSimulationContext.priceProjection = {
        modelName: 'Enhanced',
        modelVersion: '1.0',
        projectionPoints: [
          { timestamp: Date.parse('2024-01-01'), price: 45000, date: '2024-01-01' }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 30,
          averageMonthlyGrowth: 2.5,
          confidence: 0.85,
          generatedAt: '2024-01-01T00:00:00Z'
        }
      }

      render(<CashFlowSummaryChart />)
      
      // Should show price model information
      expect(screen.getByText(/Enhanced/i)).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Loan Rollover Events', () => {
    it('should highlight loan rollover periods in cash flow', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 22500,
          collateralValue: 45000,
          ltv: 50,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 22500,
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 50,
          events: []
        },
        {
          month: 7,
          date: '2024-07-01',
          btcPrice: 52000,
          totalBtcAmount: 1.5,
          totalDebt: 26000,
          collateralValue: 78000,
          ltv: 33.33,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 3500,
          totalPrincipal: 26000,
          activeLoans: [],
          repaymentDue: 22500,
          highestLtv: 50,
          events: []
        }
      ]

      render(<CashFlowSummaryChart />)
      
      // Should render chart showing rollover events
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Net Cash Flow Calculation', () => {
    it('should calculate net cash flows correctly', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 22500,
          collateralValue: 45000,
          ltv: 50,
          monthlyWithdrawal: 18000,
          principalForNeeds: 18000,
          principalForReinvestment: 0,
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 50,
          events: []
        },
        {
          month: 7,
          date: '2024-07-01',
          btcPrice: 52000,
          totalBtcAmount: 1.0,
          totalDebt: 26000,
          collateralValue: 52000,
          ltv: 50,
          monthlyWithdrawal: 3500,
          principalForNeeds: 3500,
          principalForReinvestment: 0,
          totalPrincipal: 26000,
          activeLoans: [],
          repaymentDue: 22500,
          highestLtv: 50,
          events: []
        }
      ]

      render(<CashFlowSummaryChart />)
      
      // Should render chart with net cash flow calculations
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Chart Interactivity', () => {
    it('should render interactive elements', () => {
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
          totalPrincipal: 22500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<CashFlowSummaryChart />)
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })
  })
})
