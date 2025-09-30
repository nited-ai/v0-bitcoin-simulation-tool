import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RollingLoanMetricsCard } from '../RollingLoanMetricsCard'
import type { MonthlyResult, MonthlyEvent } from '../../../../types/simulation'

// Mock simulation context
const mockSimulationContext = {
  results: [] as MonthlyResult[],
  params: {
    initialBtcAmount: 1.0,
    investmentStrategy: 'rollingLoan' as const,
    btcAccumulation: true
  }
}

vi.mock('../../../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext
}))

describe('RollingLoanMetricsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimulationContext.params.btcAccumulation = true
  })

  describe('Basic Rendering', () => {
    it('should render the rolling loan metrics card', () => {
      mockSimulationContext.results = []

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText(/Rolling Loan Metrics/i)).toBeInTheDocument()
      expect(screen.getByText(/Strategy performance summary/i)).toBeInTheDocument()
    })

    it('should display all metric labels', () => {
      mockSimulationContext.results = []

      render(<RollingLoanMetricsCard />)

      expect(screen.getByText('Total Loans Taken')).toBeInTheDocument()
      expect(screen.getByText('Total Interest Paid')).toBeInTheDocument()
      expect(screen.getByText('BTC Accumulated')).toBeInTheDocument()
      expect(screen.getByText('Average LTV')).toBeInTheDocument()
      expect(screen.getByText('Risk Level')).toBeInTheDocument()
      expect(screen.getByText('Liquidations')).toBeInTheDocument()
    })
  })

  describe('Loan Counting Logic', () => {
    it('should count loans correctly based on newLoanPrincipal', () => {
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

      render(<RollingLoanMetricsCard />)
      
      // Should count 2 loans (both months have newLoanPrincipal > 0)
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should calculate average loan size correctly', () => {
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
        },
        {
          month: 7,
          dateString: '2024-07-01',
          btcPrice: 55000,
          collateralValue: 66000,
          realCollateralValue: 66000,
          totalDebt: 15000,
          realTotalDebt: 15000,
          withdrawalAmount: 0,
          newLoanPrincipal: 15000,
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

      render(<RollingLoanMetricsCard />)
      
      // Average loan size: (10000 + 15000) / 2 = 12500
      expect(screen.getByText(/Avg: \$12.500/)).toBeInTheDocument()
    })
  })

  describe('Interest Calculation', () => {
    it('should estimate interest paid from repayments', () => {
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
        },
        {
          month: 7,
          dateString: '2024-07-01',
          btcPrice: 55000,
          collateralValue: 66000,
          realCollateralValue: 66000,
          totalDebt: 0,
          realTotalDebt: 0,
          withdrawalAmount: 0,
          newLoanPrincipal: 0,
          repaymentsDue: 10650,
          reinvestment: 0,
          currentBtcAmount: 1.2,
          freeBtc: 1.2,
          lockedBtc: 0,
          loanCount: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      // Interest should be estimated as repayment - average principal
      // 10650 - 10000 = 650
      expect(screen.getByText(/\$650/)).toBeInTheDocument()
    })
  })

  describe('BTC Accumulation Calculation', () => {
    it('should calculate BTC accumulated correctly', () => {
      mockSimulationContext.params.btcAccumulation = true
      mockSimulationContext.results = [
        {
          month: 12,
          dateString: '2024-12-01',
          btcPrice: 60000,
          collateralValue: 78000,
          realCollateralValue: 78000,
          totalDebt: 0,
          realTotalDebt: 0,
          withdrawalAmount: 0,
          newLoanPrincipal: 0,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.3,
          freeBtc: 1.3,
          lockedBtc: 0,
          loanCount: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      // BTC accumulated: 1.3 - 1.0 = 0.3
      expect(screen.getByText(/0.300 BTC/)).toBeInTheDocument()
      expect(screen.getByText(/BTC Accumulated/)).toBeInTheDocument()
    })

    it('should calculate cash generated correctly', () => {
      mockSimulationContext.params.btcAccumulation = false
      mockSimulationContext.results = [
        {
          month: 1,
          dateString: '2024-01-01',
          btcPrice: 50000,
          collateralValue: 50000,
          realCollateralValue: 50000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 5000,
          newLoanPrincipal: 10000,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 0.8,
          lockedBtc: 0.2,
          loanCount: 1,
          highestLtv: 20,
          events: []
        },
        {
          month: 7,
          dateString: '2024-07-01',
          btcPrice: 55000,
          collateralValue: 55000,
          realCollateralValue: 55000,
          totalDebt: 0,
          realTotalDebt: 0,
          withdrawalAmount: 3000,
          newLoanPrincipal: 0,
          repaymentsDue: 10650,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 1.0,
          lockedBtc: 0,
          loanCount: 0,
          highestLtv: 20,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      // Cash generated: 5000 + 3000 = 8000
      expect(screen.getByText(/\$8.000/)).toBeInTheDocument()
      expect(screen.getByText(/Cash Generated/)).toBeInTheDocument()
    })
  })

  describe('LTV Calculation', () => {
    it('should calculate average LTV correctly', () => {
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
        },
        {
          month: 2,
          dateString: '2024-02-01',
          btcPrice: 60000,
          collateralValue: 60000,
          realCollateralValue: 60000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 0,
          newLoanPrincipal: 0,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1.0,
          freeBtc: 0.8,
          lockedBtc: 0.2,
          loanCount: 1,
          highestLtv: 25,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      // Average LTV: ((10000/50000)*100 + (10000/60000)*100) / 2 = (20 + 16.67) / 2 = 18.3%
      expect(screen.getByText(/18.3%/)).toBeInTheDocument()
    })

    it('should display max LTV correctly', () => {
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
          highestLtv: 85,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText(/Max: 85.0%/)).toBeInTheDocument()
    })
  })

  describe('Risk Level Assessment', () => {
    it('should show Low risk for LTV < 45%', () => {
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
          highestLtv: 30,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('should show Extreme risk for LTV >= 80%', () => {
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
          highestLtv: 85,
          events: []
        }
      ]

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText('Extreme')).toBeInTheDocument()
    })
  })

  describe('Liquidation Counting', () => {
    it('should count liquidations from events', () => {
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

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText(/Loans liquidated/)).toBeInTheDocument()
    })

    it('should show no liquidations when count is zero', () => {
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

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText(/No liquidations/)).toBeInTheDocument()
    })
  })

  describe('Conditional Rendering', () => {
    it('should only render when rolling loan strategy is selected', () => {
      mockSimulationContext.params.investmentStrategy = 'buyAndHold' as any
      mockSimulationContext.results = []

      const { container } = render(<RollingLoanMetricsCard />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should render when rolling loan strategy is selected', () => {
      mockSimulationContext.params.investmentStrategy = 'rollingLoan'
      mockSimulationContext.results = []

      render(<RollingLoanMetricsCard />)
      
      expect(screen.getByText(/Rolling Loan Metrics/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty results gracefully', () => {
      mockSimulationContext.results = []

      render(<RollingLoanMetricsCard />)

      // Check for specific metric values using more specific selectors
      expect(screen.getByText('$0')).toBeInTheDocument() // Interest paid
      expect(screen.getByText('0.000 BTC')).toBeInTheDocument() // BTC accumulated
      expect(screen.getByText('0.0%')).toBeInTheDocument() // Average LTV
      expect(screen.getByText('Low')).toBeInTheDocument() // Risk level
      expect(screen.getByText('No liquidations')).toBeInTheDocument() // Liquidations

      // Check that all metric labels are present
      expect(screen.getByText('Total Loans Taken')).toBeInTheDocument()
      expect(screen.getByText('Total Interest Paid')).toBeInTheDocument()
    })
  })
})
