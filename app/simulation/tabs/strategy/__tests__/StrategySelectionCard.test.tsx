import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StrategySelectionCard } from '../StrategySelectionCard'

// Mock the simulation context
const mockSetParams = vi.fn()
const mockParams = {
  investmentStrategy: 'default' as const,
  btcAccumulation: true,
  monthlyWithdrawalAmount: 150,
  initialBtcAmount: 1.0,
  initialBtcPrice: 100000,
  loanAmountPercent: 15,
  riskManagement: {
    targetLtv: 40,
    liquidationLtv: 95,
    maxLoanAmount: 15000,
    annualInterestRate: 6.5,
    loanTermMonths: 12,
    liquidationFeePercent: 5.0
  }
}

vi.mock('../../../context/SimulationContext', () => ({
  useSimulation: () => ({
    params: mockParams,
    setParams: mockSetParams
  })
}))

// Mock the strategy registry
vi.mock('@/src/modules/strategies', () => ({
  getAvailableStrategies: () => [
    { id: 'default', name: 'Default Strategy', description: 'Basic investment strategy' },
    { id: 'rollingLoan', name: 'Rolling Loan Strategy', description: 'Automated loan rollover strategy' },
    { id: 'athBased', name: 'ATH-Based Strategy', description: 'All-time high based strategy' },
    { id: 'movingAverage', name: 'Moving Average Strategy', description: 'Moving average based strategy' }
  ]
}))

describe('StrategySelectionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the strategy selection card', () => {
      render(<StrategySelectionCard />)
      
      expect(screen.getByText('Investment Strategy')).toBeInTheDocument()
      expect(screen.getByText('Choose your Bitcoin lending strategy')).toBeInTheDocument()
    })

    it('should display available strategies in dropdown with coming soon badges', () => {
      render(<StrategySelectionCard />)

      const select = screen.getByRole('combobox')
      fireEvent.click(select)

      expect(screen.getByText('Default Strategy')).toBeInTheDocument()
      expect(screen.getByText('Rolling Loan Strategy')).toBeInTheDocument()
      expect(screen.getByText('Custom Strategy')).toBeInTheDocument()
      expect(screen.getAllByText('Coming Soon')).toHaveLength(3) // Custom, ATH-Based, Moving Average
    })

    it('should show current selected strategy', () => {
      render(<StrategySelectionCard />)
      
      expect(screen.getByDisplayValue('Default Strategy')).toBeInTheDocument()
    })
  })

  describe('Strategy Selection', () => {
    it('should call setParams when strategy is changed', () => {
      render(<StrategySelectionCard />)
      
      const select = screen.getByRole('combobox')
      fireEvent.click(select)
      
      const rollingLoanOption = screen.getByText('Rolling Loan Strategy')
      fireEvent.click(rollingLoanOption)
      
      expect(mockSetParams).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should update strategy in params when selection changes', () => {
      render(<StrategySelectionCard />)
      
      const select = screen.getByRole('combobox')
      fireEvent.click(select)
      
      const rollingLoanOption = screen.getByText('Rolling Loan Strategy')
      fireEvent.click(rollingLoanOption)
      
      // Verify the function passed to setParams updates the strategy
      const updateFunction = mockSetParams.mock.calls[0][0]
      const updatedParams = updateFunction(mockParams)
      expect(updatedParams.investmentStrategy).toBe('rollingLoan')
    })
  })

  describe('Strategy Information Display', () => {
    it('should show strategy description when strategy is selected', () => {
      const paramsWithRollingLoan = {
        ...mockParams,
        investmentStrategy: 'rollingLoan' as const
      }
      
      vi.mocked(require('../../../context/SimulationContext').useSimulation).mockReturnValue({
        params: paramsWithRollingLoan,
        setParams: mockSetParams
      })
      
      render(<StrategySelectionCard />)
      
      expect(screen.getByText(/automated loan rollover/i)).toBeInTheDocument()
    })

    it('should display strategy metadata when available', () => {
      render(<StrategySelectionCard />)
      
      // Should show some form of strategy information
      expect(screen.getByText(/strategy/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for screen readers', () => {
      render(<StrategySelectionCard />)
      
      expect(screen.getByLabelText(/strategy type/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<StrategySelectionCard />)
      
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      
      // Should be focusable
      select.focus()
      expect(select).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing strategy gracefully', () => {
      const paramsWithInvalidStrategy = {
        ...mockParams,
        investmentStrategy: 'nonexistent' as any
      }
      
      vi.mocked(require('../../../context/SimulationContext').useSimulation).mockReturnValue({
        params: paramsWithInvalidStrategy,
        setParams: mockSetParams
      })
      
      expect(() => render(<StrategySelectionCard />)).not.toThrow()
    })

    it('should handle empty strategy list gracefully', () => {
      vi.mocked(require('@/src/modules/strategies').getAvailableStrategies).mockReturnValue([])

      expect(() => render(<StrategySelectionCard />)).not.toThrow()
    })

    it('should prevent selection of disabled strategies', () => {
      render(<StrategySelectionCard />)

      const select = screen.getByRole('combobox')
      fireEvent.click(select)

      // Try to select a disabled strategy (Custom Strategy)
      const customOption = screen.getByText('Custom Strategy')
      fireEvent.click(customOption)

      // Should not change the selected strategy
      expect(mockSetParams).not.toHaveBeenCalled()
    })
  })
})
