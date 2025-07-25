// lib/strategy-engine/strategies/ath-collateral.ts

import type { 
  InvestmentStrategyInterface, 
  StrategyContext, 
  StrategyDecision 
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
    return "Advanced collateral management strategy that protects Bitcoin holdings during severe market downturns while enabling growth without selling."
  }

  /**
   * Calculate the All-Time High within the specified lookback period
   */
  private calculateATH(context: StrategyContext, lookbackMonths: number): number {
    const { historicalPriceData, priceChartData, btcPrice, currentDate } = context

    // Calculate lookback date
    const lookbackDate = new Date(currentDate)
    lookbackDate.setMonth(lookbackDate.getMonth() - lookbackMonths)
    const lookbackTimestamp = lookbackDate.getTime() / 1000

    let ath = btcPrice // Start with current price as minimum ATH

    // Check historical data within lookback period
    historicalPriceData.forEach(point => {
      if (point.time >= lookbackTimestamp && point.close > ath) {
        ath = point.close
      }
    })

    // Check price chart data (ONLY historical prices, not projections) within lookback period
    priceChartData.forEach(point => {
      const pointDate = new Date(point.date)
      if (pointDate >= lookbackDate && pointDate <= currentDate) {
        // Only use historical prices, not projected prices
        const price = point.historicalPrice
        if (price && price > ath) {
          ath = price
        }
      }
    })

    // Ensure we have a reasonable ATH (fallback to current price if no data)
    const result = Math.max(ath, btcPrice)



    return result
  }

  /**
   * Calculate the maximum safe debt based on ATH drawdown tolerance
   */
  private calculateMaxSafeDebt(
    totalBtcAmount: number,
    ath: number,
    maxDrawdownPercent: number,
    collateralMultiplier: number,
    emergencyBuffer: number
  ): number {
    // Calculate the worst-case BTC price (ATH minus max drawdown)
    const worstCasePrice = ath * (1 - maxDrawdownPercent / 100)

    // Calculate total collateral value at worst-case price
    const worstCaseCollateralValue = totalBtcAmount * worstCasePrice

    // Apply emergency buffer and collateral multiplier
    const maxSafeDebt = worstCaseCollateralValue / (collateralMultiplier * emergencyBuffer)

    const result = Math.max(0, maxSafeDebt)



    return result
  }

  /**
   * Calculate current risk level based on price distance from ATH
   * Returns 0 (low risk, far from ATH) to 1 (high risk, close to ATH)
   * Enhanced with exponential curve for more nuanced risk assessment
   */
  private calculateRiskLevel(currentPrice: number, ath: number, riskCurveExponent: number = 1.3): number {
    if (ath === 0) return 1 // Maximum risk if no ATH data

    const drawdownFromATH = Math.max(0, (ath - currentPrice) / ath)

    // Use exponential curve instead of linear for more nuanced risk assessment
    // Lower exponent = more aggressive near ATH, higher exponent = more conservative
    const baseRisk = 1 - drawdownFromATH
    const adjustedRisk = Math.pow(baseRisk, riskCurveExponent)

    return Math.max(0, Math.min(1, adjustedRisk))
  }

  makeDecision(context: StrategyContext): StrategyDecision {
    const {
      btcPrice,
      totalBtcAmount,
      activeLoans,
      params,
      month
    } = context

    try {
      // Get ATH Collateral strategy parameters with optimized defaults
      const maxDrawdownPercent = params.athCollateralParams?.maxDrawdownPercent ?? 82
      const collateralMultiplier = params.athCollateralParams?.collateralMultiplier ?? 1.9
      const athLookbackMonths = params.athCollateralParams?.athLookbackMonths ?? 30
      const emergencyBuffer = params.athCollateralParams?.emergencyCollateralBuffer ?? 1.15

      // Calculate current ATH within lookback period
      const ath = this.calculateATH(context, athLookbackMonths)

      // Calculate maximum safe debt based on ATH drawdown tolerance
      const maxSafeDebt = this.calculateMaxSafeDebt(
        totalBtcAmount,
        ath,
        maxDrawdownPercent,
        collateralMultiplier,
        emergencyBuffer
      )



      // Calculate current debt situation
      const collateralValue = totalBtcAmount * btcPrice
      const currentDebt = activeLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)

      // Get maturing loans for this month
      const maturingLoans = activeLoans.filter((l) => l.maturityMonth === month)
      const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)

      // Calculate debt from ongoing loans (not maturing this month)
      const debtFromOngoingLoans = activeLoans
        .filter((l) => l.maturityMonth !== month)
        .reduce((sum, l) => sum + l.repaymentAmount, 0)

      // Calculate principal needed for basic needs (repayments + withdrawal)
      const principalForNeeds =
        (repaymentDue + params.monthlyWithdrawalAmount) /
        (1 - params.loanOriginationFeePercent / 100)

      const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

      // Calculate available debt capacity within safety limits
      const availableDebtCapacity = Math.max(0, maxSafeDebt - projectedDebtAfterNeeds)

      // Calculate risk level for investment adjustment
      const riskLevel = this.calculateRiskLevel(btcPrice, ath)

      // Determine investment multiplier based on risk and available capacity
      let investmentMultiplier = 0.0
      let allowInvestment = false

      if (availableDebtCapacity > 0) {
        allowInvestment = true

        // Enhanced investment multiplier calculation with optimized parameters
        const minMultiplier = 0.15  // Increased from 0.1 for better opportunity capture
        const maxMultiplier = 1.1   // Slightly increased for more aggressive accumulation

        // Use quadratic curve for smoother transitions
        const baseMultiplier = minMultiplier +
          (maxMultiplier - minMultiplier) * Math.pow(1 - riskLevel, 2)

        // Optimized debt utilization adjustment - less punitive
        const debtUtilization = maxSafeDebt > 0 ? projectedDebtAfterNeeds / maxSafeDebt : 0
        let debtAdjustment = 1.0

        if (debtUtilization > 0.82) { // Increased threshold from 0.8
          const excessUtilization = debtUtilization - 0.82
          const maxExcess = 1.0 - 0.82
          debtAdjustment = Math.max(0.2, 1 - (excessUtilization / maxExcess) * 0.5) // Less punitive
        }

        // Capacity bonus for encouraging use of available capacity
        const capacityBonus = availableDebtCapacity > 1000 ? 1.05 : 1.0

        investmentMultiplier = Math.max(
          minMultiplier,
          Math.min(maxMultiplier, baseMultiplier * debtAdjustment * capacityBonus)
        )
      }

      // Calculate current drawdown from ATH
      const currentDrawdown = ath > 0 ? ((ath - btcPrice) / ath) * 100 : 0

      // Build detailed reasoning string
      const debtUtilization = maxSafeDebt > 0 ? projectedDebtAfterNeeds / maxSafeDebt : 0
      const worstCasePrice = ath * (1 - maxDrawdownPercent / 100)

      const reasoning = [
        `ATH (${athLookbackMonths}M): €${Math.round(ath)}`,
        `Current: €${Math.round(btcPrice)} (${currentDrawdown.toFixed(1)}% from ATH)`,
        `Worst-Case: €${Math.round(worstCasePrice)} (-${maxDrawdownPercent}%)`,
        `Max Safe Debt: €${Math.round(maxSafeDebt)}`,
        `Current Debt: €${Math.round(currentDebt)}`,
        `Projected Debt: €${Math.round(projectedDebtAfterNeeds)}`,
        `Available Capacity: €${Math.round(availableDebtCapacity)}`,
        `Debt Utilization: ${(debtUtilization * 100).toFixed(1)}%`,
        `Risk Level: ${(riskLevel * 100).toFixed(1)}%`,
        `Investment Decision: ${allowInvestment ? `ALLOW (${(investmentMultiplier * 100).toFixed(1)}%)` : 'BLOCKED'}`,
        availableDebtCapacity <= 0 ? 'Reason: At debt limit' :
        riskLevel > 0.8 ? 'Reason: High risk (close to ATH)' :
        'Reason: Safe to invest'
      ].join(' | ')

      const result = {
        allowInvestment,
        investmentMultiplier,
        allowWithdrawal: true, // Always allow withdrawal as per original logic
        withdrawalAmount: params.monthlyWithdrawalAmount,
        maxDebtOverride: maxSafeDebt, // Override default LTV with our calculated safe debt limit
        reasoning
      }



      return result
    } catch (error) {
      console.error('ATH Collateral Strategy Error:', error)
      // Fallback to safe defaults
      return {
        allowInvestment: false,
        investmentMultiplier: 0.0,
        allowWithdrawal: true,
        withdrawalAmount: params.monthlyWithdrawalAmount,
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}
