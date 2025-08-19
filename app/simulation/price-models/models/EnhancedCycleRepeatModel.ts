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
   * Calculate historical daily multipliers from price data
   */
  private calculateHistoricalMultipliers(historicalData: HistoricalDataPoint[]): number[] {
    if (historicalData.length < 2) {
      console.warn("⚠️ Enhanced Cycle Repeat Model: Insufficient historical data for multipliers")
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
    
    console.log(`📊 Enhanced Cycle Repeat Model: Calculated ${multipliers.length} daily multipliers from ${recentData.length} historical points`)
    return multipliers
  }
  
  /**
   * Apply diminishing returns effects to historical multipliers
   */
  private applyDiminishingReturns(
    baseMultiplier: number,
    currentPrice: number,
    cycleNumber: number,
    month: number,
    params: DiminishingReturnsParams
  ): number {
    // Calculate current market cap
    const currentMarketCap = currentPrice * this.BITCOIN_CURRENT_SUPPLY
    
    // Market maturity effect - diminishing returns kick in after threshold
    let maturityFactor = 1.0
    if (currentMarketCap > params.maturityThreshold) {
      const excessMarketCap = currentMarketCap - params.maturityThreshold
      const maturityRatio = excessMarketCap / params.maturityThreshold
      maturityFactor = Math.pow(1 + maturityRatio, -params.diminishingFactor)
    }
    
    // Cycle degradation - each cycle becomes less explosive
    const cycleFactor = Math.pow(1 - params.cycleDegradation, cycleNumber)
    
    // Institutional saturation effect
    const institutionalFactor = 1 - (params.institutionalSaturation * 0.5)
    
    // Regulatory maturity dampening effect
    const regulatoryFactor = 1 - (params.regulatoryMaturity * 0.3)
    
    // Liquidity constraint effect (stronger at higher prices)
    const liquidityFactor = 1 - (params.liquidityConstraint * Math.min(1, currentMarketCap / 10_000_000_000_000))
    
    // Competition factor (reduces growth potential over time)
    const competitionFactor = 1 - (params.competitionFactor * Math.min(1, month / 120)) // Increases over 10 years
    
    // Adoption curve effect
    let adoptionFactor = 1.0
    const adoptionProgress = Math.min(1, currentMarketCap / 10_000_000_000_000) // Progress toward $10T
    
    switch (params.adoptionCurveType) {
      case 'logarithmic':
        adoptionFactor = 1 - (0.5 * Math.log(1 + adoptionProgress * 9) / Math.log(10))
        break
      case 'sigmoid':
        adoptionFactor = 1 - (0.6 / (1 + Math.exp(-10 * (adoptionProgress - 0.5))))
        break
      case 'linear':
        adoptionFactor = 1 - (0.3 * adoptionProgress)
        break
    }
    
    // Combine all factors
    const combinedFactor = maturityFactor * cycleFactor * institutionalFactor * 
                          regulatoryFactor * liquidityFactor * competitionFactor * adoptionFactor
    
    // Apply factors to the base multiplier
    const adjustedMultiplier = 1 + ((baseMultiplier - 1) * combinedFactor)
    
    // Ensure reasonable bounds
    return Math.max(0.5, Math.min(2.0, adjustedMultiplier))
  }

  /**
   * Calculate where the raw cycle would end without diminishing returns
   * This applies historical multipliers directly to get the "natural" endpoint
   */
  private calculateRawFinalPrice(
    initialPrice: number,
    historicalMultipliers: number[],
    totalDays: number
  ): number {
    if (!historicalMultipliers || historicalMultipliers.length === 0) {
      return initialPrice
    }

    let currentPrice = initialPrice
    for (let i = 0; i < totalDays; i++) {
      const multiplierIndex = i % historicalMultipliers.length
      currentPrice *= historicalMultipliers[multiplierIndex]
    }

    return currentPrice
  }

  /**
   * Apply diminishing returns to the final endpoint only
   * This preserves volatility while adjusting the overall trajectory
   */
  private applyDiminishingReturnsToEndpoint(
    rawFinalPrice: number,
    params: DiminishingReturnsParams
  ): number {
    // Calculate market cap at the raw final price
    const finalMarketCap = rawFinalPrice * this.BITCOIN_CURRENT_SUPPLY

    // Apply all diminishing returns factors to the final price
    let adjustmentFactor = 1.0

    // Market maturity effect
    if (finalMarketCap > params.maturityThreshold) {
      const excessMarketCap = finalMarketCap - params.maturityThreshold
      const maturityRatio = excessMarketCap / params.maturityThreshold
      const maturityFactor = Math.pow(1 + maturityRatio, -params.diminishingFactor)
      adjustmentFactor *= maturityFactor
    }

    // Institutional saturation effect
    const institutionalFactor = 1 - (params.institutionalSaturation * 0.5)
    adjustmentFactor *= institutionalFactor

    // Regulatory maturity dampening effect
    const regulatoryFactor = 1 - (params.regulatoryMaturity * 0.3)
    adjustmentFactor *= regulatoryFactor

    // Liquidity constraint effect (stronger at higher prices)
    const liquidityFactor = 1 - (params.liquidityConstraint * Math.min(1, finalMarketCap / 10_000_000_000_000))
    adjustmentFactor *= liquidityFactor

    // Competition factor (assume maximum effect for final price)
    const competitionFactor = 1 - (params.competitionFactor * 0.5)
    adjustmentFactor *= competitionFactor

    // Adoption curve effect
    const adoptionProgress = Math.min(1, finalMarketCap / 10_000_000_000_000)
    let adoptionFactor = 1.0

    switch (params.adoptionCurveType) {
      case 'logarithmic':
        adoptionFactor = 1 - (0.5 * Math.log(1 + adoptionProgress * 9) / Math.log(10))
        break
      case 'sigmoid':
        adoptionFactor = 1 - (0.6 / (1 + Math.exp(-10 * (adoptionProgress - 0.5))))
        break
      case 'linear':
        adoptionFactor = 1 - (0.3 * adoptionProgress)
        break
    }
    adjustmentFactor *= adoptionFactor

    return rawFinalPrice * adjustmentFactor
  }

  /**
   * Calculate the angle adjustment factor
   * This determines how much to modify the trajectory
   */
  private calculateAngleAdjustment(
    rawFinalPrice: number,
    adjustedFinalPrice: number
  ): number {
    // Handle edge case of zero raw final price
    if (rawFinalPrice <= 0) {
      return 1.0
    }

    return adjustedFinalPrice / rawFinalPrice
  }

  /**
   * Apply angle adjustment progressively over time
   * This creates a smooth trajectory modification while preserving daily volatility
   */
  private applyAngleAdjustmentToPrice(
    basePrice: number,
    angleAdjustment: number,
    timeProgress: number
  ): number {
    // Clamp time progress to [0, 1] range
    const clampedProgress = Math.max(0, Math.min(1, timeProgress))

    // Use smooth interpolation for progressive adjustment
    // At timeProgress = 0: no adjustment (factor = 1.0)
    // At timeProgress = 1: full adjustment (factor = angleAdjustment)
    const adjustmentFactor = 1 + (angleAdjustment - 1) * clampedProgress

    return basePrice * adjustmentFactor
  }

  /**
   * Get cycle information for a given month
   */
  private getCycleInfo(month: number): { cycleNumber: number, monthInCycle: number } {
    const cycleNumber = Math.floor((month - 1) / 48) // 0, 1, 2, etc. (48 months = 4 years per cycle)
    const monthInCycle = ((month - 1) % 48) + 1      // 1-48 within each cycle
    return { cycleNumber, monthInCycle }
  }

  /**
   * Convert projection points back to historical data format for use in next cycle
   */
  private convertProjectionToHistorical(projectionPoints: ProjectionPoint[]): HistoricalDataPoint[] {
    return projectionPoints.map(point => ({
      time: Math.floor(point.timestamp / 1000), // Convert milliseconds to seconds
      close: point.price,
      open: point.support || point.price * 0.98, // Use support as open, or slight discount
      high: point.resistance || point.price * 1.05, // Use resistance as high, or slight premium
      low: point.support || point.price * 0.95, // Use support as low, or slight discount
      volume: 0, // No volume data for projected points
      date: new Date(point.timestamp).toISOString().split('T')[0],
      source: 'projected'
    }))
  }

  /**
   * Adjust diminishing returns parameters for later cycles to make them more conservative
   */
  private adjustDiminishingParamsForCycle(
    baseParams: DiminishingReturnsParams,
    cycleNumber: number
  ): DiminishingReturnsParams {
    // Each cycle becomes progressively more conservative
    const cycleMultiplier = Math.pow(1.2, cycleNumber) // 1.0, 1.2, 1.44, 1.73, etc.

    return {
      ...baseParams,
      // Increase diminishing factor for later cycles (more aggressive diminishing returns)
      diminishingFactor: Math.min(0.95, baseParams.diminishingFactor * cycleMultiplier),
      // Lower maturity threshold for later cycles (effects kick in sooner)
      maturityThreshold: baseParams.maturityThreshold / cycleMultiplier,
      // Increase cycle degradation for later cycles
      cycleDegradation: Math.min(0.8, baseParams.cycleDegradation + (cycleNumber * 0.1)),
      // Increase institutional saturation for later cycles
      institutionalSaturation: Math.min(0.9, baseParams.institutionalSaturation + (cycleNumber * 0.1)),
      // Increase regulatory maturity for later cycles
      regulatoryMaturity: Math.min(0.9, baseParams.regulatoryMaturity + (cycleNumber * 0.05)),
      // Increase liquidity constraints for later cycles
      liquidityConstraint: Math.min(0.8, baseParams.liquidityConstraint + (cycleNumber * 0.1)),
      // Increase competition factor for later cycles
      competitionFactor: Math.min(0.7, baseParams.competitionFactor + (cycleNumber * 0.1))
    }
  }

  /**
   * Calculate projected price for a specific month within a single cycle using angle adjustment
   * This is simplified to work within one cycle only
   */
  private getEnhancedCycleRepeatPrice(
    monthInCycle: number,
    cycleStartPrice: number,
    historicalMultipliers: number[],
    diminishingParams: DiminishingReturnsParams
  ): number {
    if (!historicalMultipliers || historicalMultipliers.length === 0) {
      return cycleStartPrice
    }

    // For month 1 of cycle, return the cycle start price
    if (monthInCycle === 1) {
      return cycleStartPrice
    }

    // Convert month to approximate days within this cycle
    const daysInCycle = Math.round((monthInCycle - 1) * (365.25 / 12))

    // Step 1: Calculate raw final price for the full cycle (48 months)
    const totalCycleDays = Math.round(47 * (365.25 / 12)) // 47 months of growth
    const rawCycleFinalPrice = this.calculateRawFinalPrice(cycleStartPrice, historicalMultipliers, totalCycleDays)

    // Step 2: Apply diminishing returns to the cycle endpoint only
    const adjustedCycleFinalPrice = this.applyDiminishingReturnsToEndpoint(rawCycleFinalPrice, diminishingParams)

    // Step 3: Calculate angle adjustment factor for this cycle
    const angleAdjustment = this.calculateAngleAdjustment(rawCycleFinalPrice, adjustedCycleFinalPrice)

    // Step 4: Calculate the raw price for this specific month within the cycle
    let rawMonthPrice = cycleStartPrice
    for (let i = 0; i < daysInCycle; i++) {
      const multiplierIndex = i % historicalMultipliers.length
      const baseMultiplier = historicalMultipliers[multiplierIndex]
      rawMonthPrice *= baseMultiplier
    }

    // Step 5: Apply progressive angle adjustment based on progress within this cycle
    const cycleProgress = daysInCycle / totalCycleDays
    const adjustedMonthPrice = this.applyAngleAdjustmentToPrice(
      rawMonthPrice,
      angleAdjustment,
      cycleProgress
    )

    return adjustedMonthPrice
  }

  /**
   * Generate a single 4-year cycle projection
   */
  private async generateSingleCycle(
    cycleNumber: number,
    historicalData: HistoricalDataPoint[],
    cycleStartPrice: number,
    baseDiminishingParams: DiminishingReturnsParams,
    cycleStartDate: Date
  ): Promise<ProjectionPoint[]> {
    console.log(`🔄 Generating Cycle ${cycleNumber + 1} starting at $${cycleStartPrice.toFixed(0)}`)

    // Calculate historical multipliers from this cycle's "historical" data
    const historicalMultipliers = this.calculateHistoricalMultipliers(historicalData)

    if (historicalMultipliers.length === 0) {
      throw new Error(`Enhanced Cycle Repeat Model: Unable to calculate multipliers for cycle ${cycleNumber + 1}`)
    }

    // Adjust diminishing returns parameters for this cycle
    const cycleDiminishingParams = this.adjustDiminishingParamsForCycle(baseDiminishingParams, cycleNumber)

    console.log(`   📊 Cycle ${cycleNumber + 1} using ${historicalMultipliers.length} multipliers with adjusted params:`)
    console.log(`   📉 Diminishing factor: ${cycleDiminishingParams.diminishingFactor.toFixed(3)} (base: ${baseDiminishingParams.diminishingFactor.toFixed(3)})`)
    console.log(`   💰 Maturity threshold: $${(cycleDiminishingParams.maturityThreshold / 1e12).toFixed(1)}T (base: $${(baseDiminishingParams.maturityThreshold / 1e12).toFixed(1)}T)`)

    const cycleProjectionPoints: ProjectionPoint[] = []
    const cycleMonths = 48 // 4 years per cycle

    // Generate monthly projections for this cycle
    for (let monthInCycle = 1; monthInCycle <= cycleMonths; monthInCycle++) {
      const currentDate = new Date(cycleStartDate)
      currentDate.setMonth(currentDate.getMonth() + monthInCycle - 1)
      currentDate.setDate(15) // Mid-month for consistency

      // Calculate main projection price using enhanced cycle repeat logic
      const mainPrice = this.getEnhancedCycleRepeatPrice(
        monthInCycle,
        cycleStartPrice,
        historicalMultipliers,
        cycleDiminishingParams
      )

      // Calculate support and resistance as percentage bands around main price
      // Bands get narrower over time as market matures and in later cycles
      const baseVolatilityBand = 0.15
      const maturityAdjustment = Math.min(0.5, (mainPrice * this.BITCOIN_CURRENT_SUPPLY) / 10_000_000_000_000)
      const cycleAdjustment = cycleNumber * 0.02 // Reduce volatility in later cycles
      const volatilityBand = baseVolatilityBand * (1 - maturityAdjustment * 0.3 - cycleAdjustment)

      const support = mainPrice * (1 - volatilityBand)
      const resistance = mainPrice * (1 + volatilityBand)

      cycleProjectionPoints.push({
        timestamp: currentDate.getTime(),
        price: mainPrice,
        support: support,
        resistance: resistance,
        confidence: this.calculateConfidence(monthInCycle, historicalMultipliers, cycleMonths, cycleDiminishingParams),
        metadata: {
          cycleDay: ((monthInCycle - 1) * 30.44) % historicalMultipliers.length,
          cycleNumber: cycleNumber,
          monthInCycle: monthInCycle,
          historicalMultipliersUsed: historicalMultipliers.length,
          volatilityBand: volatilityBand,
          marketCap: mainPrice * this.BITCOIN_CURRENT_SUPPLY,
          diminishingReturnsApplied: true,
          diminishingParams: cycleDiminishingParams,
          cycleStartPrice: cycleStartPrice,
          historicalDataSource: historicalData[0]?.source || 'unknown'
        }
      })
    }

    const cycleEndPrice = cycleProjectionPoints[cycleProjectionPoints.length - 1].price
    const cycleGrowth = ((cycleEndPrice - cycleStartPrice) / cycleStartPrice) * 100

    console.log(`   ✅ Cycle ${cycleNumber + 1} complete: $${cycleStartPrice.toFixed(0)} → $${cycleEndPrice.toFixed(0)} (${cycleGrowth.toFixed(1)}% growth)`)

    return cycleProjectionPoints
  }

  /**
   * Calculate confidence based on cycle position, volatility, and diminishing returns
   */
  private calculateConfidence(
    month: number, 
    historicalMultipliers: number[],
    totalMonths: number,
    diminishingParams: DiminishingReturnsParams
  ): number {
    if (historicalMultipliers.length === 0) return 0.3
    
    // Calculate volatility of historical multipliers
    const avgMultiplier = historicalMultipliers.reduce((sum, m) => sum + m, 0) / historicalMultipliers.length
    const variance = historicalMultipliers.reduce((sum, m) => sum + Math.pow(m - avgMultiplier, 2), 0) / historicalMultipliers.length
    const volatility = Math.sqrt(variance)
    
    // Base confidence starts high and decreases with time and volatility
    const baseConfidence = 0.85
    const timeDecay = Math.exp(-0.015 * month) // Slower decay than basic model
    const volatilityPenalty = Math.max(0.3, 1 - volatility * 1.5)
    
    // Diminishing returns confidence adjustment
    const diminishingFactor = 1 - (diminishingParams.diminishingFactor * 0.2) // Higher diminishing = lower confidence
    
    const confidence = baseConfidence * timeDecay * volatilityPenalty * diminishingFactor
    return Math.max(0.25, Math.min(0.95, confidence))
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
   * Generate price projection using Enhanced Cycle Repeat model with dynamic cycle approach
   */
  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {

    console.log(`🚀 Enhanced Cycle Repeat Model: Generating dynamic cycle projection for ${params.projectionMonths} months`)

    // Get diminishing returns parameters or use defaults
    const baseDiminishingParams: DiminishingReturnsParams = {
      ...DIMINISHING_RETURNS_PRESETS.moderate.params,
      ...(params.modelSpecificParams?.diminishingReturns || {})
    }

    console.log(`📊 Using base diminishing returns params:`, baseDiminishingParams)

    // Calculate how many complete cycles we need (48 months = 4 years per cycle)
    const totalCycles = Math.ceil(params.projectionMonths / 48)
    const remainingMonths = params.projectionMonths % 48

    console.log(`🔄 Planning ${totalCycles} cycles for ${params.projectionMonths} months (${remainingMonths} months in final cycle)`)

    const allProjectionPoints: ProjectionPoint[] = []
    const startDate = new Date()

    // Initialize for first cycle
    let currentHistoricalData = historicalData
    let currentStartPrice = params.startPrice
    let currentCycleStartDate = new Date(startDate)

    // Generate each cycle
    for (let cycleIndex = 0; cycleIndex < totalCycles; cycleIndex++) {
      // Determine how many months to generate for this cycle
      const isLastCycle = cycleIndex === totalCycles - 1
      const monthsInThisCycle = isLastCycle && remainingMonths > 0 ? remainingMonths : 48

      // Generate the full cycle (48 months) to get proper historical data for next cycle
      const fullCycleProjection = await this.generateSingleCycle(
        cycleIndex,
        currentHistoricalData,
        currentStartPrice,
        baseDiminishingParams,
        currentCycleStartDate
      )

      // Add only the required months from this cycle to the final result
      const cyclePointsToAdd = fullCycleProjection.slice(0, monthsInThisCycle)
      allProjectionPoints.push(...cyclePointsToAdd)

      // Prepare for next cycle (if there is one)
      if (cycleIndex < totalCycles - 1) {
        // Convert this cycle's projection to historical data for the next cycle
        currentHistoricalData = this.convertProjectionToHistorical(fullCycleProjection)

        // Start next cycle from the end price of this cycle
        currentStartPrice = fullCycleProjection[fullCycleProjection.length - 1].price

        // Advance the start date for the next cycle
        currentCycleStartDate = new Date(currentCycleStartDate)
        currentCycleStartDate.setMonth(currentCycleStartDate.getMonth() + 48)

        console.log(`   🔗 Prepared for Cycle ${cycleIndex + 2}: ${currentHistoricalData.length} historical points, starting at $${currentStartPrice.toFixed(0)}`)
      }
    }

    // Calculate projection metadata
    const startPrice = allProjectionPoints[0]?.price || params.startPrice
    const endPrice = allProjectionPoints[allProjectionPoints.length - 1]?.price || params.startPrice
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100
    const averageMonthlyGrowth = totalGrowth / params.projectionMonths

    console.log(`✅ Enhanced Cycle Repeat Model: Generated ${allProjectionPoints.length} points across ${totalCycles} cycles`)
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
        totalCycles: totalCycles,
        cycleApproach: 'dynamic',
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
