/**
 * Volatility Service - Cycle Repeat Volatility Implementation
 * 
 * Implements the volatility mechanism from docs/ROLLING LOAN STRATEGY.html
 * Applies historical Bitcoin price volatility patterns to Power Law projections.
 * 
 * Key Features:
 * - Extracts deviation patterns from historical data (price / Power Law ratio)
 * - Applies volatility to price projection line only (not regression lines)
 * - Supports diminishing volatility over time
 * - Cycles through historical patterns for future projections
 */

import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'

export class VolatilityService {
  // Parameter validation ranges
  private readonly PATTERN_LENGTH_MIN = 24   // Minimum 2 years
  private readonly PATTERN_LENGTH_MAX = 120  // Maximum 10 years
  private readonly DIMINISHING_FACTOR_MIN = 0.5
  private readonly DIMINISHING_FACTOR_MAX = 1.0

  /**
   * Extract deviation pattern from historical data
   * 
   * Calculates the ratio of actual price to Power Law "fair value" for each historical point.
   * This creates a pattern of how Bitcoin price deviates from the mathematical trend.
   * 
   * Reference: docs/ROLLING LOAN STRATEGY.html lines 199-204
   * 
   * @param historicalData - Array of historical price data points
   * @param patternLengthMonths - Number of months to use for pattern (24-120, default: 96)
   * @param prognosisLine - Which Power Law line to use as baseline ('fit', 'support', 'resistance')
   * @param getPowerLawPrice - Function to calculate Power Law price for a given date and line
   * @returns Array of deviation ratios (actual price / Power Law price)
   */
  extractDeviationPattern(
    historicalData: HistoricalDataPoint[],
    patternLengthMonths: number,
    prognosisLine: 'fit' | 'support' | 'resistance',
    getPowerLawPrice: (date: Date, line: 'fit' | 'support' | 'resistance') => number
  ): number[] {
    console.log('🌊 [VolatilityService] extractDeviationPattern called')
    console.log('🌊 [VolatilityService] Historical data length:', historicalData?.length)
    console.log('🌊 [VolatilityService] Pattern length months:', patternLengthMonths)
    console.log('🌊 [VolatilityService] Prognosis line:', prognosisLine)

    if (!historicalData || historicalData.length === 0) {
      console.warn('⚠️ VolatilityService: No historical data available for deviation pattern extraction')
      return []
    }

    // Take the last N months of historical data (or all available if less than requested)
    const relevantHistory = historicalData.slice(-patternLengthMonths)

    console.log(`📊 VolatilityService: Extracting deviation pattern from ${relevantHistory.length} months of data`)

    const deviationPattern: number[] = []

    for (const point of relevantHistory) {
      try {
        const date = new Date(point.time * 1000)
        const powerLawPrice = getPowerLawPrice(date, prognosisLine)
        
        if (powerLawPrice > 0) {
          const deviationRatio = point.close / powerLawPrice
          deviationPattern.push(deviationRatio)
        } else {
          console.warn(`⚠️ VolatilityService: Invalid Power Law price (${powerLawPrice}) for date ${date.toISOString()}`)
        }
      } catch (error) {
        console.error('❌ VolatilityService: Error calculating deviation ratio:', error)
      }
    }

    console.log(`✅ VolatilityService: Extracted ${deviationPattern.length} deviation ratios`)
    return deviationPattern
  }

  /**
   * Apply volatility to a base price using historical deviation pattern
   * 
   * Multiplies the base Power Law price by a historical deviation ratio,
   * cycling through the pattern and applying diminishing factor over time.
   * 
   * Reference: docs/ROLLING LOAN STRATEGY.html lines 214-220
   * 
   * @param basePrice - Base Power Law price for the projection point
   * @param deviationPattern - Array of historical deviation ratios
   * @param monthIndex - Index of the current projection month (for pattern cycling)
   * @param diminishingFactor - Factor to reduce volatility over time (0.5-1.0, default: 1.0)
   * @returns Volatility-adjusted price
   */
  applyVolatility(
    basePrice: number,
    deviationPattern: number[],
    monthIndex: number,
    diminishingFactor: number
  ): number {
    if (monthIndex === 0) {
      console.log('🌊 [VolatilityService] applyVolatility called for first month')
      console.log('🌊 [VolatilityService] Base price:', basePrice)
      console.log('🌊 [VolatilityService] Deviation pattern length:', deviationPattern?.length)
      console.log('🌊 [VolatilityService] Diminishing factor:', diminishingFactor)
    }

    if (!deviationPattern || deviationPattern.length === 0) {
      console.warn('⚠️ VolatilityService: No deviation pattern available')
      return basePrice // No volatility pattern available
    }

    if (basePrice <= 0) {
      console.warn('⚠️ VolatilityService: Invalid base price for volatility application')
      return basePrice
    }

    try {
      // Cycle through the deviation pattern using modulo
      const patternIndex = monthIndex % deviationPattern.length
      const deviationRatio = deviationPattern[patternIndex]

      // Apply diminishing factor exponentially over time (per year)
      const yearsElapsed = monthIndex / 12
      const diminishingMultiplier = Math.pow(diminishingFactor, yearsElapsed)

      // Calculate volatility multiplier
      // Formula: 1 + (deviation - 1) * diminishing_multiplier
      // This reduces the deviation impact over time while preserving the base trend
      const volatilityMultiplier = 1 + (deviationRatio - 1) * diminishingMultiplier

      const adjustedPrice = basePrice * volatilityMultiplier

      if (monthIndex === 0) {
        console.log('🌊 [VolatilityService] Pattern index:', patternIndex)
        console.log('🌊 [VolatilityService] Deviation ratio:', deviationRatio)
        console.log('🌊 [VolatilityService] Volatility multiplier:', volatilityMultiplier)
        console.log('🌊 [VolatilityService] Adjusted price:', adjustedPrice)
      }

      return adjustedPrice
    } catch (error) {
      console.error('❌ VolatilityService: Error applying volatility:', error)
      return basePrice // Fallback to base price on error
    }
  }

  /**
   * Validate volatility parameters
   * 
   * @param patternLengthMonths - Pattern length in months (24-120)
   * @param diminishingFactor - Diminishing factor (0.5-1.0)
   * @returns True if parameters are valid
   */
  validateParameters(patternLengthMonths: number, diminishingFactor: number): boolean {
    if (isNaN(patternLengthMonths) || isNaN(diminishingFactor)) {
      return false
    }

    const validPatternLength = patternLengthMonths >= this.PATTERN_LENGTH_MIN && 
                              patternLengthMonths <= this.PATTERN_LENGTH_MAX

    const validDiminishingFactor = diminishingFactor >= this.DIMINISHING_FACTOR_MIN && 
                                  diminishingFactor <= this.DIMINISHING_FACTOR_MAX

    return validPatternLength && validDiminishingFactor
  }

  /**
   * Get default volatility parameters
   * 
   * @returns Default parameters matching the original implementation
   */
  getDefaultParameters() {
    return {
      enabled: false,           // Disabled by default for backward compatibility
      patternLengthMonths: 96,  // 8 years (matches original implementation)
      diminishingFactor: 1.0    // No diminishing by default
    }
  }

  /**
   * Check if sufficient historical data is available for volatility calculation
   * 
   * @param historicalData - Historical data array
   * @param requiredMonths - Required number of months
   * @returns True if sufficient data is available
   */
  hasSufficientData(historicalData: HistoricalDataPoint[], requiredMonths: number): boolean {
    return historicalData && historicalData.length >= Math.min(requiredMonths, this.PATTERN_LENGTH_MIN)
  }
}
