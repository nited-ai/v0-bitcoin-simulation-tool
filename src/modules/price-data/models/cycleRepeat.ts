/**
 * Cycle Repeat Model
 * 
 * Generates price projections by repeating historical price cycles.
 * Migrated from lib/price-engine/models/cycle-repeat.ts
 */

import type { PriceEngineParams, ProjectionPathPoint } from '../types'

/**
 * Calculates the projected Bitcoin price for a given month based on historical daily multipliers.
 * This function is internal to the cycle-repeat model.
 */
function getCycleRepeatPrice(
  month: number,
  initialPrice: number,
  historicalMultipliers: number[],
  simulationMonths: number,
): number {
  if (!historicalMultipliers || historicalMultipliers.length === 0) {
    return initialPrice
  }

  const daysIntoSimulation = Math.round((month - 1) * (365.25 / 12))

  let currentProjectedPrice = initialPrice
  for (let i = 0; i < daysIntoSimulation; i++) {
    const multiplierIndex = i % historicalMultipliers.length
    currentProjectedPrice *= historicalMultipliers[multiplierIndex]
  }

  return currentProjectedPrice
}

/**
 * Generates a future price path by repeating a historical price cycle.
 * @param params - The parameters required for the engine, including duration and historical multipliers.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generateCycleRepeatPath(params: PriceEngineParams): ProjectionPathPoint[] {
  const { simulationMonths, initialBtcPrice, historicalDailyMultipliers } = params
  const path: ProjectionPathPoint[] = []
  const simulationStartDate = new Date()

  if (!historicalDailyMultipliers) {
    console.warn("Cycle Repeat model requires historical multipliers, but they were not provided.")
    return []
  }

  for (let month = 1; month <= simulationMonths; month++) {
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month - 1)

    const newPrice = getCycleRepeatPrice(month, initialBtcPrice, historicalDailyMultipliers, simulationMonths)
    path.push({ date: currentDate, price: newPrice })
  }

  return path
}

/**
 * Cycle Repeat Model implementation for the price data module.
 */
export const cycleRepeatModel = {
  name: 'Cycle Repeat',
  id: 'cycleRepeat',
  description: 'Repeats historical price cycles using daily multipliers',
  generatePath: generateCycleRepeatPath,
  
  /**
   * Validate parameters for cycle repeat model.
   */
  validateParams: (params: PriceEngineParams): boolean => {
    return (
      Array.isArray(params.historicalDailyMultipliers) &&
      params.historicalDailyMultipliers.length > 0 &&
      params.historicalDailyMultipliers.every(multiplier => 
        typeof multiplier === 'number' && multiplier > 0
      )
    )
  },
  
  /**
   * Get default parameters for cycle repeat model.
   */
  getDefaultParams: (): Partial<PriceEngineParams> => ({
    priceModel: 'cycleRepeat',
    historicalDailyMultipliers: [] // Will be populated from historical data
  }),
  
  /**
   * Utility functions.
   */
  utils: {
    getCycleRepeatPrice
  }
}
