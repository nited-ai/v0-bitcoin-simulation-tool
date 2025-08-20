/**
 * Enhanced Cycle Repeat Model with Diminishing Returns Theory
 * 
 * Extends the basic Cycle Repeat Model with economic principles of diminishing returns,
 * market maturity effects, and institutional saturation to provide more realistic
 * long-term Bitcoin price projections.
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint
} from "../types"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

/**
 * Diminishing Returns Parameters Interface
 */
export interface DiminishingReturnsParams {
  // Core parameters
  diminishingFactor: number        // 0.0 - 1.0, controls strength of diminishing returns effect
  maturityThreshold: number        // Market cap threshold (in USD) where effects begin
  cycleDegradation: number         // 0.0 - 1.0, how much each cycle reduces in magnitude
  
  // Advanced controls
  adoptionCurveType: 'linear' | 'logarithmic' | 'sigmoid'
  institutionalSaturation: number  // 0.0 - 1.0, current institutional adoption level
  regulatoryMaturity: number       // 0.0 - 1.0, regulatory environment maturity
  
  // Economic factors
  liquidityConstraint: number      // 0.0 - 1.0, market liquidity constraints
  competitionFactor: number        // 0.0 - 1.0, cryptocurrency competition effect
}

/**
 * Preset scenarios for diminishing returns
 */
export const DIMINISHING_RETURNS_PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'Strong diminishing returns with high market maturity assumptions',
    params: {
      diminishingFactor: 0.8,
      maturityThreshold: 1_000_000_000_000, // $1T market cap
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
      diminishingFactor: 0.5,
      maturityThreshold: 2_000_000_000_000, // $2T market cap
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
      diminishingFactor: 0.2,
      maturityThreshold: 5_000_000_000_000, // $5T market cap
      cycleDegradation: 0.05,
      adoptionCurveType: 'linear' as const,
      institutionalSaturation: 0.2,
      regulatoryMaturity: 0.3,
      liquidityConstraint: 0.2,
      competitionFactor: 0.1
    }
  }
} as const

/**
 * Enhanced Cycle Repeat Model Implementation
 */
export class EnhancedCycleRepeatModel implements PriceProjectionModel {
  readonly name = "Enhanced Cycle Repeat Model"
  readonly version = "2.0.0"
  readonly description = "Bitcoin price prediction with diminishing returns theory and market maturity effects"
  
  // Bitcoin supply constants
  private readonly BITCOIN_MAX_SUPPLY = 21_000_000
  private readonly BITCOIN_CURRENT_SUPPLY = 19_800_000 // Approximate current supply
  
  /**
   * Extract percentage movements from exactly 4 years ago to today
   */
  private extractPercentageMovements(historicalData: HistoricalDataPoint[], fourYearsAgo: Date, today: Date): number[] {
    if (historicalData.length < 2) {
      console.warn(`⚠️ Enhanced Cycle Repeat Model: Insufficient historical data. Need at least 2 points, have ${historicalData.length}`)
      return []
    }

    // Convert dates to timestamps (in seconds to match historical data)
    const fourYearsAgoTimestamp = Math.floor(fourYearsAgo.getTime() / 1000)
    const todayTimestamp = Math.floor(today.getTime() / 1000)

    // Filter data to the 4-year period
    const fourYearData = historicalData.filter(point =>
      point.time >= fourYearsAgoTimestamp && point.time <= todayTimestamp
    ).sort((a, b) => a.time - b.time) // Ensure chronological order

    if (fourYearData.length < 2) {
      console.warn(`⚠️ Enhanced Cycle Repeat Model: Insufficient data in 4-year period. Need at least 2 points, have ${fourYearData.length}`)
      return []
    }

    // Calculate daily percentage movements
    const percentageMovements: number[] = []
    for (let i = 1; i < fourYearData.length; i++) {
      const previousPrice = fourYearData[i - 1].close
      const currentPrice = fourYearData[i].close

      if (previousPrice > 0) {
        const percentageChange = currentPrice / previousPrice // This gives us the multiplier (e.g., 1.05 for +5%)
        percentageMovements.push(percentageChange)
      }
    }

    const startDate = new Date(fourYearData[0].time * 1000).toDateString()
    const endDate = new Date(fourYearData[fourYearData.length - 1].time * 1000).toDateString()

    console.log(`📊 Extracted ${percentageMovements.length} percentage movements from ${startDate} to ${endDate}`)
    console.log(`📈 Movement range: ${(Math.min(...percentageMovements) * 100 - 100).toFixed(1)}% to ${(Math.max(...percentageMovements) * 100 - 100).toFixed(1)}%`)

    return percentageMovements
  }

  /**
   * Apply diminishing returns to percentage movements
   */
  private applyDiminishingReturns(
    originalMovement: number,
    weekIndex: number,
    totalWeeks: number,
    params: DiminishingReturnsParams
  ): number {
    // Add comprehensive safety checks
    if (!params) {
      console.warn('⚠️ No diminishing returns params provided, using original movement')
      return originalMovement
    }

    // Validate required properties exist
    if (typeof params.diminishingFactor !== 'number' || typeof params.cycleDegradation !== 'number') {
      console.warn('⚠️ Invalid diminishing returns params structure:', params)
      return originalMovement
    }

    const gain = originalMovement - 1 // Convert to gain percentage (e.g., 1.15 → 0.15)

    // Preserve losses completely (market crashes should remain realistic)
    if (gain <= 0) {
      return originalMovement
    }

    // Preserve small gains below threshold
    const threshold = params.cycleDegradation * 0.1 // Convert to decimal (e.g., 0.15 → 0.015)
    if (gain <= threshold) {
      return originalMovement
    }

    // Calculate progressive dampening (starts low, increases over time)
    const progressRatio = weekIndex / totalWeeks
    const maxDampeningReduction = params.diminishingFactor * 0.8 // Max 80% of dampening strength
    const currentDampeningReduction = progressRatio * maxDampeningReduction

    // Apply dampening: reduce large gains progressively over time
    const dampenedGain = gain * (1 - currentDampeningReduction)

    // Ensure we never reduce gains below 20% of original to prevent collapse
    const minGainRatio = 0.2
    const finalGain = Math.max(gain * minGainRatio, dampenedGain)

    // Log significant dampening for debugging
    if (currentDampeningReduction > 0.1 && weekIndex % 100 === 0) {
      console.log(`   🔧 Week ${weekIndex}: Dampening ${(gain * 100).toFixed(1)}% → ${(finalGain * 100).toFixed(1)}% (reduction: ${(currentDampeningReduction * 100).toFixed(1)}%)`)
    }

    return 1 + finalGain
  }






  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    try {
      // Check required parameters
      if (!params.startPrice || params.startPrice <= 0) {
        console.error("❌ Enhanced Cycle Repeat Model: Invalid start price")
        return false
      }

      if (!params.projectionMonths || params.projectionMonths <= 0) {
        console.error("❌ Enhanced Cycle Repeat Model: Invalid projection months")
        return false
      }

      // Validate diminishing returns parameters if provided
      const diminishingParams = params.modelSpecificParams?.diminishingReturns as DiminishingReturnsParams
      if (diminishingParams) {
        if (diminishingParams.diminishingFactor < 0 || diminishingParams.diminishingFactor > 1) {
          console.error("❌ Enhanced Cycle Repeat Model: Invalid diminishing factor (must be 0-1)")
          return false
        }

        if (diminishingParams.maturityThreshold <= 0) {
          console.error("❌ Enhanced Cycle Repeat Model: Invalid maturity threshold")
          return false
        }

        if (diminishingParams.cycleDegradation < 0 || diminishingParams.cycleDegradation > 1) {
          console.error("❌ Enhanced Cycle Repeat Model: Invalid cycle degradation (must be 0-1)")
          return false
        }
      }

      return true
    } catch (error) {
      console.error("❌ Enhanced Cycle Repeat Model: Parameter validation error:", error)
      return false
    }
  }

  /**
   * Generate price projection using Enhanced Cycle Repeat model with progressive dampening
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {

    console.log(`🚀 Enhanced Cycle Repeat Model: Generating projection for ${params.projectionMonths} months with progressive dampening`)

    // Get diminishing returns parameters or use defaults
    const baseDiminishingParams: DiminishingReturnsParams = {
      ...DIMINISHING_RETURNS_PRESETS.moderate.params,
      ...(params.modelSpecificParams?.diminishingReturns || {})
    }

    console.log(`📊 Using dampening strength: ${baseDiminishingParams.diminishingFactor}, threshold: ${baseDiminishingParams.cycleDegradation}`)
    console.log(`📊 Full diminishing params:`, baseDiminishingParams)
    console.log(`📊 Model specific params:`, params.modelSpecificParams)

    // Calculate the exact 4-year lookback period from today
    const today = new Date()
    const fourYearsAgo = new Date(today)
    fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4)

    console.log(`📅 Today: ${today.toDateString()}`)
    console.log(`📅 Four years ago: ${fourYearsAgo.toDateString()}`)

    // Extract percentage movements from exactly 4 years ago
    const percentageMovements = this.extractPercentageMovements(historicalData, fourYearsAgo, today)

    console.log(`📊 Available data: ${historicalData.length} points, extracted ${percentageMovements.length} percentage movements`)

    if (percentageMovements.length === 0) {
      console.warn("⚠️ No historical percentage movements available, using fallback")
      const fallbackPoint = { price: params.startPrice, timestamp: Date.now(), confidence: 0.1 }
      return {
        modelName: this.name,
        modelVersion: this.version,
        projectionPoints: [fallbackPoint],
        metadata: {
          totalMonths: params.projectionMonths,
          totalGrowth: 0,
          averageMonthlyGrowth: 0,
          confidence: 0.1,
          generatedAt: new Date().toISOString(),
          parameters: {
            startPrice: params.startPrice,
            projectionMonths: params.projectionMonths,
            historicalDataPoints: historicalData.length,
            modelSpecificParams: params.modelSpecificParams
          }
        }
      }
    }

    console.log(`📊 Enhanced Cycle Repeat Model: Extracted ${percentageMovements.length} percentage movements from 4 years ago`)

    // Generate projection by applying the same percentage movements from 4 years ago
    const allProjectionPoints: ProjectionPoint[] = []
    let currentPrice = params.startPrice
    const startDate = new Date()

    console.log(`🎯 Starting projection from $${currentPrice.toFixed(0)} using movements from 4 years ago`)

    // Apply percentage movements for the projection period
    // Since we have weekly data (208 movements over 4 years = ~52 per year),
    // we need to repeat this pattern over the full projection period
    const totalWeeksNeeded = Math.ceil(params.projectionMonths * 4.33) // ~4.33 weeks per month

    console.log(`🔄 Starting projection loop: ${totalWeeksNeeded} weeks to process (repeating ${percentageMovements.length} historical movements)`)

    for (let weekIndex = 0; weekIndex < totalWeeksNeeded; weekIndex++) {
      // Cycle through the historical movements repeatedly
      const movementIndex = weekIndex % percentageMovements.length
      const movement = percentageMovements[movementIndex]

      // Apply diminishing returns to large movements
      let adjustedMovement: number
      try {
        adjustedMovement = this.applyDiminishingReturns(
          movement,
          weekIndex,
          totalWeeksNeeded,
          baseDiminishingParams
        )
      } catch (error) {
        console.error(`❌ Error in applyDiminishingReturns at week ${weekIndex}:`, error)
        console.log(`   Movement: ${movement}, Params:`, baseDiminishingParams)
        adjustedMovement = movement // Fallback to original movement
      }

      // Apply the percentage movement to current price
      currentPrice *= adjustedMovement

      // Create projection point (generate monthly points)
      // Generate a point every ~4.33 weeks (monthly) or at the end
      if (weekIndex % Math.round(4.33) === 0 || weekIndex === totalWeeksNeeded - 1) {
        const currentDate = new Date(startDate)
        // Add weeks to the start date
        currentDate.setDate(currentDate.getDate() + (weekIndex * 7))

        allProjectionPoints.push({
          price: currentPrice,
          timestamp: currentDate.getTime(),
          confidence: Math.max(0.1, 1 - (weekIndex / totalWeeksNeeded) * 0.5),
          metadata: {
            weekIndex: weekIndex + 1,
            movementIndex: movementIndex,
            cycleNumber: Math.floor(weekIndex / percentageMovements.length) + 1,
            originalMovement: movement,
            adjustedMovement: adjustedMovement,
            approach: 'cycle-repeat-percentage-movements'
          }
        })

        if (weekIndex % Math.round(4.33 * 3) === 0) { // Log every 3 months
          console.log(`   📈 Week ${weekIndex}: $${currentPrice.toFixed(0)} (movement: ${((adjustedMovement - 1) * 100).toFixed(1)}%, cycle: ${Math.floor(weekIndex / percentageMovements.length) + 1})`)
        }
      }
    }

    const totalCycles = Math.ceil(totalWeeksNeeded / percentageMovements.length)
    console.log(`✅ Projection loop complete: Generated ${allProjectionPoints.length} points over ${totalCycles} cycles`)
    console.log(`   📊 Projection period: ${totalWeeksNeeded} weeks (${(totalWeeksNeeded / 52.18).toFixed(1)} years)`)
    console.log(`   🔄 Repeated 4-year pattern ${totalCycles} times`)

    // Calculate projection metadata
    const startPrice = allProjectionPoints[0]?.price || params.startPrice
    const endPrice = allProjectionPoints[allProjectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths

    console.log(`✅ Enhanced Cycle Repeat Model: Generated ${allProjectionPoints.length} points`)
    console.log(`   📊 Price range: $${startPrice.toFixed(0)} → $${endPrice.toFixed(0)} (${totalGrowth.toFixed(1)}% total)`)
    console.log(`   🎯 Average monthly growth: ${averageMonthlyGrowth.toFixed(2)}%`)

    return {
      modelName: this.name,
      modelVersion: this.version,
      projectionPoints: allProjectionPoints,
      metadata: {
        totalMonths: params.projectionMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: this.calculateOverallConfidence(allProjectionPoints),
        generatedAt: new Date().toISOString(),
        approach: 'progressive-dampening',
        diminishingReturnsEnabled: true,
        baseDiminishingReturnsParams: baseDiminishingParams,
        parameters: {
          startPrice: params.startPrice,
          projectionMonths: params.projectionMonths,
          historicalDataPoints: historicalData.length,
          modelSpecificParams: params.modelSpecificParams
        }
      }
    }
  }

  /**
   * Calculate overall confidence for the entire projection
   */
  private calculateOverallConfidence(points: ProjectionPoint[]): number {
    if (points.length === 0) return 0

    const avgConfidence = points.reduce((sum, point) => sum + point.confidence, 0) / points.length
    return avgConfidence
  }

  /**
   * Get default parameters for this model
   */
  getDefaultParams(): Record<string, any> {
    return {
      cycleLengthYears: 4,
      volatilityBand: 0.15,
      diminishingReturns: DIMINISHING_RETURNS_PRESETS.moderate.params,
      description: 'Enhanced Cycle Repeat model with diminishing returns theory for realistic long-term Bitcoin price projections'
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
      tags: ["cycle", "historical", "pattern-repeat", "diminishing-returns", "economic-theory", "long-term"],
      riskLevel: "medium",
      complexity: "advanced",
      timeHorizon: "long-term",
      dataRequirements: "historical-price-data",
      confidenceRange: "25-95%",
      typicalCycleLength: "4 years (1458 days)",
      volatilityHandling: "adaptive bands based on market maturity",
      economicTheory: "diminishing returns, market maturity, institutional saturation",
      strengths: [
        "Incorporates economic theory",
        "Accounts for market evolution",
        "Realistic long-term projections",
        "Configurable economic assumptions",
        "Educational value"
      ],
      limitations: [
        "Complex parameter tuning",
        "Theoretical assumptions",
        "Requires economic understanding",
        "May be overly conservative"
      ],
      presets: Object.keys(DIMINISHING_RETURNS_PRESETS),
      defaultPreset: "moderate"
    }
  }
}

// Export singleton instance
export const enhancedCycleRepeatModel = new EnhancedCycleRepeatModel()
