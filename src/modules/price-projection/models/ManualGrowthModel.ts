/**
 * Manual Growth Model
 * 
 * Independent implementation of the manual growth rate price prediction model.
 * Allows users to specify custom annual growth rates for complete control
 * over price projections and scenario testing.
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint,
  ManualGrowthParams
} from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

/**
 * Manual Growth Model Implementation
 */
export class ManualGrowthModel implements PriceProjectionModel {
  readonly name = "Manual Growth Rates"
  readonly version = "1.0.0"
  readonly description = "User-defined annual growth rates for custom price projections"
  
  /**
   * Apply growth rate for a specific month
   */
  private applyMonthlyGrowth(
    currentPrice: number, 
    annualGrowthRate: number, 
    monthsInYear: number = 12
  ): number {
    // Convert annual growth rate to monthly compound growth
    const monthlyGrowthRate = Math.pow(1 + (annualGrowthRate / 100), 1 / monthsInYear) - 1
    return currentPrice * (1 + monthlyGrowthRate)
  }

  /**
   * Validate parameters before generation
   */
  validateParams(params: PriceModelParams): boolean {
    // Validate basic parameters
    if (!params.startPrice || params.startPrice <= 0) {
      console.error('Invalid start price for Manual Growth Model')
      return false
    }

    if (!params.projectionMonths || params.projectionMonths <= 0) {
      console.error('Invalid projection months for Manual Growth Model')
      return false
    }

    // Validate model-specific parameters
    if (!params.modelSpecificParams?.annualGrowthRates) {
      console.error('Missing annualGrowthRates for Manual Growth Model')
      return false
    }

    const growthRates = params.modelSpecificParams.annualGrowthRates as number[]
    
    if (!Array.isArray(growthRates) || growthRates.length === 0) {
      console.error('annualGrowthRates must be a non-empty array')
      return false
    }

    // Validate that all growth rates are numbers
    for (const rate of growthRates) {
      if (typeof rate !== 'number' || isNaN(rate)) {
        console.error('All growth rates must be valid numbers')
        return false
      }
    }

    return true
  }

  /**
   * Get default parameters for this model
   */
  getDefaultParams(): ManualGrowthParams {
    return {
      annualGrowthRates: [20, 15, 10, 8, 5] // 5 years of decreasing growth rates
    }
  }

  /**
   * Generate price projection
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    
    if (!this.validateParams(params)) {
      throw new Error('Invalid parameters for Manual Growth Model')
    }

    const growthRates = params.modelSpecificParams!.annualGrowthRates as number[]
    const projectionPoints: ProjectionPoint[] = []
    
    let currentPrice = params.startPrice
    const startDate = new Date()
    
    // Generate projection points for each month
    for (let month = 0; month < params.projectionMonths; month++) {
      // Calculate timestamp for this month
      const projectionDate = new Date(startDate)
      projectionDate.setMonth(projectionDate.getMonth() + month)
      
      // Determine which growth rate to use (cycle through available rates)
      const yearIndex = Math.floor(month / 12)
      const growthRateIndex = yearIndex % growthRates.length
      const currentGrowthRate = growthRates[growthRateIndex]
      
      // Apply monthly growth (except for the first month)
      if (month > 0) {
        currentPrice = this.applyMonthlyGrowth(currentPrice, currentGrowthRate)
      }
      
      // Calculate confidence (decreases over time)
      const confidence = Math.max(0.3, 0.9 - (month / params.projectionMonths) * 0.6)
      
      projectionPoints.push({
        timestamp: projectionDate.getTime(),
        price: currentPrice,
        confidence,
        metadata: {
          month,
          yearIndex,
          appliedGrowthRate: currentGrowthRate
        }
      })
    }

    // Calculate metadata
    const totalGrowth = ((currentPrice - params.startPrice) / params.startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths
    
    return {
      modelName: this.name,
      modelVersion: this.version,
      projectionPoints,
      metadata: {
        totalMonths: params.projectionMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: 0.8, // High confidence for user-defined rates
        generatedAt: new Date().toISOString(),
        appliedGrowthRates: growthRates,
        maxDecline: 0 // Manual growth model doesn't include volatility
      }
    }
  }
}

// Export singleton instance
export const manualGrowthModel = new ManualGrowthModel()
