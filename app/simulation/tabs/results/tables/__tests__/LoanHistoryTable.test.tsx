import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { LoanHistoryTable } from '../LoanHistoryTable'
import type { MonthlyResult } from '../../../../../types/simulation'

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
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
    initialBtcAmount: 1.0,
    investmentStrategy: 'rollingLoan' as const,
    btcAccumulation: true
  },
  priceProjection: {
    projectionPoints: [
      { timestamp: Date.now(), price: 50000, date: '2024-01-01' }
    ]
  }
}

vi.mock('../../../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext
}))

describe('LoanHistoryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the loan history table', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 50000,
          totalBtcAmount: 1.0,
          totalDebt: 10000,
          collateralValue: 50000,
          ltv: 20,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 10000,
          totalPrincipal: 10000,
          activeLoans: [{
            id: 1,
            month: 1,
            principal: 10000,
            maturityMonth: 7,
            repaymentAmount: 10650,
            lockedBtc: 0.2
          }],
          repaymentDue: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<LoanHistoryTable />)
      
      expect(screen.getByText(/Loan History/i)).toBeInTheDocument()
      expect(screen.getByText(/Month-by-month loan events/i)).toBeInTheDocument()
    })

    it('should display loan events in table format', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 50000,
          totalBtcAmount: 1.0,
          totalDebt: 10000,
          collateralValue: 50000,
          ltv: 20,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 10000,
          totalPrincipal: 10000,
          activeLoans: [{
            id: 1,
            month: 1,
            principal: 10000,
            maturityMonth: 7,
            repaymentAmount: 10650,
            lockedBtc: 0.2
          }],
          repaymentDue: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<LoanHistoryTable />)
      
      expect(screen.getByRole('columnheader', { name: /Month/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Date/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Event Type/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Amount/i })).toBeInTheDocument()
    })
  })

  describe('Loan Event Display', () => {
    it('should display new loan events', () => {
      mockSimulationContext.results = [
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 50000,
          totalBtcAmount: 1.0,
          totalDebt: 10000,
          collateralValue: 50000,
          ltv: 20,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 10000,
          totalPrincipal: 10000,
          activeLoans: [{
            id: 1,
            month: 1,
            principal: 10000,
            maturityMonth: 7,
            repaymentAmount: 10650,
            lockedBtc: 0.2
          }],
          repaymentDue: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<LoanHistoryTable />)
      
      // Check that the table contains loan event data
      expect(screen.getByText('1')).toBeInTheDocument() // Month
      expect(screen.getByText('1.1.2024')).toBeInTheDocument() // Date
      expect(screen.getByText(/\$10.000/)).toBeInTheDocument() // Amount
    })

    it('should display loan rollover events', () => {
      mockSimulationContext.results = [
        {
          month: 7,
          date: '2024-07-01',
          btcPrice: 55000,
          totalBtcAmount: 1.2,
          totalDebt: 11000,
          collateralValue: 66000,
          ltv: 16.7,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 1000,
          totalPrincipal: 11000,
          activeLoans: [{
            id: 2,
            month: 7,
            principal: 11000,
            maturityMonth: 13,
            repaymentAmount: 11715,
            lockedBtc: 0.2
          }],
          repaymentDue: 10650,
          highestLtv: 20,
          events: []
        }
      ]

      render(<LoanHistoryTable />)
      
      // Check that the table contains rollover event data
      expect(screen.getAllByText('7')).toHaveLength(2) // Two events in month 7
      expect(screen.getAllByText('1.7.2024')).toHaveLength(2) // Two events on same date
      expect(screen.getAllByText(/\$11.000/)).toHaveLength(2) // Two events with same amount
    })

    it('should display liquidation events', () => {
      mockSimulationContext.results = [
        {
          month: 5,
          date: '2024-05-01',
          btcPrice: 35000,
          totalBtcAmount: 0.8,
          totalDebt: 0,
          collateralValue: 28000,
          ltv: 0,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 0,
          totalPrincipal: 0,
          activeLoans: [],
          repaymentDue: 0,
          highestLtv: 85,
          events: [{ type: 'liquidated', id: 1 }]
        }
      ]

      render(<LoanHistoryTable />)
      
      expect(screen.getByText(/Liquidation/i)).toBeInTheDocument()
      expect(screen.getByText(/Loan ID 1/i)).toBeInTheDocument()
    })
  })

  describe('Data Transformation', () => {
    it('should handle empty results gracefully', () => {
      mockSimulationContext.results = []

      render(<LoanHistoryTable />)
      
      expect(screen.getByText(/No loan events to display/i)).toBeInTheDocument()
    })

    it('should sort events chronologically', () => {
      mockSimulationContext.results = [
        {
          month: 3,
          date: '2024-03-01',
          btcPrice: 52000,
          totalBtcAmount: 1.1,
          totalDebt: 5000,
          collateralValue: 57200,
          ltv: 8.7,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 5000,
          totalPrincipal: 5000,
          activeLoans: [{
            id: 2,
            month: 3,
            principal: 5000,
            maturityMonth: 9,
            repaymentAmount: 5325,
            lockedBtc: 0.096
          }],
          repaymentDue: 0,
          highestLtv: 20,
          events: []
        },
        {
          month: 1,
          date: '2024-01-01',
          btcPrice: 50000,
          totalBtcAmount: 1.0,
          totalDebt: 10000,
          collateralValue: 50000,
          ltv: 20,
          monthlyWithdrawal: 0,
          principalForNeeds: 0,
          principalForReinvestment: 10000,
          totalPrincipal: 10000,
          activeLoans: [{
            id: 1,
            month: 1,
            principal: 10000,
            maturityMonth: 7,
            repaymentAmount: 10650,
            lockedBtc: 0.2
          }],
          repaymentDue: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<LoanHistoryTable />)
      
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 data rows
    })
  })

  describe('Conditional Rendering', () => {
    it('should only render when rolling loan strategy is selected', () => {
      mockSimulationContext.params.investmentStrategy = 'buyAndHold'
      mockSimulationContext.results = []

      const { container } = render(<LoanHistoryTable />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should render when rolling loan strategy is selected', () => {
      mockSimulationContext.params.investmentStrategy = 'rollingLoan'
      mockSimulationContext.results = []

      render(<LoanHistoryTable />)
      
      expect(screen.getByText(/Loan History/i)).toBeInTheDocument()
    })
  })
})
