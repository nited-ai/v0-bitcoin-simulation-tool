/**
 * Power Law Model
 * 
 * Generates price projections based on Bitcoin's Power Law mathematical model.
 * Migrated from lib/price-engine/models/power-law.ts
 */

import type { PriceEngineParams, ProjectionPathPoint, PowerLawLine } from '../types'

export const GENESIS_DATE = new Date("2009-01-03")

// Power Law model parameters with dynamic calibration based on historical extremes
// Formula: Price = constant × (days since Genesis Block)^slope
// Fit line: Industry-standard parameters from HTML Power Law Explorer (slope = 5.844, intercept = -17.01)
// Support/Resistance: Dynamically calibrated to actual Bitcoin historical price extremes
// - Support line calibrated to 2022 market bottom ($15,500 at 35.3% of fair value)
// - Resistance line calibrated to 2013 market peak ($1,177 at 1170.2% of fair value)
const POWER_LAW_MODELS = {
  fit: { slope: 5.844, intercept: -17.01 }, // Industry standard (unchanged)
  support: { slope: 5.844, intercept: -17.461735 }, // Calibrated to historical bottoms
  resistance: { slope: 5.844, intercept: -15.941731 }, // Calibrated to historical peaks
}

/**
 * Calculate days since Bitcoin genesis block.
 */
export const getDaysSinceGenesis = (date: Date): number => {
  const diffTime = Math.abs(date.getTime() - GENESIS_DATE.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate Power Law price for a given date and line type.
 */
export const getPowerLawPrice = (date: Date, line: PowerLawLine): number => {
  const days = getDaysSinceGenesis(date)
  if (days <= 0) return 0

  const model = POWER_LAW_MODELS[line]
  const logPrice = model.slope * Math.log10(days) + model.intercept
  const priceUsd = Math.pow(10, logPrice)
  return priceUsd // Return USD price directly
}

/**
 * Generates a future price path based on the Power Law model.
 * Uses the selected prognosis line (fit/support/resistance) as the projected price
 * for the Strategy Engine to make investment decisions.
 * @param params - The parameters required for the engine, including duration and prognosis line selection.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generatePowerLawPath(params: PriceEngineParams): ProjectionPathPoint[] {
  const { simulationMonths, powerLawSettings } = params
  const path: ProjectionPathPoint[] = []
  const simulationStartDate = new Date()

  console.log(`📈 Power Law path generation using prognosis line: ${powerLawSettings?.prognosisLine || 'fit'}`)

  for (let month = 1; month <= simulationMonths; month++) {
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month - 1)

    const prognosisLine = powerLawSettings?.prognosisLine || 'fit'
    const newPrice = getPowerLawPrice(currentDate, prognosisLine)
    path.push({ date: currentDate, price: newPrice })
  }

  // Log sample prices for verification
  if (path.length > 0) {
    const firstPrice = path[0].price
    const lastPrice = path[path.length - 1].price
    const prognosisLine = powerLawSettings?.prognosisLine || 'fit'
    console.log(`   📊 Power Law ${prognosisLine} prices: ${firstPrice.toFixed(0)} → ${lastPrice.toFixed(0)}`)
  }

  return path
}

/**
 * Generate Power Law lines for all three types (fit, support, resistance).
 */
export function generatePowerLawLines(
  startDate: Date,
  endDate: Date,
  intervalDays: number = 30
): Record<PowerLawLine, ProjectionPathPoint[]> {
  const lines: Record<PowerLawLine, ProjectionPathPoint[]> = {
    fit: [],
    support: [],
    resistance: []
  }

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateClone = new Date(currentDate)
    
    lines.fit.push({
      date: new Date(dateClone),
      price: getPowerLawPrice(dateClone, 'fit')
    })
    
    lines.support.push({
      date: new Date(dateClone),
      price: getPowerLawPrice(dateClone, 'support')
    })
    
    lines.resistance.push({
      date: new Date(dateClone),
      price: getPowerLawPrice(dateClone, 'resistance')
    })

    currentDate.setDate(currentDate.getDate() + intervalDays)
  }

  return lines
}

/**
 * Power Law Model implementation for the price data module.
 */
export const powerLawModel = {
  name: 'Power Law',
  id: 'powerLaw',
  description: 'Mathematical model based on Bitcoin\'s historical power law relationship',
  generatePath: generatePowerLawPath,
  generateLines: generatePowerLawLines,
  
  /**
   * Validate parameters for power law model.
   */
  validateParams: (params: PriceEngineParams): boolean => {
    const validLines: PowerLawLine[] = ['fit', 'support', 'resistance']
    return (
      params.powerLawSettings !== undefined &&
      validLines.includes(params.powerLawSettings.prognosisLine)
    )
  },
  
  /**
   * Get default parameters for power law model.
   */
  getDefaultParams: (): Partial<PriceEngineParams> => ({
    priceModel: 'powerLaw',
    powerLawSettings: {
      prognosisLine: 'fit'
    }
  }),
  
  /**
   * Utility functions.
   */
  utils: {
    getDaysSinceGenesis,
    getPowerLawPrice,
    GENESIS_DATE,
    POWER_LAW_MODELS
  }
}
