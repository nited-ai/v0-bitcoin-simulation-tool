/**
 * Moving Average Strategy Implementation
 * 
 * Adjusts investment based on BTC price relative to long-term moving average.
 * More aggressive above MA, conservative below.
 */

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from "../types"

/**
 * Moving Average investment strategy.
 * This strategy adjusts investment based on the current BTC price relative to its
 * long-term moving average. When price is above the MA, it allows
 * normal or increased investment. When below, it reduces investment.
 */
export class MovingAverageStrategy implements InvestmentStrategyInterface {
  getName(): string {
    return "Moving Average Strategy"
  }

  getDescription(): string {
    return "Adjusts investment based on BTC price relative to long-term moving average. More aggressive above MA, conservative below."
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 3, // Moderate security - can be aggressive above MA
      complexityRating: 4, // More complex with multiple parameters
      suitableFor: ["advanced", "aggressive", "technical_analysis"],
      criteria: ["moving_average", "price_trend", "investment_multiplier", "target_ltv"]
    }
  }

  getDetailedDescription(): string {
    return "The Moving Average Strategy uses technical analysis to adjust investment aggressiveness based on Bitcoin's price position relative to its long-term moving average. This strategy assumes that prices above the moving average indicate an uptrend, while prices below suggest a downtrend or consolidation phase."
  }

  getFunctionality(): string {
    return "The strategy calculates a moving average from historical price data and compares the current price to this average. When price is above the MA, it allows normal or increased investment using a configurable multiplier. When below the MA, it reduces investment to be more conservative during potential downtrends."
  }

  getSuitability(): string {
    return "Best suited for advanced investors who understand technical analysis and market trends. Ideal for those who want to be more aggressive during uptrends and conservative during downtrends. Requires careful parameter tuning and understanding of moving average concepts."
  }

  /**
   * Calculate the moving average for the given period
   */
  private calculateMovingAverage(context: StrategyContext, periodWeeks: number): number {
    const { historicalPriceData } = context
    
    if (!historicalPriceData || historicalPriceData.length === 0) {
      // Fallback to current price if no historical data
      return context.btcPrice
    }

    // Simple moving average calculation
    const relevantData = historicalPriceData.slice(-periodWeeks)
    const sum = relevantData.reduce((acc, point) => acc + point.close, 0)
    return sum / relevantData.length
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    const { 
      btcPrice, 
      totalBtcAmount, 
      activeLoans, 
      params 
    } = context

    // Get moving average parameters (with defaults)
    const longPeriod = params.movingAverageParams?.longPeriod ?? 200 // 200 weeks default
    const baseInvestmentMultiplier = params.movingAverageParams?.investmentMultiplier ?? 1.0
    
    // Calculate moving average
    const movingAverage = this.calculateMovingAverage(context, longPeriod)
    
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

    // Calculate principal needed for basic needs
    const netWithdrawalNeed = Math.max(0, -params.monthlyWithdrawalAmount)
    const principalForNeeds =
      (repaymentDue + netWithdrawalNeed) /
      (1 - params.loanOriginationFeePercent / 100)

    const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

    // Determine investment multiplier based on price vs moving average
    let investmentMultiplier = baseInvestmentMultiplier
    let reasoning = `MA(${longPeriod}): €${Math.round(movingAverage)}, Current: €${Math.round(btcPrice)}`
    
    if (btcPrice > movingAverage) {
      // Price is above MA - allow normal or increased investment
      const priceRatio = btcPrice / movingAverage
      investmentMultiplier = Math.min(2.0, baseInvestmentMultiplier * priceRatio) // Cap at 2x
      reasoning += ` - Above MA: ${Math.round(investmentMultiplier * 100)}% investment`
    } else {
      // Price is below MA - reduce investment
      const priceRatio = btcPrice / movingAverage
      investmentMultiplier = baseInvestmentMultiplier * priceRatio * 0.5 // Reduce by half when below MA
      reasoning += ` - Below MA: ${Math.round(investmentMultiplier * 100)}% investment`
    }

    // Check if we have capacity for needs and investment
    if (projectedDebtAfterNeeds <= debtCapacity) {
      // We have capacity for both needs and investment
      return {
        allowInvestment: investmentMultiplier > 0,
        investmentMultiplier,
        allowWithdrawal: params.monthlyWithdrawalAmount < 0,
        withdrawalAmount: Math.abs(Math.min(0, params.monthlyWithdrawalAmount)),
        reasoning
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
          reasoning: reasoning + " - Can cover repayments but not withdrawal"
        }
      } else {
        // We need to deleverage to stay within target LTV
        return {
          allowInvestment: false,
          investmentMultiplier: 0.0,
          allowWithdrawal: false,
          withdrawalAmount: 0,
          reasoning: reasoning + " - Need to deleverage"
        }
      }
    }
  }
}
