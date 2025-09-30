import { describe, it, expect, beforeEach } from 'vitest'
import { RollingLoanStrategy } from '../../../src/modules/strategies/implementations/RollingLoanStrategy'
import { LoanRolloverCalculationService } from '../../../src/modules/strategies/services/LoanRolloverCalculationService'
import { PlatformFeeIntegrationService } from '../../../src/modules/strategies/services/PlatformFeeIntegrationService'
import type { StrategyContext, StrategyExecutionParams } from '../../../src/modules/strategies/types'

/**
 * Comprehensive test case for the failing rolling loan calculation scenario
 * 
 * This test validates the specific scenario reported by the user:
 * - 1 BTC at $100,000 initial price
 * - 10% target loan percentage
 * - Firefish platform (1.5% annual fee)
 * - 24-month loan term
 * - BTC accumulation enabled
 * 
 * Expected first loan calculation:
 * - Target amount: 10% of $100,000 = $10,000
 * - Interest for 24 months: $2,000
 * - Platform fees: $300 (1.5% annual)
 * - Minimum loan needed: $10,000 + $2,000 + $300 = $12,300
 * - Collateral at 50% LTV: $24,600
 */

describe('Rolling Loan Strategy - Critical Calculation Fix', () => {
  let strategy: RollingLoanStrategy
  let calculationService: LoanRolloverCalculationService
  let platformFeeService: PlatformFeeIntegrationService
  
  const testParams: StrategyExecutionParams = {
    // Core BTC parameters
    btcAmount: 1.0,
    initialBtcPrice: 100000,

    // Basic simulation parameters
    monthlyWithdrawalAmount: 0,
    annualInterestRate: 10.0,
    loanOriginationFeePercent: 1.5,
    loanTermMonths: 24,
    simulationMonths: 12,
    maxLoanAmount: 250000,
    expectedAnnualInflation: 3,

    // Rolling loan strategy parameters
    loanAmountPercent: 10, // Target 10% of BTC stack

    // BTC accumulation setting
    btcAccumulation: true,

    // Risk management
    riskManagement: {
      targetLtv: 50, // 50% LTV for collateral calculation
      liquidationLtv: 85,
      maxLoanAmount: 250000,
      liquidationFeePercent: 5,
      annualInterestRate: 10.0
    },

    // Strategy selection
    investmentStrategy: 'rollingLoan'
  }

  beforeEach(() => {
    calculationService = new LoanRolloverCalculationService()
    platformFeeService = new PlatformFeeIntegrationService()
    strategy = new RollingLoanStrategy()
  })

  describe('First Loan Calculation (Currently Failing)', () => {
    it('should calculate correct target loan amount', () => {
      // Target loan amount = 10% of BTC stack value
      const btcStackValue = testParams.btcAmount * testParams.initialBtcPrice // $100,000
      const targetPercentage = 10 // 10% target (this should come from params but isn't in current interface)
      const expectedTargetAmount = (targetPercentage / 100) * btcStackValue // $10,000

      expect(expectedTargetAmount).toBe(10000)
    })

    it('should calculate correct interest for 24-month term', () => {
      const targetAmount = 10000
      const annualRate = testParams.annualInterestRate / 100 // 0.10 (use annualInterestRate from testParams)
      const termYears = testParams.loanTermMonths / 12 // 2 years

      // Simple interest calculation for loan term
      const expectedInterest = targetAmount * annualRate * termYears // $2,000

      expect(expectedInterest).toBe(2000)
    })

    it('should calculate correct Firefish platform fees', () => {
      const targetAmount = 10000
      const annualFeeRate = testParams.loanOriginationFeePercent / 100 // 0.015
      const loanTermYears = testParams.loanTermMonths / 12 // 2 years

      // Annual fee for loan term
      const expectedPlatformFees = targetAmount * annualFeeRate * loanTermYears // $300

      expect(expectedPlatformFees).toBe(300)
    })

    it('should calculate correct minimum loan amount needed', () => {
      const targetAmount = 10000
      const interest = 2000
      const platformFees = 300
      
      const expectedMinimumLoanNeeded = targetAmount + interest + platformFees // $12,300
      
      expect(expectedMinimumLoanNeeded).toBe(12300)
    })

    it('should calculate correct collateral requirement at 50% LTV', () => {
      const minimumLoanNeeded = 12300
      const targetLtv = testParams.riskManagement.targetLtv / 100 // 0.50
      
      const expectedCollateralRequired = minimumLoanNeeded / targetLtv // $24,600
      
      expect(expectedCollateralRequired).toBe(24600)
    })

    it('FAILING: should produce first loan of ~$12,300 (currently produces $34,236)', () => {
      // This test documents the current failure
      // The strategy should calculate a loan amount close to $12,300
      // but currently calculates $34,236

      const mockContext: StrategyContext = {
        month: 1,
        currentDate: new Date('2025-01-01'),
        btcPrice: 100000,
        totalBtcAmount: 1.0,
        activeLoans: [], // No active loans (initial loan)
        collateralValue: 100000, // 1 BTC * $100,000
        debtCapacity: 50000, // 50% LTV of $100,000
        historicalPriceData: [],
        params: testParams
      }

      const decision = strategy.makeDecision(mockContext)

      // Calculate expected loan amount from investment multiplier
      const actualLoanAmount = decision.investmentMultiplier * mockContext.collateralValue

      // Document the current incorrect behavior
      console.log(`Expected loan amount: ~$12,300`)
      console.log(`Actual loan amount: $${actualLoanAmount.toLocaleString()}`)
      console.log(`Investment multiplier: ${decision.investmentMultiplier}`)
      console.log(`Reasoning: ${decision.reasoning}`)

      // This test will fail until the bug is fixed
      expect(actualLoanAmount).toBeCloseTo(12300, -2) // Allow ±100 tolerance
    })
  })

  describe('Platform Fee Integration', () => {
    it('should correctly read Firefish platform configuration', () => {
      const feeResult = platformFeeService.calculatePlatformFees(
        10000, // loan amount
        'firefish',
        24 // loan term months
      )
      
      expect(feeResult.type).toBe('annual')
      expect(feeResult.amount).toBe(300) // 1.5% annual for 2 years
    })

    it('should correctly read Strike platform configuration (0% fees)', () => {
      const feeResult = platformFeeService.calculatePlatformFees(
        10000,
        'strike',
        24
      )
      
      expect(feeResult.type).toBe('none')
      expect(feeResult.amount).toBe(0)
    })
  })

  describe('Price Projection Integration', () => {
    it('should use projected BTC price for calculations', () => {
      // This test will verify that the strategy uses price projection data
      // rather than fixed or historical prices

      const mockContext: StrategyContext = {
        month: 2,
        currentDate: new Date('2025-02-01'),
        btcPrice: 105000, // Price increased to $105,000
        totalBtcAmount: 1.0,
        activeLoans: [],
        collateralValue: 105000, // 1 BTC * $105,000
        debtCapacity: 52500, // 50% LTV of $105,000
        historicalPriceData: [],
        params: testParams
      }

      const decision = strategy.makeDecision(mockContext)

      // Verify the decision uses the projected price
      const actualLoanAmount = decision.investmentMultiplier * mockContext.collateralValue

      expect(actualLoanAmount).toBeGreaterThan(0)
      expect(decision.allowInvestment).toBe(true)
    })
  })
})
