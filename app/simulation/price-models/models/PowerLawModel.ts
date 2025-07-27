/**
 * Power Law Model Microservice
 * 
 * Independent implementation of the Bitcoin Power Law price prediction model.
 * Provides fit, support, and resistance lines based on logarithmic regression
 * of Bitcoin's price history since genesis (2009-01-03).
 */

import type { 
  PriceProjectionModel, 
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint
} from "../types"
import type { HistoricalDataPoint } from "../../data/historicalDataLoader"

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
  
  // No conversion needed - keeping prices in USD
  
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
    return priceUsd // Return USD price directly
  }
  
  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    try {
      // Check required parameters
      if (!params.startPrice || params.startPrice <= 0) {
        console.error("❌ Power Law Model: Invalid start price")
        return false
      }
      
      if (!params.projectionMonths || params.projectionMonths <= 0) {
        console.error("❌ Power Law Model: Invalid projection months")
        return false
      }
      
      // Check Power Law specific parameters
      const prognosisLine = params.modelSpecificParams?.prognosisLine
      if (!prognosisLine || !['fit', 'support', 'resistance'].includes(prognosisLine)) {
        console.error("❌ Power Law Model: Invalid prognosis line")
        return false
      }
      
      return true
    } catch (error) {
      console.error("❌ Power Law Model: Parameter validation error:", error)
      return false
    }
  }
  
  /**
   * Generate price projection using Power Law model
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    
    console.log(`🚀 Power Law Model: Generating projection for ${params.projectionMonths} months`)
    
    const prognosisLine = params.modelSpecificParams?.prognosisLine || 'fit'
    const projectionPoints: ProjectionPoint[] = []
    const startDate = new Date()
    
    // Generate monthly projections
    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + month - 1)
      currentDate.setDate(15) // Mid-month for consistency
      
      // Calculate main projection price using selected prognosis line
      const mainPrice = this.getPowerLawPrice(currentDate, prognosisLine)
      
      // Calculate support and resistance for reference
      const support = this.getPowerLawPrice(currentDate, 'support')
      const resistance = this.getPowerLawPrice(currentDate, 'resistance')
      
      projectionPoints.push({
        timestamp: currentDate.getTime(),
        price: mainPrice,
        support: support,
        resistance: resistance,
        confidence: this.calculateConfidence(currentDate),
        metadata: {
          prognosisLine,
          daysSinceGenesis: this.getDaysSinceGenesis(currentDate)
        }
      })
    }
    
    // Calculate projection metadata
    const startPrice = projectionPoints[0]?.price || params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths
    
    console.log(`✅ Power Law Model: Generated ${projectionPoints.length} points using ${prognosisLine} line`)
    console.log(`   📊 Price range: €${startPrice.toFixed(0)} → €${endPrice.toFixed(0)} (${totalGrowth.toFixed(1)}% total)`)
    
    return {
      modelName: this.name,
      modelVersion: this.version,
      projectionPoints,
      metadata: {
        prognosisLine,
        totalMonths: params.projectionMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: this.calculateOverallConfidence(projectionPoints),
        generatedAt: new Date().toISOString(),
        parameters: {
          startPrice: params.startPrice,
          projectionMonths: params.projectionMonths,
          prognosisLine
        }
      }
    }
  }
  
  /**
   * Calculate confidence level for a specific date
   * Confidence decreases with distance from current date
   */
  private calculateConfidence(date: Date): number {
    const now = new Date()
    const monthsFromNow = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    
    // Confidence decreases exponentially with time
    // Start at 85% confidence, decrease by ~5% per year
    const baseConfidence = 0.85
    const decayRate = 0.05 / 12 // 5% per year = ~0.4% per month
    const confidence = baseConfidence * Math.exp(-decayRate * monthsFromNow)
    
    return Math.max(0.3, Math.min(0.95, confidence)) // Clamp between 30% and 95%
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
      prognosisLine: 'fit',
      description: 'Power Law model uses logarithmic regression to project Bitcoin price based on historical patterns since genesis'
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
      tags: ["power-law", "logarithmic", "long-term", "mathematical"],
      riskLevel: "medium",
      complexity: "intermediate",
      timeHorizon: "long-term",
      dataRequirements: "none", // Uses mathematical model, not historical patterns
      supportedLines: ["fit", "support", "resistance"],
      confidenceRange: "30-95%",
      genesisDate: this.GENESIS_DATE.toISOString().split('T')[0],
      modelParameters: this.POWER_LAW_MODELS
    }
  }
}

// Export singleton instance
export const powerLawModel = new PowerLawModel()
