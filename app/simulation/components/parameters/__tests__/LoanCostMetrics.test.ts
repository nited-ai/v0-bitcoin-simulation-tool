/**
 * Loan Cost Metrics Tests
 * 
 * Tests for the enhanced loan cost calculations in CalculationsService
 * to verify accuracy of total interest, origination fee, and total repayment calculations.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CalculationsService, type SimulationParams } from '../calculationsService'

describe('Loan Cost Metrics', () => {
  let service: CalculationsService
  
  beforeEach(() => {
    service = new CalculationsService()
  })

  describe('Total Interest Calculation', () => {
    it('should calculate total interest correctly for standard loan', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        loanAmountPercent: 15, // $15,000 loan
        platform: 'firefish',
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5, // 6.5% annual
          loanTermMonths: 12, // 12 months
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)
      
      // Expected calculation:
      // Loan Amount: $100,000 * 15% = $15,000
      // Monthly Interest Rate: 6.5% / 12 = 0.5417%
      // Monthly Interest Payment: $15,000 * 0.5417% = $81.25
      // Total Interest: $81.25 * 12 = $975
      
      expect(result.initialCurrentLoanAmount).toBe(15000)
      expect(result.initialTotalInterestPayment).toBeCloseTo(975, 0)
    })

    it('should calculate total interest correctly for longer term loan', () => {
      const params: SimulationParams = {
        initialBtcAmount: 2.0,
        initialBtcPrice: 80000,
        loanAmountPercent: 20, // $32,000 loan
        platform: 'strike',
        riskManagement: {
          targetLtv: 60,
          maxLoanAmount: 100000,
          annualInterestRate: 8.0, // 8% annual
          loanTermMonths: 24, // 24 months
          liquidationFeePercent: 4
        }
      }

      const result = service.calculateLoanMetrics(params)
      
      // Expected calculation:
      // Loan Amount: $160,000 * 20% = $32,000
      // Monthly Interest Rate: 8% / 12 = 0.6667%
      // Monthly Interest Payment: $32,000 * 0.6667% = $213.33
      // Total Interest: $213.33 * 24 = $5,120
      
      expect(result.initialCurrentLoanAmount).toBe(32000)
      expect(result.initialTotalInterestPayment).toBeCloseTo(5120, 0)
    })
  })

  describe('Origination Fee Calculation', () => {
    it('should calculate one-time origination fee correctly for Strike platform', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.5,
        initialBtcPrice: 90000,
        loanAmountPercent: 10, // $13,500 loan
        platform: 'strike',
        riskManagement: {
          targetLtv: 45,
          maxLoanAmount: 40000,
          annualInterestRate: 7.0,
          loanTermMonths: 6,
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)

      // Expected calculation:
      // Loan Amount: $135,000 * 10% = $13,500
      // Origination Fee: $13,500 * 0% = $0 (Strike has no origination fee)

      expect(result.initialCurrentLoanAmount).toBe(13500)
      expect(result.initialOriginationFee).toBe(0)
    })

    it('should calculate annual origination fee correctly for Firefish platform', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.5,
        initialBtcPrice: 90000,
        loanAmountPercent: 10, // $13,500 loan
        platform: 'firefish',
        riskManagement: {
          targetLtv: 45,
          maxLoanAmount: 40000,
          annualInterestRate: 7.0,
          loanTermMonths: 12, // 1 year loan
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)

      // Expected calculation:
      // Loan Amount: $135,000 * 10% = $13,500
      // Annual Origination Fee: $13,500 * 1.5% = $202.5
      // Loan Term: 12 months = 1 year
      // Total Origination Fee: $202.5 * 1 = $202.5

      expect(result.initialCurrentLoanAmount).toBe(13500)
      expect(result.initialOriginationFee).toBe(202.5)
    })

    it('should calculate annual origination fee correctly for multi-year loans', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        loanAmountPercent: 20, // $20,000 loan
        platform: 'firefish',
        riskManagement: {
          targetLtv: 45,
          maxLoanAmount: 40000,
          annualInterestRate: 7.0,
          loanTermMonths: 24, // 2 year loan
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)

      // Expected calculation:
      // Loan Amount: $100,000 * 20% = $20,000
      // Annual Origination Fee: $20,000 * 1.5% = $300
      // Loan Term: 24 months = 2 years
      // Total Origination Fee: $300 * 2 = $600

      expect(result.initialCurrentLoanAmount).toBe(20000)
      expect(result.initialOriginationFee).toBe(600)
    })
  })

  describe('Total Loan Cost Calculation', () => {
    it('should calculate total repayment amount correctly', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        loanAmountPercent: 15, // $15,000 loan
        platform: 'firefish',
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5,
          loanTermMonths: 12,
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)
      
      // Expected calculation:
      // Loan Principal: $15,000
      // Origination Fee: $15,000 * 1.5% = $225 (Firefish has 1.5% origination fee)
      // Total Interest: ~$975 (calculated above)
      // Total Repayment: $15,000 + $225 + $975 = $16,200

      expect(result.initialCurrentLoanAmount).toBe(15000)
      expect(result.initialOriginationFee).toBe(225)
      expect(result.initialTotalInterestPayment).toBeCloseTo(975, 0)
      expect(result.initialTotalLoanCost).toBeCloseTo(16200, 0)
    })

    it('should handle infinite term loans correctly', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        loanAmountPercent: 10,
        platform: 'custom',
        riskManagement: {
          targetLtv: 40,
          maxLoanAmount: 30000,
          annualInterestRate: 5.0,
          loanTermMonths: Infinity, // Infinite term
          liquidationFeePercent: 3
        }
      }

      const result = service.calculateLoanMetrics(params)
      
      // For infinite term loans, should calculate 12 months of interest as reference
      // Loan Amount: $10,000
      // Monthly Interest: $10,000 * (5% / 12) = $41.67
      // Reference Interest (12 months): $41.67 * 12 = $500
      
      expect(result.initialCurrentLoanAmount).toBe(10000)
      expect(result.initialTotalInterestPayment).toBeCloseTo(500, 0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero loan amount', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        loanAmountPercent: 0, // No loan
        platform: 'firefish',
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5,
          loanTermMonths: 12,
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)
      
      expect(result.initialCurrentLoanAmount).toBe(0)
      expect(result.initialOriginationFee).toBe(0)
      expect(result.initialTotalInterestPayment).toBe(0)
      expect(result.initialTotalLoanCost).toBe(0)
    })

    it('should handle zero interest rate', () => {
      const params: SimulationParams = {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        loanAmountPercent: 10,
        platform: 'firefish',
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 0, // No interest
          loanTermMonths: 12,
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLoanMetrics(params)
      
      expect(result.initialCurrentLoanAmount).toBe(10000)
      expect(result.initialOriginationFee).toBe(150) // 1.5% of $10,000 (Firefish)
      expect(result.initialTotalInterestPayment).toBe(0)
      expect(result.initialTotalLoanCost).toBe(10150) // Principal + origination fee only
    })
  })
})
