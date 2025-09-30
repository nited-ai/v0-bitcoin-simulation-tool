# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-30-price-projection-standardization/spec.md

> Created: 2025-09-30  
> Version: 1.0.0

## Technical Requirements

### 1. Single Source of Truth

**Requirement**: All price projection data MUST use `PriceProjectionResult` from `app/simulation/price-models/types.ts`

```typescript
// Standard format (ONLY format allowed after migration)
interface PriceProjectionResult {
  modelName: string
  modelVersion: string
  projectionPoints: ProjectionPoint[]
  metadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    maxDecline: number
    volatility: number
    confidence: number
    generatedAt: string
  }
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

### 2. Standardized Data Exchange Interfaces

**Parameters → Price Projection**
```typescript
// Input to price projection generation
interface PriceModelParams {
  startPrice: number
  projectionMonths: number
  modelSpecificParams: Record<string, any>
}

// Output from price projection
type Output = PriceProjectionResult
```

**Price Projection → Strategies**
```typescript
// Already defined in PriceProjectionAdapter
interface StrategyPriceData {
  modelName: string
  pricePoints: Array<{
    month: number
    price: number
    timestamp: number
  }>
  metadata: {
    totalMonths: number
    startPrice: number
    endPrice: number
  }
}

// Conversion
const strategyData = PriceProjectionAdapter.toStrategyFormat(projection, selectedPriceLine)
```

**Strategies → Results**
```typescript
// Already defined in PriceProjectionAdapter
interface ResultsPriceData extends StrategyPriceData {
  analytics: {
    totalGrowth: number
    averageMonthlyGrowth: number
    maxDecline: number
    volatility: number
  }
}

// Conversion
const resultsData = PriceProjectionAdapter.toResultsFormat(projection)
```

### 3. Service Architecture

**UnifiedPriceProjectionService** (Already implemented)
- Single interface for all price projection generation
- Wraps `PriceModelRegistry`
- Ensures all outputs use standard format
- Handles legacy parameter conversion

**PriceProjectionAdapter** (Already implemented)
- Converts between standard format and specialized formats
- Provides safe price access with monthly-to-daily conversion
- Validates projection data
- Type guards for format detection

**PriceDataService** (Needs refactoring)
- Option A: Refactor to use `UnifiedPriceProjectionService` internally
- Option B: Deprecate and replace with `UnifiedPriceProjectionService`
- **Selected: Option A** - Refactor to maintain backward compatibility during migration

### 4. Hook Migration Strategy

**Current Hooks to Migrate**:
1. `usePriceProjection` (src/modules/price-data/hooks/)
2. `usePriceGeneration` (app/simulation/hooks/)
3. `usePriceData` (src/modules/price-data/hooks/)

**Migration Pattern**:
```typescript
// Before
const chartData = await priceDataService.generatePriceProjection(params, historicalData)

// After
const projection = await unifiedPriceProjectionService.generateProjection(
  params.priceModel,
  params,
  historicalData
)
const chartData = PriceProjectionAdapter.toLegacyFormat(projection) // Temporary during migration
```

### 5. Component Migration Strategy

**Pattern**: Update components to accept `PriceProjectionResult` and use adapter for specialized needs

```typescript
// Before
interface Props {
  chartData: PriceChartDataPoint[]
}

// After
interface Props {
  projection: PriceProjectionResult
}

// Inside component
const chartData = useMemo(() => 
  PriceProjectionAdapter.toLegacyFormat(projection),
  [projection]
)
```

### 6. Files to Delete After Migration

**Type Definitions** (~150 lines):
- `src/modules/price-projection/types/index.ts` - Old PriceProjectionResult interface
- Duplicate type definitions in:
  - `src/modules/parameters/types/` (price-related types)
  - `src/modules/results/types/` (price-related types)

**Legacy Adapters** (~200 lines):
- Any custom conversion code in components
- Duplicate adapter implementations

**Legacy Services** (~150 lines):
- `src/modules/price-projection/` directory (if no longer needed)
- Legacy methods in `PriceDataService`

**Total Estimated Reduction**: ~500 lines

### 7. Backward Compatibility Strategy

**Phase 1-2**: Dual system support
- Keep old format support in `PriceProjectionAdapter`
- Use `isOldPriceProjectionResult()` type guard
- Automatic conversion where needed

**Phase 3**: Deprecation
- Mark old interfaces with `@deprecated`
- Add console warnings for old format usage
- Update all consumers to new format

**Phase 4**: Removal
- Delete old type definitions
- Remove conversion code
- Clean up imports

## Approach Options

### Option A: Big Bang Migration
**Description**: Migrate everything at once in a single PR

**Pros**:
- Fastest completion
- No dual system maintenance
- Clean cutover

**Cons**:
- High risk of breaking changes
- Difficult to test incrementally
- Hard to roll back if issues found

### Option B: Phased Migration (Selected)
**Description**: Migrate in phases with backward compatibility

**Pros**:
- Lower risk
- Incremental testing
- Easy rollback per phase
- Maintains working system throughout

**Cons**:
- Longer timeline
- Temporary dual system complexity
- More commits/PRs

**Rationale**: Phased approach is safer for a production system and allows for thorough testing at each stage. The temporary complexity of dual system support is worth the reduced risk.

## External Dependencies

**No new dependencies required**. This refactoring uses existing infrastructure:
- `PriceProjectionAdapter` (already implemented)
- `UnifiedPriceProjectionService` (already implemented)
- `PriceModelRegistry` (existing)
- TypeScript type system (existing)

## Performance Considerations

### Expected Improvements

1. **Reduced Memory Usage**: Single format means less data duplication
2. **Faster Type Checking**: Fewer type definitions to process
3. **Improved Bundle Size**: ~500 lines removed = smaller bundle
4. **Better Tree Shaking**: Cleaner imports enable better dead code elimination

### No Performance Degradation Expected

- `PriceProjectionAdapter` uses efficient conversion algorithms
- No additional async operations introduced
- Memoization patterns maintained in components

## Migration Risks & Mitigation

### Risk 1: Breaking Changes in Components
**Mitigation**: 
- Maintain backward compatibility in Phase 1-2
- Comprehensive test coverage before migration
- Gradual component migration with testing

### Risk 2: Type Errors During Migration
**Mitigation**:
- Use TypeScript strict mode to catch issues early
- Type guards for runtime safety
- Incremental migration allows fixing issues per phase

### Risk 3: Performance Regression
**Mitigation**:
- Benchmark before/after each phase
- Monitor bundle size
- Profile critical paths

### Risk 4: Data Loss or Corruption
**Mitigation**:
- Extensive unit tests for conversion functions
- Integration tests for end-to-end flow
- Validation utilities in `PriceProjectionAdapter`

## Success Criteria

1. ✅ All code uses `PriceProjectionResult` from single location
2. ✅ Zero TypeScript errors
3. ✅ All tests passing (100% pass rate)
4. ✅ ~500 lines of code removed
5. ✅ No performance regression
6. ✅ Documentation updated
7. ✅ No console warnings in production
8. ✅ Successful deployment to production

