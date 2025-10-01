/**
 * Centralized Loan Calculation Service Tests
 * 
 * Tests for the centralized loan calculation service that ensures
 * consistent loan calculations across the application.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { CentralizedLoanCalculationService } from '../CentralizedLoanCalculationService'
import type { StrategyExecutionParams } from '../../types'

describe('CentralizedLoanCalculationService', () => {
  let service: CentralizedLoanCalculationService
  let mockParams: StrategyExecutionParams

  beforeEach(() => {
    service = new CentralizedLoanCalculationService()
    
    mockParams = {
      btcAmount: 1.0,
      initialBtcPrice: 50000,
      monthlyWithdrawalAmount: 0,
      annualInterestRate: 6.5,
      loanOriginationFeePercent: 1.5,
      loanTermMonths: 6,
      simulationMonths: 12,
      maxLoanAmount: 25000,
      expectedAnnualInflation: 3,
      btcAccumulation: true,
      investmentStrategy: 'rollingLoan',
      riskManagement: {
        targetLtv: 50,
        liquidationLtv: 80,
        maxLoanAmount: 25000,
        liquidationFeePercent: 5,
        annualInterestRate: 6.5
      }
    }
  })

  describe('calculateLoanDetails', () => {
    test('should calculate loan details correctly', () => {
      const principal = 10000
      const collateralValue = 50000
      
      const result = service.calculateLoanDetails(principal, collateralValue, mockParams)
      
      expect(result.principal).toBe(10000)
      expect(result.collateralValue).toBe(50000)
      expect(result.ltv).toBe(20) // 10000 / 50000 * 100
      
      // Origination fee: 10000 * 1.5% = 150
      expect(result.originationFee).toBe(150)
      expect(result.originationFeePercent).toBe(1.5)
      
      // Interest: 10000 * 6.5% / 12 * 6 months = 325
      expect(result.totalInterest).toBe(325)
      expect(result.monthlyInterest).toBeCloseTo(54.17, 2)
      
      // Total repayment: 10000 + 150 + 325 = 10475
      expect(result.totalRepayment).toBe(10475)
      
      // Effective cost: 150 + 325 = 475
      expect(result.effectiveCost).toBe(475)
      expect(result.effectiveCostPercent).toBe(4.75) // 475 / 10000 * 100
    })

    test('should handle zero origination fee', () => {
      const principal = 10000
      const collateralValue = 50000
      const paramsNoFee = { ...mockParams, loanOriginationFeePercent: 0 }
      
      const result = service.calculateLoanDetails(principal, collateralValue, paramsNoFee)
      
      expect(result.originationFee).toBe(0)
      expect(result.originationFeeType).toBe('none')
      expect(result.effectiveCost).toBe(result.totalInterest) // Only interest
    })

    test('should handle infinite loan term', () => {
      const principal = 10000
      const collateralValue = 50000
      const paramsInfinite = { ...mockParams, loanTermMonths: Infinity }
      
      const result = service.calculateLoanDetails(principal, collateralValue, paramsInfinite)
      
      // For infinite term, calculate 12 months of interest as reference
      const expectedInterest = principal * (mockParams.annualInterestRate / 100 / 12) * 12
      expect(result.totalInterest).toBeCloseTo(expectedInterest, 2)
    })

    test('should calculate LTV correctly', () => {
      const testCases = [
        { principal: 10000, collateral: 50000, expectedLtv: 20 },
        { principal: 25000, collateral: 50000, expectedLtv: 50 },
        { principal: 40000, collateral: 50000, expectedLtv: 80 }
      ]
      
      testCases.forEach(({ principal, collateral, expectedLtv }) => {
        const result = service.calculateLoanDetails(principal, collateral, mockParams)
        expect(result.ltv).toBe(expectedLtv)
      })
    })
  })

  describe('calculateInvestmentMultiplier', () => {
    test('should calculate investment multiplier correctly', () => {
      const principal = 10000
      const collateralValue = 50000
      
      const loanDetails = service.calculateLoanDetails(principal, collateralValue, mockParams)
      const multiplier = service.calculateInvestmentMultiplier(loanDetails, collateralValue)
      
      // Investment multiplier = principal / collateralValue
      expect(multiplier).toBe(0.2) // 10000 / 50000
    })

    test('should handle different principal amounts', () => {
      const testCases = [
        { principal: 5000, collateral: 50000, expectedMultiplier: 0.1 },
        { principal: 10000, collateral: 50000, expectedMultiplier: 0.2 },
        { principal: 25000, collateral: 50000, expectedMultiplier: 0.5 }
      ]
      
      testCases.forEach(({ principal, collateral, expectedMultiplier }) => {
        const loanDetails = service.calculateLoanDetails(principal, collateral, mockParams)
        const multiplier = service.calculateInvestmentMultiplier(loanDetails, collateral)
        expect(multiplier).toBe(expectedMultiplier)
      })
    })
  })

  describe('calculateMinimumLoanForRollover', () => {
    test('should calculate minimum loan for rollover correctly', () => {
      const repaymentDue = 10000
      const originationFeePercent = 1.5
      
      const minimumLoan = service.calculateMinimumLoanForRollover(repaymentDue, originationFeePercent)
      
      // Minimum loan = repaymentDue / (1 - fee%)
      // = 10000 / (1 - 0.015) = 10000 / 0.985 = 10152.28
      expect(minimumLoan).toBeCloseTo(10152.28, 2)
    })

    test('should handle zero origination fee', () => {
      const repaymentDue = 10000
      const originationFeePercent = 0
      
      const minimumLoan = service.calculateMinimumLoanForRollover(repaymentDue, originationFeePercent)
      
      // With no fee, minimum loan equals repayment due
      expect(minimumLoan).toBe(10000)
    })
  })

  describe('calculateRepaymentAmount', () => {
    test('should calculate repayment amount correctly', () => {
      const principal = 10000
      
      const repayment = service.calculateRepaymentAmount(principal, mockParams)
      
      // Repayment = principal + total interest
      // Interest = 10000 * 6.5% / 12 * 6 = 325
      // Repayment = 10000 + 325 = 10325
      expect(repayment).toBe(10325)
    })

    test('should handle infinite loan term', () => {
      const principal = 10000
      const paramsInfinite = { ...mockParams, loanTermMonths: Infinity }
      
      const repayment = service.calculateRepaymentAmount(principal, paramsInfinite)
      
      // For infinite term, repay principal + one month interest
      const monthlyInterest = principal * (mockParams.annualInterestRate / 100 / 12)
      expect(repayment).toBeCloseTo(principal + monthlyInterest, 2)
    })
  })

  describe('formatLoanCalculation', () => {
    test('should format loan calculation correctly', () => {
      const principal = 10000
      const collateralValue = 50000
      
      const loanDetails = service.calculateLoanDetails(principal, collateralValue, mockParams)
      const formatted = service.formatLoanCalculation(loanDetails)
      
      expect(formatted.principalFormatted).toBe('$10,000')
      expect(formatted.originationFeeFormatted).toBe('$150')
      expect(formatted.totalInterestFormatted).toBe('$325')
      expect(formatted.totalRepaymentFormatted).toBe('$10,475')
      expect(formatted.effectiveCostFormatted).toBe('$475')
      expect(formatted.effectiveCostPercentFormatted).toBe('4.75%')
      expect(formatted.ltvFormatted).toBe('20.0%')
    })
  })

  describe('validateParameters', () => {
    test('should validate correct parameters', () => {
      const principal = 10000
      const collateralValue = 50000
      
      const validation = service.validateParameters(principal, collateralValue, mockParams)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    test('should reject zero principal', () => {
      const principal = 0
      const collateralValue = 50000
      
      const validation = service.validateParameters(principal, collateralValue, mockParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Principal must be greater than 0')
    })

    test('should reject zero collateral', () => {
      const principal = 10000
      const collateralValue = 0
      
      const validation = service.validateParameters(principal, collateralValue, mockParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Collateral value must be greater than 0')
    })

    test('should reject principal exceeding collateral', () => {
      const principal = 60000
      const collateralValue = 50000
      
      const validation = service.validateParameters(principal, collateralValue, mockParams)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Principal cannot exceed collateral value')
    })

    test('should reject negative interest rate', () => {
      const principal = 10000
      const collateralValue = 50000
      const paramsNegativeRate = { ...mockParams, annualInterestRate: -5 }
      
      const validation = service.validateParameters(principal, collateralValue, paramsNegativeRate)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Interest rate cannot be negative')
    })
  })

  describe('Integration with Rolling Loan Strategy', () => {
    test('should provide consistent calculations for strategy execution', () => {
      const principal = 10000
      const collateralValue = 50000
      
      // Calculate loan details
      const loanDetails = service.calculateLoanDetails(principal, collateralValue, mockParams)
      
      // Calculate investment multiplier
      const multiplier = service.calculateInvestmentMultiplier(loanDetails, collateralValue)
      
      // Verify consistency
      expect(loanDetails.principal * multiplier).toBeCloseTo(principal * multiplier, 2)
      expect(multiplier).toBe(principal / collateralValue)
    })
  })
})

