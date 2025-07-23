// lib/strategy-engine/strategies/moving-average.ts

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from "../types"

/**
 * Moving Average investment strategy.
 * This strategy adjusts investment based on the current BTC price relative to its
 * long-term moving average (default: 200-week). When price is above the MA, it allows
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
    return "The strategy calculates a moving average (default: 200 weeks) from historical price data and compares the current price to this average. When price is above the MA, it allows normal or increased investment using a configurable multiplier. When below the MA, it reduces investment to be more conservative during potential downtrends."
  }

  getSuitability(): string {
    return "Best suited for advanced investors who understand technical analysis and market trends. Ideal for those who want to be more aggressive during uptrends and conservative during downtrends. Requires careful parameter tuning and understanding of moving average concepts. Not recommended for beginners due to its complexity and potential for increased volatility in investment decisions."
  }

  /**
   * Calculate the moving average for the given period
   */
  private calculateMovingAverage(context: StrategyContext, periodWeeks: number): number {
    const { historicalPriceData, currentDate } = context
    
    // Convert weeks to days
    const periodDays = periodWeeks * 7
    
    // Get the cutoff date
    const cutoffDate = new Date(currentDate)
    cutoffDate.setDate(cutoffDate.getDate() - periodDays)
    const cutoffTimestamp = cutoffDate.getTime() / 1000
    
    // Filter historical data to the specified period
    const relevantData = historicalPriceData.filter(point => point.time >= cutoffTimestamp)
    
    if (relevantData.length === 0) {
      // Fallback to current price if no historical data available
      return context.btcPrice
    }
    
    // Calculate simple moving average
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
    const movingAveragePeriod = params.movingAverageParams?.movingAveragePeriod ?? 200
    const baseInvestmentMultiplier = params.movingAverageParams?.investmentMultiplier ?? 1.0
    
    // Calculate moving average
    const movingAverage = this.calculateMovingAverage(context, movingAveragePeriod)
    
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

    // Determine investment multiplier based on price relative to moving average
    let investmentMultiplier = baseInvestmentMultiplier
    let reasoning = `${movingAveragePeriod}W MA: €${Math.round(movingAverage)}, Current: €${Math.round(btcPrice)}`
    
    if (btcPrice > movingAverage) {
      // Price is above moving average - allow normal or increased investment
      const priceRatio = btcPrice / movingAverage
      if (priceRatio > 1.5) {
        // Significantly above MA - be more aggressive
        investmentMultiplier = baseInvestmentMultiplier * 1.2
        reasoning += " - Aggressive investment (well above MA)"
      } else {
        // Moderately above MA - normal investment
        investmentMultiplier = baseInvestmentMultiplier
        reasoning += " - Normal investment (above MA)"
      }
    } else {
      // Price is below moving average - reduce investment
      const priceRatio = btcPrice / movingAverage
      if (priceRatio < 0.7) {
        // Significantly below MA - minimal investment
        investmentMultiplier = baseInvestmentMultiplier * 0.2
        reasoning += " - Minimal investment (well below MA)"
      } else {
        // Moderately below MA - reduced investment
        investmentMultiplier = baseInvestmentMultiplier * 0.6
        reasoning += " - Reduced investment (below MA)"
      }
    }

    // Cap the multiplier at reasonable bounds
    investmentMultiplier = Math.max(0, Math.min(2.0, investmentMultiplier))
    reasoning += ` - Multiplier: ${Math.round(investmentMultiplier * 100)}%`

    // Check if we have capacity for needs and investment
    if (projectedDebtAfterNeeds <= debtCapacity) {
      // We have capacity for both needs and investment
      return {
        allowInvestment: investmentMultiplier > 0,
        investmentMultiplier,
        allowWithdrawal: true,
        withdrawalAmount: params.monthlyWithdrawalAmount,
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
