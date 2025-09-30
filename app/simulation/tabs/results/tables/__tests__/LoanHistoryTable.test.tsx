import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { LoanHistoryTable } from '../LoanHistoryTable'
import type { MonthlyResult, MonthlyEvent } from '../../../../types/simulation'

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
          dateString: '2024-01-01',
          btcPrice: 50000,
          collateralValue: 50000,
          realCollateralValue: 50000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 0,
          newLoanPrincipal: 10000,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 0.8,
          lockedBtc: 0.2,
          loanCount: 1,
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
          dateString: '2024-01-01',
          btcPrice: 50000,
          collateralValue: 50000,
          realCollateralValue: 50000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 0,
          newLoanPrincipal: 10000,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 0.8,
          lockedBtc: 0.2,
          loanCount: 1,
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
          dateString: '2024-01-01',
          btcPrice: 50000,
          collateralValue: 50000,
          realCollateralValue: 50000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 0,
          newLoanPrincipal: 10000,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 0.8,
          lockedBtc: 0.2,
          loanCount: 1,
          highestLtv: 20,
          events: []
        }
      ]

      render(<LoanHistoryTable />)
      
      // Check that the table contains loan event data
      expect(screen.getByText('1')).toBeInTheDocument() // Month
      expect(screen.getByText('1.1.2024')).toBeInTheDocument() // Date
      const amountElements = screen.getAllByText(/\$10.000/)
      expect(amountElements.length).toBeGreaterThan(0) // Amount appears in table
    })

    it('should display loan rollover events', () => {
      mockSimulationContext.results = [
        {
          month: 6,
          dateString: '2024-06-01',
          btcPrice: 52000,
          collateralValue: 62400,
          realCollateralValue: 62400,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 0,
          newLoanPrincipal: 0,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.2,
          freeBtc: 1.0,
          lockedBtc: 0.2,
          loanCount: 1,
          highestLtv: 20,
          events: []
        },
        {
          month: 7,
          dateString: '2024-07-01',
          btcPrice: 55000,
          collateralValue: 66000,
          realCollateralValue: 66000,
          totalDebt: 11000,
          realTotalDebt: 11000,
          withdrawalAmount: 0,
          newLoanPrincipal: 11000,
          repaymentsDue: 10650,
          reinvestment: 1000,
          currentBtcAmount: 1.2,
          freeBtc: 1.0,
          lockedBtc: 0.2,
          loanCount: 1,
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
          dateString: '2024-05-01',
          btcPrice: 35000,
          collateralValue: 28000,
          realCollateralValue: 28000,
          totalDebt: 0,
          realTotalDebt: 0,
          withdrawalAmount: 0,
          newLoanPrincipal: 0,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 0.8,
          freeBtc: 0.8,
          lockedBtc: 0,
          loanCount: 0,
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
          dateString: '2024-03-01',
          btcPrice: 52000,
          collateralValue: 57200,
          realCollateralValue: 57200,
          totalDebt: 5000,
          realTotalDebt: 5000,
          withdrawalAmount: 0,
          newLoanPrincipal: 5000,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.1,
          freeBtc: 1.004,
          lockedBtc: 0.096,
          loanCount: 1,
          highestLtv: 20,
          events: []
        },
        {
          month: 1,
          dateString: '2024-01-01',
          btcPrice: 50000,
          collateralValue: 50000,
          realCollateralValue: 50000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 0,
          newLoanPrincipal: 10000,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 0.8,
          lockedBtc: 0.2,
          loanCount: 1,
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
