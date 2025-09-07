import type { PriceEngineParams } from "./types"
import { generateManualPath } from "./models/manual"
import { generatePowerLawPath } from "./models/power-law"
import { generateCycleRepeatPath } from "./models/cycle-repeat"
import { generateCycleRepeatPowerLawPath } from "./models/cycle-repeat-power-law"

/**
 * Generate only the price projection path for the selected model.
 * This is separated from historical data processing for better performance.
 */
export function generateProjectionPath(params: PriceEngineParams & {
  projectionStartDate?: Date
}): { date: Date; price: number }[] {
  console.log(`🎯 Generating projection for model: ${params.priceModel}`)

  // Use projectionStartDate if provided, otherwise use current date
  // Ensure startDate is always a proper Date object
  let startDate: Date
  if (params.projectionStartDate) {
    startDate = params.projectionStartDate instanceof Date
      ? params.projectionStartDate
      : new Date(params.projectionStartDate)
  } else {
    startDate = new Date()
  }

  const projectionParams = { ...params, projectionStartDate: startDate }

  switch (params.priceModel) {
    case "manual":
      const manualPath = generateManualPath(projectionParams)
      console.log(`📈 Manual path generated: ${manualPath.length} points (starting from ${startDate.toISOString().split('T')[0]})`)
      return manualPath

    case "powerLaw":
      const powerLawPath = generatePowerLawPath(projectionParams)
      console.log(`📈 Power Law path generated: ${powerLawPath.length} points (line: ${params.powerLawSettings.prognosisLine})`)
      return powerLawPath

    case "cycleRepeat":
      const cycleRepeatPath = generateCycleRepeatPath(projectionParams)
      console.log(`📈 Cycle Repeat path generated: ${cycleRepeatPath.length} points`)
      return cycleRepeatPath

    case "cycleRepeatPowerLaw":
      const cycleRepeatPowerLawPath = generateCycleRepeatPowerLawPath(projectionParams)
      console.log(`📈 Cycle Repeat Power Law path generated: ${cycleRepeatPowerLawPath.length} points`)
      return cycleRepeatPowerLawPath

    default:
      throw new Error(`Unknown price model: ${params.priceModel}`)
  }
}
