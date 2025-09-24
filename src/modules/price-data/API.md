# Price Data Module API Reference

Complete API reference for the Price Data Module.

## Table of Contents

- [Services](#services)
- [Hooks](#hooks)
- [Types](#types)
- [Utilities](#utilities)
- [Models](#models)

## Services

### PriceDataService

Main service class providing unified access to price data functionality.

#### Static Methods

##### `getInstance(): PriceDataService`

Returns the singleton instance of PriceDataService.

```typescript
const service = PriceDataService.getInstance()
```

#### Instance Methods

##### `loadHistoricalData(options?: DataFetchOptions): Promise<HistoricalDataPoint[]>`

Loads historical Bitcoin price data with optional caching.

**Parameters:**
- `options.useCache?: boolean` - Whether to use cached data (default: true)
- `options.maxAge?: number` - Maximum age of cached data in milliseconds

**Returns:** Promise resolving to array of historical data points

**Example:**
```typescript
const data = await service.loadHistoricalData({ useCache: true })
```

##### `getCurrentPrice(options?: DataFetchOptions): Promise<number>`

Fetches the current Bitcoin price.

**Parameters:**
- `options.useCache?: boolean` - Whether to use cached price
- `options.preferLive?: boolean` - Prefer live data over cache

**Returns:** Promise resolving to current price in USD

**Example:**
```typescript
const price = await service.getCurrentPrice({ preferLive: true })
```

##### `generatePriceProjection(params: PriceEngineParams, historicalData?: HistoricalDataPoint[]): Promise<PriceChartDataPoint[]>`

Generates price projections using specified model and parameters.

**Parameters:**
- `params: PriceEngineParams` - Projection parameters
- `historicalData?: HistoricalDataPoint[]` - Optional historical data (will load if not provided)

**Returns:** Promise resolving to chart-ready price projection data

**Example:**
```typescript
const projection = await service.generatePriceProjection({
  priceModel: 'manual',
  simulationMonths: 12,
  initialBtcPrice: 50000,
  annualGrowthRates: [10, 15, 20]
})
```

##### `clearCache(): void`

Clears all cached data.

##### `getCacheStats(): CacheStats`

Returns cache performance statistics.

##### `getPerformanceMetrics(): PerformanceMetrics`

Returns performance monitoring metrics.

##### `initialize(): Promise<void>`

Initializes the service and preloads essential data.

---

### DataCache

High-performance caching service with automatic cleanup.

#### Constructor

##### `new DataCache(config: CacheConfiguration)`

Creates a new cache instance.

**Parameters:**
- `config.maxSize: number` - Maximum number of entries
- `config.maxAge: number` - Default expiration time in milliseconds
- `config.persistToLocalStorage: boolean` - Enable localStorage persistence
- `config.compressionEnabled: boolean` - Enable data compression

#### Methods

##### `set<T>(key: string, data: T, maxAge?: number): void`

Stores data in cache with optional custom expiration.

##### `get<T>(key: string): T | null`

Retrieves data from cache, returns null if not found or expired.

##### `has(key: string): boolean`

Checks if key exists in cache and is not expired.

##### `delete(key: string): boolean`

Removes entry from cache, returns true if entry existed.

##### `clear(): void`

Removes all entries from cache.

##### `getStats(): CacheStats`

Returns cache performance statistics.

##### `getCurrentSize(): number`

Returns current cache size in bytes.

##### `cleanup(): number`

Manually removes expired entries, returns number of entries removed.

---

## Hooks

### usePriceData

Main React hook for price data management.

#### Signature

```typescript
function usePriceData(options?: {
  autoRefresh?: boolean
  refreshInterval?: number
  useCache?: boolean
}): {
  historicalData: HistoricalDataPoint[]
  currentPrice: number | null
  isLoading: boolean
  error: Error | null
  refreshData: () => Promise<void>
  clearCache: () => void
}
```

#### Parameters

- `options.autoRefresh?: boolean` - Enable automatic data refresh (default: false)
- `options.refreshInterval?: number` - Refresh interval in milliseconds (default: 60000)
- `options.useCache?: boolean` - Use cached data when available (default: true)

#### Returns

- `historicalData: HistoricalDataPoint[]` - Historical price data
- `currentPrice: number | null` - Current Bitcoin price
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refreshData: () => Promise<void>` - Manual refresh function
- `clearCache: () => void` - Clear cache function

---

### useHistoricalData

Specialized hook for historical data management.

#### Signature

```typescript
function useHistoricalData(options?: {
  useCache?: boolean
  autoLoad?: boolean
}): {
  data: HistoricalDataPoint[]
  isLoading: boolean
  error: Error | null
  reload: () => Promise<void>
  stats: { totalPoints: number; dateRange: { start: string; end: string } }
}
```

---

### usePriceProjection

Hook for price projection generation and management.

#### Signature

```typescript
function usePriceProjection(): {
  projection: PriceChartDataPoint[] | null
  isGenerating: boolean
  error: Error | null
  generateProjection: (params: PriceEngineParams) => Promise<void>
  clearProjection: () => void
}
```

---

## Types

### Core Interfaces

#### `HistoricalDataPoint`

```typescript
interface HistoricalDataPoint {
  time: number        // Unix timestamp in seconds
  date: string        // YYYY-MM-DD format
  open: number        // Opening price in USD
  high: number        // Highest price in USD
  low: number         // Lowest price in USD
  close: number       // Closing price in USD
  volume?: number     // Optional volume data
  source?: string     // Data source identifier
}
```

#### `PriceChartDataPoint`

```typescript
interface PriceChartDataPoint {
  date: string                    // YYYY-MM-DD format
  days: number                    // Days since Bitcoin genesis
  historicalPrice?: number        // Historical price (if available)
  simulationPath?: number         // Projected price (if available)
  support?: number                // Power Law support line
  resistance?: number             // Power Law resistance line
  fit?: number                    // Power Law fit line
}
```

#### `PriceEngineParams`

```typescript
interface PriceEngineParams {
  priceModel: PriceModel                    // 'manual' | 'powerLaw' | 'cycleRepeat' | 'cycleRepeatPowerLaw'
  simulationMonths: number                  // Duration of simulation
  initialBtcPrice: number                   // Starting Bitcoin price
  annualGrowthRates?: number[]              // For manual model
  powerLawSettings?: {                      // For Power Law models
    prognosisLine: PowerLawLine             // 'fit' | 'support' | 'resistance'
  }
  historicalDailyMultipliers?: number[]     // For cycle repeat models
  historicalChannelPositions?: number[]     // For Power Law cycle repeat
}
```

#### `CurrentPriceData`

```typescript
interface CurrentPriceData {
  price: number           // Current price in USD
  timestamp: number       // Unix timestamp
  source: string          // Data source
  lastUpdated: string     // ISO date string
}
```

### Configuration Types

#### `CacheConfiguration`

```typescript
interface CacheConfiguration {
  maxSize: number                 // Maximum entries
  maxAge: number                  // Default expiration (ms)
  persistToLocalStorage: boolean  // Enable localStorage
  compressionEnabled: boolean     // Enable compression
}
```

#### `DataFetchOptions`

```typescript
interface DataFetchOptions {
  useCache?: boolean      // Use cached data
  maxAge?: number         // Max cache age (ms)
  preferLive?: boolean    // Prefer live data
}
```

### Statistics Types

#### `CacheStats`

```typescript
interface CacheStats {
  hitRate: number         // Cache hit rate percentage
  totalRequests: number   // Total cache requests
  cacheHits: number       // Successful cache hits
  cacheMisses: number     // Cache misses
  cacheSize: number       // Current cache size
  lastUpdated: Date       // Last update timestamp
}
```

---

## Utilities

### Data Transformers

#### `transformApiDataToHistorical(apiData: any[]): HistoricalDataPoint[]`

Transforms raw API data to standardized historical data format.

#### `convertHistoricalToChartData(data: HistoricalDataPoint[]): PriceChartDataPoint[]`

Converts historical data to chart-ready format.

#### `mergeHistoricalAndProjectionData(historical: HistoricalDataPoint[], projection: ProjectionPathPoint[]): PriceChartDataPoint[]`

Merges historical and projection data into unified chart format.

#### `calculatePriceStatistics(data: PriceChartDataPoint[]): PriceStatistics`

Calculates comprehensive price statistics.

#### `formatPrice(price: number, currency?: string): string`

Formats price for display with appropriate precision.

### Data Validators

#### `validateHistoricalData(data: any[]): boolean`

Validates historical data structure and content.

#### `validatePriceEngineParams(params: any): boolean`

Validates price engine parameters.

#### `cleanPriceData(data: any[]): HistoricalDataPoint[]`

Cleans and validates raw price data.

### Date Helpers

#### `getDaysSinceGenesis(date: Date): number`

Calculates days since Bitcoin genesis block (2009-01-03).

#### `formatDateForChart(date: Date): string`

Formats date for chart display.

#### `parseChartDate(dateString: string): Date`

Parses chart date string to Date object.

---

## Models

### Manual Growth Model

#### `generateManualPath(params: PriceEngineParams): ProjectionPathPoint[]`

Generates price projection based on user-defined annual growth rates.

### Power Law Model

#### `generatePowerLawPath(params: PriceEngineParams): ProjectionPathPoint[]`

Generates price projection using Bitcoin's Power Law model.

#### `getPowerLawPrice(date: Date, line: PowerLawLine): number`

Calculates Power Law price for specific date and line type.

#### `getDaysSinceGenesis(date: Date): number`

Utility function for Power Law calculations.

### Cycle Repeat Model

#### `generateCycleRepeatPath(params: PriceEngineParams): ProjectionPathPoint[]`

Generates projection by repeating historical price cycles.

### Cycle Repeat Power Law Model

#### `generateCycleRepeatPowerLawPath(params: PriceEngineParams): ProjectionPathPoint[]`

Generates projection by replaying historical channel positions within Power Law channel.

---

## Error Types

### `DataValidationError`

Thrown when data validation fails.

### `CacheError`

Thrown when cache operations fail.

### `ApiError`

Thrown when API requests fail.

### `ProjectionError`

Thrown when price projection generation fails.

---

## Constants

### `GENESIS_DATE`

Bitcoin genesis block date: `new Date("2009-01-03")`

### `POWER_LAW_MODELS`

Power Law model coefficients for fit, support, and resistance lines.

### `DEFAULT_CACHE_CONFIG`

Default cache configuration values.

---

## Events

The module emits events for monitoring and debugging:

- `data:loaded` - Historical data loaded
- `price:updated` - Current price updated
- `projection:generated` - Price projection generated
- `cache:hit` - Cache hit occurred
- `cache:miss` - Cache miss occurred
- `error:occurred` - Error occurred

Listen to events using the service's event emitter interface.
