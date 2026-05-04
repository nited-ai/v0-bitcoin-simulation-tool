/**
 * Manual Growth Model Microservice
 * 
 * Independent implementation of the manual growth rate price prediction model.
 * Allows users to specify custom annual growth rates for complete control
 * over price projections and scenario testing.
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint
} from "../types"
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"

/**
 * Manual Growth Model Implementation
 */
export class ManualGrowthModel implements PriceProjectionModel {
  readonly name = "Manual Growth"
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
   * Get growth rate for a specific month, cycling through the provided rates
   */
  private getGrowthRateForMonth(month: number, annualGrowthRates: number[]): number {
    if (annualGrowthRates.length === 0) return 0
    
    // Determine which year we're in (0-based)
    const yearIndex = Math.floor((month - 1) / 12)
    
    // Cycle through growth rates if we have more years than rates
    const rateIndex = yearIndex % annualGrowthRates.length
    return annualGrowthRates[rateIndex]
  }
  
  /**
   * Calculate confidence based on user-defined growth rates
   */
  private calculateConfidence(month: number, annualGrowthRates: number[]): number {
    // Base confidence is high since user has full control
    const baseConfidence = 0.85
    
    // Slight decrease over time to reflect uncertainty
    const timeDecay = Math.exp(-0.01 * month) // 1% decay per month
    
    // Penalty for extreme growth rates
    const currentRate = this.getGrowthRateForMonth(month, annualGrowthRates)
    const extremePenalty = Math.abs(currentRate) > 200 ? 0.8 : 1.0 // Penalty for >200% growth
    
    const confidence = baseConfidence * timeDecay * extremePenalty
    return Math.max(0.50, Math.min(0.95, confidence))
  }
  
  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    try {
      // Check required parameters
      if (!params.startPrice || params.startPrice <= 0) {
        console.error("❌ Manual Growth Model: Invalid start price")
        return false
      }
      
      if (!params.projectionMonths || params.projectionMonths <= 0) {
        console.error("❌ Manual Growth Model: Invalid projection months")
        return false
      }
      
      // Check for annual growth rates
      const annualGrowthRates = params.modelSpecificParams?.annualGrowthRates
      if (!annualGrowthRates || !Array.isArray(annualGrowthRates) || annualGrowthRates.length === 0) {
        console.error("❌ Manual Growth Model: Missing or invalid annual growth rates")
        return false
      }
      
      // Validate growth rates are numbers
      const invalidRates = annualGrowthRates.filter(rate => typeof rate !== 'number' || isNaN(rate))
      if (invalidRates.length > 0) {
        console.error("❌ Manual Growth Model: Invalid growth rates found:", invalidRates)
        return false
      }
      
      return true
    } catch (error) {
      console.error("❌ Manual Growth Model: Parameter validation error:", error)
      return false
    }
  }
  
  /**
   * Generate price projection using Manual Growth model
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    
    console.log(`🚀 Manual Growth Model: Generating projection for ${params.projectionMonths} months`)

    const annualGrowthRates = params.modelSpecificParams?.annualGrowthRates || []
    const projectionPoints: ProjectionPoint[] = []

    // Start projection from today (current date) for future projections
    const startDate = new Date()

    console.log(`📅 Manual Growth Model: Starting projection from ${startDate.toISOString().split('T')[0]} (current date)`)
    console.log(`💰 Manual Growth Model: Starting price: $${params.startPrice.toLocaleString()}`)

    let currentPrice = params.startPrice
    
    // Generate monthly projections starting from next month (future projections)
    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + month) // Start from next month for future projections
      currentDate.setDate(15) // Mid-month for consistency
      
      // Get the annual growth rate for this month
      const annualGrowthRate = this.getGrowthRateForMonth(month, annualGrowthRates)
      
      // Apply monthly growth
      currentPrice = this.applyMonthlyGrowth(currentPrice, annualGrowthRate)
      
      // Calculate support and resistance as percentage bands around main price
      const volatilityBand = Math.abs(annualGrowthRate) > 100 ? 0.25 : 0.15 // Higher bands for extreme growth
      const support = currentPrice * (1 - volatilityBand)
      const resistance = currentPrice * (1 + volatilityBand)
      
      projectionPoints.push({
        timestamp: currentDate.getTime(),
        price: currentPrice,
        support: support,
        resistance: resistance,
        confidence: this.calculateConfidence(month, annualGrowthRates),
        metadata: {
          annualGrowthRate,
          yearIndex: Math.floor((month - 1) / 12),
          monthInYear: ((month - 1) % 12) + 1,
          volatilityBand
        }
      })
    }
    
    // Calculate projection metadata
    const startPrice = params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths
    
    console.log(`✅ Manual Growth Model: Generated ${projectionPoints.length} points using ${annualGrowthRates.length} growth rates`)
    console.log(`   📊 Price range: €${startPrice.toFixed(0)} → €${endPrice.toFixed(0)} (${totalGrowth.toFixed(1)}% total)`)
    console.log(`   📈 Growth rates: [${annualGrowthRates.join(', ')}]%`)
    
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
        annualGrowthRates: [...annualGrowthRates], // Copy array
        yearsProjected: Math.ceil(params.projectionMonths / 12),
        parameters: {
          startPrice: params.startPrice,
          projectionMonths: params.projectionMonths,
          annualGrowthRates: annualGrowthRates.length
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
      annualGrowthRates: [20, 15, 10, 8, 5], // Default 5-year declining growth
      description: 'Manual Growth model allows complete user control over annual growth rates for custom scenarios'
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
      tags: ["manual", "custom", "user-defined", "flexible"],
      riskLevel: "user-defined",
      complexity: "beginner",
      timeHorizon: "flexible",
      dataRequirements: "none",
      confidenceRange: "50-95%",
      inputMethod: "annual growth rates array",
      flexibility: "high - user controls all growth rates",
      strengths: ["Full user control", "Easy to understand", "Scenario testing"],
      limitations: ["Requires user expertise", "No market data integration", "Static assumptions"],
      defaultGrowthRates: [20, 15, 10, 8, 5],
      supportedRanges: "Any percentage growth rate (positive or negative)"
    }
  }
}

// Export singleton instance
export const manualGrowthModel = new ManualGrowthModel()
