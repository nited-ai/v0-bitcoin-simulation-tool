/**
 * Tests for Risk Progression Chart Component
 * 
 * Tests the risk progression visualization showing LTV and liquidation risk evolution
 * with price projection context for rolling loan strategy results.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskProgressionChart } from '../RiskProgressionChart'
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
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}))

// Mock simulation context
const mockSimulationContext = {
  results: [] as MonthlyResult[],
  params: {
    investmentStrategy: 'rollingLoan',
    riskManagement: {
      targetLtv: 50,
      liquidationLtv: 85
    }
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

describe('RiskProgressionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimulationContext.results = []
    mockSimulationContext.priceProjection = null
  })

  describe('Basic Rendering', () => {
    it('should render chart container when no data is available', () => {
      render(<RiskProgressionChart />)
      
      expect(screen.getByText(/Risk Progression Over Time/i)).toBeInTheDocument()
      expect(screen.getByText(/Run simulation to see risk evolution/i)).toBeInTheDocument()
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
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<RiskProgressionChart />)
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Risk Zone Visualization', () => {
    it('should display risk zones with appropriate colors', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 18000,
          collateralValue: 45000,
          ltv: 40,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 40,
          events: []
        },
        {
          month: 2,
          date: '2024-02-01',
          btcPrice: 42000,
          totalBtcAmount: 1.0,
          totalDebt: 18000,
          collateralValue: 42000,
          ltv: 42.86,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 42.86,
          events: []
        }
      ]

      render(<RiskProgressionChart />)
      
      // Should render risk zone areas (3 areas for risk zones)
      expect(screen.getAllByTestId('area')).toHaveLength(3)
      expect(screen.getAllByTestId('line')).toHaveLength(2) // LTV line + price line
    })

    it('should show liquidation threshold reference lines', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 38250,
          collateralValue: 45000,
          ltv: 85,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 85,
          events: []
        }
      ]

      render(<RiskProgressionChart />)
      
      expect(screen.getAllByTestId('reference-line')).toHaveLength(2) // Target LTV + Liquidation LTV
    })
  })

  describe('Price Context Integration', () => {
    it('should show price movements affecting risk levels', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 50000,
          totalBtcAmount: 1.0,
          totalDebt: 20000,
          collateralValue: 50000,
          ltv: 40,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 40,
          events: []
        },
        {
          month: 2,
          date: '2024-02-01',
          btcPrice: 40000,
          totalBtcAmount: 1.0,
          totalDebt: 20000,
          collateralValue: 40000,
          ltv: 50,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 50,
          events: []
        }
      ]

      mockSimulationContext.priceProjection = {
        modelName: 'Cycle Repeat',
        modelVersion: '1.0',
        projectionPoints: [
          { timestamp: Date.parse('2024-01-01'), price: 50000, date: '2024-01-01' },
          { timestamp: Date.parse('2024-02-01'), price: 40000, date: '2024-02-01' }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: -20,
          averageMonthlyGrowth: -1.67,
          confidence: 0.7,
          generatedAt: '2024-01-01T00:00:00Z'
        }
      }

      render(<RiskProgressionChart />)
      
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Liquidation Events', () => {
    it('should highlight liquidation events when they occur', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 38250,
          collateralValue: 45000,
          ltv: 85,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 85,
          events: []
        },
        {
          month: 2,
          date: '2024-02-01',
          btcPrice: 40000,
          totalBtcAmount: 0.5,
          totalDebt: 0,
          collateralValue: 20000,
          ltv: 0,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 0,
          events: [{ type: 'liquidated', id: 1 }]
        }
      ]

      render(<RiskProgressionChart />)
      
      // Should render chart with liquidation event visualization
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('Risk Level Indicators', () => {
    it('should categorize risk levels correctly', () => {
      const testCases = [
        { ltv: 30, expectedRisk: 'safe' },
        { ltv: 55, expectedRisk: 'moderate' },
        { ltv: 75, expectedRisk: 'high' },
        { ltv: 90, expectedRisk: 'extreme' }
      ]

      // Test with safe risk level (30% LTV)
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 45000,
          totalBtcAmount: 1.0,
          totalDebt: 13500, // 30% LTV
          collateralValue: 45000,
          ltv: 30,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 30,
          events: []
        }
      ]

      render(<RiskProgressionChart />)

      // Chart should render with appropriate risk categorization
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      expect(screen.getByText(/SAFE RISK/i)).toBeInTheDocument()
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
          totalPrincipal: 4500,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 45.45,
          events: []
        }
      ]

      render(<RiskProgressionChart />)
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })
  })
})
