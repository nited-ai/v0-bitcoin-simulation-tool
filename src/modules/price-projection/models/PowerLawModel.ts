/**
 * Power Law Model
 * 
 * Independent implementation of the Bitcoin Power Law price prediction model.
 * Provides fit, support, and resistance lines based on logarithmic regression
 * of Bitcoin's price history since genesis (2009-01-03).
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint,
  PowerLawParams
} from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

/**
 * Power Law Model Implementation
 */
export class PowerLawModel implements PriceProjectionModel {
  readonly name = "Power Law Model"
  readonly version = "1.0.0"
  readonly description = "Bitcoin price prediction based on logarithmic regression since genesis"
  
  // Genesis date for Bitcoin
  private readonly GENESIS_DATE = new Date("2009-01-03")
  
  // Power Law model parameters (slope and intercept for log-log regression)
  private readonly POWER_LAW_MODELS = {
    fit: { slope: 5.68, intercept: -16.493 },
    support: { slope: 5.85, intercept: -17.55 },
    resistance: { slope: 5.57, intercept: -15.75 },
  }
  
  /**
   * Calculate days since Bitcoin genesis
   */
  private getDaysSinceGenesis(date: Date): number {
    const diffTime = Math.abs(date.getTime() - this.GENESIS_DATE.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
  
  /**
   * Calculate Power Law price for a specific date and line type
   */
  private getPowerLawPrice(date: Date, line: 'fit' | 'support' | 'resistance'): number {
    const days = this.getDaysSinceGenesis(date)
    if (days <= 0) return 0

    const model = this.POWER_LAW_MODELS[line]
    const logPrice = model.slope * Math.log10(days) + model.intercept
    const priceUsd = Math.pow(10, logPrice)
    return priceUsd
  }

  /**
   * Validate parameters before generation
   */
  validateParams(params: PriceModelParams): boolean {
    // Validate basic parameters
    if (!params.startPrice || params.startPrice <= 0) {
      console.error('Invalid start price for Power Law Model')
      return false
    }

    if (!params.projectionMonths || params.projectionMonths <= 0) {
      console.error('Invalid projection months for Power Law Model')
      return false
    }

    // Validate model-specific parameters
    if (!params.modelSpecificParams?.prognosis) {
      console.error('Missing prognosis for Power Law Model')
      return false
    }

    const prognosis = params.modelSpecificParams.prognosis
    if (!['fit', 'support', 'resistance'].includes(prognosis)) {
      console.error('Invalid prognosis for Power Law Model. Must be: fit, support, or resistance')
      return false
    }

    return true
  }

  /**
   * Get default parameters for this model
   */
  getDefaultParams(): PowerLawParams {
    return {
      prognosis: 'fit'
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
      throw new Error('Invalid parameters for Power Law Model')
    }

    const prognosis = params.modelSpecificParams!.prognosis as 'fit' | 'support' | 'resistance'
    const projectionPoints: ProjectionPoint[] = []
    
    const startDate = new Date()
    
    // Generate projection points for each month
    for (let month = 0; month < params.projectionMonths; month++) {
      // Calculate timestamp for this month
      const projectionDate = new Date(startDate)
      projectionDate.setMonth(projectionDate.getMonth() + month)
      
      // Calculate Power Law prices for all lines
      const fitPrice = this.getPowerLawPrice(projectionDate, 'fit')
      const supportPrice = this.getPowerLawPrice(projectionDate, 'support')
      const resistancePrice = this.getPowerLawPrice(projectionDate, 'resistance')
      
      // Use the selected prognosis as the main price
      let mainPrice: number
      switch (prognosis) {
        case 'fit':
          mainPrice = fitPrice
          break
        case 'support':
          mainPrice = supportPrice
          break
        case 'resistance':
          mainPrice = resistancePrice
          break
      }
      
      // For the first point, use the provided start price
      if (month === 0) {
        mainPrice = params.startPrice
      }
      
      // Calculate confidence (Power Law has high confidence due to mathematical foundation)
      const confidence = Math.max(0.7, 0.95 - (month / params.projectionMonths) * 0.25)
      
      projectionPoints.push({
        timestamp: projectionDate.getTime(),
        price: mainPrice,
        support: supportPrice,
        resistance: resistancePrice,
        confidence,
        metadata: {
          month,
          daysSinceGenesis: this.getDaysSinceGenesis(projectionDate),
          prognosis,
          fitPrice,
          supportPrice,
          resistancePrice
        }
      })
    }

    // Calculate metadata
    const firstPrice = projectionPoints[0].price
    const lastPrice = projectionPoints[projectionPoints.length - 1].price
    const totalGrowth = ((lastPrice - firstPrice) / firstPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths
    
    return {
      modelName: this.name,
      modelVersion: this.version,
      projectionPoints,
      metadata: {
        totalMonths: params.projectionMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: 0.85, // High confidence for mathematical model
        generatedAt: new Date().toISOString(),
        prognosis,
        maxDecline: 0, // Power Law model doesn't include volatility/drawdowns
        powerLawParameters: this.POWER_LAW_MODELS
      }
    }
  }
}

// Export singleton instance
export const powerLawModel = new PowerLawModel()
