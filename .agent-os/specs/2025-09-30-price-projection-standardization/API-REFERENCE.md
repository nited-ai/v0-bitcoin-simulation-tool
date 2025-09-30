# Price Projection API Reference

**Version**: 2.0 (Post-Standardization)  
**Date**: 2025-09-30  
**Status**: Current

---

## 📦 Core Types

### PriceProjectionResult

The standard format for all price projections.

**Location**: `@/app/simulation/price-models/types`

```typescript
interface PriceProjectionResult {
  modelName: string          // e.g., "manual", "powerLaw", "cycleRepeat"
  modelVersion: string       // e.g., "1.0.0"
  projectionPoints: ProjectionPoint[]
  metadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    confidence: number
    generatedAt: string
    [key: string]: any       // Model-specific metadata
  }
}
```

**Example**:
```typescript
const projection: PriceProjectionResult = {
  modelName: "manual",
  modelVersion: "1.0.0",
  projectionPoints: [
    { timestamp: 1704067200000, price: 50000, confidence: 0.95 },
    { timestamp: 1706745600000, price: 52500, confidence: 0.93 }
  ],
  metadata: {
    totalMonths: 12,
    totalGrowth: 20,
    averageMonthlyGrowth: 1.67,
    confidence: 0.95,
    generatedAt: "2025-09-30T12:00:00Z"
  }
}
```

---

### ProjectionPoint

Individual data point in a price projection.

```typescript
interface ProjectionPoint {
  timestamp: number          // Unix timestamp in milliseconds
  price: number             // BTC price in USD
  support?: number          // Support line price (optional)
  resistance?: number       // Resistance line price (optional)
  confidence: number        // Confidence level (0-1)
  metadata?: Record<string, any>  // Point-specific metadata
}
```

---

### PriceProjectionModel

Interface that all price models must implement.

```typescript
interface PriceProjectionModel {
  readonly name: string
  readonly version: string
  readonly description: string
  
  generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult>
  
  validateParams(params: PriceModelParams): boolean
  getDefaultParams(): Record<string, any>
}
```

---

## 🔧 Services

### UnifiedPriceProjectionService

Central service for generating price projections in standard format.

**Location**: `@/src/modules/shared`

#### Methods

##### `generateProjection()`

Generate a price projection using a specific model.

```typescript
async generateProjection(
  modelId: string,
  historicalData: HistoricalDataPoint[],
  params: PriceModelParams
): Promise<PriceProjectionResult>
```

**Parameters**:
- `modelId`: Model identifier ("manual", "powerLaw", "cycleRepeat", "enhancedCycleRepeat")
- `historicalData`: Array of historical price data points
- `params`: Model-specific parameters

**Returns**: `PriceProjectionResult` in standard format

**Example**:
```typescript
import { unifiedPriceProjectionService } from '@/src/modules/shared'

const projection = await unifiedPriceProjectionService.generateProjection(
  'manual',
  historicalData,
  {
    startPrice: 50000,
    projectionMonths: 12,
    modelSpecificParams: { growthRates: [10, 15, 20] }
  }
)
```

---

##### `generateProjectionFromLegacyParams()`

Generate projection from legacy parameter format (for backward compatibility).

```typescript
async generateProjectionFromLegacyParams(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[]
): Promise<PriceProjectionResult>
```

**Parameters**:
- `params`: Legacy parameter format
- `historicalData`: Array of historical price data points

**Returns**: `PriceProjectionResult` in standard format

**Example**:
```typescript
const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
  {
    priceModel: 'manual',
    simulationMonths: 12,
    initialBtcPrice: 50000,
    annualGrowthRates: [10, 15, 20]
  },
  historicalData
)
```

---

### PriceProjectionAdapter

Utility class for format conversions and data transformations.

**Location**: `@/src/modules/shared`

#### Methods

##### `toLegacyFormat()`

Convert standard format to legacy `PriceChartDataPoint[]` format.

**⚠️ DEPRECATED**: For internal use only (PriceDataService backward compatibility).

```typescript
static toLegacyFormat(
  projection: PriceProjectionResult,
  historicalData?: HistoricalDataPoint[]
): PriceChartDataPoint[]
```

**Example**:
```typescript
// Only use if you absolutely need legacy format
const legacyFormat = PriceProjectionAdapter.toLegacyFormat(projection)
```

---

##### `toStrategyFormat()`

Convert projection to format suitable for strategy execution.

```typescript
static toStrategyFormat(
  projection: PriceProjectionResult
): StrategyPriceData
```

**Example**:
```typescript
const strategyData = PriceProjectionAdapter.toStrategyFormat(projection)
```

---

##### `toResultsFormat()`

Convert projection to format suitable for results visualization.

```typescript
static toResultsFormat(
  projection: PriceProjectionResult
): ResultsPriceData
```

**Example**:
```typescript
const resultsData = PriceProjectionAdapter.toResultsFormat(projection)
```

---

##### `validate()`

Validate a price projection result.

```typescript
static validate(
  projection: PriceProjectionResult
): { valid: boolean; errors: string[] }
```

**Example**:
```typescript
const validation = PriceProjectionAdapter.validate(projection)
if (!validation.valid) {
  console.error('Validation errors:', validation.errors)
}
```

---

## 🎣 Hooks

### useSimulation()

Access simulation context including price projection.

**Location**: `@/app/simulation/context/SimulationContext`

```typescript
const {
  priceProjection,      // PriceProjectionResult | null
  setPriceProjection,   // (projection: PriceProjectionResult | null) => void
  // ... other context fields
} = useSimulation()
```

**Example**:
```typescript
import { useSimulation } from '@/app/simulation/context/SimulationContext'

function MyComponent() {
  const { priceProjection, setPriceProjection } = useSimulation()
  
  if (!priceProjection) {
    return <div>Loading projection...</div>
  }
  
  return (
    <div>
      <h2>{priceProjection.modelName} Projection</h2>
      <p>Total Growth: {priceProjection.metadata.totalGrowth}%</p>
    </div>
  )
}
```

---

### usePriceGeneration()

Hook for generating price projections.

**Location**: `@/app/simulation/hooks/usePriceGeneration`

```typescript
usePriceGeneration(enabled: boolean = false)
```

**Example**:
```typescript
import { usePriceGeneration } from '@/app/simulation/hooks/usePriceGeneration'

function PriceProjectionTab() {
  // Enable price generation for this component
  usePriceGeneration(true)
  
  const { priceProjection } = useSimulation()
  // ... use priceProjection
}
```

---

## 🔄 Type Guards

### isNewPriceProjectionResult()

Check if an object is a valid `PriceProjectionResult`.

**Location**: `@/src/modules/shared`

```typescript
function isNewPriceProjectionResult(
  projection: any
): projection is PriceProjectionResult
```

**Example**:
```typescript
import { isNewPriceProjectionResult } from '@/src/modules/shared'

if (isNewPriceProjectionResult(data)) {
  // TypeScript knows data is PriceProjectionResult
  console.log(data.modelName)
}
```

---

## ⚠️ Deprecated APIs

### PriceDataService.generatePriceProjection()

**Status**: Deprecated  
**Replacement**: Use `UnifiedPriceProjectionService.generateProjectionFromLegacyParams()`

```typescript
// ❌ Old (deprecated)
const chartData = await priceDataService.generatePriceProjection(params)

// ✅ New (recommended)
const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
  params,
  historicalData
)
```

---

### SimulationContext.priceChartData

**Status**: Deprecated  
**Replacement**: Use `priceProjection`

```typescript
// ❌ Old (deprecated)
const { priceChartData } = useSimulation()

// ✅ New (recommended)
const { priceProjection } = useSimulation()
```

---

### SimulationContext.setPriceChartData()

**Status**: Deprecated  
**Replacement**: Use `setPriceProjection()`

```typescript
// ❌ Old (deprecated)
setPriceChartData(chartData)

// ✅ New (recommended)
setPriceProjection(projection)
```

---

## 📊 Migration Helpers

### validateNewFormat()

Validate that a projection conforms to the new standard format.

**Location**: `@/src/modules/shared`

```typescript
function validateNewFormat(
  projection: any
): { valid: boolean; errors: string[] }
```

---

### detectFormat()

Detect which format a projection is in.

**Location**: `@/src/modules/shared`

```typescript
function detectFormat(
  projection: any
): 'new' | 'old' | 'legacy' | 'unknown'
```

---

## 🎯 Best Practices

### 1. Always Use Standard Format

```typescript
// ✅ Good
import type { PriceProjectionResult } from '@/app/simulation/price-models/types'

// ❌ Bad
import type { PriceProjectionResult } from '@/src/modules/price-projection/types'
```

### 2. Use UnifiedPriceProjectionService

```typescript
// ✅ Good
const projection = await unifiedPriceProjectionService.generateProjection(...)

// ❌ Bad
const chartData = await priceDataService.generatePriceProjection(...)
```

### 3. Access Projection from Context

```typescript
// ✅ Good
const { priceProjection } = useSimulation()

// ❌ Bad
const { priceChartData } = useSimulation()
```

### 4. Validate Projections

```typescript
// ✅ Good
const validation = PriceProjectionAdapter.validate(projection)
if (!validation.valid) {
  console.error('Invalid projection:', validation.errors)
}
```

---

## 🔗 Related Documentation

- **Type Definitions**: `app/simulation/price-models/types.ts`
- **Service Implementation**: `src/modules/shared/services/UnifiedPriceProjectionService.ts`
- **Adapter Implementation**: `src/modules/shared/adapters/PriceProjectionAdapter.ts`
- **Context Implementation**: `app/simulation/context/SimulationContext.tsx`
- **Migration Guide**: `WHAT-CHANGED.md`
- **Metrics Report**: `METRICS-REPORT.md`

---

## 📝 Version History

### Version 2.0 (2025-09-30)
- Standardized on single `PriceProjectionResult` format
- Removed duplicate type definitions
- Deprecated legacy APIs
- Added comprehensive validation

### Version 1.0 (Previous)
- Multiple incompatible formats
- Scattered type definitions
- No standardization

---

## ✅ Quick Reference

| Task | API |
|------|-----|
| Import types | `@/app/simulation/price-models/types` |
| Generate projection | `unifiedPriceProjectionService.generateProjection()` |
| Access projection | `useSimulation().priceProjection` |
| Validate projection | `PriceProjectionAdapter.validate()` |
| Convert format | `PriceProjectionAdapter.toStrategyFormat()` |
| Check type | `isNewPriceProjectionResult()` |

---

**Last Updated**: 2025-09-30  
**Maintained By**: Bitcoin Simulation Tool Team

