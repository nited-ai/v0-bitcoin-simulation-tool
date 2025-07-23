// lib/price-models/cycle-repeat.ts

/**
 * Calculates the projected Bitcoin price for a given month based on historical daily multipliers.
 * @param month The current month in the simulation (1-indexed).
 * @param initialPrice The initial BTC price at the start of the simulation.
 * @param historicalMultipliers An array of daily price multipliers derived from historical data.
 * @param simulationMonths The total duration of the simulation in months.
 * @returns The projected BTC price for the given month.
 */
export const getCycleRepeatPrice = (
  month: number,
  initialPrice: number,
  historicalMultipliers: number[],
  simulationMonths: number,
): number => {
  if (!historicalMultipliers || historicalMultipliers.length === 0) {
    console.warn("Cycle Repeat: No historical multipliers available. Returning initial price.")
    return initialPrice
  }

  // Calculate the approximate number of days into the simulation for the current month
  // We use 365.25 / 12 for a more accurate average days per month over a year
  const daysIntoSimulation = Math.round((month - 1) * (365.25 / 12))

  let currentProjectedPrice = initialPrice
  for (let i = 0; i < daysIntoSimulation; i++) {
    const multiplierIndex = i % historicalMultipliers.length
    currentProjectedPrice *= historicalMultipliers[multiplierIndex]
  }

  return currentProjectedPrice
}
