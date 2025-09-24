/**
 * Cycle Repeat Power Law Model
 * 
 * Generates price projections by replaying historical channel positions within the Power Law channel.
 * Migrated from lib/price-engine/models/cycle-repeat-power-law.ts
 */

import type { PriceEngineParams, ProjectionPathPoint } from '../types'
import { getPowerLawPrice } from './powerLaw'

/**
 * Generates a future price path by replaying the historical price's position
 * within the Power Law channel.
 * @param params - The parameters required for the engine, including duration and historical channel positions.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generateCycleRepeatPowerLawPath(params: PriceEngineParams): ProjectionPathPoint[] {
  const { simulationMonths, historicalChannelPositions } = params
  const path: ProjectionPathPoint[] = []
  const simulationStartDate = new Date()

  if (!historicalChannelPositions) {
    console.warn("Cycle Repeat (Power Law) model requires historical channel positions, but they were not provided.")
    return []
  }

  for (let month = 1; month <= simulationMonths; month++) {
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month - 1)
    currentDate.setDate(15) // Use mid-month for better averaging

    const diffTime = currentDate.getTime() - simulationStartDate.getTime()
    const daysIntoSimulation = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    const positionIndex = daysIntoSimulation % historicalChannelPositions.length
    const channelPosition = historicalChannelPositions[positionIndex]

    const futureSupport = getPowerLawPrice(currentDate, "support")
    const futureResistance = getPowerLawPrice(currentDate, "resistance")
    const futureChannelWidth = futureResistance - futureSupport

    const newPrice = futureSupport + channelPosition * futureChannelWidth
    path.push({ date: currentDate, price: newPrice })
  }

  return path
}

/**
 * Cycle Repeat Power Law Model implementation for the price data module.
 */
export const cycleRepeatPowerLawModel = {
  name: 'Cycle Repeat Power Law',
  id: 'cycleRepeatPowerLaw',
  description: 'Replays historical channel positions within the Power Law channel',
  generatePath: generateCycleRepeatPowerLawPath,
  
  /**
   * Validate parameters for cycle repeat power law model.
   */
  validateParams: (params: PriceEngineParams): boolean => {
    return (
      Array.isArray(params.historicalChannelPositions) &&
      params.historicalChannelPositions.length > 0 &&
      params.historicalChannelPositions.every(position => 
        typeof position === 'number' && position >= 0 && position <= 1
      )
    )
  },
  
  /**
   * Get default parameters for cycle repeat power law model.
   */
  getDefaultParams: (): Partial<PriceEngineParams> => ({
    priceModel: 'cycleRepeatPowerLaw',
    historicalChannelPositions: [] // Will be populated from historical data
  })
}
