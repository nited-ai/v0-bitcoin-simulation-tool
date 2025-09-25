import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RollingLoanConfigCard } from '../RollingLoanConfigCard'

// Mock the simulation context
const mockSetParams = vi.fn()
const mockParams = {
  investmentStrategy: 'rollingLoan' as const,
  btcAccumulation: true,
  monthlyWithdrawalAmount: 150,
  initialBtcAmount: 1.0,
  initialBtcPrice: 100000,
  loanAmountPercent: 15,
  platform: 'firefish',
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

describe('RollingLoanConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the rolling loan configuration card', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText('Rolling Loan Configuration')).toBeInTheDocument()
      expect(screen.getByText(/configure your automated loan rollover/i)).toBeInTheDocument()
    })

    it('should show BTC accumulation toggle', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText('BTC Accumulation Mode')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('should display current BTC accumulation state', () => {
      render(<RollingLoanConfigCard />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })
  })

  describe('BTC Accumulation Toggle', () => {
    it('should call setParams when BTC accumulation is toggled', () => {
      render(<RollingLoanConfigCard />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      expect(mockSetParams).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should update btcAccumulation in params when toggled', () => {
      render(<RollingLoanConfigCard />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      // Verify the function passed to setParams updates btcAccumulation
      const updateFunction = mockSetParams.mock.calls[0][0]
      const updatedParams = updateFunction(mockParams)
      expect(updatedParams.btcAccumulation).toBe(false)
    })
  })

  describe('Mode Descriptions', () => {
    it('should show accumulation mode description when enabled', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/reinvest loan proceeds/i)).toBeInTheDocument()
      expect(screen.getByText(/accumulate more bitcoin/i)).toBeInTheDocument()
    })

    it('should show cash generation mode description when disabled', () => {
      const paramsWithCashMode = {
        ...mockParams,
        btcAccumulation: false
      }
      
      vi.mocked(require('../../../context/SimulationContext').useSimulation).mockReturnValue({
        params: paramsWithCashMode,
        setParams: mockSetParams
      })
      
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/take loan proceeds as cash/i)).toBeInTheDocument()
      expect(screen.getByText(/generate income/i)).toBeInTheDocument()
    })
  })

  describe('Strategy Mechanics Preview', () => {
    it('should display loan amount calculation preview', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/initial loan amount/i)).toBeInTheDocument()
      expect(screen.getByText(/\$15,000/)).toBeInTheDocument() // 15% of $100k BTC
    })

    it('should show target LTV information', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/target ltv/i)).toBeInTheDocument()
      expect(screen.getByText(/40%/)).toBeInTheDocument()
    })

    it('should display loan term information', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/loan term/i)).toBeInTheDocument()
      expect(screen.getByText(/12 months/i)).toBeInTheDocument()
    })
  })

  describe('Real-time Calculations', () => {
    it('should update calculations when BTC amount changes', () => {
      const paramsWithDifferentBtc = {
        ...mockParams,
        initialBtcAmount: 2.0
      }
      
      vi.mocked(require('../../../context/SimulationContext').useSimulation).mockReturnValue({
        params: paramsWithDifferentBtc,
        setParams: mockSetParams
      })
      
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/\$30,000/)).toBeInTheDocument() // 15% of $200k BTC
    })

    it('should update calculations when loan percentage changes', () => {
      const paramsWithDifferentLoanPercent = {
        ...mockParams,
        loanAmountPercent: 20
      }
      
      vi.mocked(require('../../../context/SimulationContext').useSimulation).mockReturnValue({
        params: paramsWithDifferentLoanPercent,
        setParams: mockSetParams
      })
      
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/\$20,000/)).toBeInTheDocument() // 20% of $100k BTC
    })
  })

  describe('Educational Content', () => {
    it('should display rolling loan mechanics explanation', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/how rolling loans work/i)).toBeInTheDocument()
      expect(screen.getByText(/automatic rollover/i)).toBeInTheDocument()
    })

    it('should show risk management information', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText(/risk management/i)).toBeInTheDocument()
      expect(screen.getByText(/liquidation protection/i)).toBeInTheDocument()
    })
  })

  describe('Conditional Rendering', () => {
    it('should only render when rolling loan strategy is selected', () => {
      const paramsWithDifferentStrategy = {
        ...mockParams,
        investmentStrategy: 'default' as const
      }
      
      vi.mocked(require('../../../context/SimulationContext').useSimulation).mockReturnValue({
        params: paramsWithDifferentStrategy,
        setParams: mockSetParams
      })
      
      const { container } = render(<RollingLoanConfigCard />)
      expect(container.firstChild).toBeNull()
    })

    it('should render when rolling loan strategy is selected', () => {
      render(<RollingLoanConfigCard />)
      
      expect(screen.getByText('Rolling Loan Configuration')).toBeInTheDocument()
    })
  })
})
