/**
 * Power Law Model
 * 
 * Generates price projections based on Bitcoin's Power Law mathematical model.
 * Migrated from lib/price-engine/models/power-law.ts
 */

import type { PriceEngineParams, ProjectionPathPoint, PowerLawLine } from '../types'

export const GENESIS_DATE = new Date("2009-01-03")

// Power Law model parameters based on exact straight line fit
// Formula: Price = constant × (days since Genesis Block)^slope
// Exact fit between $0.53 (2011-01-01) and $4,785,285.25 (2040-01-01)
// Slope: 5.836657 (0.63% from Giovanni's theoretical 5.8)
// Produces $143k for 2026, $1.07M for 2033 (7.4% above Giovanni's $1M target)
const POWER_LAW_MODELS = {
  fit: { slope: 5.836656989322271, intercept: -16.981003249825243 },
  support: { slope: 5.836656989322271, intercept: -17.131003249825243 }, // 0.15 lower in log space
  resistance: { slope: 5.836656989322271, intercept: -16.831003249825243 }, // 0.15 higher in log space
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
