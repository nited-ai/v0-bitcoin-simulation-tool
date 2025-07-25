// lib/strategy-engine/strategies/ath-based.ts

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from "../types"

/**
 * ATH-Based investment strategy.
 * This strategy limits investment when the current BTC price is above a certain percentage
 * of the All-Time High (ATH). The idea is to be more conservative when prices are near
 * historical peaks.
 */
export class AthBasedStrategy implements InvestmentStrategyInterface {
  getName(): string {
    return "ATH-Based Strategy"
  }

  getDescription(): string {
    return "Limits investment when BTC price is above a percentage of All-Time High. More conservative near price peaks."
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 4, // Higher security through market timing
      complexityRating: 2, // Simple concept but requires ATH threshold configuration
      suitableFor: ["intermediate", "conservative", "market_aware"],
      criteria: ["all_time_high", "price_proximity", "target_ltv", "debt_capacity"]
    }
  }

  getDetailedDescription(): string {
    return "The ATH-Based Strategy implements a market timing approach that becomes more conservative when Bitcoin prices approach historical peaks. It tracks the All-Time High (ATH) and reduces or eliminates new investments when the current price exceeds a configurable percentage of the ATH."
  }

  getFunctionality(): string {
    return "When the current BTC price is below the ATH threshold (e.g., 80% of ATH), the strategy behaves like the default strategy. When the price exceeds this threshold, investment is blocked or reduced, helping to avoid taking on new debt near market tops. The strategy continuously tracks the ATH from both historical and projected price data."
  }

  getSuitability(): string {
    return "Perfect for investors who want to avoid leveraging near market peaks. Suitable for those who believe in market cycles and want to be more conservative during potential bubble phases. Good for intermediate investors who understand market timing concepts but want a systematic approach rather than emotional decision-making."
  }

  /**
   * Calculate the All-Time High from historical and current price data
   */
  private calculateATH(context: StrategyContext): number {
    const { historicalPriceData, priceChartData, btcPrice } = context
    
    let ath = 0
    
    // Check historical data
    historicalPriceData.forEach(point => {
      if (point.close > ath) {
        ath = point.close
      }
    })
    
    // Check price chart data (includes projections)
    priceChartData.forEach(point => {
      const price = point.simulationPath || point.historicalPrice
      if (price && price > ath) {
        ath = price
      }
    })
    
    // Check current price
    if (btcPrice > ath) {
      ath = btcPrice
    }
    
    return ath
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    const { 
      btcPrice, 
      totalBtcAmount, 
      activeLoans, 
      params 
    } = context

    // Get ATH-based parameters (with defaults)
    const athThresholdPercent = params.athBasedParams?.athThresholdPercent ?? 80
    
    // Calculate current ATH
    const ath = this.calculateATH(context)
    const athThreshold = ath * (athThresholdPercent / 100)
    
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

    // Determine investment multiplier based on ATH proximity
    let investmentMultiplier = 1.0
    let reasoning = `ATH: €${Math.round(ath)}, Threshold (${athThresholdPercent}%): €${Math.round(athThreshold)}, Current: €${Math.round(btcPrice)}`
    
    if (btcPrice > athThreshold) {
      // Price is above ATH threshold - reduce or eliminate investment
      investmentMultiplier = 0.0
      reasoning += " - Investment blocked (above ATH threshold)"
    } else {
      // Price is below ATH threshold - allow normal investment
      const distanceFromThreshold = (athThreshold - btcPrice) / athThreshold
      investmentMultiplier = Math.min(1.0, distanceFromThreshold * 2) // Scale investment based on distance
      reasoning += ` - Investment allowed (${Math.round(investmentMultiplier * 100)}% capacity)`
    }

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
