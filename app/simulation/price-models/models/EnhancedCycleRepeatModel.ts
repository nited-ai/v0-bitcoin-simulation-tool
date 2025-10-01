/**
 * Enhanced Cycle Repeat Model
 *
 * Advanced implementation of the Bitcoin cycle repeat price prediction model     
 * with diminishing returns theory and economic maturation effects.
 */

import type {
  PriceProjectionModel,
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint

} from "../types"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

/**
 * Diminishing Returns Parameters
 */
export interface DiminishingReturnsParams {
  diminishingFactor: number // 0-1, how strongly diminishing returns affect growth
  maturityThreshold: number // Market cap threshold where effects begin
  cycleDegradation: number // 0-1, how much each cycle degrades
  adoptionCurveType: 'linear' | 'logarithmic' | 'sigmoid'
  institutionalSaturation: number // 0-1, level of institutional adoption
  regulatoryMaturity: number // 0-1, regulatory framework development
  liquidityConstraint: number // 0-1, market liquidity constraints
  competitionFactor: number // 0-1, competitive pressure from other assets
}

/**
 * Preset configurations for different economic scenarios
 */
export const DIMINISHING_RETURNS_PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'Strong diminishing returns with high market maturity assumptions',
    params: {
      diminishingFactor: 0.4, // Reduced from 0.8 to scale down impact
      maturityThreshold: 1_000_000_000_000,
      cycleDegradation: 0.3,
      adoptionCurveType: 'logarithmic' as const,
      institutionalSaturation: 0.7,
      regulatoryMaturity: 0.8,
      liquidityConstraint: 0.6,
      competitionFactor: 0.5
    }
  },
  moderate: {
    name: 'Moderate',
    description: 'Balanced diminishing returns reflecting gradual market evolution',
    params: {
      diminishingFactor: 0.25, // Reduced from 0.5 to scale down impact
      maturityThreshold: 2_000_000_000_000,
      cycleDegradation: 0.15,
      adoptionCurveType: 'sigmoid' as const,
      institutionalSaturation: 0.4,
      regulatoryMaturity: 0.5,
      liquidityConstraint: 0.4,
      competitionFactor: 0.3
    }
  },
  optimistic: {
    name: 'Optimistic',
    description: 'Minimal diminishing returns with continued growth potential',
    params: {
      diminishingFactor: 0.1, // Reduced from 0.2 to scale down impact
      maturityThreshold: 5_000_000_000_000,
      cycleDegradation: 0.05,
      adoptionCurveType: 'linear' as const,
      institutionalSaturation: 0.2,
      regulatoryMaturity: 0.3,
      liquidityConstraint: 0.2,
      competitionFactor: 0.1
    }
  },
  moonshots: {
    name: 'Moonshots',
    description: 'Aggressive growth assumptions with minimal constraints',
    params: {
      diminishingFactor: 0.05, // Very minimal impact
      maturityThreshold: 10_000_000_000_000,
      cycleDegradation: 0.02,
      adoptionCurveType: 'linear' as const,
      institutionalSaturation: 0.1,
      regulatoryMaturity: 0.2,
      liquidityConstraint: 0.1,
      competitionFactor: 0.05
    }
  }
} as const

/**
 * Enhanced Cycle Repeat Model Implementation
 */
export class EnhancedCycleRepeatModel implements PriceProjectionModel {
  readonly name = "Enhanced Cycle Repeat Model"
  readonly version = "2.0.0"
  readonly description = "Advanced Bitcoin price prediction with economic maturation theory"

  /**
   * Extract percentage movements from exactly 4 years ago (1460 days approach)
   */
  private extractPercentageMovements(historicalData: HistoricalDataPoint[]): number[] {
    if (!historicalData || historicalData.length < 2) {
      console.warn("Insufficient historical data")
      return []
    }

    // Calculate exact 4-year lookback from today
    const today = new Date()
    const fourYearsAgo = new Date(today)
    fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4)

    // Convert to Unix timestamps for data filtering
    const fourYearsAgoTimestamp = Math.floor(fourYearsAgo.getTime() / 1000)
    const todayTimestamp = Math.floor(today.getTime() / 1000)

    console.log(`📅 Today: ${today.toDateString()}`)
    console.log(`📅 Four years ago: ${fourYearsAgo.toDateString()}`)

    // Filter historical data to exact 4-year window
    const fourYearData = historicalData.filter(point =>
      point.time >= fourYearsAgoTimestamp && point.time <= todayTimestamp
    ).sort((a, b) => a.time - b.time)

    if (fourYearData.length < 2) {
      console.warn("Insufficient data in 4-year period")
      return []
    }

    // Calculate percentage movements between consecutive points
    const percentageMovements: number[] = []
    for (let i = 1; i < fourYearData.length; i++) {
      const previousPrice = fourYearData[i - 1].close
      const currentPrice = fourYearData[i].close

      if (previousPrice > 0) {
        const percentageChange = currentPrice / previousPrice
        percentageMovements.push(percentageChange)
      }
    }

    // Calculate movement statistics
    const movements = percentageMovements.map(m => (m - 1) * 100)
    const minMovement = Math.min(...movements).toFixed(1)
    const maxMovement = Math.max(...movements).toFixed(1)

    console.log(`📊 Extracted ${percentageMovements.length} percentage movements from ${fourYearData[0]?.date || 'start'} to ${fourYearData[fourYearData.length - 1]?.date || 'end'}`)
    console.log(`📈 Movement range: ${minMovement}% to ${maxMovement}%`)

    return percentageMovements
  }

  /**
   * Apply diminishing returns to large gains while preserving losses
   */
  private applyDiminishingReturns(
    originalMovement: number,
    currentPrice: number,
    cycleNumber: number,
    params: DiminishingReturnsParams
  ): number {
    // Preserve losses completely (market crashes remain realistic)
    if (originalMovement <= 1.0) {
      return originalMovement
    }

    // Calculate gain percentage
    const gainPercentage = (originalMovement - 1) * 100

    // Preserve small gains below threshold
    const threshold = params.cycleDegradation * 100 // Convert to percentage
    if (gainPercentage <= threshold) {
      return originalMovement
    }

    // Apply progressive dampening to large gains
    const excessGain = gainPercentage - threshold
    const dampenedExcessGain = excessGain * (1 - params.diminishingFactor)
    const adjustedGainPercentage = threshold + dampenedExcessGain

    // Ensure minimum gain ratio to prevent collapse
    const minGainRatio = 0.1 // Minimum 10% of original gain preserved
    const minAdjustedGain = gainPercentage * minGainRatio
    const finalGainPercentage = Math.max(adjustedGainPercentage, minAdjustedGain)

    // Convert back to multiplier
    return 1 + (finalGainPercentage / 100)
  }

  /**
   * Generate projection using cycle repeat methodology with weekly processing
   */
  private generateCycleRepeatProjection(
    percentageMovements: number[],
    startPrice: number,
    projectionMonths: number,
    params: DiminishingReturnsParams
  ): ProjectionPoint[] {
    if (percentageMovements.length === 0) {
      console.warn("No percentage movements available for projection")
      return []
    }

    // Calculate total weeks needed for projection
    const totalWeeksNeeded = Math.ceil(projectionMonths * 4.33) // ~4.33 weeks per month
    const totalCycles = Math.ceil(totalWeeksNeeded / percentageMovements.length)

    console.log(`🔄 Starting projection loop: ${totalWeeksNeeded} weeks to process (repeating ${percentageMovements.length} historical movements)`)

    const allProjectionPoints: ProjectionPoint[] = []
    const startDate = new Date()
    let currentPrice = startPrice

    // Add initial point at start price
    const volatilityBand = 0.15 // 15% bands
    allProjectionPoints.push({
      timestamp: startDate.getTime(),
      price: Math.round(startPrice),
      support: Math.round(startPrice * (1 - volatilityBand)),
      resistance: Math.round(startPrice * (1 + volatilityBand)),
      confidence: 1.0,
      metadata: {
        weekIndex: 0,
        movementIndex: 0,
        cycleNumber: 1,
        originalMovement: 1.0,
        adjustedMovement: 1.0,
        approach: "cycle-repeat-percentage-movements",
        diminishingReturnsApplied: true,
        diminishingParams: {
          diminishingFactor: params.diminishingFactor,
          cycleDegradation: params.cycleDegradation,
          adoptionCurveType: params.adoptionCurveType
        }
      }
    })

    // Process week by week, applying historical movements sequentially
    for (let weekIndex = 0; weekIndex < totalWeeksNeeded; weekIndex++) {
      // Cycle through historical movements using modulo
      const movementIndex = weekIndex % percentageMovements.length
      const movement = percentageMovements[movementIndex]
      const cycleNumber = Math.floor(weekIndex / percentageMovements.length) + 1

      // Apply diminishing returns if enabled
      let adjustedMovement = movement
      try {
        adjustedMovement = this.applyDiminishingReturns(
          movement,
          currentPrice,
          cycleNumber,
          params
        )
      } catch (error) {
        console.error("Error in applyDiminishingReturns:", error)
        adjustedMovement = movement // Use original movement as fallback
      }

      // Apply movement to current price
      currentPrice *= adjustedMovement

      // Generate monthly points (every ~4.33 weeks)
      if (weekIndex % Math.round(4.33) === 0 || weekIndex === totalWeeksNeeded - 1) {
        const currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + (weekIndex * 7))

        // Calculate support and resistance bands
        const volatilityBand = 0.15 // 15% bands
        const support = currentPrice * (1 - volatilityBand)
        const resistance = currentPrice * (1 + volatilityBand)

        // Calculate confidence (decreases over time)
        const confidence = Math.max(0.1, 1 - (weekIndex / totalWeeksNeeded) * 0.5)

        allProjectionPoints.push({
          timestamp: currentDate.getTime(),
          price: Math.round(currentPrice),
          support: Math.round(support),
          resistance: Math.round(resistance),
          confidence,
          metadata: {
            weekIndex,
            movementIndex,
            cycleNumber,
            originalMovement: movement,
            adjustedMovement,
            approach: "cycle-repeat-percentage-movements",
            diminishingReturnsApplied: true,
            diminishingParams: {
              diminishingFactor: params.diminishingFactor,
              cycleDegradation: params.cycleDegradation,
              adoptionCurveType: params.adoptionCurveType
            }
          }
        })
      }
    }

    console.log(`✅ Projection loop complete: Generated ${allProjectionPoints.length} points over ${totalCycles} cycles`)
    console.log(`   📊 Projection period: ${totalWeeksNeeded} weeks (${(totalWeeksNeeded / 52).toFixed(1)} years)`)
    console.log(`   🔄 Repeated 4-year pattern ${totalCycles} times`)

    return allProjectionPoints
  }

  /**
   * Generate price projection using Enhanced Cycle Repeat model
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {

    console.log(`🚀 Enhanced Cycle Repeat Model: Generating projection for ${params.projectionMonths} months`)

    // Extract diminishing returns parameters
    const diminishingReturns = params.modelSpecificParams?.diminishingReturns as DiminishingReturnsParams
    if (!diminishingReturns) {
      throw new Error("Enhanced Cycle Repeat Model: Missing diminishing returns parameters")
    }

    // Extract percentage movements from exactly 4 years ago
    const percentageMovements = this.extractPercentageMovements(historicalData)

    if (percentageMovements.length === 0) {
      throw new Error("Enhanced Cycle Repeat Model: Unable to extract percentage movements from historical data")
    }

    // Generate projection using cycle repeat methodology
    const projectionPoints = this.generateCycleRepeatProjection(
      percentageMovements,
      params.startPrice,
      params.projectionMonths,
      diminishingReturns
    )

    // Calculate projection metadata
    const startPrice = projectionPoints[0]?.price || params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice       
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths

    console.log(`✅ Enhanced Cycle Repeat Model: Generated ${projectionPoints.length} points using ${percentageMovements.length} percentage movements`)
    console.log(`   📊 Price range: €${startPrice.toFixed(0)} → €${endPrice.toFixed(0)} (${totalGrowth.toFixed(1)}% total)`)

    return {
      modelName: this.name,
      modelVersion: this.version,
      projectionPoints,
      metadata: {
        totalMonths: params.projectionMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: this.calculateOverallConfidence(projectionPoints),
        generatedAt: new Date().toISOString(),
        historicalMovementsCount: percentageMovements.length,
        cycleLengthDays: 1460,
        baseDiminishingReturnsParams: diminishingReturns,
        parameters: {
          startPrice: params.startPrice,
          projectionMonths: params.projectionMonths,
          historicalDataPoints: historicalData.length
        }
      }
    }
  }

  /**
   * Calculate overall confidence based on projection points
   */
  private calculateOverallConfidence(projectionPoints: ProjectionPoint[]): number {
    if (projectionPoints.length === 0) return 0

    const totalConfidence = projectionPoints.reduce((sum, point) => sum + point.confidence, 0)
    return totalConfidence / projectionPoints.length
  }

  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    if (!params.startPrice || params.startPrice <= 0) {
      console.error("Enhanced Cycle Repeat Model: Invalid start price")
      return false
    }

    if (!params.projectionMonths || params.projectionMonths <= 0) {
      console.error("Enhanced Cycle Repeat Model: Invalid projection months")
      return false
    }

    // Validate diminishing returns parameters if provided
    const diminishingReturns = params.modelSpecificParams?.diminishingReturns as DiminishingReturnsParams
    if (diminishingReturns) {
      if (diminishingReturns.diminishingFactor < 0 || diminishingReturns.diminishingFactor > 1) {
        console.error("Enhanced Cycle Repeat Model: Invalid diminishing factor (must be 0-1)")
        return false
      }

      if (diminishingReturns.cycleDegradation < 0 || diminishingReturns.cycleDegradation > 1) {
        console.error("Enhanced Cycle Repeat Model: Invalid cycle degradation (must be 0-1)")
        return false
      }
    }

    return true
  }
  /**
   * Get default parameters for the model
   */
  getDefaultParams(): Record<string, any> {
    return {
      diminishingReturns: DIMINISHING_RETURNS_PRESETS.moderate.params
    }
  }

  /**
   * Get model metadata
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: "Bitcoin Simulation Team",
      tags: ["cycle", "historical", "enhanced", "diminishing-returns", "economic-theory"],
      riskLevel: "medium",
      complexity: "advanced",
      timeHorizon: "long-term",
      dataRequirements: "historical-price-data",
      confidenceRange: "10-90%",
      typicalCycleLength: "4 years (1458 days)",
      volatilityHandling: "preserves natural volatility with economic adjustments",
      strengths: [
        "Incorporates economic maturation theory",
        "Accounts for diminishing returns",
        "Cycle degradation modeling",
        "Multiple economic scenarios"
      ],
      limitations: [
        "Assumes historical patterns continue",
        "Economic theory may not hold",
        "Sensitive to parameter selection"
      ],
      presets: Object.keys(DIMINISHING_RETURNS_PRESETS)
    }
  }
}

// Export singleton instance
export const enhancedCycleRepeatModel = new EnhancedCycleRepeatModel()