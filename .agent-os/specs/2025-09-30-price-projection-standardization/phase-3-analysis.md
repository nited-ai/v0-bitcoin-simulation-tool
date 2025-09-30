# Phase 3 Component Migration Analysis

## Overview
Phase 3 focuses on migrating UI components to use the new `PriceProjectionResult` format from `SimulationContext.priceProjection` instead of the legacy `priceChartData` format.

## Current Status

### ✅ Already Compatible Components
These components already use `PriceProjectionResult` and don't need migration:

1. **UnifiedPriceChart** (`app/simulation/tabs/price-projection/UnifiedPriceChart.tsx`)
   - Already accepts `PriceProjectionResult` via `onProjectionChange` prop
   - Uses `priceModelRegistry.generateProjection()` which returns new format
   - Manages its own local projection state
   - **Status**: ✅ Compatible, but should integrate with `SimulationContext.priceProjection`

2. **PriceProjectionChart** (`app/simulation/tabs/price-projection/PriceProjectionChart.tsx`)
   - Already uses `PriceProjectionResult` type
   - Uses `priceModelRegistry.generateProjection()` 
   - Manages local projection state
   - **Status**: ✅ Compatible

3. **GrowthRateAnalysis** (if exists)
   - Need to verify existence and usage
   - **Status**: ⏳ Pending verification

### 🔄 Components Needing Migration

#### Hooks Using Legacy Format

1. **usePriceGeneration** (`app/simulation/hooks/usePriceGeneration.ts`)
   - **Current**: Calls `priceDataService.generatePriceProjection()` → returns legacy format → calls `setPriceChartData()`
   - **Migration**: Should call `unifiedPriceProjectionService.generateProjection()` → returns new format → calls `setPriceProjection()`
   - **Impact**: Used by components that need price generation
   - **Status**: 🔄 Needs migration

2. **useSimulationRunner** (`app/simulation/hooks/useSimulationRunner.ts`)
   - **Current**: Reads `priceChartData` from context
   - **Migration**: Should read `priceProjection` and use `PriceProjectionAdapter.toStrategyFormat()`
   - **Impact**: Used by strategy execution
   - **Status**: 🔄 Needs migration

#### Strategy Tab Components

3. **Strategy Execution Components**
   - Need to identify which components execute strategies
   - Should use `PriceProjectionAdapter.toStrategyFormat()`
   - **Status**: ⏳ Pending identification

4. **Strategy Visualization Components**
   - Need to identify visualization components
   - **Status**: ⏳ Pending identification

#### Results Tab Components

5. **BitcoinPriceChart** (Results tab)
   - Need to locate and analyze
   - Should use `PriceProjectionAdapter.toResultsFormat()`
   - **Status**: ⏳ Pending identification

6. **Other Results Visualizations**
   - Need to identify all results components
   - **Status**: ⏳ Pending identification

## Migration Strategy

### Phase 3.1: Context Integration (Task 10) ✅ COMPLETE
- [x] Add `priceProjection` field to SimulationContext
- [x] Add `setPriceProjection` method
- [x] Maintain backward compatibility with `priceChartData`
- [x] Create migration tests (13/13 passing)

### Phase 3.2: Price Projection Tab (Task 11) 🔄 IN PROGRESS
- [ ] 11.1 Write tests for UnifiedPriceChart integration
- [ ] 11.2 Update UnifiedPriceChart to sync with `SimulationContext.priceProjection`
- [ ] 11.3 Verify PriceProjectionChart compatibility
- [ ] 11.4 Verify GrowthRateAnalysis compatibility
- [ ] 11.5 Add adapter usage where needed
- [ ] 11.6 Verify all tests pass

### Phase 3.3: Strategy Tab (Task 12) ⏳ PENDING
- [ ] 12.1 Write tests for strategy components
- [ ] 12.2 Migrate useSimulationRunner to use priceProjection
- [ ] 12.3 Use PriceProjectionAdapter.toStrategyFormat()
- [ ] 12.4 Update strategy visualization components
- [ ] 12.5 Update prop types and interfaces
- [ ] 12.6 Verify all tests pass

### Phase 3.4: Results Tab (Task 13) ⏳ PENDING
- [ ] 13.1 Write tests for results components
- [ ] 13.2 Update BitcoinPriceChart component
- [ ] 13.3 Use PriceProjectionAdapter.toResultsFormat()
- [ ] 13.4 Update other results visualization components
- [ ] 13.5 Update prop types and interfaces
- [ ] 13.6 Verify all tests pass

### Phase 3.5: Integration Testing (Task 14) ⏳ PENDING
- [ ] 14.1 Visual regression testing
- [ ] 14.2 Functional testing for each tab
- [ ] 14.3 Cross-tab data flow testing
- [ ] 14.4 User acceptance testing
- [ ] 14.5 Performance benchmarking
- [ ] 14.6 Document Phase 3 completion

## Key Findings

### 1. Most Components Already Compatible
The majority of price projection components already use the new `PriceProjectionResult` format because they use `priceModelRegistry.generateProjection()` directly. This significantly reduces migration work.

### 2. Service Layer Abstraction Works
Phase 1's service layer migration means that hooks using `priceDataService.generatePriceProjection()` already get the new format internally (converted to legacy for backward compatibility). We just need to remove the conversion step.

### 3. Minimal Breaking Changes
Because we maintained backward compatibility in Phase 1-2, we can migrate components incrementally without breaking existing functionality.

### 4. Adapter Pattern Success
The `PriceProjectionAdapter` provides clean conversion utilities for the few places that need format conversion (strategy execution, results visualization).

## Migration Checklist

### Before Starting Each Component
- [ ] Identify all props and state related to price data
- [ ] Check if component uses legacy `PriceChartDataPoint[]` format
- [ ] Check if component uses new `PriceProjectionResult` format
- [ ] Identify dependencies (hooks, services, adapters)

### During Migration
- [ ] Write migration tests first
- [ ] Update component to use `priceProjection` from context
- [ ] Use appropriate adapter methods for format conversion
- [ ] Add Phase 3 migration logging
- [ ] Verify TypeScript compilation
- [ ] Run component tests

### After Migration
- [ ] Verify all tests pass (100%)
- [ ] Check for TypeScript errors (0 errors)
- [ ] Test in browser (no console errors)
- [ ] Verify backward compatibility
- [ ] Update documentation
- [ ] Commit changes

## Test Coverage Goals

- **Unit Tests**: Each migrated component should have tests
- **Integration Tests**: Cross-component data flow
- **Visual Tests**: Chart rendering verification
- **Performance Tests**: No regression in render times
- **Target**: 100% test pass rate

## Timeline Estimate

- Task 10 (Context): ✅ Complete (1 hour)
- Task 11 (Price Projection Tab): 🔄 In Progress (2-3 hours)
- Task 12 (Strategy Tab): ⏳ Pending (3-4 hours)
- Task 13 (Results Tab): ⏳ Pending (3-4 hours)
- Task 14 (Integration Testing): ⏳ Pending (2-3 hours)

**Total Estimated**: 11-15 hours for complete Phase 3

## Next Steps

1. Complete Task 11.1: Write tests for UnifiedPriceChart integration with SimulationContext
2. Update UnifiedPriceChart to sync projection with context
3. Verify other price projection components
4. Move to Strategy Tab migration
5. Move to Results Tab migration
6. Complete integration testing
7. Create PR for Phase 3
8. Proceed to Phase 4 (Cleanup)

