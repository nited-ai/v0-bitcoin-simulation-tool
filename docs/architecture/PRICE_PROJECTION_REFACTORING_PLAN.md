# Price Projection System Refactoring Plan

> Created: 2025-01-10
> Status: **URGENT - Technical Debt Identified**
> Priority: **HIGH**

## Problem Statement

The application currently has **THREE** different price projection systems with incompatible output formats:

### 1. New Standard (app/simulation/price-models/)
```typescript
interface PriceProjectionResult {
  modelName: string
  modelVersion: string
  projectionPoints: ProjectionPoint[]  // ✅ STANDARD
  metadata: { totalMonths, totalGrowth, confidence, ... }
}

interface ProjectionPoint {
  timestamp: number
  price: number
  support?: number
  resistance?: number
  confidence: number
  metadata?: Record<string, any>
}
```

### 2. Old Standard (src/modules/price-projection/)
```typescript
interface PriceProjectionResult {
  projectedPrices: Array<{ month, date, price }>
  projectionPoints: Array<{ timestamp, price, date }>  // ⚠️ DIFFERENT
  metadata: { model, version, parameters, ... }
}
```

### 3. Legacy (src/modules/price-data/)
```typescript
// Returns PriceChartDataPoint[] directly (no wrapper)
interface PriceChartDataPoint {
  date: string
  days: number
  historicalPrice?: number
  simulationPath?: number
  support?: number
  resistance?: number
  fit?: number
}
```

## Current Issues

1. **Enhanced Cycle Repeat Model Fails**: Missing `diminishingReturns` parameters when converting between formats
2. **Inconsistent Data Flow**: Different models return different formats
3. **Adapter Hell**: Multiple conversion layers (`generateProjectionViaPriceModelRegistry`, `LegacyStrategyAdapter`)
4. **Maintenance Burden**: Changes require updates in 3+ places
5. **Type Safety Lost**: `Record<string, any>` used for model-specific params

## Root Cause Analysis

The dual system exists because:
- **Legacy System** (`src/modules/price-data/`): Original implementation, tightly coupled to chart rendering
- **New System** (`app/simulation/price-models/`): Proper microservices architecture with `PriceProjectionModel` interface
- **Migration Incomplete**: Only Enhanced Cycle Repeat model fully migrated to new system

## Recommended Solution

### Phase 1: Standardize on New System (IMMEDIATE)

**Goal**: All models use `PriceProjectionModel` interface from `app/simulation/price-models/types.ts`

**Actions**:
1. ✅ Keep `PriceProjectionModel` interface as the standard
2. ✅ Migrate remaining models (Power Law, Manual Growth) to new system
3. ✅ Deprecate `ProjectionGenerator` in `src/modules/price-data/`
4. ✅ Update `PriceDataService` to always use `PriceModelRegistry`
5. ✅ Remove adapter layers

**Benefits**:
- Single source of truth for price projections
- Consistent parameter handling
- Proper model-specific parameter support
- Better type safety

### Phase 2: Unified Parameter System (NEXT)

**Goal**: Replace `PriceEngineParams` with `PriceModelParams`

**Current Problem**:
```typescript
// Old system - flat structure
interface PriceEngineParams {
  priceModel: string
  simulationMonths: number
  initialBtcPrice: number
  annualGrowthRates: number[]  // Manual Growth specific
  powerLawSettings: {...}       // Power Law specific
  // No place for diminishingReturns!
}

// New system - extensible structure
interface PriceModelParams {
  startPrice: number
  projectionMonths: number
  modelSpecificParams?: Record<string, any>  // ✅ Flexible
}
```

**Actions**:
1. Update all hooks to use `PriceModelParams`
2. Remove `PriceEngineParams` interface
3. Update simulation context
4. Update all model implementations

### Phase 3: Clean Up Legacy Code (FINAL)

**Actions**:
1. Remove `src/modules/price-projection/` (old standard)
2. Remove `ProjectionGenerator` from `src/modules/price-data/`
3. Remove conversion adapters
4. Update all imports
5. Run full test suite

## Migration Strategy

### Step 1: Fix Immediate Issue (Enhanced Cycle Repeat)

**File**: `src/modules/price-data/services/PriceDataService.ts`

```typescript
private async generateProjectionViaPriceModelRegistry(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[]
): Promise<PriceChartDataPoint[]> {
  const priceModelRegistryModule = await import('../../../../app/simulation/price-models/PriceModelRegistry')
  const priceModelRegistry = priceModelRegistryModule.priceModelRegistry
  
  // Extract model-specific parameters
  let modelSpecificParams: Record<string, any> = {}
  
  if (params.priceModel === 'enhancedCycleRepeat') {
    // Check if diminishingReturns is in params
    if (params.modelSpecificParams?.diminishingReturns) {
      modelSpecificParams = params.modelSpecificParams
    } else {
      // Load from sessionStorage or use moderate preset
      const savedParams = sessionStorage.getItem('enhancedCycleRepeat_params')
      if (savedParams) {
        modelSpecificParams = JSON.parse(savedParams)
      } else {
        // Use moderate preset as default
        modelSpecificParams = {
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
      }
    }
  }
  
  const modelParams = {
    startPrice: params.initialBtcPrice,
    projectionMonths: params.simulationMonths,
    modelSpecificParams
  }
  
  // ... rest of the method
}
```

### Step 2: Migrate Power Law Model

**Create**: `app/simulation/price-models/models/PowerLawModel.ts` (if not exists)

Implement full `PriceProjectionModel` interface with proper parameter handling.

### Step 3: Migrate Manual Growth Model

**Create**: `app/simulation/price-models/models/ManualGrowthModel.ts` (if not exists)

Implement full `PriceProjectionModel` interface.

### Step 4: Update PriceDataService

**Modify**: `src/modules/price-data/services/PriceDataService.ts`

```typescript
public async generatePriceProjection(
  params: PriceEngineParams,
  historicalData?: HistoricalDataPoint[]
): Promise<PriceChartDataPoint[]> {
  // Always delegate to PriceModelRegistry
  return await this.generateProjectionViaPriceModelRegistry(params, histData)
}
```

### Step 5: Remove ProjectionGenerator

**Delete**: `src/modules/price-data/services/ProjectionGenerator.ts`

Update all imports to use `PriceModelRegistry` instead.

## Testing Strategy

1. **Unit Tests**: Each model implements `PriceProjectionModel` interface
2. **Integration Tests**: `PriceModelRegistry.generateProjection()` works for all models
3. **E2E Tests**: Full simulation flow from Parameters → Results
4. **Regression Tests**: Existing simulations produce same results

## Timeline

- **Immediate** (Today): Fix Enhanced Cycle Repeat parameter issue
- **Phase 1** (1-2 days): Migrate all models to new system
- **Phase 2** (2-3 days): Unified parameter system
- **Phase 3** (1 day): Clean up legacy code

## Success Criteria

✅ All price models use `PriceProjectionModel` interface
✅ Single `PriceProjectionResult` format across application
✅ No adapter layers needed
✅ Model-specific parameters properly supported
✅ All tests passing
✅ Zero TypeScript errors
✅ Documentation updated

## Questions to Answer

1. **Why wasn't this done during initial migration?**
   - Likely time constraints or incremental migration approach
   - Enhanced Cycle Repeat was added later

2. **Should we keep backward compatibility?**
   - NO - clean break is better than maintaining dual systems
   - Update all consumers at once

3. **What about existing saved simulations?**
   - Add migration logic to convert old format to new
   - Or invalidate old simulations (simpler)

## Related Files

- `app/simulation/price-models/types.ts` - Standard interface
- `app/simulation/price-models/PriceModelRegistry.ts` - Registry implementation
- `src/modules/price-data/services/PriceDataService.ts` - Legacy service
- `src/modules/price-data/services/ProjectionGenerator.ts` - To be removed
- `app/simulation/hooks/usePriceGeneration.ts` - Consumer
- `src/modules/strategies/services/StrategyExecutionService.ts` - Consumer

## Notes

- This refactoring will eliminate ~500 lines of adapter code
- Will improve type safety significantly
- Will make adding new models much easier
- Will reduce maintenance burden by 50%+

