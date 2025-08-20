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
   * Calculate historical multipliers from the provided data
   */
  private calculateHistoricalMultipliers(historicalData: HistoricalDataPoint[]): number[] {
    if (!historicalData || historicalData.length < 2) {
      return []
    }

    // Use last 4 years of data (approximately 1458 days)
    const cycleDays = 1458
    const recentData = historicalData.slice(-cycleDays)

    const multipliers: number[] = []
    for (let i = 1; i < recentData.length; i++) {
      const prevPrice = recentData[i - 1].close
      const currentPrice = recentData[i].close

      if (prevPrice > 0) {
        const multiplier = currentPrice / prevPrice
        // Don't clamp extreme values - preserve natural volatility
        multipliers.push(multiplier)
      }
    }

    console.log(`📊 Enhanced Cycle Repeat Model: Calculated ${multipliers.length} daily multipliers from ${recentData.length} historical points`)
    return multipliers
  }

  /**
   * Apply diminishing returns and cycle degradation effects
   */
  private applyDiminishingReturns(
    originalMultiplier: number,
    currentPrice: number,
    cycleNumber: number,
    params: DiminishingReturnsParams
  ): number {
    // Calculate cycle degradation effect (FIXED: higher degradation = lower growth)
    const cycleDegradationEffect = Math.pow(1 - params.cycleDegradation, cycleNumber)

    // Calculate diminishing returns based on market cap
    const marketCap = currentPrice * 21_000_000 // Approximate total supply
    const maturityEffect = marketCap > params.maturityThreshold
      ? 1 - (params.diminishingFactor * Math.min(1, (marketCap - params.maturityThreshold) / params.maturityThreshold))
      : 1

    // Apply institutional saturation effect
    const institutionalEffect = 1 - (params.institutionalSaturation * 0.3)

    // Combine all effects
    const combinedEffect = cycleDegradationEffect * maturityEffect * institutionalEffect

    // Apply to multiplier
    if (originalMultiplier > 1) {
      // Reduce gains
      const gain = originalMultiplier - 1
      const adjustedGain = gain * combinedEffect
      return 1 + adjustedGain
    } else {
      // Preserve losses (don't amplify them)
      return originalMultiplier
    }
  }

  /**
   * Calculate projected price for a specific month using enhanced cycle repeat logic
   */
  private getEnhancedCycleRepeatPrice(
    month: number,
    initialPrice: number,
    historicalMultipliers: number[],
    params: DiminishingReturnsParams
  ): number {
    if (!historicalMultipliers || historicalMultipliers.length === 0) {
      return initialPrice
    }

    // Convert month to approximate days
    const daysIntoSimulation = Math.round((month - 1) * (365.25 / 12))
    const cycleLength = 1458 // 4 years in days
    const cycleNumber = Math.floor(daysIntoSimulation / cycleLength)

    let currentProjectedPrice = initialPrice
    for (let i = 0; i < daysIntoSimulation; i++) {
      const multiplierIndex = i % historicalMultipliers.length
      const originalMultiplier = historicalMultipliers[multiplierIndex]

      // Apply diminishing returns and cycle degradation
      const adjustedMultiplier = this.applyDiminishingReturns(
        originalMultiplier,
        currentProjectedPrice,
        cycleNumber,
        params
      )

      currentProjectedPrice *= adjustedMultiplier
    }

    return currentProjectedPrice
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

    // Calculate historical multipliers from the provided data
    const historicalMultipliers = this.calculateHistoricalMultipliers(historicalData)

    if (historicalMultipliers.length === 0) {
      throw new Error("Enhanced Cycle Repeat Model: Unable to calculate historical multipliers from provided data")
    }

    const projectionPoints: ProjectionPoint[] = []
    const startDate = new Date()

    // Generate monthly projections
    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + month - 1)
      currentDate.setDate(15) // Mid-month for consistency

      // Calculate main projection price using enhanced cycle repeat logic
      const mainPrice = this.getEnhancedCycleRepeatPrice(
        month,
        params.startPrice,
        historicalMultipliers,
        diminishingReturns
      )

      // Calculate support and resistance as percentage bands around main price
      const volatilityBand = 0.15 // 15% bands
      const support = mainPrice * (1 - volatilityBand)
      const resistance = mainPrice * (1 + volatilityBand)

      // Calculate confidence (decreases over time)
      const confidence = Math.max(0.1, 1 - (month / params.projectionMonths) * 0.9)

      // Calculate cycle information
      const cycleLength = 48 // 4 years in months
      const cycleNumber = Math.floor((month - 1) / cycleLength)
      const monthInCycle = ((month - 1) % cycleLength) + 1

      projectionPoints.push({
        timestamp: currentDate.getTime(),
        price: Math.round(mainPrice),
        support: Math.round(support),
        resistance: Math.round(resistance),
        confidence,
        metadata: {
          cycleNumber,
          monthInCycle,
          diminishingReturnsApplied: true,
          originalMultiplierIndex: ((month - 1) * 30) % historicalMultipliers.length
        }
      })
    }

    // Calculate projection metadata
    const startPrice = projectionPoints[0]?.price || params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths

    console.log(`✅ Enhanced Cycle Repeat Model: Generated ${projectionPoints.length} points using ${historicalMultipliers.length} historical multipliers`)
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
        historicalMultipliersCount: historicalMultipliers.length,
        cycleLengthDays: 1458,
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
