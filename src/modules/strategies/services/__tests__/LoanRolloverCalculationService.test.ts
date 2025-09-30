import { describe, it, expect, beforeEach } from 'vitest'
import { LoanRolloverCalculationService } from '../LoanRolloverCalculationService'
import type { LoanRolloverParams, LoanRolloverResult, PlatformFeeConfig } from '../types'

describe('LoanRolloverCalculationService', () => {
  let service: LoanRolloverCalculationService

  beforeEach(() => {
    service = new LoanRolloverCalculationService()
  })

  describe('Basic Interface', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(LoanRolloverCalculationService)
    })

    it('should have all required methods', () => {
      expect(typeof service.calculateMinimumLoanAmount).toBe('function')
      expect(typeof service.calculateMaximumLoanAmount).toBe('function')
      expect(typeof service.calculateExcessProceeds).toBe('function')
      expect(typeof service.calculateLoanRollover).toBe('function')
      expect(typeof service.detectInsufficientCollateral).toBe('function')
    })
  })

  describe('Minimum Loan Amount Calculation', () => {
    it('should calculate minimum loan for principal repayment only', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 10000,
        accruedInterest: 0,
        platformFeeConfig: { type: 'none', percent: 0 },
        loanOriginationFeePercent: 2
      }

      const result = service.calculateMinimumLoanAmount(params)
      
      // Minimum = (10000 + 0 + 0) / (1 - 0.02) = 10204.08
      expect(result).toBeCloseTo(10204.08, 2)
    })

    it('should calculate minimum loan with accrued interest', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 10000,
        accruedInterest: 500,
        platformFeeConfig: { type: 'none', percent: 0 },
        loanOriginationFeePercent: 2
      }

      const result = service.calculateMinimumLoanAmount(params)
      
      // Minimum = (10000 + 500 + 0) / (1 - 0.02) = 10714.29
      expect(result).toBeCloseTo(10714.29, 2)
    })

    it('should calculate minimum loan with Firefish annual platform fees', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 10000,
        accruedInterest: 500,
        platformFeeConfig: { type: 'annual', percent: 1.5 },
        loanOriginationFeePercent: 2,
        loanTermMonths: 12
      }

      const result = service.calculateMinimumLoanAmount(params)
      
      // Platform fee = 10000 * 0.015 * 1 = 150
      // Minimum = (10000 + 500 + 150) / (1 - 0.02) = 10867.35
      expect(result).toBeCloseTo(10867.35, 2)
    })

    it('should handle Strike platform with zero fees', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 10000,
        accruedInterest: 500,
        platformFeeConfig: { type: 'none', percent: 0 },
        loanOriginationFeePercent: 0
      }

      const result = service.calculateMinimumLoanAmount(params)
      
      // Minimum = (10000 + 500 + 0) / (1 - 0) = 10500
      expect(result).toBe(10500)
    })

    it('should calculate minimum loan with Custom platform one-time fees', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 10000,
        accruedInterest: 500,
        platformFeeConfig: { type: 'one-time', percent: 1.0 },
        loanOriginationFeePercent: 2
      }

      const result = service.calculateMinimumLoanAmount(params)
      
      // Platform fee = 10000 * 0.01 = 100 (one-time on original principal)
      // Minimum = (10000 + 500 + 100) / (1 - 0.02) = 10816.33
      expect(result).toBeCloseTo(10816.33, 2)
    })
  })

  describe('Maximum Loan Amount Calculation', () => {
    it('should calculate maximum loan based on target percentage', () => {
      const btcStackValue = 100000
      const targetLtvPercent = 50

      const result = service.calculateMaximumLoanAmount(btcStackValue, targetLtvPercent)
      
      expect(result).toBe(50000)
    })

    it('should handle zero BTC stack value', () => {
      const btcStackValue = 0
      const targetLtvPercent = 50

      const result = service.calculateMaximumLoanAmount(btcStackValue, targetLtvPercent)
      
      expect(result).toBe(0)
    })

    it('should handle 100% target LTV', () => {
      const btcStackValue = 100000
      const targetLtvPercent = 100

      const result = service.calculateMaximumLoanAmount(btcStackValue, targetLtvPercent)
      
      expect(result).toBe(100000)
    })
  })

  describe('Excess Proceeds Calculation', () => {
    it('should calculate excess proceeds correctly', () => {
      const newLoanAmount = 15000
      const totalRepaymentDue = 10500

      const result = service.calculateExcessProceeds(newLoanAmount, totalRepaymentDue)
      
      expect(result).toBe(4500)
    })

    it('should return zero for negative excess', () => {
      const newLoanAmount = 10000
      const totalRepaymentDue = 12000

      const result = service.calculateExcessProceeds(newLoanAmount, totalRepaymentDue)
      
      expect(result).toBe(0)
    })

    it('should handle exact match', () => {
      const newLoanAmount = 10500
      const totalRepaymentDue = 10500

      const result = service.calculateExcessProceeds(newLoanAmount, totalRepaymentDue)
      
      expect(result).toBe(0)
    })
  })

  describe('Insufficient Collateral Detection', () => {
    it('should detect sufficient collateral', () => {
      const minimumLoanNeeded = 10000
      const btcStackValue = 50000
      const liquidationLtvPercent = 95

      const result = service.detectInsufficientCollateral(minimumLoanNeeded, btcStackValue, liquidationLtvPercent)
      
      expect(result.hasInsufficientCollateral).toBe(false)
      expect(result.maxPossibleLoan).toBe(47500) // 50000 * 0.95
    })

    it('should detect insufficient collateral', () => {
      const minimumLoanNeeded = 50000
      const btcStackValue = 50000
      const liquidationLtvPercent = 95

      const result = service.detectInsufficientCollateral(minimumLoanNeeded, btcStackValue, liquidationLtvPercent)
      
      expect(result.hasInsufficientCollateral).toBe(true)
      expect(result.maxPossibleLoan).toBe(47500)
      expect(result.shortfall).toBe(2500) // 50000 - 47500
    })

    it('should handle edge case at liquidation limit', () => {
      const minimumLoanNeeded = 47500
      const btcStackValue = 50000
      const liquidationLtvPercent = 95

      const result = service.detectInsufficientCollateral(minimumLoanNeeded, btcStackValue, liquidationLtvPercent)
      
      expect(result.hasInsufficientCollateral).toBe(false)
      expect(result.maxPossibleLoan).toBe(47500)
    })
  })

  describe('Complete Loan Rollover Calculation', () => {
    it('should calculate successful rollover with excess proceeds', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 10000,
        accruedInterest: 500,
        platformFeeConfig: { type: 'none', percent: 0 },
        loanOriginationFeePercent: 2,
        btcStackValue: 100000,
        loanAmountPercent: 60, // 60% of BTC stack
        liquidationLtvPercent: 95
      }

      const result = service.calculateLoanRollover(params)
      
      expect(result.success).toBe(true)
      expect(result.minimumLoanNeeded).toBeCloseTo(10714.29, 2)
      expect(result.maximumLoanAmount).toBe(60000)
      expect(result.actualLoanAmount).toBe(60000) // Uses maximum since minimum < maximum
      expect(result.excessProceeds).toBeCloseTo(49500, 2) // 60000 - 10500 (total repayment due)
      expect(result.conflictResolution).toBe('none')
    })

    it('should handle conflict when minimum exceeds target', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 40000,
        accruedInterest: 2000,
        platformFeeConfig: { type: 'annual', percent: 1.5 },
        loanOriginationFeePercent: 2,
        loanTermMonths: 12,
        btcStackValue: 100000,
        targetLtvPercent: 40, // Target would be 40000, but minimum is higher
        liquidationLtvPercent: 95
      }

      const result = service.calculateLoanRollover(params)
      
      expect(result.success).toBe(true)
      expect(result.conflictResolution).toBe('forced_exceedance')
      expect(result.actualLoanAmount).toBeGreaterThan(40000) // Forced to exceed target
      expect(result.actualLoanAmount).toBeLessThan(95000) // But within liquidation limit
    })

    it('should detect liquidation scenario', () => {
      const params: LoanRolloverParams = {
        previousLoanPrincipal: 90000,
        accruedInterest: 4500,
        platformFeeConfig: { type: 'annual', percent: 1.5 },
        loanOriginationFeePercent: 2,
        loanTermMonths: 12,
        btcStackValue: 100000,
        targetLtvPercent: 50,
        liquidationLtvPercent: 95
      }

      const result = service.calculateLoanRollover(params)
      
      expect(result.success).toBe(false)
      expect(result.conflictResolution).toBe('liquidation')
      expect(result.insufficientCollateral?.hasInsufficientCollateral).toBe(true)
    })
  })
})
