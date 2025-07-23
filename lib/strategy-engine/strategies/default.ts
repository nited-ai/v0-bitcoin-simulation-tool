// lib/strategy-engine/strategies/default.ts

import type { 
  InvestmentStrategyInterface, 
  StrategyContext, 
  StrategyDecision 
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
