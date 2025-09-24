# Price Data Module

A comprehensive Bitcoin price data management module providing unified access to historical data, current prices, and price projections.

## Overview

The Price Data Module consolidates functionality from `lib/price-engine/` into a clean, modular architecture with:

- **Unified Data Access**: Single interface for all price-related data
- **Advanced Caching**: Multi-layer caching with memory and localStorage persistence
- **Price Projections**: Multiple mathematical models for Bitcoin price forecasting
- **React Integration**: Custom hooks for seamless React state management
- **Performance Monitoring**: Built-in metrics and performance tracking
- **Type Safety**: Comprehensive TypeScript interfaces

## Architecture

```
src/modules/price-data/
├── types/              # TypeScript interfaces and type definitions
├── services/           # Core business logic services
├── hooks/              # React hooks for state management
├── utils/              # Utility functions and helpers
├── models/             # Price projection models
├── __tests__/          # Comprehensive test suite
└── index.ts            # Main module exports
```

## Quick Start

### Basic Usage

```typescript
import { priceDataService } from '@/src/modules/price-data'

// Load historical data
const historicalData = await priceDataService.loadHistoricalData()

// Get current Bitcoin price
const currentPrice = await priceDataService.getCurrentPrice()

// Generate price projection
const projection = await priceDataService.generatePriceProjection({
  priceModel: 'manual',
  simulationMonths: 12,
  initialBtcPrice: 50000,
  annualGrowthRates: [10, 15, 20]
})
```

### React Integration

```typescript
import { usePriceData } from '@/src/modules/price-data'

function PriceChart() {
  const { 
    historicalData, 
    currentPrice, 
    isLoading, 
    error 
  } = usePriceData()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Current Price: ${currentPrice}</h2>
      <p>Historical Data Points: {historicalData.length}</p>
    </div>
  )
}
```

## Core Services

### PriceDataService

Main service providing unified access to all price data functionality.

```typescript
// Singleton pattern - always use getInstance()
const service = PriceDataService.getInstance()

// Load historical data with caching
const data = await service.loadHistoricalData({ useCache: true })

// Get current price with live preference
const price = await service.getCurrentPrice({ preferLive: true })

// Generate price projections
const projection = await service.generatePriceProjection(params, historicalData)
```

### DataCache

High-performance caching service with automatic cleanup and statistics.

```typescript
import { DataCache } from '@/src/modules/price-data'

const cache = new DataCache({
  maxSize: 100,
  maxAge: 60000, // 1 minute
  persistToLocalStorage: true
})

// Store data
cache.set('key', data, 30000) // Custom 30s expiration

// Retrieve data
const cachedData = cache.get('key')

// Get cache statistics
const stats = cache.getStats()
console.log(`Hit rate: ${stats.hitRate}%`)
```

## Price Projection Models

### Manual Growth Model

User-defined annual growth rates with compound monthly calculations.

```typescript
const params = {
  priceModel: 'manual',
  simulationMonths: 24,
  initialBtcPrice: 50000,
  annualGrowthRates: [10, 15, 20, 25, 30]
}

const projection = await service.generatePriceProjection(params)
```

### Power Law Model

Mathematical model based on Bitcoin's historical power law relationship.

```typescript
const params = {
  priceModel: 'powerLaw',
  simulationMonths: 12,
  powerLawSettings: {
    prognosisLine: 'fit' // 'fit', 'support', or 'resistance'
  }
}

const projection = await service.generatePriceProjection(params)
```

### Cycle Repeat Models

Models that replay historical price patterns.

```typescript
// Basic cycle repeat
const cycleParams = {
  priceModel: 'cycleRepeat',
  simulationMonths: 18,
  historicalDailyMultipliers: [1.001, 1.002, 0.999, ...] // Daily multipliers
}

// Cycle repeat with Power Law channel
const powerLawCycleParams = {
  priceModel: 'cycleRepeatPowerLaw',
  simulationMonths: 18,
  historicalChannelPositions: [0.3, 0.5, 0.7, ...] // Channel positions (0-1)
}
```

## React Hooks

### usePriceData

Main hook for price data management.

```typescript
const {
  historicalData,
  currentPrice,
  isLoading,
  error,
  refreshData,
  clearCache
} = usePriceData({
  autoRefresh: true,
  refreshInterval: 60000, // 1 minute
  useCache: true
})
```

### useHistoricalData

Specialized hook for historical data management.

```typescript
const {
  data,
  isLoading,
  error,
  reload,
  stats
} = useHistoricalData({
  useCache: true,
  autoLoad: true
})
```

### usePriceProjection

Hook for price projection generation and management.

```typescript
const {
  projection,
  isGenerating,
  error,
  generateProjection,
  clearProjection
} = usePriceProjection()

// Generate projection
await generateProjection({
  priceModel: 'manual',
  simulationMonths: 12,
  annualGrowthRates: [15, 20, 25]
})
```

## Utility Functions

### Data Transformers

```typescript
import { 
  convertHistoricalToChartData,
  mergeHistoricalAndProjectionData,
  calculatePriceStatistics,
  formatPrice
} from '@/src/modules/price-data'

// Convert to chart format
const chartData = convertHistoricalToChartData(historicalData)

// Merge historical and projection data
const mergedData = mergeHistoricalAndProjectionData(historical, projection)

// Calculate statistics
const stats = calculatePriceStatistics(chartData)

// Format prices
const formatted = formatPrice(50000) // "$50.0K"
```

### Data Validators

```typescript
import { 
  validateHistoricalData,
  validatePriceEngineParams,
  cleanPriceData
} from '@/src/modules/price-data'

// Validate data
const isValid = validateHistoricalData(data)

// Validate parameters
const paramsValid = validatePriceEngineParams(params)

// Clean and validate data
const cleanData = cleanPriceData(rawData)
```

## Performance Monitoring

Built-in performance monitoring with detailed metrics.

```typescript
// Get performance metrics
const metrics = service.getPerformanceMetrics()

console.log('Cache efficiency:', metrics.cacheEfficiency)
console.log('Average load time:', metrics.averageLoadTime)
console.log('Success rate:', metrics.successRate)

// Performance monitor is automatically used by all services
// Metrics are collected for:
// - Data loading operations
// - Cache hit/miss rates
// - API response times
// - Projection generation times
```

## Error Handling

Comprehensive error handling with specific error types.

```typescript
try {
  const data = await service.loadHistoricalData()
} catch (error) {
  if (error instanceof DataValidationError) {
    console.error('Data validation failed:', error.message)
  } else if (error instanceof CacheError) {
    console.error('Cache operation failed:', error.message)
  } else if (error instanceof ApiError) {
    console.error('API request failed:', error.message)
  } else {
    console.error('Unknown error:', error.message)
  }
}
```

## Configuration

### Cache Configuration

```typescript
const cacheConfig = {
  maxSize: 100,           // Maximum number of entries
  maxAge: 300000,         // 5 minutes in milliseconds
  persistToLocalStorage: true,
  compressionEnabled: false
}
```

### Service Configuration

```typescript
// Services are configured through environment variables
// or can be configured programmatically:

service.configure({
  cacheEnabled: true,
  performanceMonitoring: true,
  logLevel: 'info'
})
```

## Testing

Comprehensive test suite with high coverage.

```bash
# Run all price data module tests
npm test src/modules/price-data

# Run specific test files
npm test src/modules/price-data/__tests__/PriceDataService.test.ts
npm test src/modules/price-data/__tests__/DataCache.test.ts
```

### Test Utilities

```typescript
import { 
  generateMockHistoricalData,
  createTestEnvironment,
  assertDataStructure
} from '@/src/modules/price-data/__tests__/helpers'

// Generate test data
const mockData = generateMockHistoricalData(100)

// Create test environment with mocks
const testEnv = createTestEnvironment()

// Assert data structure
assertDataStructure(data, ['time', 'date', 'close'])
```

## Migration Notes

This module replaces functionality from:

- `lib/price-engine/index.ts` → `PriceDataService`
- `lib/price-engine/historical-data-loader.ts` → `loadHistoricalData()`
- `lib/price-engine/models/` → `src/modules/price-data/models/`
- `lib/price-engine/types.ts` → `src/modules/price-data/types/`

### Breaking Changes

- Import paths have changed from `@/lib/price-engine/*` to `@/src/modules/price-data`
- Some function signatures have been updated for consistency
- Caching behavior is now more explicit with options parameters

### Compatibility

The module maintains backward compatibility where possible and provides migration utilities for smooth transitions.

## Contributing

When contributing to this module:

1. **Follow the modular architecture** - keep services, hooks, and utilities separate
2. **Write comprehensive tests** - aim for 90%+ coverage
3. **Update documentation** - keep README and inline docs current
4. **Use TypeScript strictly** - no `any` types without justification
5. **Monitor performance** - use built-in performance monitoring

## License

This module is part of the Bitcoin Simulation Tool and follows the same license terms.
