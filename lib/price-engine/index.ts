// lib/price-engine/index.ts
// This will be the main entry point and dispatcher for the price engine.
// Implementation will follow in the next steps.

import type { PriceEngineParams, HistoricalDataPoint, PriceChartDataPoint } from "./types"
import { generateManualPath } from "./models/manual"
import { generatePowerLawPath, getDaysSinceGenesis, getPowerLawPrice } from "./models/power-law"
import { generateCycleRepeatPath } from "./models/cycle-repeat"
import { generateCycleRepeatPowerLawPath } from "./models/cycle-repeat-power-law"
import { PerformanceMonitor } from "./performance-monitor"
import { generateProjectionPath } from "./projection-generator"
import { mergeHistoricalAndProjection, addPowerLawLines } from "./chart-merger"

/**
 * The main dispatcher for the Price Engine.
 * This function orchestrates the entire price data generation process.
 *
 * 1. Selects the appropriate price model based on parameters.
 * 2. Generates the future price path using the selected model.
 * 3. Merges the historical data with the new future path.
 * 4. Calculates and adds Power Law channel lines (support, resistance, fit) to all data points.
 * 5. Returns a complete, chart-ready dataset.
 *
 * @param params - The complete set of parameters for the price generation.
 * @param historicalData - The pre-loaded historical price data.
 * @returns A promise that resolves to an array of `PriceChartDataPoint`.
 */
async function generatePriceChartDataOriginal(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[],
): Promise<PriceChartDataPoint[]> {
  let futurePath: { date: Date; price: number }[] = []

  // Step 1 & 2: Select model and generate the future price path
  console.log(`🎯 PriceEngine: Generating path for model "${params.priceModel}"`)

  switch (params.priceModel) {
    case "manual":
      futurePath = generateManualPath(params)
      console.log(`📈 Manual path generated: ${futurePath.length} points`)
      break
    case "powerLaw":
      futurePath = generatePowerLawPath(params)
      console.log(`📈 Power Law path generated: ${futurePath.length} points (line: ${params.powerLawSettings.prognosisLine})`)
      break
    case "cycleRepeat":
      futurePath = generateCycleRepeatPath(params)
      console.log(`📈 Cycle Repeat path generated: ${futurePath.length} points`)
      break
    case "cycleRepeatPowerLaw":
      futurePath = generateCycleRepeatPowerLawPath(params)
      console.log(`📈 Cycle Repeat Power Law path generated: ${futurePath.length} points`)
      break
    default:
      throw new Error(`Unknown price model: ${params.priceModel}`)
  }

  // Step 3: Merge historical data with the future path
  const dataMap = new Map<string, Partial<PriceChartDataPoint>>()

  // Add historical data to the map
  historicalData.forEach((point) => {
    const date = new Date(point.time * 1000)
    const dateString = date.toISOString().split("T")[0]
    dataMap.set(dateString, {
      date: dateString,
      days: getDaysSinceGenesis(date),
      historicalPrice: point.close,
    })
  })

  // Add future simulation path data to the map, overwriting if dates overlap
  futurePath.forEach((point) => {
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

  const combinedData = Array.from(dataMap.values()).sort((a, b) => a.days! - b.days!)

  // Step 4: Calculate and add Power Law channel lines to every point
  const finalChartData = combinedData.map((point) => {
    const date = new Date(point.date!)
    return {
      ...point,
      date: point.date!,
      days: point.days!,
      support: getPowerLawPrice(date, "support"),
      resistance: getPowerLawPrice(date, "resistance"),
      fit: getPowerLawPrice(date, "fit"),
    }
  })

  return finalChartData
}

/**
 * Optimized price chart data generation.
 * Separates expensive historical data processing from fast projection generation.
 *
 * @param params - The complete set of parameters for the price generation.
 * @param historicalData - The pre-loaded historical price data.
 * @returns A promise that resolves to an array of `PriceChartDataPoint`.
 */
async function generatePriceChartDataOptimized(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[],
): Promise<PriceChartDataPoint[]> {

  // Step 1: Convert historical data to chart format
  const historicalChartData = historicalData.map((point, index) => ({
    date: point.date,
    days: index,
    timestamp: point.time,
    price: point.close,
    isHistorical: true,
    confidence: 1.0
  }))

  // Step 2: Get the last historical price to connect projection properly
  const lastHistoricalPoint = historicalData[historicalData.length - 1]
  const lastHistoricalPrice = lastHistoricalPoint?.close || params.initialBtcPrice
  const lastHistoricalDate = lastHistoricalPoint?.date ? new Date(lastHistoricalPoint.date) : new Date()

  // Step 3: Generate projection path starting from last historical point (fast)
  const projectionParams = {
    ...params,
    initialBtcPrice: lastHistoricalPrice,
    projectionStartDate: lastHistoricalDate
  }
  const projectionPath = generateProjectionPath(projectionParams)

  // Step 4: Merge cached historical data with new projection (fast)
  const chartData = mergeHistoricalAndProjection(historicalChartData, projectionPath)

  // Step 5: Add Power Law reference lines only when needed
  if (params.priceModel === 'powerLaw' || params.priceModel === 'cycleRepeatPowerLaw') {
    addPowerLawLines(chartData, params)
  }

  return chartData
}

/**
 * Simplified version that always generates fresh price projections
 * Historical data is cached separately in the historical-data-loader
 */
export async function generatePriceChartData(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[],
): Promise<PriceChartDataPoint[]> {
  console.log("🚀 Generating optimized price chart data...")
  const startTime = performance.now()

  // Use optimized version that caches historical data processing
  const data = await generatePriceChartDataOptimized(params, historicalData)

  const totalTime = performance.now() - startTime
  PerformanceMonitor.recordLoadTime("chart-generation", totalTime)
  console.log(`✅ Optimized chart data generated in ${Math.round(totalTime)}ms (${data.length} points)`)

  return data
}

// Chart caching removed - projections are always generated fresh
// Historical data caching is handled separately in historical-data-loader.ts
