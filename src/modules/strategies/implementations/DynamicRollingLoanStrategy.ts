/**
 * Dynamic Rolling Loan Strategy Implementation
 * 
 * Automatically manages Bitcoin-backed loans with two modes:
 * - Dynamic LTV Mode: When loan term is Infinity (monthly interest accrual, LTV reset)
 * - Fixed Term Mode: When loan term is specific months (rollover at maturity)
 * 
 * Mode selection is automatic based on the loanTermMonths parameter.
 */

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from "../types"
import { centralizedLoanCalculationService } from '../services/CentralizedLoanCalculationService'

/**
 * Dynamic Rolling Loan Strategy - Automated loan management with dual modes
 * 
 * This strategy automatically manages Bitcoin-backed loans by selecting the appropriate
 * mode based on the loan term parameter:
 * 
 * **Dynamic LTV Mode** (loanTermMonths === Infinity):
 * - Monthly interest accrual on loan balance
 * - Automatic LTV reset to target percentage each month
 * - Continuous leverage without rollover events
 * - Ideal for long-term leverage strategies
 * 
 * **Fixed Term Mode** (loanTermMonths === specific number):
 * - Interest calculated at rollover (full term interest)
 * - Loan rollover only at maturity months
 * - Discrete rollover events with excess proceeds calculation
 * - Ideal for structured loan management
 * 
 * Both modes support:
 * - Monthly savings with annual compound increases
 * - BTC accumulation mode (reinvest proceeds)
 * - Cash generation mode (withdraw specified amounts)
 * - Risk management with liquidation protection
 */
export class DynamicRollingLoanStrategy implements InvestmentStrategyInterface {
  
  getName(): string {
    return "Dynamic Rolling Loan"
  }

  getDescription(): string {
    return "Automated loan management with automatic mode selection: Dynamic LTV (infinite term) or Fixed Term (specific months) based on loan term parameter."
  }

  getDetailedDescription(): string {
    return `The Dynamic Rolling Loan Strategy provides intelligent loan management that automatically adapts to your loan term preference.

**Dynamic LTV Mode** (Infinite Loan Term):
When you set the loan term to Infinity, the strategy maintains your target LTV by accruing interest monthly and automatically adjusting your loan balance. This provides continuous leverage without rollover events.

**Fixed Term Mode** (Specific Loan Term):
When you set a specific loan term (3, 6, 12, 18, or 24 months), the strategy calculates full-term interest and rolls over the loan at maturity. This provides structured loan management with discrete rollover events.

Both modes support monthly savings with annual increases, BTC accumulation for portfolio growth, or cash generation for living expenses. The strategy automatically handles all calculations and adapts to Bitcoin price changes while maintaining your risk parameters.`
  }

  getFunctionality(): string {
    return "Automatic mode selection, monthly interest accrual (Dynamic LTV), loan rollover (Fixed Term), monthly savings with annual increases, dual accumulation/income modes"
  }

  getSuitability(): string {
    return "Suitable for Bitcoin holders seeking flexible leverage strategies with either continuous (Dynamic LTV) or structured (Fixed Term) loan management"
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 3, // Moderate security - depends on market conditions and leverage
      complexityRating: 4, // High complexity - dual mode system with automated management
      suitableFor: ["moderate", "aggressive", "income_seekers", "accumulators"],
      criteria: [
        "target_ltv",
        "loan_term",
        "automatic_mode_selection",
        "monthly_savings",
        "annual_increase",
        "btc_accumulation",
        "cash_generation",
        "risk_management"
      ]
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

    // ═══════════════════════════════════════════════════════════════════════
    // EDGE CASE: No BTC available
    // ═══════════════════════════════════════════════════════════════════════
    if (totalBtcAmount <= 0) {
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: "No BTC available for collateral"
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIAL LOAN: Month 0 with no active loans
    // ═══════════════════════════════════════════════════════════════════════
    if (month === 0 && activeLoans.length === 0) {
      return this.handleInitialLoan(context)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUTOMATIC MODE SELECTION
    // ═══════════════════════════════════════════════════════════════════════
    if (params.loanTermMonths === Infinity) {
      // Dynamic LTV Mode: Monthly interest accrual, LTV reset
      return this.handleDynamicLtvMode(context)
    } else {
      // Fixed Term Mode: Rollover at maturity
      return this.handleFixedTermMode(context)
    }
  }

  /**
   * Handle initial loan creation (Month 0)
   *
   * Creates the first loan based on maxLoanAmount parameter.
   * This is the same for both Dynamic LTV and Fixed Term modes.
   *
   * Uses CentralizedLoanCalculationService for consistent loan calculations.
   *
   * @param context - Strategy context with BTC price, amount, and parameters
   * @returns StrategyDecision with investment multiplier and withdrawal settings
   */
  private handleInitialLoan(context: StrategyContext): StrategyDecision {
    const { btcPrice, totalBtcAmount, params } = context

    // Calculate collateral value
    const collateralValue = totalBtcAmount * btcPrice

    // ═══════════════════════════════════════════════════════════════════════
    // CRITICAL FIX: Calculate principal based on loanAmountPercent
    // ═══════════════════════════════════════════════════════════════════════
    // Use loanAmountPercent if available (user-configured percentage)
    // Otherwise fall back to old logic for backward compatibility
    let principal: number

    console.log('🔍 DynamicRollingLoanStrategy.handleInitialLoan() - DEBUG:', {
      totalBtcAmount,
      btcPrice,
      collateralValue,
      loanAmountPercent: params.loanAmountPercent,
      maxLoanAmount: params.maxLoanAmount,
      targetLtv: params.riskManagement?.targetLtv
    })

    if (params.loanAmountPercent !== undefined && params.loanAmountPercent > 0) {
      // Use user-configured percentage (e.g., 10% of collateral)
      principal = collateralValue * (params.loanAmountPercent / 100)
      console.log('✅ Using loanAmountPercent:', {
        loanAmountPercent: params.loanAmountPercent,
        calculation: `${collateralValue} * (${params.loanAmountPercent} / 100)`,
        principal
      })
    } else {
      // Legacy fallback: use targetLtv and maxLoanAmount constraint
      const targetLtv = params.riskManagement?.targetLtv || 40
      principal = Math.min(
        params.maxLoanAmount,
        collateralValue * (targetLtv / 100)
      )
      console.log('⚠️ Using legacy fallback:', {
        targetLtv,
        maxLoanAmount: params.maxLoanAmount,
        calculation: `min(${params.maxLoanAmount}, ${collateralValue} * (${targetLtv} / 100))`,
        principal
      })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Calculate complete loan details using centralized service
    // ═══════════════════════════════════════════════════════════════════════
    const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
      principal,
      collateralValue,
      params
    )

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Calculate investment multiplier for BTC accumulation
    // ═══════════════════════════════════════════════════════════════════════
    // CRITICAL FIX: For initial loan, investmentMultiplier should be 1.0
    // The principal already represents the correct loan amount based on loanAmountPercent
    // Using principal/collateralValue would apply the percentage TWICE!
    //
    // HTML Prototype Logic:
    //   purchasedBtc = btcHoldings * targetLtv * (1 - loanFee)
    //   This is equivalent to: purchasedBtc = principal / btcPrice
    //   Where principal = collateralValue * targetLtv
    //
    // Our Logic Should Be:
    //   investmentMultiplier = 1.0 (use full principal for BTC purchase)
    //   btcPurchased = principal / btcPrice
    //
    const investmentMultiplier = 1.0  // Use full principal, don't apply percentage twice

    console.log('📊 Loan Details:', {
      principal: loanDetails.principal,
      originationFee: loanDetails.originationFee,
      totalInterest: loanDetails.totalInterest,
      totalRepayment: loanDetails.totalRepayment,
      ltv: loanDetails.ltv,
      investmentMultiplier,
      expectedBtcPurchase: `${principal} / ${btcPrice} = ${(principal / btcPrice).toFixed(5)} BTC`
    })

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Format values for display
    // ═══════════════════════════════════════════════════════════════════════
    const formatted = centralizedLoanCalculationService.formatLoanCalculation(loanDetails)

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Return decision based on accumulation mode
    // ═══════════════════════════════════════════════════════════════════════
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
        withdrawalAmount: principal * 0.8, // Take 80% as cash, keep 20% buffer
        reasoning: `Taking initial loan: ${formatted.principalFormatted} principal + ${formatted.originationFeeFormatted} fee + ${formatted.totalInterestFormatted} interest = ${formatted.totalRepaymentFormatted} total (${loanDetails.ltv.toFixed(1)}% LTV)`
      }
    }
  }

  /**
   * Handle Dynamic LTV Mode (Infinite Loan Term)
   *
   * - Monthly interest accrual on loan balance
   * - Automatic LTV reset to target percentage
   * - No rollover events
   *
   * @param context - Strategy context with BTC price, amount, active loans, and parameters
   * @returns StrategyDecision with investment/withdrawal instructions
   */
  private handleDynamicLtvMode(context: StrategyContext): StrategyDecision {
    const { month, btcPrice, totalBtcAmount, activeLoans, params } = context

    // ═══════════════════════════════════════════════════════════════════════
    // SKIP MONTH 0: Initial loan already created
    // ═══════════════════════════════════════════════════════════════════════
    if (month === 0) {
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: "Month 0: Initial loan already created"
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Accrue monthly interest on existing loan
    // ═══════════════════════════════════════════════════════════════════════
    if (activeLoans.length > 0) {
      const monthlyRate = params.annualInterestRate / 12
      activeLoans[0].repaymentAmount *= (1 + monthlyRate)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Calculate target loan based on current collateral
    // ═══════════════════════════════════════════════════════════════════════
    const collateralValue = totalBtcAmount * btcPrice
    const targetLtv = params.riskManagement.targetLtv / 100
    const targetLoan = collateralValue * targetLtv

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Calculate current loan balance
    // ═══════════════════════════════════════════════════════════════════════
    const currentLoanBalance = activeLoans.length > 0
      ? activeLoans[0].repaymentAmount
      : 0

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Calculate amount to borrow
    // ═══════════════════════════════════════════════════════════════════════
    const amountToBorrow = targetLoan - currentLoanBalance

    if (amountToBorrow <= 0) {
      // Current loan exceeds target, no action needed
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `Dynamic LTV: Current loan $${Math.round(currentLoanBalance)} exceeds target $${Math.round(targetLoan)}, no action needed`
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Calculate net proceeds after origination fee
    // ═══════════════════════════════════════════════════════════════════════
    const loanFee = params.loanOriginationFeePercent / 100
    const netProceeds = amountToBorrow * (1 - loanFee)

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Update loan balance to target
    // ═══════════════════════════════════════════════════════════════════════
    if (activeLoans.length > 0) {
      activeLoans[0].repaymentAmount = targetLoan
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: Calculate investment multiplier
    // ═══════════════════════════════════════════════════════════════════════
    const investmentMultiplier = netProceeds / collateralValue

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 8: Return decision based on accumulation mode
    // ═══════════════════════════════════════════════════════════════════════
    if (params.btcAccumulation) {
      // BTC Accumulation Mode: Reinvest net proceeds
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `Dynamic LTV reset: borrowing $${Math.round(amountToBorrow)} (net $${Math.round(netProceeds)}) to maintain ${(targetLtv * 100).toFixed(1)}% LTV`
      }
    } else {
      // Cash Generation Mode: Take specified withdrawal amount
      const withdrawalAmount = Math.abs(params.monthlyWithdrawalAmount || 0)
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: true,
        withdrawalAmount,
        reasoning: `Dynamic LTV reset: borrowing $${Math.round(amountToBorrow)} (net $${Math.round(netProceeds)}), withdrawing $${Math.round(withdrawalAmount)}`
      }
    }
  }

  /**
   * Handle Fixed Term Mode (Specific Loan Term)
   *
   * - Interest calculated at rollover (full term interest)
   * - Loan rollover only at maturity months
   * - Excess proceeds calculation
   *
   * @param context - Strategy context with BTC price, amount, active loans, and parameters
   * @returns StrategyDecision with investment/withdrawal instructions
   */
  private handleFixedTermMode(context: StrategyContext): StrategyDecision {
    const { month, btcPrice, totalBtcAmount, activeLoans, params } = context

    // ═══════════════════════════════════════════════════════════════════════
    // SKIP MONTH 0: Initial loan already created
    // ═══════════════════════════════════════════════════════════════════════
    if (month === 0) {
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: "Month 0: Initial loan already created"
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHECK IF LOAN IS MATURING THIS MONTH
    // ═══════════════════════════════════════════════════════════════════════
    const maturingLoan = activeLoans.find(loan => loan.maturityMonth === month)

    if (!maturingLoan) {
      // No loan maturing this month, no action needed
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `No loan maturing this month (next maturity: ${activeLoans.length > 0 ? activeLoans[0].maturityMonth : 'N/A'})`
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Calculate full term interest
    // ═══════════════════════════════════════════════════════════════════════
    const annualRate = params.annualInterestRate
    const termYears = params.loanTermMonths / 12
    const interestDue = maturingLoan.principal * annualRate * termYears
    const totalDebtToRepay = maturingLoan.principal + interestDue

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Calculate new target loan based on current collateral
    // ═══════════════════════════════════════════════════════════════════════
    const collateralValue = totalBtcAmount * btcPrice
    const targetLtv = params.riskManagement.targetLtv / 100
    const targetLoan = collateralValue * targetLtv

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Calculate amount to borrow (after repaying old loan)
    // ═══════════════════════════════════════════════════════════════════════
    const amountToBorrow = targetLoan - totalDebtToRepay

    if (amountToBorrow <= 0) {
      // Forced exceedance scenario - insufficient collateral to maintain target LTV
      return {
        allowInvestment: false,
        investmentMultiplier: 0,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `Rollover: repaying $${Math.round(totalDebtToRepay)} (principal $${Math.round(maturingLoan.principal)} + interest $${Math.round(interestDue)}), insufficient collateral for target LTV`
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Calculate net proceeds after origination fee
    // ═══════════════════════════════════════════════════════════════════════
    const loanFee = params.loanOriginationFeePercent / 100
    const netProceeds = amountToBorrow * (1 - loanFee)

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Calculate investment multiplier
    // ═══════════════════════════════════════════════════════════════════════
    const investmentMultiplier = netProceeds / collateralValue

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Return decision based on accumulation mode
    // ═══════════════════════════════════════════════════════════════════════
    if (params.btcAccumulation) {
      // BTC Accumulation Mode: Reinvest net proceeds
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: false,
        withdrawalAmount: 0,
        reasoning: `Rollover: repaying $${Math.round(totalDebtToRepay)} (principal $${Math.round(maturingLoan.principal)} + interest $${Math.round(interestDue)}), borrowing $${Math.round(targetLoan)} (net $${Math.round(netProceeds)})`
      }
    } else {
      // Cash Generation Mode: Take specified withdrawal amount
      const withdrawalAmount = Math.abs(params.monthlyWithdrawalAmount || 0)
      return {
        allowInvestment: true,
        investmentMultiplier,
        allowWithdrawal: true,
        withdrawalAmount,
        reasoning: `Rollover: repaying $${Math.round(totalDebtToRepay)} (principal $${Math.round(maturingLoan.principal)} + interest $${Math.round(interestDue)}), borrowing $${Math.round(targetLoan)}, withdrawing $${Math.round(withdrawalAmount)}`
      }
    }
  }
}

