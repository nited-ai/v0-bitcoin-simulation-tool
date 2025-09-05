/**
 * Price Projection Results Adapter
 * 
 * Adapter for integrating price projection context with simulation results.
 * Provides accuracy analysis and projection comparison functionality.
 */

import type {
  IPriceProjectionResultsAdapter,
  EnhancedMonthlyResult,
  ProjectionComparisonResult
} from '../types'
import type { MonthlyResult } from '@/modules/strategies/types'
import type { PriceProjectionResult } from '@/modules/price-projection/types'
import type { ValidationResult } from '@/modules/shared/types'

/**
 * Price Projection Results Adapter Implementation
 */
export class PriceProjectionResultsAdapter implements IPriceProjectionResultsAdapter {
  
  /**
   * Enhance results with projection context
   */
  enhanceWithProjectionContext(
    results: MonthlyResult[], 
    projection: PriceProjectionResult
  ): EnhancedMonthlyResult[] {
    
    if (!results || results.length === 0) {
      return []
    }

    if (!projection || !projection.projectionPoints || projection.projectionPoints.length === 0) {
      return this.enhanceResultsBasic(results)
    }

    // Create projection lookup by month
    const projectionLookup = new Map<number, any>()
    projection.projectionPoints.forEach(point => {
      const month = point.metadata?.month
      if (month !== undefined) {
        projectionLookup.set(month, point)
      }
    })

    return results.map((result, index) => {
      const enhanced = this.enhanceResultBasic(result, index, results)
      
      // Add projection context if available
      const projectionPoint = projectionLookup.get(result.month)
      if (projectionPoint) {
        enhanced.projectionContext = {
          modelName: projection.modelName,
          confidence: projectionPoint.confidence,
          supportPrice: projectionPoint.support,
          resistancePrice: projectionPoint.resistance,
          priceDeviation: result.btcPrice - projectionPoint.price
        }
      }

      return enhanced
    })
  }

  /**
   * Calculate projection accuracy metrics
   */
  calculateProjectionAccuracy(
    results: MonthlyResult[], 
    projection: PriceProjectionResult
  ): ProjectionComparisonResult {
    
    if (!results || results.length === 0 || !projection || !projection.projectionPoints) {
      return {
        accuracy: 0,
        averageDeviation: 0,
        maxDeviation: 0,
        correlationCoefficient: 0,
        deviationsByMonth: [],
        summary: 'Insufficient data for comparison'
      }
    }

    // Match results with projection points
    const matchedData: Array<{
      month: number
      actualPrice: number
      projectedPrice: number
      deviation: number
      deviationPercent: number
    }> = []

    const projectionLookup = new Map<number, any>()
    projection.projectionPoints.forEach(point => {
      const month = point.metadata?.month
      if (month !== undefined) {
        projectionLookup.set(month, point)
      }
    })

    results.forEach(result => {
      const projectionPoint = projectionLookup.get(result.month)
      if (projectionPoint) {
        const deviation = result.btcPrice - projectionPoint.price
        const deviationPercent = (deviation / result.btcPrice) * 100

        matchedData.push({
          month: result.month,
          actualPrice: result.btcPrice,
          projectedPrice: projectionPoint.price,
          deviation,
          deviationPercent: Math.abs(deviationPercent)
        })
      }
    })

    if (matchedData.length === 0) {
      return {
        accuracy: 0,
        averageDeviation: 0,
        maxDeviation: 0,
        correlationCoefficient: 0,
        deviationsByMonth: [],
        summary: 'No matching data points found'
      }
    }

    // Calculate metrics
    const deviations = matchedData.map(d => Math.abs(d.deviation))
    const deviationPercents = matchedData.map(d => d.deviationPercent)
    
    const averageDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length
    const maxDeviation = Math.max(...deviations)
    const averageDeviationPercent = deviationPercents.reduce((sum, dev) => sum + dev, 0) / deviationPercents.length
    
    // Accuracy as inverse of average deviation percentage
    const accuracy = Math.max(0, 100 - averageDeviationPercent)

    // Calculate correlation coefficient
    const correlationCoefficient = this.calculateCorrelation(
      matchedData.map(d => d.actualPrice),
      matchedData.map(d => d.projectedPrice)
    )

    // Generate summary
    const summary = `Projection accuracy: ${accuracy.toFixed(1)}%. Average deviation: ${averageDeviation.toFixed(0)}. Correlation: ${correlationCoefficient.toFixed(3)}`

    return {
      accuracy,
      averageDeviation,
      maxDeviation,
      correlationCoefficient,
      deviationsByMonth: matchedData,
      summary
    }
  }

  /**
   * Validate projection alignment with results
   */
  validateProjectionAlignment(
    results: MonthlyResult[], 
    projection: PriceProjectionResult
  ): ValidationResult {
    const errors: string[] = []

    // Check if projection exists
    if (!projection) {
      errors.push('Projection data is missing')
      return { isValid: false, errors }
    }

    // Check if projection has points
    if (!projection.projectionPoints || projection.projectionPoints.length === 0) {
      errors.push('Projection must contain at least one projection point')
      return { isValid: false, errors }
    }

    // Validate projection points
    projection.projectionPoints.forEach((point, index) => {
      if (typeof point.timestamp !== 'number' || point.timestamp <= 0) {
        errors.push(`Projection point ${index}: Invalid timestamp`)
      }
      
      if (typeof point.price !== 'number' || point.price <= 0) {
        errors.push(`Projection point ${index}: Invalid price`)
      }
      
      if (typeof point.confidence !== 'number' || point.confidence < 0 || point.confidence > 1) {
        errors.push(`Projection point ${index}: Invalid confidence (must be between 0 and 1)`)
      }
      
      if (point.support !== undefined && (typeof point.support !== 'number' || point.support <= 0)) {
        errors.push(`Projection point ${index}: Invalid support price`)
      }
      
      if (point.resistance !== undefined && (typeof point.resistance !== 'number' || point.resistance <= 0)) {
        errors.push(`Projection point ${index}: Invalid resistance price`)
      }
    })

    // Check time alignment - only if we have results to compare
    if (results && results.length > 0) {
      const projectionMonths = projection.projectionPoints
        .map(p => p.metadata?.month)
        .filter(m => m !== undefined)

      const resultMonths = results.map(r => r.month)
      const overlappingMonths = projectionMonths.filter(m => resultMonths.includes(m))

      if (overlappingMonths.length === 0) {
        errors.push('No time alignment between projection and results data')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Enhance results with basic analysis metrics (without projection context)
   */
  private enhanceResultsBasic(results: MonthlyResult[]): EnhancedMonthlyResult[] {
    return results.map((result, index) => this.enhanceResultBasic(result, index, results))
  }

  /**
   * Enhance a single result with basic analysis metrics
   */
  private enhanceResultBasic(result: MonthlyResult, index: number, allResults: MonthlyResult[]): EnhancedMonthlyResult {
    const portfolioValue = result.currentBtcAmount * result.btcPrice
    const realPortfolioValue = result.realCollateralValue
    
    // Calculate returns
    const initialValue = allResults[0].currentBtcAmount * allResults[0].btcPrice
    const totalReturn = ((portfolioValue - initialValue) / initialValue) * 100
    const realTotalReturn = ((realPortfolioValue - allResults[0].realCollateralValue) / allResults[0].realCollateralValue) * 100
    
    const monthlyReturn = index > 0 
      ? ((portfolioValue - (allResults[index - 1].currentBtcAmount * allResults[index - 1].btcPrice)) / (allResults[index - 1].currentBtcAmount * allResults[index - 1].btcPrice)) * 100
      : 0

    // Calculate risk metrics
    const currentLtv = result.collateralValue > 0 ? (result.totalDebt / result.collateralValue) * 100 : 0
    const liquidationPrice = result.totalDebt > 0 ? (result.totalDebt / result.currentBtcAmount) * 1.05 : 0 // Assuming 95% liquidation LTV
    const liquidationDistance = liquidationPrice > 0 ? ((result.btcPrice - liquidationPrice) / result.btcPrice) * 100 : 100
    const collateralRatio = result.totalDebt > 0 ? result.collateralValue / result.totalDebt : 0

    // Calculate cash flow
    const netCashFlow = -result.withdrawalAmount + result.newLoanPrincipal - result.repaymentsDue
    const cumulativeCashFlow = allResults.slice(0, index + 1).reduce((sum, r) => 
      sum + (-r.withdrawalAmount + r.newLoanPrincipal - r.repaymentsDue), 0
    )
    const realCumulativeCashFlow = cumulativeCashFlow / (1 + (0.03 * (index + 1) / 12)) // Inflation adjusted

    return {
      ...result,
      portfolioValue,
      realPortfolioValue,
      totalReturn,
      realTotalReturn,
      monthlyReturn,
      currentLtv,
      liquidationDistance,
      liquidationPrice,
      collateralRatio,
      netCashFlow,
      cumulativeCashFlow,
      realCumulativeCashFlow
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) {
      return 0
    }

    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }
}

// Export singleton instance
export const priceProjectionResultsAdapter = new PriceProjectionResultsAdapter()
