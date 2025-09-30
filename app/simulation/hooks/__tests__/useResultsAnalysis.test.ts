import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useResultsAnalysis } from '../useResultsAnalysis'
import type { MonthlyResult, SimulationParams } from '../../types/simulation'

// Test data for validation scenarios
const createMockResult = (overrides: Partial<MonthlyResult> = {}): MonthlyResult => ({
  month: 1,
  date: '2024-01-01',
  btcPrice: 100000,
  totalBtcAmount: 1.0,
  collateralValue: 100000,
  totalDebt: 0,
  ltv: 0,
  highestLtv: 0,
  monthlyWithdrawal: 0,
  events: [],
  activeLoans: [],
  repaymentDue: 0,
  newLoanPrincipal: 0,
  principalForNeeds: 0,
  principalForReinvestment: 0,
  reinvestment: 0,
  currentBtcAmount: 1.0,
  freeBtc: 1.0,
  lockedBtc: 0,
  loanCount: 0,
  repaymentsDue: 0,
  withdrawalAmount: 0,
  dateString: '2024-01-01',
  ...overrides
})

const mockParams: SimulationParams = {
  initialBtcAmount: 1.0,
  initialBtcPrice: 100000,
  investmentStrategy: 'rollingLoan',
  simulationMonths: 12,
  monthlyWithdrawalAmount: 0,
  annualInterestRate: 0.1,
  loanTermMonths: 6,
  riskLevel: 'moderate',
  platform: 'firefish'
}

describe('useResultsAnalysis', () => {
  describe('Basic Functionality', () => {
    it('should return null for empty results', () => {
      const { result } = renderHook(() => useResultsAnalysis([], mockParams))
      expect(result.current).toBeNull()
    })

    it('should calculate basic metrics correctly', () => {
      const results = [
        createMockResult({ month: 1, collateralValue: 100000, totalDebt: 10000 }),
        createMockResult({ month: 2, collateralValue: 110000, totalDebt: 10000 })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      expect(analysis.totalMonths).toBe(2)
      expect(analysis.finalPortfolioValue).toBe(110000)
      expect(analysis.finalNetWorth).toBe(100000) // 110000 - 10000
      expect(analysis.totalDebtPeak).toBe(10000)
    })
  })

  describe('Performance Calculations', () => {
    it('should calculate total return correctly', () => {
      // Create 12 monthly results to represent 1 full year
      const results = Array.from({ length: 12 }, (_, i) =>
        createMockResult({
          month: i + 1,
          collateralValue: i === 11 ? 150000 : 100000, // Final month has higher value
          totalDebt: 0,
          currentBtcAmount: 1.0,
          totalBtcAmount: 1.0
        })
      )

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      const initialValue = 100000 // 1.0 BTC * $100,000
      const finalNetWorth = 150000 // No debt
      const expectedReturn = finalNetWorth - initialValue // $50,000
      const expectedReturnPercent = (expectedReturn / initialValue) * 100 // 50%

      expect(analysis.totalReturn).toBe(expectedReturn)
      expect(analysis.totalReturnPercent).toBe(expectedReturnPercent)
      expect(analysis.annualizedReturn).toBeCloseTo(50, 1) // 50% over 1 year (12 months)
    })

    it('should calculate annualized return correctly for different time periods', () => {
      // Create 24 monthly results to represent 2 full years
      const results = Array.from({ length: 24 }, (_, i) =>
        createMockResult({
          month: i + 1,
          collateralValue: i === 23 ? 200000 : 100000, // Final month has doubled value
          totalDebt: 0,
          totalBtcAmount: 1.0
        })
      )

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      // 100% return over 2 years should be ~41.4% annualized
      expect(analysis.annualizedReturn).toBeCloseTo(41.4, 1)
    })
  })

  describe('Risk Metrics', () => {
    it('should calculate max drawdown correctly', () => {
      const results = [
        createMockResult({ month: 1, collateralValue: 100000, totalDebt: 0 }), // Net: $100k
        createMockResult({ month: 2, collateralValue: 120000, totalDebt: 0 }), // Net: $120k (new peak)
        createMockResult({ month: 3, collateralValue: 90000, totalDebt: 0 }),  // Net: $90k (drawdown)
        createMockResult({ month: 4, collateralValue: 110000, totalDebt: 0 })  // Net: $110k (recovery)
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      // Max drawdown should be from $120k peak to $90k trough = $30k (25%)
      expect(analysis.maxDrawdown).toBe(30000)
      expect(analysis.maxDrawdownPercent).toBeCloseTo(25, 1)
    })

    it('should detect liquidation events correctly', () => {
      const results = [
        createMockResult({ 
          month: 1, 
          events: [] 
        }),
        createMockResult({ 
          month: 3, 
          events: [{ type: 'liquidated', description: 'Liquidated due to high LTV' }] 
        }),
        createMockResult({ 
          month: 5, 
          events: [{ type: 'liquidated', description: 'Another liquidation' }] 
        })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      expect(analysis.liquidationCount).toBe(2)
      expect(analysis.firstLiquidationMonth).toBe(3)
    })
  })

  describe('BTC Amount Calculation - CRITICAL VALIDATION', () => {
    it('should use currentBtcAmount for final BTC calculation', () => {
      const results = [
        createMockResult({
          month: 1,
          currentBtcAmount: 1.0
        }),
        createMockResult({
          month: 2,
          currentBtcAmount: 1.1 // This should be used for final calculation
        })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      // Uses currentBtcAmount (1.1) from app/simulation types
      expect(analysis.finalBtcAmount).toBe(1.1) // Uses currentBtcAmount
      expect(analysis.btcGrowth).toBeCloseTo(0.1, 10) // Correctly 0.1 using currentBtcAmount
      expect(analysis.btcGrowthPercent).toBeCloseTo(10, 10) // Correctly 10% using currentBtcAmount
    })
  })

  describe('Debt and LTV Calculations', () => {
    it('should calculate debt metrics correctly', () => {
      const results = [
        createMockResult({ totalDebt: 10000, ltv: 10, highestLtv: 10 }),
        createMockResult({ totalDebt: 15000, ltv: 12, highestLtv: 15 }),
        createMockResult({ totalDebt: 5000, ltv: 5, highestLtv: 15 })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      expect(analysis.averageDebt).toBe(10000) // (10000 + 15000 + 5000) / 3
      expect(analysis.maxDebt).toBe(15000)
      expect(analysis.maxLTV).toBe(15)
      
      // CRITICAL: Currently uses highestLtv for average - should this be ltv?
      expect(analysis.averageLTV).toBeCloseTo(13.33, 2) // (10 + 15 + 15) / 3 = 13.33
    })
  })

  describe('Cash Flow Calculations', () => {
    it('should calculate cash flow metrics correctly', () => {
      const results = [
        createMockResult({ 
          withdrawalAmount: -1000, // Withdrawal (negative)
          reinvestment: 500,
          newLoanPrincipal: 10000,
          repaymentsDue: 0
        }),
        createMockResult({ 
          withdrawalAmount: 0,
          reinvestment: 1000,
          newLoanPrincipal: 5000,
          repaymentsDue: 2000
        })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      expect(analysis.totalWithdrawals).toBe(1000) // Only negative withdrawalAmount
      expect(analysis.totalReinvestments).toBe(1500) // 500 + 1000
      expect(analysis.totalLoanPrincipal).toBe(15000) // 10000 + 5000
      expect(analysis.totalRepayments).toBe(2000) // 0 + 2000
    })

    it('should handle repayments calculation correctly - CRITICAL VALIDATION', () => {
      const results = [
        createMockResult({ repaymentsDue: 1000 }),
        createMockResult({ repaymentsDue: 1500 }),
        createMockResult({ repaymentsDue: 500 })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      // CRITICAL: Verify this doesn't double-count repayments
      expect(analysis.totalRepayments).toBe(3000) // 1000 + 1500 + 500
    })
  })

  describe('Risk Assessment', () => {
    it('should calculate risk score and level correctly', () => {
      const highRiskResults = [
        createMockResult({ 
          month: 1,
          collateralValue: 100000,
          totalDebt: 0,
          highestLtv: 85, // High LTV risk (30 points)
          events: []
        }),
        createMockResult({ 
          month: 2,
          collateralValue: 40000, // 60% drawdown (30 points)
          totalDebt: 0,
          highestLtv: 85,
          events: [{ type: 'liquidated', description: 'Liquidated' }] // Liquidation risk (40 points)
        })
      ]

      const { result } = renderHook(() => useResultsAnalysis(highRiskResults, mockParams))
      const analysis = result.current!

      // Risk score should be: 40 (liquidation) + 30 (LTV) + 30 (drawdown) = 100
      expect(analysis.riskScore).toBe(100)
      expect(analysis.riskLevel).toBe('extreme')
    })

    it('should calculate low risk correctly', () => {
      const lowRiskResults = [
        createMockResult({ 
          collateralValue: 100000,
          totalDebt: 0,
          highestLtv: 30, // Low LTV (10 points)
          events: []
        }),
        createMockResult({ 
          collateralValue: 110000, // No drawdown (0 points)
          totalDebt: 0,
          highestLtv: 30,
          events: [] // No liquidations (0 points)
        })
      ]

      const { result } = renderHook(() => useResultsAnalysis(lowRiskResults, mockParams))
      const analysis = result.current!

      expect(analysis.riskScore).toBe(10) // Only LTV risk
      expect(analysis.riskLevel).toBe('low')
    })
  })

  describe('Performance Rating', () => {
    it('should calculate excellent performance correctly', () => {
      const excellentResults = [
        createMockResult({ month: 1, collateralValue: 100000, totalDebt: 0 }),
        createMockResult({ month: 12, collateralValue: 200000, totalDebt: 0 }) // 100% annual return
      ]

      const { result } = renderHook(() => useResultsAnalysis(excellentResults, mockParams))
      const analysis = result.current!

      // Performance score: 50 (return) + 30 (stability) + 20 (no liquidations) = 100
      expect(analysis.performanceScore).toBe(100)
      expect(analysis.performanceRating).toBe('excellent')
    })

    it('should penalize liquidations in performance score', () => {
      const resultsWithLiquidations = [
        createMockResult({ 
          month: 1, 
          collateralValue: 100000, 
          totalDebt: 0,
          events: []
        }),
        createMockResult({ 
          month: 12, 
          collateralValue: 200000, 
          totalDebt: 0,
          events: [{ type: 'liquidated', description: 'Liquidated' }]
        })
      ]

      const { result } = renderHook(() => useResultsAnalysis(resultsWithLiquidations, mockParams))
      const analysis = result.current!

      // Should lose 5 points per liquidation from efficiency score
      expect(analysis.performanceScore).toBe(95) // 50 + 30 + 15 (20 - 5)
      expect(analysis.performanceRating).toBe('excellent')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single month simulation', () => {
      const results = [
        createMockResult({ month: 1, collateralValue: 100000, totalDebt: 0 })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, mockParams))
      const analysis = result.current!

      expect(analysis.totalMonths).toBe(1)
      expect(analysis.annualizedReturn).toBe(0) // No time elapsed
    })

    it('should handle zero initial value', () => {
      const zeroParams = { ...mockParams, initialBtcAmount: 0, initialBtcPrice: 100000 }
      const results = [
        createMockResult({ month: 1, collateralValue: 0, totalDebt: 0, currentBtcAmount: 1.1 })
      ]

      const { result } = renderHook(() => useResultsAnalysis(results, zeroParams))
      const analysis = result.current!

      // When initial BTC amount is 0 but final is 1.1, we get 1.1/0 * 100 = Infinity
      expect(analysis.totalReturnPercent).toBeNaN() // 0/0 = NaN (net worth change)
      expect(analysis.btcGrowthPercent).toBe(Infinity) // 1.1/0 * 100 = Infinity
    })
  })
})
