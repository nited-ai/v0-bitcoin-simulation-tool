/**
 * Power Law Calibration Service
 * 
 * Analyzes historical Bitcoin price data to dynamically calibrate Power Law support and resistance lines
 * based on actual historical price extremes rather than fixed log-space offsets.
 */

import type { HistoricalDataPoint } from '../types'
import { getDaysSinceGenesis } from '../models/powerLaw'

export interface PowerLawCalibration {
  fit: { slope: number; intercept: number }
  support: { slope: number; intercept: number }
  resistance: { slope: number; intercept: number }
  calibrationData: {
    supportPoint: { date: Date; actualPrice: number; fairValue: number; ratio: number }
    resistancePoint: { date: Date; actualPrice: number; fairValue: number; ratio: number }
    analysisDate: Date
    totalDataPoints: number
  }
}

export interface HistoricalExtreme {
  date: Date
  actualPrice: number
  fairValue: number
  ratio: number // actualPrice / fairValue
  daysSinceGenesis: number
  type: 'support' | 'resistance'
  significance: number // How extreme this point is
}

export class PowerLawCalibrationService {
  private readonly FIT_SLOPE = 5.844 // Industry standard from HTML Power Law Explorer
  private readonly FIT_INTERCEPT = -17.01 // Industry standard from HTML Power Law Explorer

  /**
   * Analyze historical data to find Power Law extremes and calibrate support/resistance lines
   */
  async calibratePowerLawLines(historicalData: HistoricalDataPoint[]): Promise<PowerLawCalibration> {
    console.log(`🔍 Analyzing ${historicalData.length} historical data points for Power Law calibration...`)

    // Filter data from 2010 onwards (when Bitcoin had meaningful price discovery)
    const filteredData = historicalData.filter(point => {
      const date = new Date(point.time * 1000)
      return date >= new Date('2010-01-01')
    })

    console.log(`📊 Using ${filteredData.length} data points from 2010 onwards`)

    // Calculate relative extremes
    const extremes = this.findHistoricalExtremes(filteredData)
    
    // Find the most extreme support and resistance points
    const supportExtreme = this.findMostExtremePoint(extremes, 'support')
    const resistanceExtreme = this.findMostExtremePoint(extremes, 'resistance')

    console.log(`\n=== HISTORICAL EXTREMES ANALYSIS ===`)
    console.log(`Support extreme: ${supportExtreme.date.toISOString().split('T')[0]} - $${supportExtreme.actualPrice.toLocaleString()} (${(supportExtreme.ratio * 100).toFixed(1)}% of fair value)`)
    console.log(`Resistance extreme: ${resistanceExtreme.date.toISOString().split('T')[0]} - $${resistanceExtreme.actualPrice.toLocaleString()} (${(resistanceExtreme.ratio * 100).toFixed(1)}% of fair value)`)

    // Calculate calibrated intercepts
    const supportIntercept = this.calculateInterceptFromPoint(supportExtreme)
    const resistanceIntercept = this.calculateInterceptFromPoint(resistanceExtreme)

    console.log(`\n=== CALIBRATED PARAMETERS ===`)
    console.log(`Fit line: slope=${this.FIT_SLOPE}, intercept=${this.FIT_INTERCEPT}`)
    console.log(`Support line: slope=${this.FIT_SLOPE}, intercept=${supportIntercept.toFixed(6)}`)
    console.log(`Resistance line: slope=${this.FIT_SLOPE}, intercept=${resistanceIntercept.toFixed(6)}`)

    return {
      fit: { slope: this.FIT_SLOPE, intercept: this.FIT_INTERCEPT },
      support: { slope: this.FIT_SLOPE, intercept: supportIntercept },
      resistance: { slope: this.FIT_SLOPE, intercept: resistanceIntercept },
      calibrationData: {
        supportPoint: {
          date: supportExtreme.date,
          actualPrice: supportExtreme.actualPrice,
          fairValue: supportExtreme.fairValue,
          ratio: supportExtreme.ratio
        },
        resistancePoint: {
          date: resistanceExtreme.date,
          actualPrice: resistanceExtreme.actualPrice,
          fairValue: resistanceExtreme.fairValue,
          ratio: resistanceExtreme.ratio
        },
        analysisDate: new Date(),
        totalDataPoints: filteredData.length
      }
    }
  }

  /**
   * Find historical extremes relative to the Power Law fit line
   */
  private findHistoricalExtremes(historicalData: HistoricalDataPoint[]): HistoricalExtreme[] {
    const extremes: HistoricalExtreme[] = []

    for (const point of historicalData) {
      const date = new Date(point.time * 1000)
      const actualPrice = point.close
      const daysSinceGenesis = getDaysSinceGenesis(date)
      
      // Calculate fair value according to fit line
      const logFairValue = this.FIT_SLOPE * Math.log10(daysSinceGenesis) + this.FIT_INTERCEPT
      const fairValue = Math.pow(10, logFairValue)
      
      const ratio = actualPrice / fairValue
      
      // Determine if this is a potential extreme
      let type: 'support' | 'resistance' | null = null
      let significance = 0
      
      if (ratio < 0.5) { // Significantly below fair value
        type = 'support'
        significance = 1 - ratio // Lower ratio = higher significance
      } else if (ratio > 2.0) { // Significantly above fair value
        type = 'resistance'
        significance = ratio - 1 // Higher ratio = higher significance
      }
      
      if (type) {
        extremes.push({
          date,
          actualPrice,
          fairValue,
          ratio,
          daysSinceGenesis,
          type,
          significance
        })
      }
    }

    console.log(`📈 Found ${extremes.filter(e => e.type === 'support').length} support extremes and ${extremes.filter(e => e.type === 'resistance').length} resistance extremes`)
    
    return extremes
  }

  /**
   * Find the most extreme point of a given type
   */
  private findMostExtremePoint(extremes: HistoricalExtreme[], type: 'support' | 'resistance'): HistoricalExtreme {
    const typeExtremes = extremes.filter(e => e.type === type)
    
    if (typeExtremes.length === 0) {
      throw new Error(`No ${type} extremes found in historical data`)
    }

    // For support: find the lowest ratio (furthest below fair value)
    // For resistance: find the highest ratio (furthest above fair value)
    if (type === 'support') {
      return typeExtremes.reduce((min, current) => 
        current.ratio < min.ratio ? current : min
      )
    } else {
      return typeExtremes.reduce((max, current) => 
        current.ratio > max.ratio ? current : max
      )
    }
  }

  /**
   * Calculate the intercept that would make the Power Law line pass through a specific point
   */
  private calculateInterceptFromPoint(extreme: HistoricalExtreme): number {
    // Formula: log10(Price) = slope * log10(days) + intercept
    // Solving for intercept: intercept = log10(Price) - slope * log10(days)
    return Math.log10(extreme.actualPrice) - this.FIT_SLOPE * Math.log10(extreme.daysSinceGenesis)
  }

  /**
   * Get known historical extremes for validation (major market cycles)
   */
  getKnownHistoricalExtremes(): Array<{ date: string; price: number; type: 'support' | 'resistance'; description: string }> {
    return [
      // Major support levels (market bottoms)
      { date: '2011-11-18', price: 2.0, type: 'support', description: '2011 Bear Market Bottom' },
      { date: '2015-01-14', price: 177, type: 'support', description: '2015 Bear Market Bottom' },
      { date: '2018-12-15', price: 3200, type: 'support', description: '2018 Bear Market Bottom' },
      { date: '2022-11-21', price: 15500, type: 'support', description: '2022 Bear Market Bottom' },
      
      // Major resistance levels (market peaks)
      { date: '2013-11-30', price: 1177, type: 'resistance', description: '2013 Bull Market Peak' },
      { date: '2017-12-17', price: 19783, type: 'resistance', description: '2017 Bull Market Peak' },
      { date: '2021-11-10', price: 68789, type: 'resistance', description: '2021 Bull Market Peak' }
    ]
  }

  /**
   * Validate calibration against known extremes
   */
  validateCalibration(calibration: PowerLawCalibration): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    const knownExtremes = this.getKnownHistoricalExtremes()

    // Check if support line is below known bottoms
    for (const extreme of knownExtremes.filter(e => e.type === 'support')) {
      const date = new Date(extreme.date)
      const days = getDaysSinceGenesis(date)
      const supportPrice = Math.pow(10, calibration.support.slope * Math.log10(days) + calibration.support.intercept)
      
      if (supportPrice > extreme.price * 1.1) { // Allow 10% tolerance
        issues.push(`Support line too high for ${extreme.description}: $${supportPrice.toLocaleString()} > $${extreme.price.toLocaleString()}`)
      }
    }

    // Check if resistance line is above known peaks
    for (const extreme of knownExtremes.filter(e => e.type === 'resistance')) {
      const date = new Date(extreme.date)
      const days = getDaysSinceGenesis(date)
      const resistancePrice = Math.pow(10, calibration.resistance.slope * Math.log10(days) + calibration.resistance.intercept)
      
      if (resistancePrice < extreme.price * 0.9) { // Allow 10% tolerance
        issues.push(`Resistance line too low for ${extreme.description}: $${resistancePrice.toLocaleString()} < $${extreme.price.toLocaleString()}`)
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}

// Export singleton instance
export const powerLawCalibrationService = new PowerLawCalibrationService()
