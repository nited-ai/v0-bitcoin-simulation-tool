/**
 * Strategy Results Adapter
 * 
 * Base adapter class for enhancing strategy results with price projection context
 * and preparing data for results analysis and visualization.
 */

import type { StrategyExecutionResult } from '../interfaces/StrategyInterface'
import type { 
  EnhancedResultsAnalysis, 
  ProjectionAccuracyMetrics,
  StrategyPerformanceMetrics,
  RiskAssessmentData,
  ComparisonData,
  DeviationMetrics,
  RiskCategory
} from '../interfaces/ResultsInterface'
import type { PriceProjectionResult } from '../types'

/**
 * Base Strategy Results Adapter
 * 
 * Provides common functionality for enhancing strategy results
 * with price projection context and calculating performance metrics.
 */
export class StrategyResultsAdapter {
  /**
   * Enhance strategy results with price projection context
   * 
   * @param strategyResult - Complete strategy execution result
   * @param originalProjection - Original price projection used
   * @returns Enhanced analysis with accuracy and performance metrics
   */
  static enhanceWithProjectionContext(
    strategyResult: StrategyExecutionResult,
    originalProjection: PriceProjectionResult
  ): EnhancedResultsAnalysis {
    const projectionAccuracy = this.calculateProjectionAccuracy(
      strategyResult,
      originalProjection
    )

    const strategyPerformance = this.calculateStrategyPerformance(strategyResult)

    const riskAssessment = this.assessRisk(strategyResult)

    return {
      monthlyResults: strategyResult.monthlyResults,
      priceProjectionAccuracy: projectionAccuracy,
      strategyPerformance: strategyPerformance,
      riskAssessment: riskAssessment
    }
  }

  /**
   * Calculate price projection accuracy metrics
   * 
   * @param strategyResult - Strategy execution result with actual prices
   * @param originalProjection - Original price projection
   * @returns Projection accuracy metrics
   */
  private static calculateProjectionAccuracy(
    strategyResult: StrategyExecutionResult,
    originalProjection: PriceProjectionResult
  ): ProjectionAccuracyMetrics {
    const actualVsProjected: ComparisonData[] = []
    const projectionMap = new Map<number, number>()

    // Create map of projected prices by timestamp
    originalProjection.projectionPoints.forEach(point => {
      projectionMap.set(point.timestamp, point.price)
    })

    // Compare actual vs projected prices
    strategyResult.monthlyResults.forEach(result => {
      const timestamp = new Date(result.dateString).getTime()
      const projectedPrice = projectionMap.get(timestamp)

      if (projectedPrice) {
        const deviation = result.btcPrice - projectedPrice
        const deviationPercent = (deviation / projectedPrice) * 100

        actualVsProjected.push({
          timestamp,
          projected: projectedPrice,
          actual: result.btcPrice,
          deviation,
          deviationPercent
        })
      }
    })

    const deviationAnalysis = this.calculateDeviationMetrics(actualVsProjected)
    const accuracyScore = this.calculateAccuracyScore(actualVsProjected)

    return {
      modelUsed: originalProjection.modelName,
      projectionConfidence: originalProjection.metadata.confidence,
      actualVsProjected,
      accuracyScore,
      deviationAnalysis
    }
  }

  /**
   * Calculate deviation metrics
   * 
   * @param comparisons - Array of actual vs projected comparisons
   * @returns Statistical deviation metrics
   */
  private static calculateDeviationMetrics(comparisons: ComparisonData[]): DeviationMetrics {
    if (comparisons.length === 0) {
      return {
        meanAbsoluteError: 0,
        rootMeanSquareError: 0,
        meanAbsolutePercentageError: 0,
        maxDeviation: 0,
        minDeviation: 0
      }
    }

    const absoluteErrors = comparisons.map(c => Math.abs(c.deviation))
    const squaredErrors = comparisons.map(c => c.deviation * c.deviation)
    const absolutePercentageErrors = comparisons.map(c => Math.abs(c.deviationPercent))

    return {
      meanAbsoluteError: absoluteErrors.reduce((sum, err) => sum + err, 0) / absoluteErrors.length,
      rootMeanSquareError: Math.sqrt(squaredErrors.reduce((sum, err) => sum + err, 0) / squaredErrors.length),
      meanAbsolutePercentageError: absolutePercentageErrors.reduce((sum, err) => sum + err, 0) / absolutePercentageErrors.length,
      maxDeviation: Math.max(...comparisons.map(c => c.deviation)),
      minDeviation: Math.min(...comparisons.map(c => c.deviation))
    }
  }

  /**
   * Calculate accuracy score (0-100)
   * 
   * @param comparisons - Array of actual vs projected comparisons
   * @returns Accuracy score between 0 and 100
   */
  private static calculateAccuracyScore(comparisons: ComparisonData[]): number {
    if (comparisons.length === 0) return 0

    const meanAbsolutePercentageError = comparisons
      .map(c => Math.abs(c.deviationPercent))
      .reduce((sum, err) => sum + err, 0) / comparisons.length

    // Convert MAPE to accuracy score (100 - MAPE, clamped to 0-100)
    return Math.max(0, Math.min(100, 100 - meanAbsolutePercentageError))
  }

  /**
   * Calculate strategy performance metrics
   * 
   * @param strategyResult - Strategy execution result
   * @returns Strategy performance metrics
   */
  private static calculateStrategyPerformance(
    strategyResult: StrategyExecutionResult
  ): StrategyPerformanceMetrics {
    const { monthlyResults, executionSummary } = strategyResult

    if (monthlyResults.length === 0) {
      return {
        totalReturn: 0,
        totalReturnPercent: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        winRate: 0,
        profitFactor: 0,
        averageMonthlyReturn: 0
      }
    }

    const initialValue = monthlyResults[0].collateralValue
    const finalValue = executionSummary.finalPortfolioValue
    const totalReturn = finalValue - initialValue
    const totalReturnPercent = (totalReturn / initialValue) * 100

    // Calculate annualized return
    const years = monthlyResults.length / 12
    const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100 : 0

    // Calculate monthly returns for additional metrics
    const monthlyReturns = this.calculateMonthlyReturns(monthlyResults)
    const averageMonthlyReturn = monthlyReturns.reduce((sum, ret) => sum + ret, 0) / monthlyReturns.length
    const monthlyReturnStdDev = this.calculateStandardDeviation(monthlyReturns)
    
    // Sharpe ratio (assuming risk-free rate of 2% annually = ~0.167% monthly)
    const riskFreeRate = 0.00167
    const sharpeRatio = monthlyReturnStdDev > 0 ? (averageMonthlyReturn - riskFreeRate) / monthlyReturnStdDev : 0

    // Win rate
    const positiveReturns = monthlyReturns.filter(ret => ret > 0).length
    const winRate = (positiveReturns / monthlyReturns.length) * 100

    // Profit factor
    const grossProfit = monthlyReturns.filter(ret => ret > 0).reduce((sum, ret) => sum + ret, 0)
    const grossLoss = Math.abs(monthlyReturns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown: executionSummary.maxDrawdown,
      maxDrawdownPercent: (executionSummary.maxDrawdown / initialValue) * 100,
      winRate,
      profitFactor,
      averageMonthlyReturn: averageMonthlyReturn * 100 // Convert to percentage
    }
  }

  /**
   * Calculate monthly returns from monthly results
   * 
   * @param monthlyResults - Array of monthly results
   * @returns Array of monthly return percentages (as decimals)
   */
  private static calculateMonthlyReturns(monthlyResults: any[]): number[] {
    const returns: number[] = []

    for (let i = 1; i < monthlyResults.length; i++) {
      const previousValue = monthlyResults[i - 1].collateralValue
      const currentValue = monthlyResults[i].collateralValue
      const monthlyReturn = (currentValue - previousValue) / previousValue
      returns.push(monthlyReturn)
    }

    return returns
  }

  /**
   * Calculate standard deviation of an array of numbers
   * 
   * @param values - Array of numbers
   * @returns Standard deviation
   */
  private static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length

    return Math.sqrt(variance)
  }

  /**
   * Assess risk levels for the strategy
   * 
   * @param strategyResult - Strategy execution result
   * @returns Risk assessment data
   */
  private static assessRisk(strategyResult: StrategyExecutionResult): RiskAssessmentData {
    const { monthlyResults, executionSummary } = strategyResult

    // Calculate risk scores
    const liquidationRisk = this.assessLiquidationRisk(executionSummary.liquidationCount, monthlyResults.length)
    const volatilityRisk = this.assessVolatilityRisk(monthlyResults)
    const concentrationRisk = this.assessConcentrationRisk() // Always high for single-asset Bitcoin strategy

    // Overall risk score (0-10)
    const riskScores = {
      low: 2,
      medium: 5,
      high: 8,
      critical: 10
    }

    const overallRiskScore = Math.max(
      riskScores[liquidationRisk],
      riskScores[volatilityRisk],
      riskScores[concentrationRisk]
    )

    // Generate risk factors and recommendations
    const riskFactors: string[] = []
    const recommendations: string[] = []

    if (liquidationRisk === 'high' || liquidationRisk === 'critical') {
      riskFactors.push('High liquidation risk detected')
      recommendations.push('Reduce loan-to-value ratios')
    }

    if (volatilityRisk === 'high' || volatilityRisk === 'critical') {
      riskFactors.push('High price volatility exposure')
      recommendations.push('Consider volatility hedging strategies')
    }

    if (concentrationRisk === 'high') {
      riskFactors.push('High Bitcoin concentration risk')
      recommendations.push('Consider portfolio diversification')
    }

    return {
      overallRiskScore,
      liquidationRisk,
      volatilityRisk,
      concentrationRisk,
      riskFactors,
      recommendations
    }
  }

  /**
   * Assess liquidation risk based on liquidation events
   */
  private static assessLiquidationRisk(liquidationCount: number, totalMonths: number): RiskCategory {
    const liquidationRate = liquidationCount / totalMonths

    if (liquidationRate === 0) return 'low'
    if (liquidationRate < 0.05) return 'medium'
    if (liquidationRate < 0.1) return 'high'
    return 'critical'
  }

  /**
   * Assess volatility risk based on price movements
   */
  private static assessVolatilityRisk(monthlyResults: any[]): RiskCategory {
    if (monthlyResults.length < 2) return 'low'

    const priceChanges = []
    for (let i = 1; i < monthlyResults.length; i++) {
      const change = Math.abs(
        (monthlyResults[i].btcPrice - monthlyResults[i - 1].btcPrice) / monthlyResults[i - 1].btcPrice
      )
      priceChanges.push(change)
    }

    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length

    if (avgVolatility < 0.1) return 'low'
    if (avgVolatility < 0.2) return 'medium'
    if (avgVolatility < 0.4) return 'high'
    return 'critical'
  }

  /**
   * Assess concentration risk (always high for Bitcoin-only strategy)
   */
  private static assessConcentrationRisk(): RiskCategory {
    return 'high' // Single-asset Bitcoin strategy always has high concentration risk
  }
}
