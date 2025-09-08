/**
 * ATH Collateral Strategy Implementation
 * 
 * Advanced collateral management strategy designed to protect Bitcoin holdings
 * during severe market downturns while allowing for portfolio growth.
 */

import type {
  InvestmentStrategyInterface,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata
} from "../types"

/**
 * ATH Collateral Strategy - Advanced collateral management strategy
 * 
 * This strategy is designed to protect Bitcoin holdings during severe market downturns
 * while allowing for portfolio growth without selling Bitcoin. Key features:
 * 
 * 1. Dynamic debt limits based on ATH drawdown tolerance
 * 2. Collateral management with safety buffers
 * 3. Liquidation protection through emergency collateral reserves
 * 4. Conservative borrowing during high-risk periods
 */
export class AthCollateralStrategy implements InvestmentStrategyInterface {
  getName(): string {
    return "ATH Collateral Strategy"
  }

  getDescription(): string {
    return "Advanced collateral management with ATH drawdown protection and emergency reserves."
  }

  getMetadata(): StrategyMetadata {
    return {
      securityRating: 5, // Highest security through advanced risk management
      complexityRating: 5, // Most complex strategy with multiple parameters
      suitableFor: ["expert", "conservative", "risk_averse"],
      criteria: ["ath_drawdown", "collateral_buffer", "emergency_reserve", "liquidation_protection"]
    }
  }

  getDetailedDescription(): string {
    return "The ATH Collateral Strategy implements sophisticated risk management by tracking Bitcoin's distance from All-Time High and adjusting collateral usage accordingly. It maintains emergency reserves and implements dynamic debt limits to protect against severe market downturns while still allowing for strategic leverage."
  }

  getFunctionality(): string {
    return "This strategy monitors ATH drawdown levels and implements tiered risk management: conservative borrowing during small drawdowns, reduced leverage during moderate drawdowns, and emergency protection during severe drawdowns. It maintains collateral buffers and emergency reserves to prevent liquidation during market crashes."
  }

  getSuitability(): string {
    return "Designed for expert investors who prioritize capital preservation over maximum returns. Perfect for those who want sophisticated risk management and are willing to sacrifice some upside potential for downside protection. Requires understanding of advanced risk management concepts and careful parameter configuration."
  }

  /**
   * Calculate the All-Time High from available data
   */
  private calculateATH(context: StrategyContext): number {
    const { historicalPriceData, priceProjectionData, btcPrice } = context
    
    let ath = 0
    
    // Check historical data
    if (historicalPriceData && historicalPriceData.length > 0) {
      historicalPriceData.forEach(point => {
        if (point.close > ath) {
          ath = point.close
        }
      })
    }
    
    // Check price projection data
    if (priceProjectionData && priceProjectionData.projectionPoints) {
      priceProjectionData.projectionPoints.forEach(point => {
        if (point.price > ath) {
          ath = point.price
        }
      })
    }
    
    // Check current price
    if (btcPrice > ath) {
      ath = btcPrice
    }
    
    return ath
  }

  /**
   * Calculate drawdown from ATH
   */
  private calculateDrawdown(currentPrice: number, ath: number): number {
    if (ath === 0) return 0
    return ((ath - currentPrice) / ath) * 100
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    const { 
      btcPrice, 
      totalBtcAmount, 
      activeLoans, 
      params 
    } = context

    // Get ATH collateral parameters (with defaults)
    const athDrawdownTolerance = params.athCollateralParams?.athDrawdownTolerance ?? 80 // 80% max drawdown
    const collateralBuffer = params.athCollateralParams?.collateralBuffer ?? 20 // 20% buffer
    const emergencyReserve = params.athCollateralParams?.emergencyReserve ?? 10 // 10% emergency reserve
    
    // Calculate current ATH and drawdown
    const ath = this.calculateATH(context)
    const drawdown = this.calculateDrawdown(btcPrice, ath)
    
    // Calculate current debt situation
    const collateralValue = totalBtcAmount * btcPrice
    let debtCapacity = collateralValue * (params.riskManagement.targetLtv / 100)
    
    // Apply collateral buffer
    const bufferedCollateralValue = collateralValue * (1 - collateralBuffer / 100)
    const bufferedDebtCapacity = bufferedCollateralValue * (params.riskManagement.targetLtv / 100)
    
    // Apply emergency reserve
    const reserveCollateralValue = collateralValue * (1 - emergencyReserve / 100)
    const reserveDebtCapacity = reserveCollateralValue * (params.riskManagement.targetLtv / 100)
    
    // Get maturing loans for this month
    const maturingLoans = activeLoans.filter((l) => l.maturityMonth === context.month)
    const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
    
    // Calculate debt from ongoing loans
    const debtFromOngoingLoans = activeLoans
      .filter((l) => l.maturityMonth !== context.month)
      .reduce((sum, l) => sum + l.repaymentAmount, 0)

    // Calculate principal needed for basic needs
    const netWithdrawalNeed = Math.max(0, -params.monthlyWithdrawalAmount)
    const principalForNeeds =
      (repaymentDue + netWithdrawalNeed) /
      (1 - params.loanOriginationFeePercent / 100)

    const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

    // Determine risk level and adjust debt capacity
    let riskLevel = "low"
    let adjustedDebtCapacity = debtCapacity
    let investmentMultiplier = 1.0
    
    if (drawdown < 20) {
      // Low risk - normal operations with buffer
      riskLevel = "low"
      adjustedDebtCapacity = bufferedDebtCapacity
      investmentMultiplier = 0.8 // Conservative even in good times
    } else if (drawdown < 50) {
      // Moderate risk - reduced capacity
      riskLevel = "moderate"
      adjustedDebtCapacity = bufferedDebtCapacity * 0.7
      investmentMultiplier = 0.5
    } else if (drawdown < athDrawdownTolerance) {
      // High risk - emergency mode
      riskLevel = "high"
      adjustedDebtCapacity = reserveDebtCapacity * 0.5
      investmentMultiplier = 0.2
    } else {
      // Extreme risk - survival mode
      riskLevel = "extreme"
      adjustedDebtCapacity = reserveDebtCapacity * 0.3
      investmentMultiplier = 0.0
    }

    let reasoning = `ATH: €${Math.round(ath)}, Current: €${Math.round(btcPrice)}, Drawdown: ${drawdown.toFixed(1)}%, Risk: ${riskLevel}`

    // Check if we have capacity for needs and investment
    if (projectedDebtAfterNeeds <= adjustedDebtCapacity) {
      // We have capacity for both needs and investment
      return {
        allowInvestment: investmentMultiplier > 0,
        investmentMultiplier,
        allowWithdrawal: params.monthlyWithdrawalAmount < 0,
        withdrawalAmount: Math.abs(Math.min(0, params.monthlyWithdrawalAmount)),
        maxDebtOverride: adjustedDebtCapacity,
        reasoning: reasoning + ` - Investment: ${Math.round(investmentMultiplier * 100)}%`
      }
    } else {
      // We need to check if we can at least cover repayments
      const principalForRepaymentOnly = repaymentDue / (1 - params.loanOriginationFeePercent / 100)
      const projectedDebtForRepaymentOnly = debtFromOngoingLoans + principalForRepaymentOnly

      if (projectedDebtForRepaymentOnly <= adjustedDebtCapacity) {
        // We can cover repayments but not withdrawal
        return {
          allowInvestment: false,
          investmentMultiplier: 0.0,
          allowWithdrawal: false,
          withdrawalAmount: 0,
          maxDebtOverride: adjustedDebtCapacity,
          reasoning: reasoning + " - Repayments only"
        }
      } else {
        // We need to deleverage to stay within adjusted capacity
        return {
          allowInvestment: false,
          investmentMultiplier: 0.0,
          allowWithdrawal: false,
          withdrawalAmount: 0,
          maxDebtOverride: adjustedDebtCapacity,
          reasoning: reasoning + " - Emergency deleveraging"
        }
      }
    }
  }
}
