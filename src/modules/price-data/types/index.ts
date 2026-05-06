/**
 * Price Data Module Types
 * 
 * Comprehensive type definitions for price data management,
 * historical data handling, and price projections.
 */

/**
 * Defines the specific Power Law line to be used for price projection.
 */
export type PowerLawLine = "fit" | "support" | "resistance"

/**
 * Defines the available price projection models.
 */
export type PriceModel = "manual" | "powerLaw" | "cycleRepeat" | "enhancedCycleRepeat" | "cycleRepeatPowerLaw"

/**
 * Standardized format for a single point of historical price data.
 */
export interface HistoricalDataPoint {
  time: number        // Unix timestamp in seconds (for chart compatibility)
  date: string        // YYYY-MM-DD format
  open: number        // Opening price in USD
  high: number        // Highest price in USD
  low: number         // Lowest price in USD
  close: number       // Closing price in USD
  volume?: number     // Optional volume data
  source?: string     // Data source identifier
}

/**
 * Extended historical data point with additional metadata.
 */
export interface ExtendedHistoricalDataPoint extends HistoricalDataPoint {
  date: string // YYYY-MM-DD format
  timestamp: number
  price: number
  isHistorical: boolean
  confidence: number
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
    // Interactive slope and intercept controls
    controlMode?: 'unified' | 'individual'
    unifiedSlope?: number
    unifiedIntercept?: number
    individualParams?: {
      fit: { slope: number; intercept: number }
      support: { slope: number; intercept: number }
      resistance: { slope: number; intercept: number }
    }
    // Independent price projection parameters (separate from regression lines)
    priceProjectionParams?: {
      slope: number                  // Custom slope for price projection
      intercept: number              // Custom intercept for price projection
    }
    // Cycle Repeat Volatility settings
    cycleRepeatVolatility?: {
      enabled: boolean               // Enable/disable volatility feature
      patternLengthMonths: number    // 24-120 months, default: 96
      diminishingFactor: number      // 0.5-1.0, default: 1.0 (no diminishing)
    }
  }
  projectionStartDate?: Date
  // Optional pre-calculated historical patterns for specific models
  historicalDailyMultipliers?: number[] | null
  historicalChannelPositions?: number[] | null
}

/**
 * Standardized output format for a single data point in the final chart series.
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

/**
 * Configuration options for data fetching operations.
 */
export interface DataFetchOptions {
  useCache?: boolean
  maxAge?: number // Cache max age in milliseconds
  retryAttempts?: number
  timeout?: number
  preferLive?: boolean
}

/**
 * Cache configuration settings.
 */
export interface CacheConfiguration {
  maxSize: number
  maxAge: number
  persistToLocalStorage: boolean
  compressionEnabled: boolean
}

/**
 * Price data service interface.
 */
export interface IPriceDataService {
  loadHistoricalData(options?: DataFetchOptions): Promise<HistoricalDataPoint[]>
  getCurrentPrice(options?: DataFetchOptions): Promise<number>
  generatePriceProjection(params: PriceEngineParams, historicalData: HistoricalDataPoint[]): Promise<PriceChartDataPoint[]>
  clearCache(): void
  getCacheStats(): CacheStats
}

/**
 * Cache statistics and metrics.
 */
export interface CacheStats {
  hitRate: number
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  cacheSize: number
  lastUpdated: Date
}

/**
 * Performance metrics for monitoring.
 */
export interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: Date
  success: boolean
  cacheHit?: boolean
}

/**
 * Data validation result.
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Price projection path point.
 */
export interface ProjectionPathPoint {
  date: Date
  price: number
}

/**
 * Historical data set with metadata.
 */
export interface HistoricalDataSet {
  data: HistoricalDataPoint[]
  startDate: Date
  endDate: Date
  totalPoints: number
  source: string
  lastUpdated: Date
}

/**
 * Current price data from external APIs.
 */
export interface CurrentPriceData {
  price: number
  timestamp: number
  source: string
  lastUpdated: string
}

/**
 * Bitcoin All-Time High data — matches the legacy public/data/bitcoin/ath.json shape
 * for compatibility with old consumers (PR4 will simplify to just `value` + `date` once
 * those consumers migrate).
 */
export interface ATHData {
  meta: {
    lastUpdated: string
    source: string
    version: string
    description?: string
  }
  ath: {
    value: number
    date: string
    timestamp: number
    source: string
  }
}

/**
 * Data service state for centralized management.
 */
export interface DataServiceState {
  historicalData: HistoricalDataPoint[]
  currentPrice: CurrentPriceData | null
  ath: number | null
  athData: ATHData | null
  isHistoricalDataLoaded: boolean
  isLoadingHistoricalData: boolean
  isATHLoaded: boolean
  lastHistoricalDataLoad: number
  errors: string[]
  isInitializing: boolean
}

/**
 * Price data loading options.
 */
export interface PriceDataLoadOptions {
  preferLive?: boolean
  useCache?: boolean
  maxAge?: number
  retryAttempts?: number
  timeout?: number
}

/**
 * Error types for price data operations.
 */
export type PriceDataError =
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'CACHE_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Price data operation result.
 */
export interface PriceDataResult<T> {
  success: boolean
  data?: T
  error?: {
    type: PriceDataError
    message: string
    details?: any
  }
  metadata?: {
    source: string
    timestamp: number
    cached: boolean
    duration: number
  }
}
