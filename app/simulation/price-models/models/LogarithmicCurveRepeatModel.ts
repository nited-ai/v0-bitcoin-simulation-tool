/**
 * Logarithmic Curve Repeat Model
 * 
 * Bitcoin price projection model that applies mathematical logarithmic transformations
 * to historical cycle patterns. Designed with extensible architecture to support
 * future curve types (linear, exponential, sigmoid).
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint
} from "../types"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

/**
 * Supported curve types for mathematical transformations
 */
export type CurveType = 'logarithmic' | 'linear' | 'exponential' | 'sigmoid'

/**
 * Parameters for curve transformations (extensible for all curve types)
 */
export interface CurveTransformationParams {
  curveType: CurveType
  baseMultiplier: number      // 0.5-1.2: Amplifies/dampens all movements (conservative range)
  logarithmicStrength: number // 0-1.0: How much ln() transformation to apply (scaled down internally)
  smoothingFactor: number     // 0-1.0: Reduces volatility while preserving trends
  growthAcceleration: number  // 0.5-1.5: Modifies curve steepness (conservative range)
}

/**
 * Logarithmic Curve Repeat Model Implementation
 */
export class LogarithmicCurveRepeatModel implements PriceProjectionModel {
  readonly name = "Logarithmic Curve Repeat Model"
  readonly version = "1.0.0"
  readonly description = "Bitcoin price projection using logarithmic transformations of historical cycle patterns"

  /**
   * Extract percentage movements from 4-year historical data
   */
  private extractHistoricalMovements(historicalData: HistoricalDataPoint[]): number[] {
    // Use last 4 years of data (exactly 1460 days to match cycle repeat model)
    const fourYearsInDays = 1460
    const recentData = historicalData.slice(-fourYearsInDays)
    
    if (recentData.length < 100) {
      throw new Error('Insufficient historical data: Need at least 4 years of Bitcoin price data')
    }

    const movements: number[] = []
    for (let i = 1; i < recentData.length; i++) {
      const prevPrice = recentData[i - 1].close
      const currentPrice = recentData[i].close
      
      if (prevPrice > 0) {
        const movement = currentPrice / prevPrice
        // Store raw movements without clamping for sequential application
        movements.push(movement)
      }
    }
    
    console.log(`📊 Logarithmic Curve Model: Extracted ${movements.length} movements from ${recentData.length} historical points`)

    // Debug: Log movement statistics
    const avgMovement = movements.reduce((sum, m) => sum + m, 0) / movements.length
    const maxMovement = Math.max(...movements)
    const minMovement = Math.min(...movements)
    console.log(`📈 Movement stats: avg=${avgMovement.toFixed(4)}, max=${maxMovement.toFixed(4)}, min=${minMovement.toFixed(4)}`)

    return movements
  }

  /**
   * Apply curve transformation to a single movement
   * Extensible method that will support multiple curve types
   */
  private applyCurveTransformation(
    originalMovement: number,
    params: CurveTransformationParams,
    timeProgress: number = 0
  ): number {
    switch (params.curveType) {
      case 'logarithmic':
        return this.applyLogarithmicTransformation(originalMovement, params)
      
      // Future curve types will be added here:
      // case 'linear':
      //   return this.applyLinearTransformation(originalMovement, params, timeProgress)
      // case 'exponential':
      //   return this.applyExponentialTransformation(originalMovement, params, timeProgress)
      // case 'sigmoid':
      //   return this.applySigmoidTransformation(originalMovement, params, timeProgress)
      
      default:
        console.warn(`Unsupported curve type: ${params.curveType}, falling back to logarithmic`)
        return this.applyLogarithmicTransformation(originalMovement, params)
    }
  }

  /**
   * Apply logarithmic transformation using mathematical ln() properties
   * Focus on preserving volatility while allowing subtle curve adjustments
   */
  private applyLogarithmicTransformation(
    originalMovement: number,
    params: CurveTransformationParams
  ): number {
    // If no logarithmic strength, return original movement (pure cycle repeat)
    if (params.logarithmicStrength === 0) {
      return originalMovement * params.baseMultiplier
    }

    // Convert to gain/loss for transformation
    const gain = originalMovement - 1

    // Preserve volatility by applying transformation only to the magnitude, not the direction
    if (Math.abs(gain) > 0.0001) { // Avoid ln(0)
      // Apply logarithmic dampening only to large movements, preserve small ones
      const gainMagnitude = Math.abs(gain)
      const gainSign = Math.sign(gain)

      // Only apply transformation to movements larger than 1% to preserve volatility
      if (gainMagnitude > 0.01) {
        // Use subtle logarithmic dampening for large movements only
        const scaledStrength = params.logarithmicStrength * 0.3 // More conservative scaling
        const lnInput = 1 + gainMagnitude * scaledStrength
        const lnTransformed = Math.log(lnInput) * 0.8 // Gentle dampening

        // Blend original and transformed based on strength
        const blendedGain = gainMagnitude * (1 - params.logarithmicStrength) + lnTransformed * params.logarithmicStrength
        const finalGain = gainSign * blendedGain

        // Apply minimal smoothing to preserve volatility
        const smoothedGain = finalGain * (1 - params.smoothingFactor * 0.5) + (gain * params.smoothingFactor * 0.5)

        return 1 + (smoothedGain * params.baseMultiplier * params.growthAcceleration)
      } else {
        // Preserve small movements (< 1%) completely to maintain volatility
        return 1 + (gain * params.baseMultiplier)
      }
    }

    return originalMovement * params.baseMultiplier
  }

  /**
   * Calculate projected price for a specific month using truly sequential movement application
   * Each day applies only the movement from the corresponding historical day
   */
  private getLogarithmicCurvePrice(
    month: number,
    initialPrice: number,
    historicalMovements: number[],
    curveParams: CurveTransformationParams,
    totalMonths: number
  ): number {
    if (!historicalMovements || historicalMovements.length === 0) {
      return initialPrice
    }

    // Convert month to approximate days
    const daysIntoSimulation = Math.round((month - 1) * (365.25 / 12))
    const totalDays = Math.ceil(totalMonths * (365.25 / 12))

    // Apply movements day by day, building on previous day's price
    let currentProjectedPrice = initialPrice
    for (let i = 0; i < daysIntoSimulation; i++) {
      const movementIndex = i % historicalMovements.length
      const originalMovement = historicalMovements[movementIndex]

      // Apply curve transformation
      const timeProgress = i / totalDays
      const transformedMovement = this.applyCurveTransformation(
        originalMovement,
        curveParams,
        timeProgress
      )

      // Apply this day's movement to get next day's price
      currentProjectedPrice *= transformedMovement
    }

    return currentProjectedPrice
  }

  /**
   * Generate price projection using curve transformations
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    console.log(`🚀 Generating logarithmic curve projection for ${params.projectionMonths} months`)

    // Extract curve parameters
    const curveParams = params.modelSpecificParams?.logarithmicCurve as CurveTransformationParams
    if (!curveParams) {
      throw new Error('Missing logarithmic curve parameters')
    }

    // Extract historical movements
    const historicalMovements = this.extractHistoricalMovements(historicalData)

    // Generate projection points
    const projectionPoints: ProjectionPoint[] = []
    const startDate = new Date()

    // Generate monthly projections (same approach as cycle repeat model)
    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + month - 1)
      currentDate.setDate(15) // Mid-month for consistency

      // Calculate main projection price using logarithmic curve transformations
      const mainPrice = this.getLogarithmicCurvePrice(
        month,
        params.startPrice,
        historicalMovements,
        curveParams,
        params.projectionMonths
      )

      // Create projection point
      projectionPoints.push({
        price: Math.round(mainPrice),
        timestamp: currentDate.getTime(),
        confidence: Math.max(0.1, 1 - (month / params.projectionMonths) * 0.9) // Decreasing confidence
      })
    }

    // Calculate metadata
    const startPrice = projectionPoints[0]?.price || params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths
    const transformationApplied = curveParams.logarithmicStrength > 0

    return {
      modelName: this.name,
      modelVersion: this.version,
      projectionPoints,
      metadata: {
        totalMonths: params.projectionMonths,
        totalGrowth: Math.round(totalGrowth * 100) / 100,
        averageMonthlyGrowth: Math.round(averageMonthlyGrowth * 100) / 100,
        confidence: projectionPoints[projectionPoints.length - 1]?.confidence || 0.1,
        generatedAt: new Date().toISOString(),
        
        // Curve-specific metadata
        curveType: curveParams.curveType,
        curveParameters: curveParams,
        historicalMovementsCount: historicalMovements.length,
        transformationApplied,
        behaviorMode: transformationApplied ? 'logarithmic-transformation' : 'pure-cycle-repeat',
        supportedCurveTypes: ['logarithmic'] // Will expand for future curve types
      }
    }
  }

  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    if (!params.startPrice || params.startPrice <= 0) return false
    if (!params.projectionMonths || params.projectionMonths <= 0) return false
    
    const curveParams = params.modelSpecificParams?.logarithmicCurve as CurveTransformationParams
    if (!curveParams) return false
    
    // Validate curve parameters with more conservative ranges
    if (!['logarithmic', 'linear', 'exponential', 'sigmoid'].includes(curveParams.curveType)) return false
    if (curveParams.baseMultiplier < 0.5 || curveParams.baseMultiplier > 1.2) return false
    if (curveParams.logarithmicStrength < 0 || curveParams.logarithmicStrength > 1.0) return false
    if (curveParams.smoothingFactor < 0 || curveParams.smoothingFactor > 1.0) return false
    if (curveParams.growthAcceleration < 0.5 || curveParams.growthAcceleration > 1.5) return false
    
    return true
  }

  /**
   * Get default parameters (matches cycle repeat behavior)
   */
  getDefaultParams(): CurveTransformationParams {
    return {
      curveType: 'logarithmic',
      baseMultiplier: 1.0,        // No amplification
      logarithmicStrength: 0.0,   // Pure cycle repeat initially
      smoothingFactor: 0.0,       // No smoothing
      growthAcceleration: 1.0     // Linear acceleration
    }
  }
}

// Export singleton instance
export const logarithmicCurveRepeatModel = new LogarithmicCurveRepeatModel()
