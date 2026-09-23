import { addCalendarMonths } from './cycleReplay'
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
  PowerLawModelParams,
  ProjectionPoint
} from "../types"
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"
import { VolatilityService } from "../services/VolatilityService"

/**
 * Power Law Model Implementation
 */
export class PowerLawModel implements PriceProjectionModel {
  readonly name = "Power Law Model"
  readonly version = "2.0.0"
  readonly description = "Bitcoin price prediction based on logarithmic regression since genesis with optional cycle repeat volatility"

  // Genesis date for Bitcoin
  private readonly GENESIS_DATE = new Date("2009-01-03")

  // Volatility service for cycle repeat volatility calculations
  private readonly volatilityService = new VolatilityService()

  // Cache for deviation patterns to avoid recalculation
  private deviationPatternCache = new Map<string, number[]>()
  
  // Power Law model parameters with dynamic calibration based on historical extremes
  // Fit line: Industry-standard parameters from HTML Power Law Explorer (slope = 5.844, intercept = -17.01)
  // Support/Resistance: Dynamically calibrated to actual Bitcoin historical price extremes
  // - Support line calibrated to 2022 market bottom ($15,500 at 35.3% of fair value)
  // - Resistance line calibrated to 2013 market peak ($1,177 at 1170.2% of fair value)
  // Produces $143k for 2026, $1.07M for 2033 (7.4% above Giovanni's $1M target)
  private readonly POWER_LAW_MODELS = {
    fit: { slope: 5.844, intercept: -17.01 }, // Industry standard (unchanged)
    support: { slope: 5.844, intercept: -17.46 }, // Calibrated to historical bottoms
    resistance: { slope: 5.06, intercept: -13.5 }, // Calibrated to historical peaks
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
   * Calculate Power Law price using custom parameters (for price projection)
   */
  private getPowerLawPriceCustom(date: Date, slope: number, intercept: number): number {
    const days = this.getDaysSinceGenesis(date)
    if (days <= 0) return 0

    const logPrice = slope * Math.log10(days) + intercept
    const priceUsd = Math.pow(10, logPrice)
    return priceUsd
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

      // Validate volatility parameters if provided
      const volatilitySettings = params.modelSpecificParams?.cycleRepeatVolatility
      if (volatilitySettings && volatilitySettings.enabled) {
        const isValid = this.volatilityService.validateParameters(
          volatilitySettings.patternLengthMonths,
          volatilitySettings.diminishingFactor
        )
        if (!isValid) {
          console.error("❌ Power Law Model: Invalid volatility parameters")
          return false
        }
      }

      return true
    } catch (error) {
      console.error("❌ Power Law Model: Parameter validation error:", error)
      return false
    }
  }
  
  /**
   * Generate price projection using Power Law model with optional volatility
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {

    console.log(`🚀 Power Law Model: Generating projection for ${params.projectionMonths} months`)
    console.log('🔧 [PowerLawModel] Received params:', params)
    console.log('🔧 [PowerLawModel] modelSpecificParams:', params.modelSpecificParams)

    const prognosisLine = params.modelSpecificParams?.prognosisLine || 'fit'
    const volatilitySettings = params.modelSpecificParams?.cycleRepeatVolatility
    const priceProjectionParams = params.modelSpecificParams?.priceProjectionParams

    console.log('🔧 [PowerLawModel] Extracted volatility settings:', volatilitySettings)
    console.log('🔧 [PowerLawModel] Volatility enabled?', volatilitySettings?.enabled)
    const projectionPoints: ProjectionPoint[] = []
    const startDate = new Date(new Date().toISOString().slice(0, 10))
    projectionPoints.push({ timestamp: startDate.getTime(), price: params.startPrice, confidence: 0, support: this.getPowerLawPrice(startDate, 'support'), resistance: this.getPowerLawPrice(startDate, 'resistance') })

    // Prepare volatility if enabled
    let deviationPattern: number[] = []
    let volatilityApplied = false

    if (volatilitySettings?.enabled) {
      console.log(`📊 Power Law Model: Volatility enabled with ${volatilitySettings.patternLengthMonths} months pattern`)

      // Determine which Power Law baseline to use for deviation extraction
      // CRITICAL: Must match the baseline used for projection to ensure pattern consistency
      let baselineForDeviation: 'fit' | 'support' | 'resistance' | 'custom' = prognosisLine
      let customParams: { slope: number; intercept: number } | undefined = undefined

      if (priceProjectionParams) {
        // If custom projection params are used, extract deviations using those same params
        baselineForDeviation = 'custom'
        customParams = priceProjectionParams
        console.log(`📊 Power Law Model: Using custom projection params for deviation extraction (slope: ${priceProjectionParams.slope}, intercept: ${priceProjectionParams.intercept})`)
      }

      // Create cache key that includes custom params if used
      const cacheKey = priceProjectionParams
        ? `custom-${priceProjectionParams.slope}-${priceProjectionParams.intercept}-${volatilitySettings.patternLengthMonths}-${historicalData.length}`
        : `${prognosisLine}-${volatilitySettings.patternLengthMonths}-${historicalData.length}`

      // Check cache first
      if (this.deviationPatternCache.has(cacheKey)) {
        deviationPattern = this.deviationPatternCache.get(cacheKey)!
        console.log(`✅ Power Law Model: Using cached deviation pattern (${deviationPattern.length} points)`)
      } else {
        // Extract deviation pattern from historical data using the correct baseline
        if (customParams) {
          // Use custom parameters for deviation extraction
          const slope = customParams.slope
          const intercept = customParams.intercept
          deviationPattern = this.volatilityService.extractDeviationPattern(
            historicalData,
            volatilitySettings.patternLengthMonths,
            'fit', // Placeholder, not used when custom function is provided
            (date) => this.getPowerLawPriceCustom(date, slope, intercept)
          )
        } else {
          // Use standard prognosis line
          deviationPattern = this.volatilityService.extractDeviationPattern(
            historicalData,
            volatilitySettings.patternLengthMonths,
            prognosisLine,
            (date, line) => this.getPowerLawPrice(date, line)
          )
        }

        // Cache the pattern
        this.deviationPatternCache.set(cacheKey, deviationPattern)
        console.log(`✅ Power Law Model: Cached new deviation pattern (${deviationPattern.length} points)`)
      }

      volatilityApplied = deviationPattern.length > 0

      if (volatilityApplied) {
        console.log(`📊 Power Law Model: Will apply ${deviationPattern.length} deviation points to ${params.projectionMonths} projection months`)
        console.log(`📊 Power Law Model: Pattern will cycle every ${deviationPattern.length} months`)
      }
    }

    // Generate monthly projections
    for (let month = 1; month <= params.projectionMonths; month++) {
      const currentDate = new Date(addCalendarMonths(startDate.getTime(), month))

      // Calculate base price for projection (using custom params if provided, otherwise prognosis line)
      let baseProjectionPrice: number
      if (priceProjectionParams) {
        baseProjectionPrice = this.getPowerLawPriceCustom(
          currentDate,
          priceProjectionParams.slope,
          priceProjectionParams.intercept
        )
      } else {
        baseProjectionPrice = this.getPowerLawPrice(currentDate, prognosisLine)
      }

      // Apply volatility to price projection if enabled
      let finalProjectionPrice = baseProjectionPrice
      if (volatilityApplied && deviationPattern.length > 0) {
        finalProjectionPrice = this.volatilityService.applyVolatility(
          baseProjectionPrice,
          deviationPattern,
          month - 1, // 0-based month index for pattern cycling
          volatilitySettings!.diminishingFactor
        )
      }

      // Calculate support and resistance for reference (ALWAYS pure mathematical curves)
      const support = this.getPowerLawPrice(currentDate, 'support')
      const resistance = this.getPowerLawPrice(currentDate, 'resistance')

      projectionPoints.push({
        timestamp: currentDate.getTime(),
        price: finalProjectionPrice, // This is the price projection line (with volatility if enabled)
        support: support,           // Pure mathematical curve (no volatility)
        resistance: resistance,     // Pure mathematical curve (no volatility)
        confidence: this.calculateConfidence(currentDate),
        metadata: {
          prognosisLine,
          daysSinceGenesis: this.getDaysSinceGenesis(currentDate),
          basePrice: baseProjectionPrice,
          volatilityApplied: volatilityApplied
        }
      })
    }
    
    // Calculate projection metadata
    const startPrice = projectionPoints[0]?.price || params.startPrice
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths

    const logMessage = volatilityApplied
      ? `✅ Power Law Model: Generated ${projectionPoints.length} points using ${prognosisLine} line with volatility`
      : `✅ Power Law Model: Generated ${projectionPoints.length} points using ${prognosisLine} line`
    console.log(logMessage)
    console.log(`   📊 Price range: €${startPrice.toFixed(0)} → €${endPrice.toFixed(0)} (${totalGrowth.toFixed(1)}% total)`)

    if (volatilityApplied) {
      console.log(`   🌊 Volatility: ${deviationPattern.length} pattern points, diminishing factor: ${volatilitySettings!.diminishingFactor}`)
    }
    
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
        },
        // Enhanced metadata for volatility and custom parameters
        volatilityApplied,
        volatilitySettings: volatilityApplied ? volatilitySettings : undefined,
        customProjectionParams: priceProjectionParams,
        deviationPatternLength: deviationPattern.length,
        genesisDate: this.GENESIS_DATE.toISOString().split('T')[0],
        modelParameters: this.POWER_LAW_MODELS
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
