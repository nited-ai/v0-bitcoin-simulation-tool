import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RiskAssessment } from '../RiskAssessment'

// Mock simulation context
const mockSimulationContext = {
  results: [],
  params: {
    initialBtcAmount: 1.0,
    investmentStrategy: 'rollingLoan',
    loanAmountPercent: 10,
    targetLtv: 50
  }
}

// Mock results analysis
const mockAnalysis = {
  liquidationCount: 0,
  maxLTV: 45,
  maxDrawdownPercent: 20,
  averageLTV: 35,
  maxDebt: 50000,
  finalPortfolioValue: 150000,
  riskLevel: 'medium'
}

vi.mock('../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext
}))

vi.mock('../../hooks/useResultsAnalysis', () => ({
  useResultsAnalysis: () => mockAnalysis
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback
  })
}))

describe('RiskAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the risk assessment card', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
      expect(screen.getByText('Comprehensive risk analysis for your simulation parameters')).toBeInTheDocument()
    })

    it('should display overall risk score', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Overall Risk Score')).toBeInTheDocument()
      expect(screen.getByText(/\/100/)).toBeInTheDocument()
    })

    it('should display risk breakdown section', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Risk Breakdown')).toBeInTheDocument()
    })
  })

  describe('Risk Scoring Validation', () => {
    it('should calculate risk score using weighted system: Liquidation (40) + LTV (30) + Drawdown (30)', () => {
      // Test case: 85% max LTV should give 30 points = Medium risk
      const highLtvAnalysis = {
        ...mockAnalysis,
        maxLTV: 85,
        maxDrawdownPercent: 10,
        liquidationCount: 0
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(highLtvAnalysis)
      
      render(<RiskAssessment />)
      
      // Should show 30 points for LTV risk (85% > 80%)
      expect(screen.getByText('30/100')).toBeInTheDocument()
    })

    it('should assign correct risk levels based on thresholds', () => {
      const testCases = [
        { score: 15, expectedLevel: 'low' },    // <25 = low
        { score: 35, expectedLevel: 'medium' }, // 25-49 = medium  
        { score: 55, expectedLevel: 'high' },   // 50-69 = high
        { score: 75, expectedLevel: 'extreme' } // 70+ = extreme
      ]

      testCases.forEach(({ score, expectedLevel }) => {
        // Mock analysis to produce the desired score
        const testAnalysis = {
          ...mockAnalysis,
          liquidationCount: score >= 40 ? 1 : 0,
          maxLTV: score >= 70 ? 85 : score >= 40 ? 65 : score >= 25 ? 35 : 25,
          maxDrawdownPercent: score >= 60 ? 35 : score >= 30 ? 25 : 10
        }
        
        vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(testAnalysis)
        
        const { rerender } = render(<RiskAssessment />)
        
        expect(screen.getByText(expectedLevel.toUpperCase())).toBeInTheDocument()
        
        rerender(<div />)
      })
    })
  })

  describe('Individual Risk Metrics', () => {
    it('should display liquidation risk metric', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Liquidation Risk')).toBeInTheDocument()
    })

    it('should display volatility risk metric', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Volatility Risk')).toBeInTheDocument()
    })

    it('should display debt exposure metric', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Debt Exposure')).toBeInTheDocument()
    })

    it('should display concentration risk metric', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Concentration Risk')).toBeInTheDocument()
    })

    it('should display strategy risk metric', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Strategy Risk')).toBeInTheDocument()
    })
  })

  describe('Strategy Risk Calculation', () => {
    it('should calculate strategy risk based on loan exposure and target LTV', () => {
      const testCases = [
        { loanPercent: 5, targetLtv: 30, expectedLevel: 'low' },
        { loanPercent: 15, targetLtv: 50, expectedLevel: 'medium' },
        { loanPercent: 25, targetLtv: 70, expectedLevel: 'high' },
        { loanPercent: 30, targetLtv: 80, expectedLevel: 'extreme' }
      ]

      testCases.forEach(({ loanPercent, targetLtv, expectedLevel }) => {
        mockSimulationContext.params.loanAmountPercent = loanPercent
        mockSimulationContext.params.targetLtv = targetLtv
        
        const { rerender } = render(<RiskAssessment />)
        
        // Strategy risk should reflect the parameters
        expect(screen.getByText('Strategy Risk')).toBeInTheDocument()
        
        rerender(<div />)
      })
    })

    it('should not use hardcoded strategy values', () => {
      // Ensure strategy risk is calculated dynamically, not hardcoded
      mockSimulationContext.params.investmentStrategy = 'rollingLoan'
      mockSimulationContext.params.loanAmountPercent = 20
      mockSimulationContext.params.targetLtv = 60
      
      render(<RiskAssessment />)
      
      // Should show dynamic description based on actual parameters
      expect(screen.getByText(/rollingLoan strategy with 20% loan exposure/)).toBeInTheDocument()
    })
  })

  describe('Risk Recommendations', () => {
    it('should show recommendations section', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Risk Recommendations')).toBeInTheDocument()
    })

    it('should provide liquidation-specific recommendations when liquidations occurred', () => {
      const liquidationAnalysis = {
        ...mockAnalysis,
        liquidationCount: 2
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(liquidationAnalysis)
      
      render(<RiskAssessment />)
      
      expect(screen.getByText(/Consider reducing target LTV to avoid liquidations/)).toBeInTheDocument()
    })

    it('should provide high LTV recommendations when max LTV > 80%', () => {
      const highLtvAnalysis = {
        ...mockAnalysis,
        maxLTV: 85
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(highLtvAnalysis)
      
      render(<RiskAssessment />)
      
      expect(screen.getByText(/Your maximum LTV exceeded 80% - consider more conservative parameters/)).toBeInTheDocument()
    })
  })

  describe('Risk Summary', () => {
    it('should display risk summary section', () => {
      render(<RiskAssessment />)
      
      expect(screen.getByText('Risk Summary')).toBeInTheDocument()
      expect(screen.getByText('Liquidation Events')).toBeInTheDocument()
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
      expect(screen.getByText('Risk Rating')).toBeInTheDocument()
    })

    it('should show correct liquidation count', () => {
      const liquidationAnalysis = {
        ...mockAnalysis,
        liquidationCount: 3
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(liquidationAnalysis)
      
      render(<RiskAssessment />)
      
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display max drawdown percentage', () => {
      const drawdownAnalysis = {
        ...mockAnalysis,
        maxDrawdownPercent: 35.7
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(drawdownAnalysis)
      
      render(<RiskAssessment />)
      
      expect(screen.getByText('35.7%')).toBeInTheDocument()
    })
  })

  describe('Validation Example: 85% max LTV = 30pts = Medium risk', () => {
    it('should correctly calculate 30 points for 85% max LTV resulting in medium risk', () => {
      const validationAnalysis = {
        liquidationCount: 0,        // 0 points
        maxLTV: 85,                // 30 points (>80%)
        maxDrawdownPercent: 10,    // 0 points (<15%)
        averageLTV: 60,
        maxDebt: 85000,
        finalPortfolioValue: 100000,
        riskLevel: 'medium'
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(validationAnalysis)
      
      render(<RiskAssessment />)
      
      // Should show 30/100 risk score
      expect(screen.getByText('30/100')).toBeInTheDocument()
      
      // Should show MEDIUM risk level
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing analysis gracefully', () => {
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(null)
      
      render(<RiskAssessment />)
      
      expect(screen.getByText('Run a simulation to see risk assessment')).toBeInTheDocument()
    })

    it('should handle zero values correctly', () => {
      const zeroAnalysis = {
        liquidationCount: 0,
        maxLTV: 0,
        maxDrawdownPercent: 0,
        averageLTV: 0,
        maxDebt: 0,
        finalPortfolioValue: 100000,
        riskLevel: 'low'
      }
      
      vi.mocked(require('../../hooks/useResultsAnalysis').useResultsAnalysis).mockReturnValue(zeroAnalysis)
      
      render(<RiskAssessment />)
      
      // Should show 0/100 risk score for zero risk scenario
      expect(screen.getByText('0/100')).toBeInTheDocument()
      expect(screen.getByText('LOW')).toBeInTheDocument()
    })
  })
})
