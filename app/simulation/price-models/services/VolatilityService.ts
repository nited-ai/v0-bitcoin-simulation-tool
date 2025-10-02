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

    // Detect data interval by checking time difference between consecutive points
    const dataInterval = this.detectDataInterval(historicalData)
    console.log('🌊 [VolatilityService] Detected data interval:', dataInterval)

    // Convert months to data points based on interval
    const dataPointsNeeded = this.convertMonthsToDataPoints(patternLengthMonths, dataInterval)
    console.log(`🌊 [VolatilityService] Converting ${patternLengthMonths} months to ${dataPointsNeeded} data points (${dataInterval} interval)`)

    // Take the last N data points (representing the requested months)
    const relevantHistory = historicalData.slice(-dataPointsNeeded)

    // Calculate actual time span
    if (relevantHistory.length > 0) {
      const startDate = new Date(relevantHistory[0].time * 1000)
      const endDate = new Date(relevantHistory[relevantHistory.length - 1].time * 1000)
      const monthsSpan = ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1)
      console.log(`📊 VolatilityService: Extracting pattern from ${relevantHistory.length} data points spanning ${monthsSpan} months`)
      console.log(`📊 VolatilityService: Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    }

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

    // Resample to monthly frequency if needed
    // This ensures the pattern matches the projection time scale (monthly)
    const monthlyPattern = this.resampleToMonthly(deviationPattern, dataInterval, patternLengthMonths)
    console.log(`✅ VolatilityService: Resampled to ${monthlyPattern.length} monthly deviation ratios`)

    return monthlyPattern
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

      if (monthIndex === 0 || monthIndex === 1 || monthIndex === 95 || monthIndex === 96 || monthIndex === 97) {
        console.log(`🌊 [VolatilityService] Month ${monthIndex}: Pattern[${patternIndex}/${deviationPattern.length}] = ${deviationRatio.toFixed(3)} → Multiplier: ${volatilityMultiplier.toFixed(3)}`)
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

  /**
   * Detect the interval of historical data by analyzing time differences
   *
   * @param historicalData - Historical data array
   * @returns Detected interval ('daily', 'weekly', or 'monthly')
   */
  private detectDataInterval(historicalData: HistoricalDataPoint[]): 'daily' | 'weekly' | 'monthly' {
    if (historicalData.length < 2) {
      return 'weekly' // Default fallback
    }

    // Calculate average time difference between consecutive points (in days)
    let totalDaysDiff = 0
    let count = 0

    for (let i = 1; i < Math.min(10, historicalData.length); i++) {
      const timeDiff = historicalData[i].time - historicalData[i - 1].time
      const daysDiff = timeDiff / (60 * 60 * 24) // Convert seconds to days
      totalDaysDiff += daysDiff
      count++
    }

    const avgDaysDiff = totalDaysDiff / count

    // Classify based on average difference
    if (avgDaysDiff < 3) {
      return 'daily'
    } else if (avgDaysDiff < 15) {
      return 'weekly'
    } else {
      return 'monthly'
    }
  }

  /**
   * Convert months to data points based on interval
   *
   * @param months - Number of months
   * @param interval - Data interval
   * @returns Number of data points needed
   */
  private convertMonthsToDataPoints(months: number, interval: 'daily' | 'weekly' | 'monthly'): number {
    switch (interval) {
      case 'daily':
        return Math.round(months * 30.44) // Average days per month
      case 'weekly':
        return Math.round(months * 4.33) // Average weeks per month
      case 'monthly':
        return months // 1:1 mapping
      default:
        return months
    }
  }

  /**
   * Resample deviation pattern to monthly frequency
   *
   * This ensures the pattern matches the projection time scale (monthly).
   * For example, if we have 416 weekly data points spanning 96 months,
   * we resample to 96 monthly data points by taking every ~4.33rd point.
   *
   * @param deviationPattern - Original deviation pattern (at data interval frequency)
   * @param dataInterval - Original data interval
   * @param targetMonths - Target number of months
   * @returns Resampled pattern at monthly frequency
   */
  private resampleToMonthly(
    deviationPattern: number[],
    dataInterval: 'daily' | 'weekly' | 'monthly',
    targetMonths: number
  ): number[] {
    // If already monthly, no resampling needed
    if (dataInterval === 'monthly') {
      return deviationPattern
    }

    // Calculate how many data points per month
    const dataPointsPerMonth = dataInterval === 'daily' ? 30.44 : 4.33

    // Resample to monthly frequency
    const monthlyPattern: number[] = []
    for (let month = 0; month < targetMonths; month++) {
      // Calculate which data point index corresponds to this month
      const dataPointIndex = Math.floor(month * dataPointsPerMonth)

      // Make sure we don't go out of bounds
      if (dataPointIndex < deviationPattern.length) {
        monthlyPattern.push(deviationPattern[dataPointIndex])
      } else {
        // If we run out of data, use the last available point
        monthlyPattern.push(deviationPattern[deviationPattern.length - 1])
      }
    }

    return monthlyPattern
  }
}
