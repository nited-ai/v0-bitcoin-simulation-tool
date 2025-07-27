/**
 * Cycle Repeat Model Microservice
 * 
 * Independent implementation of the Bitcoin cycle repeat price prediction model.
 * Uses historical daily price multipliers to project future price movements
 * by repeating historical patterns (typically 4-year cycles).
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint
} from "../types"
import type { HistoricalDataPoint } from "../../data/historicalDataLoader"

/**
 * Cycle Repeat Model Implementation
 */
export class CycleRepeatModel implements PriceProjectionModel {
  readonly name = "Cycle Repeat Model"
  readonly version = "1.0.0"
  readonly description = "Bitcoin price prediction based on repeating historical cycles"
  
  /**
   * Calculate historical daily multipliers from price data
   */
  private calculateHistoricalMultipliers(historicalData: HistoricalDataPoint[]): number[] {
    if (historicalData.length < 2) {
      console.warn("⚠️ Cycle Repeat Model: Insufficient historical data for multipliers")
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
        // Clamp extreme values to prevent unrealistic projections
        const clampedMultiplier = Math.max(0.5, Math.min(2.0, multiplier))
        multipliers.push(clampedMultiplier)
      }
    }
    
    console.log(`📊 Cycle Repeat Model: Calculated ${multipliers.length} daily multipliers from ${recentData.length} historical points`)
    return multipliers
  }
  
  /**
   * Calculate projected price for a specific month using cycle repeat logic
   */
  private getCycleRepeatPrice(
    month: number,
    initialPrice: number,
    historicalMultipliers: number[]
  ): number {
    if (!historicalMultipliers || historicalMultipliers.length === 0) {
      return initialPrice
    }

    // Convert month to approximate days
    const daysIntoSimulation = Math.round((month - 1) * (365.25 / 12))

    let currentProjectedPrice = initialPrice
    for (let i = 0; i < daysIntoSimulation; i++) {
      const multiplierIndex = i % historicalMultipliers.length
      currentProjectedPrice *= historicalMultipliers[multiplierIndex]
    }

    return currentProjectedPrice
  }
  
  /**
   * Calculate confidence based on cycle position and historical volatility
   */
  private calculateConfidence(
    month: number, 
    historicalMultipliers: number[],
    totalMonths: number
  ): number {
    if (historicalMultipliers.length === 0) return 0.3
    
    // Calculate volatility of historical multipliers
    const avgMultiplier = historicalMultipliers.reduce((sum, m) => sum + m, 0) / historicalMultipliers.length
    const variance = historicalMultipliers.reduce((sum, m) => sum + Math.pow(m - avgMultiplier, 2), 0) / historicalMultipliers.length
    const volatility = Math.sqrt(variance)
    
    // Base confidence starts high and decreases with time and volatility
    const baseConfidence = 0.80
    const timeDecay = Math.exp(-0.02 * month) // 2% decay per month
    const volatilityPenalty = Math.max(0.3, 1 - volatility * 2) // Higher volatility = lower confidence
    
    const confidence = baseConfidence * timeDecay * volatilityPenalty
    return Math.max(0.25, Math.min(0.90, confidence))
  }
  
  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    try {
      // Check required parameters
      if (!params.startPrice || params.startPrice <= 0) {
        console.error("❌ Cycle Repeat Model: Invalid start price")
        return false
      }
      
      if (!params.projectionMonths || params.projectionMonths <= 0) {
        console.error("❌ Cycle Repeat Model: Invalid projection months")
        return false
      }
      
      // Cycle Repeat model doesn't require specific parameters
      // but benefits from longer historical data
      return true
    } catch (error) {
      console.error("❌ Cycle Repeat Model: Parameter validation error:", error)
      return false
    }
  }
  
  /**
   * Generate price projection using Cycle Repeat model
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    
    console.log(`🚀 Cycle Repeat Model: Generating projection for ${params.projectionMonths} months`)
    
    // Calculate historical multipliers from the provided data
    const historicalMultipliers = this.calculateHistoricalMultipliers(historicalData)
    
    if (historicalMultipliers.length === 0) {
      throw new Error("Cycle Repeat Model: Unable to calculate historical multipliers from provided data")
    }
    
    const projectionPoints: ProjectionPoint[] = []
    const startDate = new Date()
    
    // Generate monthly projections
    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + month - 1)
      currentDate.setDate(15) // Mid-month for consistency
      
      // Calculate main projection price using cycle repeat logic
      const mainPrice = this.getCycleRepeatPrice(month, params.startPrice, historicalMultipliers)
      
      // Calculate support and resistance as percentage bands around main price
      const volatilityBand = 0.15 // 15% bands
      const support = mainPrice * (1 - volatilityBand)
      const resistance = mainPrice * (1 + volatilityBand)
      
      projectionPoints.push({
        timestamp: currentDate.getTime(),
        price: mainPrice,
        support: support,
        resistance: resistance,
        confidence: this.calculateConfidence(month, historicalMultipliers, params.projectionMonths),
        metadata: {
          cycleDay: ((month - 1) * 30.44) % historicalMultipliers.length,
          historicalMultipliersUsed: historicalMultipliers.length,
          volatilityBand: volatilityBand
        }
      })
    }
    
    // Calculate projection metadata
    const startPrice = projectionPoints[0]?.price || params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths
    
    console.log(`✅ Cycle Repeat Model: Generated ${projectionPoints.length} points using ${historicalMultipliers.length} historical multipliers`)
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
        cycleLengthDays: historicalMultipliers.length,
        parameters: {
          startPrice: params.startPrice,
          projectionMonths: params.projectionMonths,
          historicalDataPoints: historicalData.length
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
      description: 'Cycle Repeat model projects future prices by repeating historical daily price patterns, typically using 4-year Bitcoin cycles'
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
      tags: ["cycle", "historical", "pattern-repeat", "medium-term"],
      riskLevel: "medium-high",
      complexity: "intermediate",
      timeHorizon: "medium-term",
      dataRequirements: "historical-price-data",
      confidenceRange: "25-90%",
      typicalCycleLength: "4 years (1458 days)",
      volatilityHandling: "clamps extreme multipliers to 0.5-2.0x range",
      strengths: ["Captures market cycles", "Uses actual historical patterns", "Good for medium-term projections"],
      limitations: ["Assumes cycles repeat", "Sensitive to historical data quality", "May not capture new market dynamics"]
    }
  }
}

// Export singleton instance
export const cycleRepeatModel = new CycleRepeatModel()
