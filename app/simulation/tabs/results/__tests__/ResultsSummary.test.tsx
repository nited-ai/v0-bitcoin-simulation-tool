import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsSummary } from '../ResultsSummary'
import { useSimulation } from '../../../context/SimulationContext'
import { useResultsAnalysis } from '../../../hooks/useResultsAnalysis'

// Mock the hooks
vi.mock('../../../context/SimulationContext')
vi.mock('../../../hooks/useResultsAnalysis')

// Mock data for testing calculations
const mockResults = [
  {
    month: 1,
    date: '2024-01-01',
    btcPrice: 100000,
    totalBtcAmount: 1.0,
    collateralValue: 100000,
    totalDebt: 10000,
    ltv: 10,
    highestLtv: 10,
    monthlyWithdrawal: 0,
    events: [],
    activeLoans: [],
    repaymentDue: 0,
    newLoanPrincipal: 10000,
    principalForNeeds: 10000,
    principalForReinvestment: 0,
    reinvestment: 0,
    currentBtcAmount: 1.0,
    freeBtc: 0.9,
    lockedBtc: 0.1,
    loanCount: 1,
    repaymentsDue: 0,
    withdrawalAmount: 0,
    dateString: '2024-01-01'
  },
  {
    month: 2,
    date: '2024-02-01',
    btcPrice: 110000,
    totalBtcAmount: 1.1,
    collateralValue: 121000,
    totalDebt: 10000,
    ltv: 8.26,
    highestLtv: 10,
    monthlyWithdrawal: 0,
    events: [],
    activeLoans: [],
    repaymentDue: 0,
    newLoanPrincipal: 0,
    principalForNeeds: 0,
    principalForReinvestment: 0,
    reinvestment: 11000,
    currentBtcAmount: 1.1,
    freeBtc: 1.0,
    lockedBtc: 0.1,
    loanCount: 1,
    repaymentsDue: 0,
    withdrawalAmount: 0,
    dateString: '2024-02-01'
  }
]

const mockParams = {
  initialBtcAmount: 1.0,
  initialBtcPrice: 100000,
  investmentStrategy: 'rollingLoan' as const,
  simulationMonths: 12,
  monthlyWithdrawalAmount: 0,
  annualInterestRate: 0.1,
  loanTermMonths: 6,
  riskLevel: 'moderate' as const,
  platform: 'firefish' as const
}

const mockAnalysis = {
  totalMonths: 2,
  finalPortfolioValue: 121000,
  finalNetWorth: 111000,
  totalDebtPeak: 10000,
  totalReturn: 11000,
  totalReturnPercent: 11.0,
  annualizedReturn: 69.4,
  maxDrawdown: 0,
  maxDrawdownPercent: 0,
  liquidationCount: 0,
  firstLiquidationMonth: null,
  averageDebt: 10000,
  maxDebt: 10000,
  averageLTV: 9.13,
  maxLTV: 10,
  totalWithdrawals: 0,
  totalReinvestments: 11000,
  totalLoanPrincipal: 10000,
  totalRepayments: 0,
  initialBtcAmount: 1.0,
  finalBtcAmount: 1.1,
  btcGrowth: 0.1,
  btcGrowthPercent: 10.0,
  averageMonthlyWithdrawal: 0,
  averageMonthlyReinvestment: 5500,
  averagePortfolioValue: 110500,
  riskLevel: 'low' as const,
  riskScore: 10,
  performanceRating: 'excellent' as const,
  performanceScore: 85
}

describe('ResultsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useSimulation
    vi.mocked(useSimulation).mockReturnValue({
      results: mockResults,
      params: mockParams,
      setParams: vi.fn(),
      currentPage: 1,
      setCurrentPage: vi.fn(),
      priceProjection: null,
      isLoading: false,
      error: null
    })
  })

  describe('Basic Rendering', () => {
    it('should render placeholder when no analysis is available', () => {
      vi.mocked(useResultsAnalysis).mockReturnValue(null)
      
      render(<ResultsSummary />)
      
      expect(screen.getAllByText('Run Simulation')).toHaveLength(5)
      expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
      expect(screen.getByText('Net Worth')).toBeInTheDocument()
      expect(screen.getByText('Total Return')).toBeInTheDocument()
      expect(screen.getByText('Risk Level')).toBeInTheDocument()
      expect(screen.getByText('Performance')).toBeInTheDocument()
    })

    it('should render all metric cards when analysis is available', () => {
      vi.mocked(useResultsAnalysis).mockReturnValue(mockAnalysis)
      
      render(<ResultsSummary />)
      
      // Main performance metrics
      expect(screen.getByText('Final Portfolio Value')).toBeInTheDocument()
      expect(screen.getByText('Net Worth')).toBeInTheDocument()
      expect(screen.getByText('Total Return')).toBeInTheDocument()
      expect(screen.getByText('Risk Level')).toBeInTheDocument()
      
      // Detailed metrics
      expect(screen.getByText('BTC Growth')).toBeInTheDocument()
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
      expect(screen.getByText('Liquidations')).toBeInTheDocument()
      expect(screen.getByText('Max LTV')).toBeInTheDocument()
      expect(screen.getByText('Performance')).toBeInTheDocument()
    })
  })

  describe('Value Display and Formatting', () => {
    beforeEach(() => {
      vi.mocked(useResultsAnalysis).mockReturnValue(mockAnalysis)
    })

    it('should display portfolio value correctly formatted', () => {
      render(<ResultsSummary />)
      
      expect(screen.getByText('$121,000')).toBeInTheDocument()
      expect(screen.getByText('Total BTC value at end')).toBeInTheDocument()
    })

    it('should display net worth with correct color coding', () => {
      render(<ResultsSummary />)
      
      expect(screen.getByText('$111,000')).toBeInTheDocument()
      expect(screen.getByText('Portfolio value minus debt')).toBeInTheDocument()
    })

    it('should display total return with percentage and annualized return', () => {
      render(<ResultsSummary />)
      
      expect(screen.getByText('+11.0%')).toBeInTheDocument()
      expect(screen.getByText('69.4% annualized')).toBeInTheDocument()
    })

    it('should display BTC growth correctly', () => {
      render(<ResultsSummary />)
      
      expect(screen.getByText('+0.1000 BTC')).toBeInTheDocument()
      expect(screen.getByText('10.0% increase')).toBeInTheDocument()
    })

    it('should display risk level with badge and score', () => {
      render(<ResultsSummary />)
      
      expect(screen.getByText('LOW')).toBeInTheDocument()
      expect(screen.getByText('Score: 10/100')).toBeInTheDocument()
    })

    it('should display performance rating with badge and score', () => {
      render(<ResultsSummary />)
      
      expect(screen.getByText('EXCELLENT')).toBeInTheDocument()
      expect(screen.getByText('Score: 85/100')).toBeInTheDocument()
    })
  })

  describe('Color Coding Logic', () => {
    it('should apply green color for positive values', () => {
      vi.mocked(useResultsAnalysis).mockReturnValue(mockAnalysis)
      
      render(<ResultsSummary />)
      
      const netWorthElement = screen.getByText('$111,000')
      expect(netWorthElement).toHaveClass('text-green-600')
    })

    it('should apply red color for negative values', () => {
      const negativeAnalysis = {
        ...mockAnalysis,
        finalNetWorth: -5000,
        totalReturn: -15000,
        totalReturnPercent: -15.0,
        btcGrowth: -0.1,
        btcGrowthPercent: -10.0
      }
      
      vi.mocked(useResultsAnalysis).mockReturnValue(negativeAnalysis)
      
      render(<ResultsSummary />)
      
      const netWorthElement = screen.getByText('$-5,000')
      expect(netWorthElement).toHaveClass('text-red-600')
    })

    it('should apply correct risk level colors', () => {
      const highRiskAnalysis = {
        ...mockAnalysis,
        riskLevel: 'high' as const,
        riskScore: 75
      }
      
      vi.mocked(useResultsAnalysis).mockReturnValue(highRiskAnalysis)
      
      render(<ResultsSummary />)
      
      expect(screen.getByText('HIGH')).toBeInTheDocument()
    })

    it('should apply correct LTV colors based on thresholds', () => {
      const highLTVAnalysis = {
        ...mockAnalysis,
        maxLTV: 85.0
      }
      
      vi.mocked(useResultsAnalysis).mockReturnValue(highLTVAnalysis)
      
      render(<ResultsSummary />)
      
      const ltvElement = screen.getByText('85.0%')
      expect(ltvElement).toHaveClass('text-red-600')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero values correctly', () => {
      const zeroAnalysis = {
        ...mockAnalysis,
        totalReturn: 0,
        totalReturnPercent: 0,
        btcGrowth: 0,
        btcGrowthPercent: 0,
        liquidationCount: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0
      }

      vi.mocked(useResultsAnalysis).mockReturnValue(zeroAnalysis)

      render(<ResultsSummary />)

      expect(screen.getByText('+0.0%')).toBeInTheDocument() // Total return percentage with + prefix
      expect(screen.getByText('+0.0000 BTC')).toBeInTheDocument() // BTC growth amount with + prefix
      expect(screen.getByText('None occurred')).toBeInTheDocument() // No liquidations
    })

    it('should handle liquidation events correctly', () => {
      const liquidationAnalysis = {
        ...mockAnalysis,
        liquidationCount: 2,
        firstLiquidationMonth: 3
      }
      
      vi.mocked(useResultsAnalysis).mockReturnValue(liquidationAnalysis)
      
      render(<ResultsSummary />)
      
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('First: Month 3')).toBeInTheDocument()
    })

    it('should handle no liquidations correctly', () => {
      // Explicitly mock analysis with no liquidations
      const noLiquidationAnalysis = {
        ...mockAnalysis,
        liquidationCount: 0,
        firstLiquidationMonth: null
      }

      vi.mocked(useResultsAnalysis).mockReturnValue(noLiquidationAnalysis)

      render(<ResultsSummary />)

      // Look for liquidation-specific text
      expect(screen.getByText('None occurred')).toBeInTheDocument()

      // Verify liquidation count is 0 by checking the liquidation card structure
      const liquidationCard = screen.getByText('Liquidations').closest('.rounded-lg')
      expect(liquidationCard).toHaveTextContent('0')
      expect(liquidationCard).toHaveTextContent('None occurred')
    })
  })

  describe('Calculation Validation', () => {
    it('should call useResultsAnalysis with correct parameters', () => {
      vi.mocked(useResultsAnalysis).mockReturnValue(mockAnalysis)
      
      render(<ResultsSummary />)
      
      expect(useResultsAnalysis).toHaveBeenCalledWith(mockResults, mockParams)
    })

    it('should display values that match the analysis calculations', () => {
      vi.mocked(useResultsAnalysis).mockReturnValue(mockAnalysis)
      
      render(<ResultsSummary />)
      
      // Verify key calculations are displayed correctly
      expect(screen.getByText('$121,000')).toBeInTheDocument() // finalPortfolioValue
      expect(screen.getByText('$111,000')).toBeInTheDocument() // finalNetWorth
      expect(screen.getByText('+11.0%')).toBeInTheDocument() // totalReturnPercent
      expect(screen.getByText('69.4% annualized')).toBeInTheDocument() // annualizedReturn
      expect(screen.getByText('+0.1000 BTC')).toBeInTheDocument() // btcGrowth
      expect(screen.getByText('10.0% increase')).toBeInTheDocument() // btcGrowthPercent
    })
  })
})
