/**
 * Price Data Module
 * 
 * Barrel export for all price data functionality including services,
 * adapters, storage, and types.
 */

// Types
export type {
  PriceDataPoint,
  HistoricalDataPoint,
  PriceDataSource,
  APIResponse,
  CoinCapAsset,
  CoinCapHistoryPoint,
  CoinDeskCurrentPrice,
  PriceDataRequest,
  PriceDataResponse,
  HistoricalDataStorage,
  CacheConfig,
  CacheEntry,
  IPriceDataService,
  IHistoricalDataService,
  IAPIAdapter,
  IDataCache,
  SourceStatus,
  CacheStats,
  SyncStatus,
  AggregationOptions,
  DataQualityMetrics,
  ExportConfig,
  ExportResult,
  PriceSubscription,
  PriceAlert,
  BatchRequest,
  BatchResult
} from './types'

// Services
export { PriceDataService, priceDataService } from './services/PriceDataService'
export { HistoricalDataService, historicalDataService } from './services/HistoricalDataService'

// Adapters
export { CoinCapAdapter, coinCapAdapter } from './adapters/CoinCapAdapter'
export { CoinDeskAdapter, coinDeskAdapter } from './adapters/CoinDeskAdapter'

// Storage
export { DataCache, dataCache } from './storage/DataCache'

// Re-export commonly used functions for backward compatibility
export { priceDataService as getPriceData } from './services/PriceDataService'
export { historicalDataService as getHistoricalData } from './services/HistoricalDataService'
