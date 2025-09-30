# Price Projection Usage Examples

This document provides practical examples for using the standardized price projection system.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Strategy Integration](#strategy-integration)
3. [Results Integration](#results-integration)
4. [Legacy Migration](#legacy-migration)
5. [Advanced Usage](#advanced-usage)

## Basic Usage

### Generate a Price Projection

```typescript
import { unifiedPriceProjectionService } from '@/src/modules/shared'
import type { PriceProjectionResult } from '@/src/modules/shared'

// Load historical data
const historicalData = await loadHistoricalData()

// Generate projection
const projection: PriceProjectionResult = await unifiedPriceProjectionService.generateProjection(
  'enhancedCycleRepeat',
  {
    startPrice: 113346,
    projectionMonths: 144,
    modelSpecificParams: {
      diminishingReturns: {
        diminishingFactor: 0.25,
        maturityThreshold: 2_000_000_000_000,
        cycleDegradation: 0.15,
        adoptionCurveType: 'sigmoid',
        institutionalSaturation: 0.4,
        regulatoryMaturity: 0.5,
        liquidityConstraint: 0.4,
        competitionFactor: 0.3
      }
    }
  },
  historicalData
)

console.log(`Generated ${projection.projectionPoints.length} projection points`)
console.log(`Total growth: ${projection.metadata.totalGrowth.toFixed(2)}%`)
```

### Access Projection Data

```typescript
// Get first and last prices
const startPrice = projection.projectionPoints[0].price
const endPrice = projection.projectionPoints[projection.projectionPoints.length - 1].price

// Iterate through projection points
projection.projectionPoints.forEach((point, index) => {
  console.log(`Month ${index}: $${point.price.toFixed(2)}`)
  if (point.support) {
    console.log(`  Support: $${point.support.toFixed(2)}`)
  }
  if (point.resistance) {
    console.log(`  Resistance: $${point.resistance.toFixed(2)}`)
  }
})

// Get metadata
console.log('Projection Metadata:', {
  model: projection.modelName,
  version: projection.modelVersion,
  months: projection.metadata.totalMonths,
  avgGrowth: projection.metadata.averageMonthlyGrowth,
  confidence: projection.metadata.confidence
})
```

## Strategy Integration

### Use Projection in Strategy Execution

```typescript
import { PriceProjectionAdapter } from '@/src/modules/shared'
import { StrategyExecutionService } from '@/src/modules/strategies'

// Generate projection
const projection = await unifiedPriceProjectionService.generateProjection(
  'powerLaw',
  params,
  historicalData
)

// Convert to strategy format
const strategyData = PriceProjectionAdapter.toStrategyFormat(projection, 'price')

// Execute strategy
const strategyService = new StrategyExecutionService()
const result = await strategyService.executeStrategy(
  strategy,
  strategyParams,
  projection // Service handles format automatically
)
```

### Get Price at Specific Month

```typescript
import { PriceProjectionAdapter } from '@/src/modules/shared'

// Get price at month 12 (1 year)
const priceAtYear1 = PriceProjectionAdapter.getPriceAtMonth(projection, 12, 30)

// Get price at month 60 (5 years)
const priceAtYear5 = PriceProjectionAdapter.getPriceAtMonth(projection, 60, 30)

console.log(`Price after 1 year: $${priceAtYear1.toFixed(2)}`)
console.log(`Price after 5 years: $${priceAtYear5.toFixed(2)}`)
```

### Select Different Price Lines

```typescript
// Use main price line (default)
const mainPriceData = PriceProjectionAdapter.toStrategyFormat(projection, 'price')

// Use support line (conservative)
const supportPriceData = PriceProjectionAdapter.toStrategyFormat(projection, 'support')

// Use resistance line (optimistic)
const resistancePriceData = PriceProjectionAdapter.toStrategyFormat(projection, 'resistance')
```

## Results Integration

### Convert for Results Analysis

```typescript
import { PriceProjectionAdapter } from '@/src/modules/shared'

// Convert to results format with analytics
const resultsData = PriceProjectionAdapter.toResultsFormat(projection)

// Access analytics
console.log('Results Analytics:', {
  totalGrowth: resultsData.analytics.totalGrowth,
  avgMonthlyGrowth: resultsData.analytics.averageMonthlyGrowth,
  maxDecline: resultsData.analytics.maxDecline,
  volatility: resultsData.analytics.volatility
})

// Use in charts
const chartData = resultsData.pricePoints.map(point => ({
  date: point.date,
  price: point.price,
  support: point.support,
  resistance: point.resistance
}))
```

## Legacy Migration

### Convert from Old Format

```typescript
import { 
  PriceProjectionAdapter, 
  isOldPriceProjectionResult 
} from '@/src/modules/shared'

// Check format and convert if needed
let standardProjection: PriceProjectionResult

if (isOldPriceProjectionResult(projection)) {
  console.log('Converting from old format...')
  standardProjection = PriceProjectionAdapter.fromOldFormat(projection)
} else {
  standardProjection = projection
}

// Now use standardized format
const strategyData = PriceProjectionAdapter.toStrategyFormat(standardProjection)
```

### Convert from Legacy PriceChartDataPoint[]

```typescript
import { PriceProjectionAdapter } from '@/src/modules/shared'

// Legacy format (array of chart points)
const legacyChartData: PriceChartDataPoint[] = [
  { date: '2024-01-01', days: 0, price: 100000, ... },
  { date: '2024-01-02', days: 1, price: 101000, ... },
  // ...
]

// Convert to standard format
const standardProjection = PriceProjectionAdapter.fromLegacyFormat(
  legacyChartData,
  'Manual Growth',
  historicalData
)

// Now use standardized format
console.log(`Converted ${standardProjection.projectionPoints.length} points`)
```

### Generate from Legacy Params

```typescript
import { unifiedPriceProjectionService } from '@/src/modules/shared'
import type { PriceEngineParams } from '@/src/modules/price-data/types'

// Legacy parameter format
const legacyParams: PriceEngineParams = {
  priceModel: 'manual',
  simulationMonths: 144,
  initialBtcPrice: 113346,
  annualGrowthRates: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]
}

// Generate using legacy params (automatically converted)
const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
  legacyParams,
  historicalData
)
```

## Advanced Usage

### Validate Projection Data

```typescript
import { PriceProjectionAdapter } from '@/src/modules/shared'

// Validate projection
const validation = PriceProjectionAdapter.validate(projection)

if (!validation.valid) {
  console.error('Invalid projection:', validation.errors)
  validation.errors.forEach(error => {
    console.error(`  - ${error}`)
  })
} else {
  console.log('✅ Projection is valid')
}
```

### Convert to Legacy Format (for backward compatibility)

```typescript
import { PriceProjectionAdapter } from '@/src/modules/shared'

// Convert standard format back to legacy format
const legacyChartData = PriceProjectionAdapter.toLegacyFormat(
  projection,
  historicalData
)

// Use with legacy components
renderLegacyChart(legacyChartData)
```

### Check Model Availability

```typescript
import { unifiedPriceProjectionService } from '@/src/modules/shared'

// List all available models
const models = unifiedPriceProjectionService.getAvailableModels()
console.log('Available models:', models)

// Check specific model
const isAvailable = unifiedPriceProjectionService.isModelAvailable('enhancedCycleRepeat')
console.log('Enhanced Cycle Repeat available:', isAvailable)

// Get model info
const modelInfo = unifiedPriceProjectionService.getModelInfo('powerLaw')
if (modelInfo) {
  console.log('Model Info:', {
    name: modelInfo.name,
    version: modelInfo.version,
    description: modelInfo.description
  })
}
```

### Custom Model-Specific Parameters

```typescript
// Manual Growth Model
const manualProjection = await unifiedPriceProjectionService.generateProjection(
  'manual',
  {
    startPrice: 113346,
    projectionMonths: 144,
    modelSpecificParams: {
      annualGrowthRates: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]
    }
  },
  historicalData
)

// Power Law Model
const powerLawProjection = await unifiedPriceProjectionService.generateProjection(
  'powerLaw',
  {
    startPrice: 113346,
    projectionMonths: 144,
    modelSpecificParams: {
      prognosisLine: 'fit' // 'fit', 'support', or 'resistance'
    }
  },
  historicalData
)

// Enhanced Cycle Repeat Model
const enhancedProjection = await unifiedPriceProjectionService.generateProjection(
  'enhancedCycleRepeat',
  {
    startPrice: 113346,
    projectionMonths: 144,
    modelSpecificParams: {
      diminishingReturns: {
        diminishingFactor: 0.25,
        maturityThreshold: 2_000_000_000_000,
        cycleDegradation: 0.15,
        adoptionCurveType: 'sigmoid',
        institutionalSaturation: 0.4,
        regulatoryMaturity: 0.5,
        liquidityConstraint: 0.4,
        competitionFactor: 0.3
      }
    }
  },
  historicalData
)
```

## React Hook Usage

### Custom Hook Example

```typescript
import { useState, useCallback } from 'react'
import { unifiedPriceProjectionService } from '@/src/modules/shared'
import type { PriceProjectionResult } from '@/src/modules/shared'

export function usePriceProjection() {
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const generateProjection = useCallback(async (
    modelId: string,
    params: PriceModelParams,
    historicalData: HistoricalDataPoint[]
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await unifiedPriceProjectionService.generateProjection(
        modelId,
        params,
        historicalData
      )
      setProjection(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate projection')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  return { projection, isLoading, error, generateProjection }
}
```

## Best Practices

1. **Always use the unified service** for new code
2. **Validate projections** before using them
3. **Use type guards** when dealing with mixed formats
4. **Convert early** - standardize format as soon as possible
5. **Document model-specific parameters** in your code
6. **Handle errors gracefully** - projection generation can fail
7. **Cache projections** when appropriate (they're expensive to generate)
8. **Use adapters** for format conversion, don't write custom converters

## Common Pitfalls

### ❌ Don't: Access projection points directly without validation
```typescript
const price = projection.projectionPoints[month * 30].price // May be undefined!
```

### ✅ Do: Use the adapter's safe accessor
```typescript
const price = PriceProjectionAdapter.getPriceAtMonth(projection, month, 30)
```

### ❌ Don't: Mix old and new types
```typescript
import type { PriceProjectionResult } from '@/src/modules/price-projection/types' // Old
```

### ✅ Do: Use the standard type
```typescript
import type { PriceProjectionResult } from '@/src/modules/shared' // New standard
```

### ❌ Don't: Write custom format converters
```typescript
const converted = projection.projectionPoints.map(p => ({ /* custom logic */ }))
```

### ✅ Do: Use the provided adapters
```typescript
const converted = PriceProjectionAdapter.toStrategyFormat(projection)
```

