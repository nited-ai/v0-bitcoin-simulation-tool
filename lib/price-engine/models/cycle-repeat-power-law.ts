import type { PriceEngineParams } from "../types"
import { getPowerLawPrice } from "./power-law" // Import from the refactored power-law model

interface PathPoint {
  date: Date
  price: number
}

/**
 * Generates a future price path by replaying the historical price's position
 * within the Power Law channel.
 * @param params - The parameters required for the engine, including duration and historical channel positions.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generateCycleRepeatPowerLawPath(params: PriceEngineParams): PathPoint[] {
  const { simulationMonths, historicalChannelPositions } = params
  const path: PathPoint[] = []
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
