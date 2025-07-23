import type { PriceEngineParams } from "../types"
import type { PowerLawLine } from "../types"

export const GENESIS_DATE = new Date("2009-01-03")

const POWER_LAW_MODELS = {
  fit: { slope: 5.68, intercept: -16.493 },
  support: { slope: 5.85, intercept: -17.55 },
  resistance: { slope: 5.57, intercept: -15.75 },
}

const USD_TO_EUR_RATE = 0.92

interface PathPoint {
  date: Date
  price: number
}

export const getDaysSinceGenesis = (date: Date): number => {
  const diffTime = Math.abs(date.getTime() - GENESIS_DATE.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const getPowerLawPrice = (date: Date, line: PowerLawLine): number => {
  const days = getDaysSinceGenesis(date)
  if (days <= 0) return 0

  const model = POWER_LAW_MODELS[line]
  const logPrice = model.slope * Math.log10(days) + model.intercept
  const priceUsd = Math.pow(10, logPrice)
  return priceUsd * USD_TO_EUR_RATE
}

/**
 * Generates a future price path based on the Power Law model.
 * @param params - The parameters required for the engine, including duration and which prognosis line to follow.
 * @returns An array of objects, each containing the date and the projected price for that date.
 */
export function generatePowerLawPath(params: PriceEngineParams): PathPoint[] {
  const { simulationMonths, powerLawSettings } = params
  const path: PathPoint[] = []
  const simulationStartDate = new Date()

  for (let month = 1; month <= simulationMonths; month++) {
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month - 1)

    const newPrice = getPowerLawPrice(currentDate, powerLawSettings.prognosisLine)
    path.push({ date: currentDate, price: newPrice })
  }

  return path
}
