// lib/strategy-engine/strategies/default.ts

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from "../types"

/**
 * Default investment strategy - maintains the original behavior of the simulation.
 * This strategy allows full investment up to the target LTV without any additional restrictions.
 */
export class DefaultStrategy implements InvestmentStrategyInterface {
  getName(): string {
    return "Default Strategy"
  }

  getDescription(): string {
    return "Standard investment approach with no additional restrictions. Invests up to target LTV."
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 3, // Moderate security - depends on target LTV setting
      complexityRating: 1, // Very simple - no additional parameters
      suitableFor: ["beginners", "conservative", "moderate"],
      criteria: ["target_ltv", "debt_capacity", "basic_needs"]
    }
  }

  getDetailedDescription(): string {
    return "The Default Strategy is the simplest investment approach that maintains the original behavior of the simulation. It focuses purely on maintaining your target debt ratio (LTV) without any market timing considerations."
  }

  getFunctionality(): string {
    return "This strategy invests the maximum available amount up to your target LTV whenever debt capacity is available after covering basic needs (loan repayments and withdrawals). It does not consider market conditions, price trends, or timing factors."
  }

  getSuitability(): string {
    return "Ideal for beginners who want a straightforward approach without complex market analysis. Suitable for conservative investors who prefer consistent, predictable behavior regardless of market conditions. Good for those who want to focus on risk management through LTV control rather than market timing."
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    const { 
      btcPrice, 
      totalBtcAmount, 
      activeLoans, 
      params 
    } = context

    // Calculate current debt situation
    const collateralValue = totalBtcAmount * btcPrice
    const debtCapacity = collateralValue * (params.riskManagement.targetLtv / 100)
    
    // Get maturing loans for this month
    const maturingLoans = activeLoans.filter((l) => l.maturityMonth === context.month)
    const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
    
    // Calculate debt from ongoing loans (not maturing this month)
    const debtFromOngoingLoans = activeLoans
      .filter((l) => l.maturityMonth !== context.month)
      .reduce((sum, l) => sum + l.repaymentAmount, 0)

    // Calculate principal needed for basic needs (repayments + withdrawal)
    const principalForNeeds = 
      (repaymentDue + params.monthlyWithdrawalAmount) / 
      (1 - params.loanOriginationFeePercent / 100)

    const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

    // Default strategy: allow investment if we have capacity after covering needs
    if (projectedDebtAfterNeeds <= debtCapacity) {
      // We have capacity for both needs and investment
      return {
        allowInvestment: true,
        investmentMultiplier: 1.0, // Use full available capacity
        allowWithdrawal: true,
        withdrawalAmount: params.monthlyWithdrawalAmount,
        reasoning: "Sufficient debt capacity for both withdrawal and investment"
      }
    } else {
      // We need to check if we can at least cover repayments
      const principalForRepaymentOnly = repaymentDue / (1 - params.loanOriginationFeePercent / 100)
      const projectedDebtForRepaymentOnly = debtFromOngoingLoans + principalForRepaymentOnly

      if (projectedDebtForRepaymentOnly <= debtCapacity) {
        // We can cover repayments but not withdrawal
        return {
          allowInvestment: false,
          investmentMultiplier: 0.0,
          allowWithdrawal: false,
          withdrawalAmount: 0,
          reasoning: "Can cover loan repayments but not withdrawal - skipping withdrawal"
        }
      } else {
        // We need to deleverage to stay within target LTV
        return {
          allowInvestment: false,
          investmentMultiplier: 0.0,
          allowWithdrawal: false,
          withdrawalAmount: 0,
          reasoning: "Need to deleverage to stay within target LTV"
        }
      }
    }
  }
}
