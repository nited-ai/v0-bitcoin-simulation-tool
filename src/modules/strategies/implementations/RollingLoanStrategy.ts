/**
 * Rolling Loan Strategy Implementation
 * 
 * Automatically rolls over Bitcoin-backed loans to maintain continuous leverage
 * with dual functionality based on BTC accumulation settings.
 */

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata,
  Loan
} from "../types"
import { LoanRolloverCalculationService } from '../services/LoanRolloverCalculationService'
import type { LoanRolloverParams, PlatformFeeConfig } from '../services/types'

/**
 * Rolling Loan Strategy - Automated loan rollover for continuous leverage
 * 
 * This strategy automatically manages Bitcoin-backed loans by rolling them over
 * at maturity to maintain continuous leverage. Key features:
 * 
 * 1. Automatic initial loan based on target LTV
 * 2. Loan rollover at maturity with minimum repayment calculation
 * 3. Dual functionality: BTC accumulation vs cash generation
 * 4. Dynamic loan sizing based on Bitcoin price changes
 * 5. Risk management with liquidation protection
 */
export class RollingLoanStrategy implements InvestmentStrategyInterface {
  private loanCalculationService: LoanRolloverCalculationService

  constructor() {
    this.loanCalculationService = new LoanRolloverCalculationService()
  }
  getName(): string {
    return "Rolling Loan Strategy"
  }

  getDescription(): string {
    return "Automatically rolls over Bitcoin-backed loans to maintain continuous leverage with dual BTC accumulation and cash generation modes."
  }

  getDetailedDescription(): string {
    return `The Rolling Loan Strategy provides automated loan management for Bitcoin holders who want to maintain continuous leverage without manual intervention. 

When BTC accumulation is enabled, loan proceeds are reinvested into additional Bitcoin for portfolio growth. When disabled, excess proceeds are taken as cash for living expenses while maintaining the target loan percentage.

The strategy automatically handles loan rollovers at maturity, calculates minimum repayment amounts, and adapts to Bitcoin price changes to optimize loan sizing within risk parameters.`
  }

  getFunctionality(): string {
    return "Automated loan rollover, dynamic loan sizing, dual accumulation/income modes, risk-aware lending"
  }

  getSuitability(): string {
    return "Suitable for Bitcoin holders seeking continuous leverage, income generation, or automated accumulation strategies"
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 3, // Moderate security - depends on market conditions and leverage
      complexityRating: 4, // High complexity - automated loan management with multiple scenarios
      suitableFor: ["moderate", "aggressive", "income_seekers", "accumulators"],
      criteria: ["target_ltv", "loan_rollover", "btc_accumulation", "cash_generation", "risk_management"]
    }
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    const {
      month,
      btcPrice,
      totalBtcAmount,
      activeLoans,
      params
    } = context

    // Handle edge case: no BTC
    if (totalBtcAmount <= 0) {
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: "No BTC available for collateral"
      }
    }

    const collateralValue = totalBtcAmount * btcPrice
    const targetLtv = params.riskManagement.targetLtv
    const maxLoanAmount = Math.min(
      params.maxLoanAmount,
      collateralValue * (targetLtv / 100)
    )

    // Get maturing loans for this month
    const maturingLoans = activeLoans.filter(loan => loan.maturityMonth === month)
    const totalRepaymentDue = maturingLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)

    // Calculate minimum loan needed to pay off maturing loans
    const minimumLoanNeeded = totalRepaymentDue > 0 ? 
      totalRepaymentDue / (1 - params.loanOriginationFeePercent / 100) : 0

    // Determine if this is initial loan or rollover
    const isInitialLoan = activeLoans.length === 0
    const isRollover = maturingLoans.length > 0

    if (isInitialLoan) {
      return this.handleInitialLoan(context, collateralValue, maxLoanAmount)
    }

    if (isRollover) {
      return this.handleLoanRollover(context, collateralValue, maturingLoans)
    }

    // No action needed this month
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: "No loans maturing this month, no action required"
    }
  }

  private handleInitialLoan(
    context: StrategyContext,
    collateralValue: number,
    maxLoanAmount: number
  ): StrategyDecision {
    const { params } = context
    const loanAmount = maxLoanAmount
    const investmentMultiplier = loanAmount / collateralValue

    if (params.btcAccumulation) {
      // BTC Accumulation Mode: Reinvest loan proceeds into more BTC
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `Taking initial loan of $${Math.round(loanAmount)} for BTC accumulation (${params.riskManagement.targetLtv}% LTV)`
      }
    } else {
      // Cash Generation Mode: Take loan proceeds as cash
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: true,
        withdrawalAmount: loanAmount * 0.8, // Take most as cash, keep some buffer
        reasoning: `Taking initial loan of $${Math.round(loanAmount)} for cash generation (${params.riskManagement.targetLtv}% LTV)`
      }
    }
  }

  private handleLoanRollover(
    context: StrategyContext,
    collateralValue: number,
    maturingLoans: Loan[]
  ): StrategyDecision {
    const { params } = context

    // Calculate total repayment due from maturing loans
    const totalRepaymentDue = maturingLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)
    const totalPrincipal = maturingLoans.reduce((sum, loan) => sum + loan.principal, 0)
    const accruedInterest = totalRepaymentDue - totalPrincipal

    // Create platform fee configuration
    const platformFeeConfig: PlatformFeeConfig = this.getPlatformFeeConfig(params)

    // Prepare loan rollover parameters
    const rolloverParams: LoanRolloverParams = {
      previousLoanPrincipal: totalPrincipal,
      accruedInterest,
      platformFeeConfig,
      loanOriginationFeePercent: params.loanOriginationFeePercent,
      loanTermMonths: params.loanTermMonths,
      btcStackValue: collateralValue,
      targetLtvPercent: params.riskManagement.targetLtv,
      liquidationLtvPercent: params.riskManagement.liquidationLtv
    }

    // Use calculation service for comprehensive rollover calculation
    const rolloverResult = this.loanCalculationService.calculateLoanRollover(rolloverParams)

    if (!rolloverResult.success) {
      // Liquidation scenario
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: rolloverResult.reasoning
      }
    }

    // Calculate investment multiplier and target LTV override
    const investmentMultiplier = rolloverResult.actualLoanAmount / collateralValue
    const targetLtvOverride = rolloverResult.conflictResolution === 'forced_exceedance'
      ? (rolloverResult.actualLoanAmount / collateralValue) * 100
      : undefined

    if (params.btcAccumulation) {
      // BTC Accumulation Mode: Reinvest excess proceeds
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        targetLtvOverride,
        reasoning: rolloverResult.reasoning + ` (reinvest excess $${Math.round(rolloverResult.excessProceeds)})`
      }
    } else {
      // Cash Generation Mode: Take excess proceeds as cash
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: true,
        withdrawalAmount: Math.max(0, rolloverResult.excessProceeds * 0.9), // Take 90% of excess as cash
        targetLtvOverride,
        reasoning: rolloverResult.reasoning + ` (cash generation $${Math.round(rolloverResult.excessProceeds)})`
      }
    }
  }

  /**
   * Get platform fee configuration from simulation parameters
   */
  private getPlatformFeeConfig(params: any): PlatformFeeConfig {
    // Map platform-specific fee configurations
    if (params.platform === 'firefish') {
      return { type: 'annual', percent: 1.5 }
    } else if (params.platform === 'strike') {
      return { type: 'none', percent: 0 }
    } else {
      // Custom platform - use origination fee type from params
      const feeType = params.originationFeeType || 'one-time'
      return {
        type: feeType === 'annual' ? 'annual' : 'one-time',
        percent: params.originationFeePercent || 1.0
      }
    }
  }
}
