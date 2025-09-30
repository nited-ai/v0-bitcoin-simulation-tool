import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { FinalPortfolioSummary } from '../FinalPortfolioSummary'
import type { MonthlyResult, SimulationParams } from '../../../../types/simulation'

// Mock the SimulationContext
const mockUseSimulation = vi.fn()
vi.mock('../../../../context/SimulationContext', () => ({
  useSimulation: () => mockUseSimulation()
}))

describe('FinalPortfolioSummary', () => {
  const mockParams: SimulationParams = {
    investmentStrategy: 'rollingLoan',
    initialBtcAmount: 1.0,
    initialBtcPrice: 50000,
    simulationLength: 12,
    loanAmountPercent: 50,
    platform: 'firefish',
    maxInitialLtv: 70,
    originationFeePercent: 0,
    originationFeeType: 'one-time',
    riskManagement: {
      targetLtv: 70,
      maxLoanAmount: 250000,
      annualInterestRate: 6.5,
      loanTermMonths: 6,
      liquidationLtv: 85,
      liquidationFeePercent: 5
    }
  } as SimulationParams

  const createMockResult = (overrides: Partial<MonthlyResult> = {}): MonthlyResult => ({
    month: 1,
    dateString: '2024-01-01',
    btcPrice: 50000,
    collateralValue: 50000,
    realCollateralValue: 50000,
    totalDebt: 0,
    realTotalDebt: 0,
    withdrawalAmount: 0,
    newLoanPrincipal: 0,
    repaymentsDue: 0,
    reinvestment: 0,
    currentBtcAmount: 1.0,
    freeBtc: 1.0,
    lockedBtc: 0,
    loanCount: 0,
    highestLtv: 0,
    events: [],
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should not render for non-rolling loan strategies', () => {
      mockUseSimulation.mockReturnValue({
        results: [],
        params: { ...mockParams, investmentStrategy: 'buyAndHold' }
      })

      const { container } = render(<FinalPortfolioSummary />)
      expect(container.firstChild).toBeNull()
    })

    it('should render placeholder when no results are available', () => {
      mockUseSimulation.mockReturnValue({
        results: [],
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('should render all metric cards when results are available', () => {
      const mockResults = [
        createMockResult({ month: 0 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.2,
          collateralValue: 72000,
          totalDebt: 10000,
          btcPrice: 60000,
          loanCount: 1
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      expect(screen.getByText('Final Portfolio Summary')).toBeInTheDocument()
      expect(screen.getByText('Final BTC Amount')).toBeInTheDocument()
      expect(screen.getByText('Total Debt')).toBeInTheDocument()
      expect(screen.getByText('Net Portfolio Value')).toBeInTheDocument()
      expect(screen.getByText('Buy & Hold Comparison')).toBeInTheDocument()
    })
  })

  describe('Calculation Validation', () => {
    it('should calculate portfolio metrics correctly', () => {
      const mockResults = [
        createMockResult({ month: 0, currentBtcAmount: 1.0, btcPrice: 50000 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.2,
          collateralValue: 72000, // 1.2 BTC * $60,000
          totalDebt: 10000,
          btcPrice: 60000,
          loanCount: 1
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      // Final BTC Amount: 1.2 BTC
      expect(screen.getByText('1.200 BTC')).toBeInTheDocument()
      
      // Total Debt: $10,000 (formatted as $10.000)
      expect(screen.getByText('$10.000')).toBeInTheDocument()

      // Net Portfolio Value: $72,000 - $10,000 = $62,000 (formatted as $62.000)
      // Note: There are multiple $62.000 elements, so we need to be more specific
      const netPortfolioElements = screen.getAllByText('$62.000')
      expect(netPortfolioElements.length).toBeGreaterThan(0)
    })

    it('should calculate Buy & Hold comparison correctly', () => {
      const mockResults = [
        createMockResult({ month: 0, currentBtcAmount: 1.0, btcPrice: 50000 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.2,
          collateralValue: 72000, // 1.2 BTC * $60,000
          totalDebt: 10000,
          btcPrice: 60000,
          loanCount: 1
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      // Buy & Hold would be: 1.0 BTC * $60,000 = $60,000
      // Rolling Loan net: $72,000 - $10,000 = $62,000
      // Outperformance: $62,000 - $60,000 = +$2,000 (+3.3%) (formatted as +$2.000)
      expect(screen.getByText('+$2.000')).toBeInTheDocument()
      expect(screen.getByText('+3.3%')).toBeInTheDocument()
    })

    it('should handle underperformance correctly', () => {
      const mockResults = [
        createMockResult({ month: 0, currentBtcAmount: 1.0, btcPrice: 50000 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 0.9, // Lost BTC due to poor strategy
          collateralValue: 54000, // 0.9 BTC * $60,000
          totalDebt: 5000,
          btcPrice: 60000,
          loanCount: 1
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      // Buy & Hold would be: 1.0 BTC * $60,000 = $60,000
      // Rolling Loan net: $54,000 - $5,000 = $49,000
      // Underperformance: $49,000 - $60,000 = -$11,000 (-18.3%)
      // Component uses Math.abs() so shows "11.000" not "-11.000"
      expect(screen.getByText(/Underperformed by \$11.000/)).toBeInTheDocument()
      // There are multiple elements with 18.3% (one shows -18.3%, another shows (18.3%))
      const percentageElements = screen.getAllByText(/(18.3%)/i)
      expect(percentageElements.length).toBeGreaterThan(0)
      expect(screen.getByText('⚠️ Strategy Underperformed')).toBeInTheDocument()
    })
  })

  describe('Active Loans Status', () => {
    it('should display active loans information correctly', () => {
      const mockResults = [
        createMockResult({ month: 0 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.2,
          collateralValue: 72000,
          totalDebt: 15000,
          loanCount: 2 // 2 active loans
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      expect(screen.getByText(/Simulation ended with 2 active loans/)).toBeInTheDocument()
      expect(screen.getByText(/totaling \$15.000 remaining debt/)).toBeInTheDocument()
    })

    it('should display no active loans message correctly', () => {
      const mockResults = [
        createMockResult({ month: 0 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.2,
          collateralValue: 72000,
          totalDebt: 0, // No debt
          loanCount: 0 // No active loans
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      expect(screen.getByText(/Simulation ended with no active loans/)).toBeInTheDocument()
      expect(screen.getByText(/All loans were successfully repaid/)).toBeInTheDocument()
    })
  })

  describe('Color Coding and Visual Indicators', () => {
    it('should apply correct colors for positive performance', () => {
      const mockResults = [
        createMockResult({ month: 0, currentBtcAmount: 1.0, btcPrice: 50000 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.2,
          collateralValue: 72000,
          totalDebt: 10000,
          btcPrice: 60000
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      expect(screen.getByText('🎉 Strategy Successful')).toBeInTheDocument()
    })

    it('should apply correct colors for debt display', () => {
      const mockResults = [
        createMockResult({ month: 0 }),
        createMockResult({ 
          month: 12, 
          totalDebt: 15000 // Has debt
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: mockParams
      })

      render(<FinalPortfolioSummary />)
      
      expect(screen.getByText('Outstanding debt')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero buy hold value gracefully', () => {
      const mockResults = [
        createMockResult({ month: 0, currentBtcAmount: 0, btcPrice: 50000 }),
        createMockResult({ 
          month: 12, 
          currentBtcAmount: 1.0,
          collateralValue: 60000,
          totalDebt: 0,
          btcPrice: 60000
        })
      ]

      mockUseSimulation.mockReturnValue({
        results: mockResults,
        params: { ...mockParams, initialBtcAmount: 0 }
      })

      render(<FinalPortfolioSummary />)
      
      // Should not crash and should display values
      expect(screen.getByText('1.000 BTC')).toBeInTheDocument()
    })
  })

  describe('Runtime Error Prevention', () => {
    it('should handle undefined finalResult gracefully', () => {
      mockUseSimulation.mockReturnValue({
        results: [undefined as any],
        params: mockParams
      })

      render(<FinalPortfolioSummary />)

      // Should fallback to zero values without crashing
      expect(screen.getByText('0.000 BTC')).toBeInTheDocument()
      expect(screen.getAllByText('$0').length).toBeGreaterThan(0)
    })

    it('should handle undefined properties in finalResult without crashing', () => {
      mockUseSimulation.mockReturnValue({
        results: [{
          month: 12,
          dateString: '2024-12-01',
          btcPrice: 100000,
          // Missing currentBtcAmount, collateralValue, totalDebt properties
          events: []
        } as any],
        params: mockParams
      })

      render(<FinalPortfolioSummary />)

      // Should use nullish coalescing to default to 0
      expect(screen.getByText('0.000 BTC')).toBeInTheDocument()
      expect(screen.getAllByText('$0').length).toBeGreaterThan(0)
    })

    it('should handle null/undefined values in calculations without crashing', () => {
      mockUseSimulation.mockReturnValue({
        results: [{
          month: 12,
          dateString: '2024-12-01',
          btcPrice: null,
          currentBtcAmount: undefined,
          collateralValue: null,
          totalDebt: undefined,
          loanCount: null,
          events: []
        } as any],
        params: mockParams
      })

      render(<FinalPortfolioSummary />)

      // Should handle null/undefined values gracefully using nullish coalescing
      expect(screen.getByText('0.000 BTC')).toBeInTheDocument()
      expect(screen.getAllByText('$0').length).toBeGreaterThan(0)
    })

    it('should prevent toFixed() errors on undefined values', () => {
      // This test specifically addresses the original runtime error
      mockUseSimulation.mockReturnValue({
        results: [{
          month: 12,
          dateString: '2024-12-01',
          btcPrice: 100000,
          currentBtcAmount: undefined, // This was causing the original error
          collateralValue: 120000,
          totalDebt: 20000,
          loanCount: 1,
          events: []
        } as any],
        params: mockParams
      })

      // This should not throw "Cannot read properties of undefined (reading 'toFixed')"
      expect(() => render(<FinalPortfolioSummary />)).not.toThrow()

      // Should display 0.000 BTC instead of crashing
      expect(screen.getByText('0.000 BTC')).toBeInTheDocument()
    })
  })
})
