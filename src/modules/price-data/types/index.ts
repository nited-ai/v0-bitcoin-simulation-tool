/**
 * Price Data Module Types
 * 
 * Type definitions for historical data management, API integration,
 * and price data services.
 */

import type { ValidationResult } from '@/modules/shared/types'

/**
 * Price data point with timestamp and price information
 */
export interface PriceDataPoint {
  timestamp: number
  price: number
  high?: number
  low?: number
  volume?: number
  marketCap?: number
  metadata?: Record<string, any>
}

/**
 * Historical data point (extends shared type)
 */
export interface HistoricalDataPoint {
  time: number
  close: number
  high?: number
  low?: number
  open?: number
  volume?: number
}

/**
 * Price data source configuration
 */
export interface PriceDataSource {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  rateLimit: number // requests per minute
  enabled: boolean
  priority: number
}

/**
 * API response from price data providers
 */
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
  source: string
  rateLimit?: {
    remaining: number
    resetTime: number
  }
}

/**
 * CoinCap API specific types
 */
export interface CoinCapAsset {
  id: string
  rank: string
  symbol: string
  name: string
  supply: string
  maxSupply: string
  marketCapUsd: string
  volumeUsd24Hr: string
  priceUsd: string
  changePercent24Hr: string
  vwap24Hr: string
}

export interface CoinCapHistoryPoint {
  priceUsd: string
  time: number
  date: string
}

/**
 * CoinDesk API specific types
 */
export interface CoinDeskCurrentPrice {
  time: {
    updated: string
    updatedISO: string
    updateduk: string
  }
  disclaimer: string
  chartName: string
  bpi: {
    USD: {
      code: string
      symbol: string
      rate: string
      description: string
      rate_float: number
    }
    GBP: {
      code: string
      symbol: string
      rate: string
      description: string
      rate_float: number
    }
    EUR: {
      code: string
      symbol: string
      rate: string
      description: string
      rate_float: number
    }
  }
}

/**
 * Price data request configuration
 */
export interface PriceDataRequest {
  symbol: string
  startDate?: Date
  endDate?: Date
  interval?: 'daily' | 'weekly' | 'monthly' | 'hourly'
  source?: string
  useCache?: boolean
  maxAge?: number // Cache max age in milliseconds
}

/**
 * Price data response
 */
export interface PriceDataResponse {
  success: boolean
  data?: PriceDataPoint[]
  error?: string
  source: string
  cached: boolean
  timestamp: number
  metadata: {
    symbol: string
    interval: string
    startDate?: string
    endDate?: string
    totalPoints: number
  }
}

/**
 * Historical data storage configuration
 */
export interface HistoricalDataStorage {
  format: 'json' | 'csv' | 'sqlite'
  path: string
  compression: boolean
  maxFileSize: number // in MB
  retentionDays: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean
  maxSize: number // in MB
  ttl: number // Time to live in milliseconds
  strategy: 'lru' | 'fifo' | 'lfu'
  persistToDisk: boolean
  diskPath?: string
}

/**
 * Price data cache entry
 */
export interface CacheEntry<T = any> {
  key: string
  data: T
  timestamp: number
  ttl: number
  size: number
  accessCount: number
  lastAccessed: number
}

/**
 * Price data service interface
 */
export interface IPriceDataService {
  getCurrentPrice(symbol: string, source?: string): Promise<PriceDataResponse>
  getHistoricalData(request: PriceDataRequest): Promise<PriceDataResponse>
  getMultipleAssets(symbols: string[], source?: string): Promise<Map<string, PriceDataResponse>>
  validateDataIntegrity(data: PriceDataPoint[]): ValidationResult
  getAvailableSources(): PriceDataSource[]
  getSourceStatus(sourceId: string): Promise<SourceStatus>
}

/**
 * Historical data service interface
 */
export interface IHistoricalDataService {
  loadHistoricalData(symbol: string, interval: string): Promise<HistoricalDataPoint[]>
  saveHistoricalData(symbol: string, interval: string, data: HistoricalDataPoint[]): Promise<boolean>
  updateHistoricalData(symbol: string, interval: string, newData: HistoricalDataPoint[]): Promise<boolean>
  getDataRange(symbol: string, interval: string): Promise<{ start: Date; end: Date } | null>
  cleanupOldData(retentionDays: number): Promise<number>
  validateDataConsistency(symbol: string, interval: string): Promise<ValidationResult>
}

/**
 * API adapter interface
 */
export interface IAPIAdapter {
  fetchCurrentPrice(symbol: string): Promise<APIResponse<number>>
  fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<APIResponse<HistoricalDataPoint[]>>
  validateResponse(response: any): ValidationResult
  transformResponse(response: any): PriceDataPoint[]
  getSourceInfo(): PriceDataSource
  testConnection(): Promise<boolean>
}

/**
 * Data cache interface
 */
export interface IDataCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, data: T, ttl?: number): Promise<boolean>
  delete(key: string): Promise<boolean>
  clear(): Promise<boolean>
  has(key: string): Promise<boolean>
  size(): Promise<number>
  keys(): Promise<string[]>
  getStats(): Promise<CacheStats>
}

/**
 * Source status information
 */
export interface SourceStatus {
  id: string
  name: string
  online: boolean
  lastCheck: Date
  responseTime: number
  errorCount: number
  rateLimit: {
    remaining: number
    resetTime: Date
  }
  dataQuality: {
    score: number
    issues: string[]
  }
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictionCount: number
  oldestEntry: Date
  newestEntry: Date
  memoryUsage: number
}

/**
 * Data synchronization status
 */
export interface SyncStatus {
  symbol: string
  interval: string
  lastSync: Date
  nextSync: Date
  status: 'idle' | 'syncing' | 'error' | 'paused'
  progress: number
  error?: string
}

/**
 * Price data aggregation options
 */
export interface AggregationOptions {
  method: 'average' | 'median' | 'weighted' | 'ohlc'
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month'
  sources: string[]
  weights?: Record<string, number>
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
  completeness: number // 0-1
  accuracy: number // 0-1
  consistency: number // 0-1
  timeliness: number // 0-1
  issues: Array<{
    type: 'missing' | 'outlier' | 'duplicate' | 'stale'
    description: string
    severity: 'low' | 'medium' | 'high'
    count: number
  }>
}

/**
 * Price data export configuration
 */
export interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx'
  symbol: string
  interval: string
  startDate?: Date
  endDate?: Date
  includeMetadata: boolean
  compression: boolean
  filename?: string
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  filename?: string
  data?: string | Buffer
  error?: string
  size: number
  recordCount: number
}

/**
 * Real-time price subscription
 */
export interface PriceSubscription {
  id: string
  symbol: string
  callback: (price: PriceDataPoint) => void
  active: boolean
  lastUpdate: Date
  errorCount: number
}

/**
 * Price alert configuration
 */
export interface PriceAlert {
  id: string
  symbol: string
  condition: 'above' | 'below' | 'change'
  threshold: number
  enabled: boolean
  triggered: boolean
  createdAt: Date
  triggeredAt?: Date
}

/**
 * Batch operation request
 */
export interface BatchRequest {
  operations: Array<{
    type: 'fetch' | 'update' | 'delete'
    symbol: string
    interval?: string
    params?: any
  }>
  parallel: boolean
  maxConcurrency?: number
}

/**
 * Batch operation result
 */
export interface BatchResult {
  success: boolean
  results: Array<{
    operation: string
    success: boolean
    data?: any
    error?: string
  }>
  totalTime: number
  successCount: number
  errorCount: number
}
