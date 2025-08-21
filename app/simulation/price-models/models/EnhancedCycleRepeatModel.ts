import type {
  PriceProjectionModel,
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint
} from '../types'
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

// Enhanced Cycle Repeat Model parameters
export interface EnhancedCycleRepeatParams {
  diminishingFactor: number    // 0-1, how much returns diminish over time
  cycleDegradation: number     // 0-0.5, how much each cycle weakens
}

/**
 * Enhanced Cycle Repeat Model
 * Applies historical Bitcoin price movements from exactly 4 years ago with economic maturation theory
 */
export class EnhancedCycleRepeatModel implements PriceProjectionModel {
  readonly name = "Enhanced Cycle Repeat Model"
  readonly version = "2.0.0"
  readonly description = "Advanced Bitcoin price prediction with economic maturation theory"

  /**
   * Validate model-specific parameters
   */
  validateParams(params: PriceModelParams): boolean {
    const modelParams = params.modelSpecificParams?.enhancedCycleRepeat
    if (!modelParams) return false

    return (
      typeof modelParams.diminishingFactor === 'number' &&
      modelParams.diminishingFactor >= 0 &&
      modelParams.diminishingFactor <= 1 &&
      typeof modelParams.cycleDegradation === 'number' &&
      modelParams.cycleDegradation >= 0 &&
      modelParams.cycleDegradation <= 0.5
    )
  }

  /**
   * Get default parameters for this model
   */
  getDefaultParams(): EnhancedCycleRepeatParams {
    return {
      diminishingFactor: 0.2,  // 20% diminishing returns (Optimistic default)
      cycleDegradation: 0.05   // 5% cycle degradation
    }
  }

  /**
   * Generate price projection using enhanced cycle repeat methodology
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    if (!this.validateParams(params)) {
      throw new Error('Invalid parameters for Enhanced Cycle Repeat Model')
    }

    const modelParams = params.modelSpecificParams?.enhancedCycleRepeat || this.getDefaultParams()

    // Extract historical movements from exactly 4 years ago (1460 days)
    const historicalMovements = this.extractHistoricalMovements(historicalData)

    if (historicalMovements.length === 0) {
      throw new Error('Insufficient historical data for Enhanced Cycle Repeat Model')
    }

    // Generate monthly projection points
    const projectionPoints: ProjectionPoint[] = []
    const startDate = new Date()
    let runningPrice = params.startPrice

    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + month - 1)
      currentDate.setDate(15) // Mid-month for consistency

      // Calculate days in this month (approximately 30.44 days per month)
      const daysInThisMonth = Math.round(365.25 / 12)

      // Apply movements for this month with diminishing returns and cycle degradation
      for (let dayInMonth = 0; dayInMonth < daysInThisMonth; dayInMonth++) {
        const totalDayIndex = (month - 1) * daysInThisMonth + dayInMonth
        const movementIndex = totalDayIndex % historicalMovements.length
        const originalMovement = historicalMovements[movementIndex]

        // Apply diminishing returns and cycle degradation
        const timeProgress = totalDayIndex / (params.projectionMonths * daysInThisMonth)
        const diminishingEffect = 1 - (modelParams.diminishingFactor * timeProgress)
        const cycleEffect = 1 - (modelParams.cycleDegradation * Math.floor(totalDayIndex / 1460))

        // Transform the movement
        const transformedMovement = 1 + ((originalMovement - 1) * diminishingEffect * cycleEffect)

        // Apply to running price
        runningPrice *= transformedMovement
      }

      // Create projection point
      projectionPoints.push({
        price: Math.round(runningPrice),
        timestamp: currentDate.getTime(),
        confidence: Math.max(0.1, 1 - (month / params.projectionMonths) * 0.9)
      })
    }

    // Calculate metadata
    const totalGrowth = ((runningPrice - params.startPrice) / params.startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths

    return {
      projectionPoints,
      metadata: {
        totalMonths: params.projectionMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: 0.8,
        generatedAt: Date.now(),
        modelName: this.name,
        modelVersion: this.version,
        historicalMovementsCount: historicalMovements.length,
        diminishingFactor: modelParams.diminishingFactor,
        cycleDegradation: modelParams.cycleDegradation
      }
    }
  }

  /**
   * Extract historical price movements from exactly 4 years ago (1460 days)
   */
  private extractHistoricalMovements(historicalData: HistoricalDataPoint[]): number[] {
    if (!historicalData || historicalData.length < 1460) {
      return []
    }

    const movements: number[] = []
    const startIndex = historicalData.length - 1460 // Start from 1460 days ago

    for (let i = startIndex; i < historicalData.length - 1; i++) {
      const currentPrice = historicalData[i].close
      const nextPrice = historicalData[i + 1].close

      if (currentPrice > 0 && nextPrice > 0) {
        const movement = nextPrice / currentPrice
        movements.push(movement)
      }
    }

    return movements
  }
}

// Export singleton instance
export const enhancedCycleRepeatModel = new EnhancedCycleRepeatModel()