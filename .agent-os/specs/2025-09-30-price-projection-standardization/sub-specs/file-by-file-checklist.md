# File-by-File Migration Checklist

This is the detailed file-by-file checklist for the spec detailed in @.agent-os/specs/2025-09-30-price-projection-standardization/spec.md

> Created: 2025-09-30  
> Version: 1.0.0

## Phase 1: Service Layer Files

### Files to Modify

#### ✅ src/modules/price-data/services/PriceDataService.ts
- [ ] Add import for `UnifiedPriceProjectionService`
- [ ] Add import for `PriceProjectionAdapter`
- [ ] Update `generatePriceProjection()` method
- [ ] Add migration logging
- [ ] Maintain backward compatibility
- [ ] Update JSDoc comments

**Estimated Lines Changed**: ~30 lines

#### ✅ src/modules/price-projection/types/index.ts
- [ ] Add `@deprecated` JSDoc to `PriceProjectionResult`
- [ ] Add `@deprecated` JSDoc to `IPriceProjectionModel`
- [ ] Add deprecation notice in file header
- [ ] Reference new standard location

**Estimated Lines Changed**: ~10 lines

### Files to Create

#### ✅ src/modules/shared/utils/migrationHelpers.ts
- [ ] Create file
- [ ] Implement `logFormatUsage()`
- [ ] Implement `validateMigration()`
- [ ] Add JSDoc documentation
- [ ] Export from shared module

**Estimated Lines**: ~50 lines

### Files to Test

#### ✅ src/modules/price-data/__tests__/PriceDataService.test.ts
- [ ] Add tests for unified service usage
- [ ] Add tests for backward compatibility
- [ ] Add tests for all price models
- [ ] Verify legacy format output

**Estimated Lines**: ~100 lines

#### ✅ src/modules/shared/__tests__/migrationHelpers.test.ts
- [ ] Create test file
- [ ] Test `logFormatUsage()`
- [ ] Test `validateMigration()`

**Estimated Lines**: ~50 lines

---

## Phase 2: Hook Files

### Files to Modify

#### ✅ src/modules/price-data/hooks/usePriceProjection.ts
- [ ] Update import statements
- [ ] Change `projectionData` type to `PriceProjectionResult | null`
- [ ] Update `generateProjection()` implementation
- [ ] Update `UsePriceProjectionReturn` interface
- [ ] Add migration logging
- [ ] Update JSDoc comments

**Estimated Lines Changed**: ~40 lines

#### ✅ app/simulation/hooks/usePriceGeneration.ts
- [ ] Add import for `UnifiedPriceProjectionService`
- [ ] Add import for `PriceProjectionAdapter`
- [ ] Update projection generation logic
- [ ] Add temporary conversion for context
- [ ] Add migration logging
- [ ] Update comments

**Estimated Lines Changed**: ~30 lines

#### ✅ src/modules/price-data/hooks/usePriceData.ts
- [ ] Update import statements
- [ ] Change `projectionData` type
- [ ] Update `generateProjection()` implementation
- [ ] Update return type interface
- [ ] Add migration logging

**Estimated Lines Changed**: ~35 lines

#### ✅ src/modules/price-data/hooks/usePriceProjection.ts (useMultiModelProjection)
- [ ] Update `projections` Map type
- [ ] Update projection generation loop
- [ ] Update `getProjectionForModel()` return type
- [ ] Add migration logging

**Estimated Lines Changed**: ~25 lines

### Files to Test

#### ✅ src/modules/price-data/__tests__/usePriceProjection.test.ts
- [ ] Update existing tests for new format
- [ ] Add tests for PriceProjectionResult return type
- [ ] Add tests for error handling
- [ ] Add tests for useMultiModelProjection

**Estimated Lines Changed**: ~80 lines

#### ✅ app/simulation/__tests__/usePriceGeneration.test.ts
- [ ] Update existing tests
- [ ] Add tests for enabled/disabled states
- [ ] Add tests for context integration

**Estimated Lines Changed**: ~60 lines

#### ✅ src/modules/price-data/__tests__/usePriceData.test.ts
- [ ] Update existing tests
- [ ] Add tests for new format
- [ ] Add integration tests

**Estimated Lines Changed**: ~70 lines

---

## Phase 3: Component Files

### Files to Modify

#### ✅ app/simulation/context/SimulationContext.tsx
- [ ] Add `priceProjection: PriceProjectionResult | null` field
- [ ] Add `setPriceProjection` method
- [ ] Keep legacy `priceChartData` temporarily
- [ ] Update context provider
- [ ] Update JSDoc comments

**Estimated Lines Changed**: ~20 lines

#### ✅ app/simulation/tabs/price-projection/UnifiedPriceChart.tsx
- [ ] Update props interface to accept `PriceProjectionResult`
- [ ] Add adapter usage for chart data conversion
- [ ] Update component logic
- [ ] Add memoization for conversions
- [ ] Update prop types

**Estimated Lines Changed**: ~30 lines

#### ✅ app/simulation/tabs/price-projection/PriceProjectionChart.tsx
- [ ] Update props interface
- [ ] Add adapter usage
- [ ] Update chart data preparation
- [ ] Update prop types

**Estimated Lines Changed**: ~25 lines

#### ✅ app/simulation/tabs/price-projection/GrowthRateAnalysis.tsx
- [ ] Update props interface
- [ ] Add adapter usage if needed
- [ ] Update data access patterns
- [ ] Update prop types

**Estimated Lines Changed**: ~20 lines

#### ✅ app/simulation/tabs/strategies/[strategy-components].tsx
- [ ] Update props to accept `PriceProjectionResult`
- [ ] Use `PriceProjectionAdapter.toStrategyFormat()`
- [ ] Update strategy execution logic
- [ ] Update visualization components

**Estimated Lines Changed**: ~40 lines (across multiple files)

#### ✅ app/simulation/tabs/results/charts/BitcoinPriceChart.tsx
- [ ] Update props interface
- [ ] Use `PriceProjectionAdapter.toResultsFormat()`
- [ ] Update chart rendering logic
- [ ] Add analytics display

**Estimated Lines Changed**: ~35 lines

#### ✅ app/simulation/tabs/results/[results-components].tsx
- [ ] Update props interfaces
- [ ] Add adapter usage
- [ ] Update data access patterns
- [ ] Update visualizations

**Estimated Lines Changed**: ~50 lines (across multiple files)

### Files to Test

#### ✅ app/simulation/__tests__/SimulationContext.test.tsx
- [ ] Test new priceProjection field
- [ ] Test setPriceProjection method
- [ ] Test backward compatibility

**Estimated Lines**: ~80 lines

#### ✅ app/simulation/tabs/price-projection/__tests__/UnifiedPriceChart.test.tsx
- [ ] Test with PriceProjectionResult
- [ ] Test null handling
- [ ] Test adapter conversion
- [ ] Visual regression tests

**Estimated Lines**: ~100 lines

#### ✅ app/simulation/tabs/strategies/__tests__/[strategy-tests].tsx
- [ ] Test strategy format conversion
- [ ] Test strategy execution
- [ ] Integration tests

**Estimated Lines**: ~120 lines

#### ✅ app/simulation/tabs/results/__tests__/BitcoinPriceChart.test.tsx
- [ ] Test results format conversion
- [ ] Test analytics display
- [ ] Visual regression tests

**Estimated Lines**: ~100 lines

---

## Phase 4: Cleanup Files

### Files to Delete

#### 🗑️ src/modules/price-projection/types/index.ts
- [ ] Verify no remaining imports
- [ ] Delete file
- [ ] Update barrel exports if needed

**Lines Removed**: ~40 lines

#### 🗑️ src/modules/parameters/types/[price-related-types].ts
- [ ] Identify duplicate price types
- [ ] Verify no remaining usage
- [ ] Delete duplicate definitions

**Lines Removed**: ~50 lines

#### 🗑️ src/modules/results/types/[price-related-types].ts
- [ ] Identify duplicate price types
- [ ] Verify no remaining usage
- [ ] Delete duplicate definitions

**Lines Removed**: ~50 lines

#### 🗑️ src/modules/price-projection/ (evaluate entire directory)
- [ ] Check if directory still needed
- [ ] Verify no remaining dependencies
- [ ] Delete if obsolete

**Lines Removed**: ~150 lines (if deleted)

### Files to Modify (Cleanup)

#### ✅ src/modules/shared/adapters/PriceProjectionAdapter.ts
- [ ] Remove `toLegacyFormat()` method
- [ ] Remove `fromOldFormat()` method
- [ ] Remove old format type guards
- [ ] Update JSDoc comments
- [ ] Clean up imports

**Lines Removed**: ~100 lines

#### ✅ src/modules/shared/services/UnifiedPriceProjectionService.ts
- [ ] Remove legacy parameter conversion
- [ ] Remove `generateProjectionFromLegacyParams()` method
- [ ] Simplify service interface
- [ ] Update JSDoc comments

**Lines Removed**: ~50 lines

#### ✅ src/modules/price-data/services/PriceDataService.ts
- [ ] Remove legacy methods if any
- [ ] Simplify service interface
- [ ] Update JSDoc comments

**Lines Removed**: ~30 lines

#### ✅ app/simulation/context/SimulationContext.tsx
- [ ] Remove `priceChartData` field
- [ ] Remove `setPriceChartData` method
- [ ] Clean up context interface
- [ ] Update provider implementation

**Lines Removed**: ~15 lines

### Files to Update (Import Paths)

#### ✅ All files importing from deprecated locations
- [ ] Find all imports from `src/modules/price-projection/types`
- [ ] Update to `app/simulation/price-models/types`
- [ ] Verify TypeScript compilation
- [ ] Run tests

**Files Affected**: ~20-30 files  
**Estimated Changes**: ~50 lines total

---

## Summary Statistics

### Lines of Code Impact

| Category | Lines Changed | Lines Added | Lines Removed | Net Change |
|----------|---------------|-------------|---------------|------------|
| Phase 1 | 40 | 150 | 0 | +150 |
| Phase 2 | 130 | 310 | 0 | +310 |
| Phase 3 | 220 | 400 | 0 | +400 |
| Phase 4 | 95 | 0 | 485 | -485 |
| **Total** | **485** | **860** | **485** | **+375** |

**Note**: Net positive during migration, then ~500 lines removed in Phase 4

### Files Impact

| Category | Files Modified | Files Created | Files Deleted | Total Files |
|----------|----------------|---------------|---------------|-------------|
| Phase 1 | 2 | 2 | 0 | 4 |
| Phase 2 | 4 | 4 | 0 | 8 |
| Phase 3 | 12 | 8 | 0 | 20 |
| Phase 4 | 6 | 0 | 8 | 14 |
| **Total** | **24** | **14** | **8** | **46** |

### Risk by File

| Risk Level | Files | Notes |
|------------|-------|-------|
| 🔴 High | 3 | SimulationContext, UnifiedPriceChart, BitcoinPriceChart |
| ⚠️ Medium | 12 | Hooks, strategy components, results components |
| ✅ Low | 31 | Services, utilities, tests, cleanup |

## Verification Checklist

After each phase:

- [ ] All modified files compile without errors
- [ ] All tests pass (100% pass rate)
- [ ] No new TypeScript errors introduced
- [ ] No console errors in development
- [ ] Visual regression tests pass (Phase 3)
- [ ] Performance benchmarks meet targets
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Changes deployed to staging
- [ ] Smoke tests pass on staging

## Rollback Files

Keep backups of these critical files:

1. `app/simulation/context/SimulationContext.tsx`
2. `src/modules/price-data/services/PriceDataService.ts`
3. `src/modules/shared/adapters/PriceProjectionAdapter.ts`
4. `src/modules/shared/services/UnifiedPriceProjectionService.ts`

Store in: `.migration-backups/YYYY-MM-DD/`

