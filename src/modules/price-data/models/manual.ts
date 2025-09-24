/**
 * Manual Growth Model
 * 
 * Generates price projections based on user-defined annual growth rates.
 * Migrated from lib/price-engine/models/manual.ts
 */

import type { PriceEngineParams, ProjectionPathPoint } from '../types'

/**
 * Generates a future price path based on a series of manual annual growth rates.
 * @param params - The parameters required for the engine, including initial price, duration, and growth rates.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generateManualPath(params: PriceEngineParams & {
  projectionStartDate?: Date
}): ProjectionPathPoint[] {
  const { simulationMonths, initialBtcPrice, annualGrowthRates, projectionStartDate } = params
  const path: ProjectionPathPoint[] = []
  const simulationStartDate = projectionStartDate || new Date()

  let lastPrice = initialBtcPrice

  for (let month = 1; month <= simulationMonths; month++) {
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month)

    // Determine the annual growth rate for the current year of the simulation
    const yearIndex = Math.min(Math.floor((month - 1) / 12), annualGrowthRates.length - 1)
    const annualGrowthRate = annualGrowthRates[yearIndex] / 100
    const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1

    const newPrice = lastPrice * (1 + monthlyGrowthRate)
    path.push({ date: currentDate, price: newPrice })
    lastPrice = newPrice
  }

  return path
}

/**
 * Manual Growth Model implementation for the price data module.
 */
export const manualGrowthModel = {
  name: 'Manual Growth',
  id: 'manual',
  description: 'User-defined annual growth rates with compound monthly calculations',
  generatePath: generateManualPath,
  
  /**
   * Validate parameters for manual growth model.
   */
  validateParams: (params: PriceEngineParams): boolean => {
    return (
      Array.isArray(params.annualGrowthRates) &&
      params.annualGrowthRates.length > 0 &&
      params.annualGrowthRates.every(rate => typeof rate === 'number')
    )
  },
  
  /**
   * Get default parameters for manual growth model.
   */
  getDefaultParams: (): Partial<PriceEngineParams> => ({
    priceModel: 'manual',
    annualGrowthRates: [10, 15, 20, 25, 30]
  })
}
