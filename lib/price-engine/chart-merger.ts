import type { PriceChartDataPoint, PriceEngineParams } from "./types"
import { getDaysSinceGenesis, getPowerLawPrice } from "./models/power-law"

/**
 * Efficiently merge cached historical chart data with new projection data.
 * This avoids re-processing historical data every time.
 */
export function mergeHistoricalAndProjection(
  historicalChartData: PriceChartDataPoint[],
  projectionPath: { date: Date; price: number }[]
): PriceChartDataPoint[] {
  
  const dataMap = new Map<string, PriceChartDataPoint>()
  
  // Add cached historical data (already processed)
  historicalChartData.forEach(point => {
    dataMap.set(point.date, { ...point })
  })
  
  // Add projection data
  projectionPath.forEach(point => {
    const dateString = point.date.toISOString().split("T")[0]
    const existingPoint = dataMap.get(dateString) || {
      date: dateString,
      days: getDaysSinceGenesis(point.date),
    }
    dataMap.set(dateString, {
      ...existingPoint,
      simulationPath: point.price,
    })
  })
  
  // Convert back to array and sort by days
  return Array.from(dataMap.values()).sort((a, b) => a.days - b.days)
}

/**
 * Add Power Law support/resistance/fit lines to chart data.
 * These lines are available as reference lines in all price models.
 */
export function addPowerLawLines(chartData: PriceChartDataPoint[], params: PriceEngineParams): void {
  console.log(`📊 Adding Power Law reference lines to chart data`)

  chartData.forEach(point => {
    const date = new Date(point.date)
    point.support = getPowerLawPrice(date, "support")
    point.resistance = getPowerLawPrice(date, "resistance")
    point.fit = getPowerLawPrice(date, "fit")
  })
}
