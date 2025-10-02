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
   * Creates the first loan based on target LTV and returns investment decision.
   * This is the same for both Dynamic LTV and Fixed Term modes.
   */
  private handleInitialLoan(context: StrategyContext): StrategyDecision {
    // TODO: Implement initial loan logic in Task 3
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: "Initial loan logic not yet implemented"
    }
  }

  /**
   * Handle Dynamic LTV Mode (Infinite Loan Term)
   * 
   * - Monthly interest accrual on loan balance
   * - Automatic LTV reset to target percentage
   * - No rollover events
   */
  private handleDynamicLtvMode(context: StrategyContext): StrategyDecision {
    // TODO: Implement Dynamic LTV mode logic in Task 5
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: "Dynamic LTV mode logic not yet implemented"
    }
  }

  /**
   * Handle Fixed Term Mode (Specific Loan Term)
   * 
   * - Interest calculated at rollover (full term interest)
   * - Loan rollover only at maturity months
   * - Excess proceeds calculation
   */
  private handleFixedTermMode(context: StrategyContext): StrategyDecision {
    // TODO: Implement Fixed Term mode logic in Task 6
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: "Fixed Term mode logic not yet implemented"
    }
  }
}

