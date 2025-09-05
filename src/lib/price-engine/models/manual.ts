import type { PriceEngineParams } from "../types"

interface PathPoint {
  date: Date
  price: number
}

/**
 * Generates a future price path based on a series of manual annual growth rates.
 * @param params - The parameters required for the engine, including initial price, duration, and growth rates.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generateManualPath(params: PriceEngineParams & {
  projectionStartDate?: Date
}): PathPoint[] {
  const { simulationMonths, initialBtcPrice, annualGrowthRates, projectionStartDate } = params
  const path: PathPoint[] = []
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
