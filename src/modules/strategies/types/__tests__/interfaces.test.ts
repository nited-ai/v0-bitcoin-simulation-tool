/**
 * Tests for Strategy Module Type Interfaces
 * 
 * Tests for new interface fields added for Dynamic Rolling Loan Strategy
 */

import { describe, it, expect } from 'vitest'
import type {
  StrategyExecutionParams,
  MonthlyResult,
  Loan
} from '../index'

describe('StrategyExecutionParams Interface', () => {
  describe('annualSavingsIncrease field', () => {
    it('should accept valid annualSavingsIncrease parameter', () => {
      const params: StrategyExecutionParams = {
        btcAmount: 10,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 1000,
        annualInterestRate: 0.08,
        loanOriginationFeePercent: 0.01,
        loanTermMonths: Infinity,
        simulationMonths: 120,
        maxLoanAmount: 150000,
        expectedAnnualInflation: 0.03,
        btcAccumulation: true,
        annualSavingsIncrease: 10, // NEW FIELD - 10% annual increase
        riskManagement: {
          targetLtv: 15,
          liquidationLtv: 85,
          maxLoanAmount: 150000,
          liquidationFeePercent: 0.05,
          annualInterestRate: 0.08
        },
        investmentStrategy: 'rollingLoan'
      }

      expect(params.annualSavingsIncrease).toBe(10)
      expect(typeof params.annualSavingsIncrease).toBe('number')
    })

    it('should be optional (undefined is valid)', () => {
      const params: StrategyExecutionParams = {
        btcAmount: 10,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 1000,
        annualInterestRate: 0.08,
        loanOriginationFeePercent: 0.01,
        loanTermMonths: 6,
        simulationMonths: 120,
        maxLoanAmount: 150000,
        expectedAnnualInflation: 0.03,
        btcAccumulation: false,
        // annualSavingsIncrease is NOT provided
        riskManagement: {
          targetLtv: 15,
          liquidationLtv: 85,
          maxLoanAmount: 150000,
          liquidationFeePercent: 0.05,
          annualInterestRate: 0.08
        },
        investmentStrategy: 'rollingLoan'
      }

      expect(params.annualSavingsIncrease).toBeUndefined()
    })

    it('should accept zero as valid value', () => {
      const params: StrategyExecutionParams = {
        btcAmount: 10,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 1000,
        annualInterestRate: 0.08,
        loanOriginationFeePercent: 0.01,
        loanTermMonths: 12,
        simulationMonths: 120,
        maxLoanAmount: 150000,
        expectedAnnualInflation: 0.03,
        btcAccumulation: true,
        annualSavingsIncrease: 0, // No annual increase
        riskManagement: {
          targetLtv: 15,
          liquidationLtv: 85,
          maxLoanAmount: 150000,
          liquidationFeePercent: 0.05,
          annualInterestRate: 0.08
        },
        investmentStrategy: 'rollingLoan'
      }

      expect(params.annualSavingsIncrease).toBe(0)
    })

    it('should work with Infinity loan term (Dynamic LTV mode)', () => {
      const params: StrategyExecutionParams = {
        btcAmount: 10,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 1000,
        annualInterestRate: 0.08,
        loanOriginationFeePercent: 0.01,
        loanTermMonths: Infinity, // Dynamic LTV mode
        simulationMonths: 120,
        maxLoanAmount: 150000,
        expectedAnnualInflation: 0.03,
        btcAccumulation: true,
        annualSavingsIncrease: 5,
        riskManagement: {
          targetLtv: 15,
          liquidationLtv: 85,
          maxLoanAmount: 150000,
          liquidationFeePercent: 0.05,
          annualInterestRate: 0.08
        },
        investmentStrategy: 'rollingLoan'
      }

      expect(params.loanTermMonths).toBe(Infinity)
      expect(params.annualSavingsIncrease).toBe(5)
    })
  })
})

describe('MonthlyResult Interface', () => {
  const createBasicMonthlyResult = (): MonthlyResult => ({
    month: 1,
    date: '2024-01-01',
    btcPrice: 100000,
    totalBtcAmount: 10,
    totalDebt: 150000,
    collateralValue: 1000000,
    ltv: 15,
    monthlyWithdrawal: 1000,
    principalForNeeds: 500,
    principalForReinvestment: 500,
    totalPrincipal: 1000,
    activeLoans: [],
    repaymentDue: 0,
    highestLtv: 15,
    events: []
  })

  describe('btcPurchased field', () => {
    it('should accept btcPurchased field', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        btcPurchased: 0.5 // NEW FIELD - BTC purchased this month
      }

      expect(result.btcPurchased).toBe(0.5)
      expect(typeof result.btcPurchased).toBe('number')
    })

    it('should be optional (undefined is valid)', () => {
      const result: MonthlyResult = createBasicMonthlyResult()
      
      expect(result.btcPurchased).toBeUndefined()
    })

    it('should accept zero as valid value', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        btcPurchased: 0
      }

      expect(result.btcPurchased).toBe(0)
    })
  })

  describe('monthlySavingsApplied field', () => {
    it('should accept monthlySavingsApplied field', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        monthlySavingsApplied: 1000 // NEW FIELD - Monthly savings applied
      }

      expect(result.monthlySavingsApplied).toBe(1000)
      expect(typeof result.monthlySavingsApplied).toBe('number')
    })

    it('should accept negative values for withdrawals', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        monthlySavingsApplied: -2500 // Withdrawal
      }

      expect(result.monthlySavingsApplied).toBe(-2500)
    })

    it('should be optional (undefined is valid)', () => {
      const result: MonthlyResult = createBasicMonthlyResult()
      
      expect(result.monthlySavingsApplied).toBeUndefined()
    })
  })

  describe('interestAccrued field', () => {
    it('should accept interestAccrued field', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        interestAccrued: 1000 // NEW FIELD - Interest accrued this month
      }

      expect(result.interestAccrued).toBe(1000)
      expect(typeof result.interestAccrued).toBe('number')
    })

    it('should be optional (undefined is valid)', () => {
      const result: MonthlyResult = createBasicMonthlyResult()
      
      expect(result.interestAccrued).toBeUndefined()
    })

    it('should only be present in Dynamic LTV mode', () => {
      // Dynamic LTV mode - has interest accrued
      const dynamicResult: MonthlyResult = {
        ...createBasicMonthlyResult(),
        interestAccrued: 1000
      }

      // Fixed Term mode - no interest accrued
      const fixedResult: MonthlyResult = createBasicMonthlyResult()

      expect(dynamicResult.interestAccrued).toBeDefined()
      expect(fixedResult.interestAccrued).toBeUndefined()
    })
  })

  describe('loanRollover field', () => {
    it('should accept loanRollover object', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        loanRollover: {
          oldLoanAmount: 150000,
          newLoanAmount: 160000,
          excessProceeds: 10000
        }
      }

      expect(result.loanRollover).toBeDefined()
      expect(result.loanRollover?.oldLoanAmount).toBe(150000)
      expect(result.loanRollover?.newLoanAmount).toBe(160000)
      expect(result.loanRollover?.excessProceeds).toBe(10000)
    })

    it('should be optional (undefined is valid)', () => {
      const result: MonthlyResult = createBasicMonthlyResult()
      
      expect(result.loanRollover).toBeUndefined()
    })

    it('should have all required properties', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        loanRollover: {
          oldLoanAmount: 150000,
          newLoanAmount: 160000,
          excessProceeds: 10000
        }
      }

      expect(result.loanRollover).toHaveProperty('oldLoanAmount')
      expect(result.loanRollover).toHaveProperty('newLoanAmount')
      expect(result.loanRollover).toHaveProperty('excessProceeds')
    })

    it('should only be present in Fixed Term mode at rollover', () => {
      // Fixed Term mode at rollover - has loanRollover
      const rolloverResult: MonthlyResult = {
        ...createBasicMonthlyResult(),
        loanRollover: {
          oldLoanAmount: 150000,
          newLoanAmount: 160000,
          excessProceeds: 10000
        }
      }

      // Non-rollover month - no loanRollover
      const normalResult: MonthlyResult = createBasicMonthlyResult()

      expect(rolloverResult.loanRollover).toBeDefined()
      expect(normalResult.loanRollover).toBeUndefined()
    })
  })

  describe('all new fields together', () => {
    it('should accept all new fields simultaneously', () => {
      const result: MonthlyResult = {
        ...createBasicMonthlyResult(),
        btcPurchased: 0.5,
        monthlySavingsApplied: 1000,
        interestAccrued: 1000,
        loanRollover: {
          oldLoanAmount: 150000,
          newLoanAmount: 160000,
          excessProceeds: 10000
        }
      }

      expect(result.btcPurchased).toBe(0.5)
      expect(result.monthlySavingsApplied).toBe(1000)
      expect(result.interestAccrued).toBe(1000)
      expect(result.loanRollover).toBeDefined()
    })
  })
})

