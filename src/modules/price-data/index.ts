/**
 * Price Data Module
 *
 * Comprehensive Bitcoin price data management module providing:
 * - Historical data loading and caching
 * - Current price fetching with multiple sources
 * - Price projection generation using various models
 * - React hooks for seamless integration
 * - Performance monitoring and analytics
 *
 * @example
 * ```typescript
 * import { priceDataService, usePriceData } from '@/src/modules/price-data'
 *
 * // Service usage
 * const data = await priceDataService.loadHistoricalData()
 * const price = await priceDataService.getCurrentPrice()
 *
 * // React hook usage (PR3 SWR-backed shape)
 * const {
 *   prices,         // PricePoint[]
 *   currentPrice,   // { value: number; fetchedAt: string } | null
 *   ath,            // { value: number } | null
 *   lastUpdated,    // string | null
 *   isStale,        // boolean
 *   isLoading,      // boolean
 *   error,          // Error | undefined
 *   refresh,        // () => Promise<void>
 * } = usePriceData()
 * ```
 *
 * @see {@link ./README.md} for comprehensive documentation
 * @see {@link ./API.md} for complete API reference
 * @module PriceData
 */

// Main service class and instance (singleton)
import { PriceDataService as PriceDataServiceClass } from './services/PriceDataService'
export { PriceDataService } from './services/PriceDataService'
export const priceDataService = PriceDataServiceClass.getInstance()

// Types - Core interfaces and type definitions
export * from './types'

// Services - Business logic and data management
export * from './services/DataCache'
export * from './services/ProjectionGenerator'
export * from './services/ChartMerger'
export * from './services/PerformanceMonitor'

// Hooks - React integration and state management
export * from './hooks/usePriceData'
export * from './hooks/useHistoricalData'
export * from './hooks/usePriceProjection'

// Utils - Helper functions and utilities
export * from './utils/dataTransformers'
export * from './utils/validators'
export * from './utils/dateHelpers'

// Models - Price projection models
export * from './models/manual'
export * from './models/powerLaw'
export * from './models/cycleRepeat'
export * from './models/cycleRepeatPowerLaw'

// Re-export commonly used types for convenience
export type {
  HistoricalDataPoint,
  PriceChartDataPoint,
  PriceEngineParams,
  CurrentPriceData,
  CacheConfiguration,
  DataFetchOptions,
  CacheStats
} from './types'
