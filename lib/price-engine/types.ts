// lib/price-engine/types.ts

/**
 * Defines the specific Power Law line to be used for price projection.
 */
export type PowerLawLine = "fit" | "support" | "resistance"

/**
 * Defines the available price projection models.
 */
export type PriceModel = "manual" | "powerLaw" | "cycleRepeat" | "cycleRepeatPowerLaw"

/**
 * Standardized format for a single point of historical price data.
 */
export interface HistoricalDataPoint {
  time: number // Unix timestamp in seconds
  close: number
}

/**
 * Defines the complete set of input parameters required by the Price Engine.
 */
export interface PriceEngineParams {
  priceModel: PriceModel
  simulationMonths: number
  initialBtcPrice: number
  annualGrowthRates: number[]
  powerLawSettings: {
    prognosisLine: PowerLawLine
  }
  // Optional pre-calculated historical patterns for specific models
  historicalDailyMultipliers?: number[] | null
  historicalChannelPositions?: number[] | null
}

/**
 * Standardized output format for a single data point in the final chart series.
 * Contains both historical and projected values.
 */
export interface PriceChartDataPoint {
  date: string // YYYY-MM-DD format
  days: number
  historicalPrice?: number
  simulationPath?: number
  support?: number
  resistance?: number
  fit?: number
}
