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
import { PlatformFeeIntegrationService } from '../services/PlatformFeeIntegrationService'
import { centralizedLoanCalculationService } from '../services/CentralizedLoanCalculationService'
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
  private platformFeeService: PlatformFeeIntegrationService

  constructor() {
    this.loanCalculationService = new LoanRolloverCalculationService()
    this.platformFeeService = new PlatformFeeIntegrationService()
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

    // CRITICAL FIX: Use loanAmountPercent if available (user-configured percentage)
    // Otherwise fall back to old logic for backward compatibility
    let maxLoanAmount: number
    if (params.loanAmountPercent !== undefined && params.loanAmountPercent > 0) {
      // Use user-configured percentage (e.g., 10% of collateral)
      maxLoanAmount = collateralValue * (params.loanAmountPercent / 100)
    } else {
      // Legacy fallback: use targetLtv and maxLoanAmount constraint
      const targetLtv = params.riskManagement.targetLtv
      maxLoanAmount = Math.min(
        params.maxLoanAmount,
        collateralValue * (targetLtv / 100)
      )
    }

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

  /**
   * Handle initial loan creation (Month 0)
   *
   * ⚠️ IMPORTANT: This method demonstrates the CORRECT way to create loans.
   *
   * Steps:
   * 1. Calculate loan details using CentralizedLoanCalculationService
   * 2. Get investment multiplier from the service
   * 3. Format values for display
   * 4. Return strategy decision with complete loan breakdown
   *
   * DO NOT calculate loan amounts manually. Always use the centralized service.
   *
   * @see docs/DEVELOPER_GUIDE_LOAN_CALCULATIONS.md for detailed usage guide
   */
  private handleInitialLoan(
    context: StrategyContext,
    collateralValue: number,
    maxLoanAmount: number
  ): StrategyDecision {
    const { params } = context
    const principal = maxLoanAmount

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Calculate complete loan details using centralized service
    // ═══════════════════════════════════════════════════════════════════════
    //
    // ⚠️ CRITICAL: ALWAYS use centralizedLoanCalculationService for loan calculations
    //
    // This ensures:
    // - Accurate cost breakdown (principal + fees + interest)
    // - Consistent calculations across the application
    // - Proper rounding (no decimals)
    // - Clear distinction between principal (received) and repayment (owed)
    //
    // DO NOT calculate loan amounts manually!
    // ═══════════════════════════════════════════════════════════════════════
    const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
      principal,
      collateralValue,
      params
    )

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Investment multiplier — set to 1.0 (full principal)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // CRITICAL FIX (mirrors c0cc098 for DynamicRollingLoanStrategy):
    // StrategyExecutionService applies `principalForReinvestment =
    // remainingDebtCapacity * investmentMultiplier`. With debtCapacity already
    // computed as `collateralValue * loanAmountPercent/100`, the multiplier
    // must NOT be `principal/collateralValue` (= loanAmountPercent/100), or
    // we apply the percentage TWICE (factor-10 error for 10% LTV scenarios).
    //
    // The loan principal already encodes the user's loanAmountPercent; we
    // tell the executor to use all of it.
    // ═══════════════════════════════════════════════════════════════════════
    const investmentMultiplier = 1.0

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Format values for display
    // ═══════════════════════════════════════════════════════════════════════
    const formatted = centralizedLoanCalculationService.formatLoanCalculation(loanDetails)

    if (params.btcAccumulation) {
      // BTC Accumulation Mode: Reinvest loan proceeds into more BTC
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `Taking initial loan: ${formatted.principalFormatted} principal + ${formatted.originationFeeFormatted} fee + ${formatted.totalInterestFormatted} interest = ${formatted.totalRepaymentFormatted} total (${loanDetails.ltv.toFixed(1)}% LTV)`
      }
    } else {
      // Cash Generation Mode: Take loan proceeds as cash
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: true,
        withdrawalAmount: principal * 0.8, // Take most as cash, keep some buffer
        reasoning: `Taking initial loan: ${formatted.principalFormatted} principal + ${formatted.originationFeeFormatted} fee + ${formatted.totalInterestFormatted} interest = ${formatted.totalRepaymentFormatted} total (${loanDetails.ltv.toFixed(1)}% LTV)`
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

    // Create platform fee configuration using integration service
    // For now, use custom platform as default since platform info isn't in StrategyExecutionParams
    // TODO: Add platform information to StrategyContext or StrategyExecutionParams
    const platformFeeConfig: PlatformFeeConfig = this.getPlatformFeeConfigFromParams(params)

    // CRITICAL FIX: Use loanAmountPercent if available, otherwise fall back to targetLtv
    const targetLtvPercent = params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
      ? params.loanAmountPercent
      : params.riskManagement.targetLtv

    // Prepare loan rollover parameters
    const rolloverParams: LoanRolloverParams = {
      previousLoanPrincipal: totalPrincipal,
      accruedInterest,
      platformFeeConfig,
      loanOriginationFeePercent: params.loanOriginationFeePercent,
      loanTermMonths: params.loanTermMonths,
      btcStackValue: collateralValue,
      targetLtvPercent, // Use user-configured percentage or fall back to targetLtv
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

    // Investment multiplier = 1.0 (use full new principal). Same reason as
    // handleInitialLoan: StrategyExecutionService already sized debtCapacity
    // via loanAmountPercent, so the principal IS the intended loan size.
    // The forced_exceedance case overrides debtCapacity via targetLtvOverride
    // below, so multiplier still semantically means "take all of capacity".
    const investmentMultiplier = 1.0
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
   * Get platform fee configuration from strategy execution parameters
   * Since platform information isn't directly available in StrategyExecutionParams,
   * we infer it from the fee structure
   */
  private getPlatformFeeConfigFromParams(params: any): PlatformFeeConfig {
    // Infer platform from fee characteristics
    if (params.loanOriginationFeePercent === 0) {
      // Strike platform has 0% fees
      return this.platformFeeService.getPlatformFeeConfig('strike')
    } else if (params.loanOriginationFeePercent === 1.5) {
      // Firefish platform has 1.5% annual fees
      return this.platformFeeService.getPlatformFeeConfig('firefish')
    } else {
      // Custom platform with configurable fees
      return this.platformFeeService.getPlatformFeeConfig('custom')
    }
  }
}
