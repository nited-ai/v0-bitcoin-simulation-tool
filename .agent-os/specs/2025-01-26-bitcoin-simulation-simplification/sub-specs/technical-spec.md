# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-26-bitcoin-simulation-simplification/spec.md

> Created: 2025-01-26
> Version: 1.0.0

## Architecture Overview

### Current Architecture (Over-Engineered)
```
Current (~10,000 lines):
├── src/modules/                    # 6 microservice modules (~3,000 lines)
│   ├── parameters/                 # Duplicate parameter logic
│   ├── price-projection/           # Duplicate price models
│   ├── strategies/                 # Over-abstracted strategies
│   ├── results/                    # Duplicate results processing
│   ├── price-data/                 # Complex data management
│   └── shared/                     # Over-engineered utilities
├── lib/price-engine/               # Duplicate price engine (~1,500 lines)
├── lib/services/                   # Overlapping services (~1,000 lines)
├── lib/strategy-engine/            # Over-abstracted strategies (~500 lines)
├── app/simulation/                 # Working application (~4,000 lines)
└── prisma/                         # Unnecessary database layer
```

### Target Architecture (Simplified)
```
Target (~3,000 lines):
├── app/simulation/
│   ├── page.tsx                    # Main simulation page (100 lines)
│   ├── components/
│   │   ├── parameters/             # Keep existing UI components (800 lines)
│   │   ├── price-projection/       # Keep existing UI components (600 lines)
│   │   ├── results/                # Keep existing UI components (500 lines)
│   │   └── shared/                 # Navigation and layout (200 lines)
│   ├── lib/
│   │   ├── calculations.ts         # Consolidated financial math (300 lines)
│   │   ├── price-models.ts         # All 5 models unified (400 lines)
│   │   └── services.ts             # Data loading and export (200 lines)
│   ├── hooks/                      # Essential hooks only (200 lines)
│   ├── types/                      # Consolidated types (100 lines)
│   └── constants/                  # Presets and configs (100 lines)
```

## Implementation Strategy

### Phase 1: Remove Duplicate Systems
**Target: Eliminate ~4,000 lines of duplicate code**

1. **Delete Over-Engineered Directories**
   - Remove `src/modules/` entirely (6 directories)
   - Remove `lib/price-engine/` (duplicate of app-level models)
   - Remove `lib/strategy-engine/` (merge into calculations)
   - Remove `lib/services/` (consolidate essential services)
   - Remove `prisma/` (replace with static JSON data)

2. **Preserve Working Components**
   - Keep all `app/simulation/components/` (UI works perfectly)
   - Keep all `app/simulation/tabs/` (user interface components)
   - Keep `app/simulation/shared/` (navigation and layout)
   - Keep `components/ui/` (shadcn/ui components)

### Phase 2: Consolidate Core Logic
**Target: Merge duplicate implementations into single sources**

1. **Price Models Consolidation** (`app/simulation/lib/price-models.ts`)
   ```typescript
   // Merge all price model implementations:
   // - lib/price-engine/models/* 
   // - src/modules/price-projection/models/*
   // - app/simulation/price-models/models/*
   
   export class UnifiedPriceModels {
     manualGrowthModel: ManualGrowthModel
     powerLawModel: PowerLawModel
     cycleRepeatModel: CycleRepeatModel
     enhancedCycleRepeatModel: EnhancedCycleRepeatModel
     logarithmicCurveModel: LogarithmicCurveModel
   }
   ```

2. **Calculations Consolidation** (`app/simulation/lib/calculations.ts`)
   ```typescript
   // Merge all calculation services:
   // - src/modules/parameters/services/calculationsService.ts
   // - lib/strategy-engine/
   // - app/simulation/hooks/useCalculationsIntegration.ts
   
   export class UnifiedCalculations {
     calculateLoanMetrics()
     calculateRiskMetrics()
     calculatePortfolioProjections()
     calculateLiquidationPrices()
   }
   ```

3. **Data Services Consolidation** (`app/simulation/lib/services.ts`)
   ```typescript
   // Merge all data services:
   // - lib/services/centralized-data-service.ts
   // - lib/services/bitcoin-api-service.ts
   // - app/simulation/hooks/useCentralizedData.ts
   
   export class UnifiedDataService {
     loadHistoricalData()
     fetchCurrentPrice()
     exportResults()
   }
   ```

### Phase 3: Type System Simplification
**Target: Single source of truth for all types**

1. **Consolidated Types** (`app/simulation/types/index.ts`)
   ```typescript
   // Merge all type definitions from:
   // - src/modules/*/types/
   // - lib/*/types.ts
   // - app/simulation/types/simulation.ts
   
   export interface SimulationParams { /* unified */ }
   export interface PriceProjectionResult { /* unified */ }
   export interface MonthlyResult { /* unified */ }
   ```

## Data Layer Simplification

### Remove Database Complexity
- **Delete**: PostgreSQL database, Prisma schema, API routes
- **Replace**: Static JSON files in `public/data/bitcoin/`
- **Benefit**: Eliminates ~500 lines of database code, improves loading speed

### Simplified Data Loading
```typescript
// Replace complex database queries with simple JSON loading
export async function loadBitcoinData(): Promise<HistoricalDataPoint[]> {
  const response = await fetch('/data/bitcoin/daily.json')
  return response.json()
}
```

## Performance Optimizations

### Bundle Size Reduction
- **Remove unused dependencies**: Prisma, database drivers
- **Consolidate imports**: Single import paths instead of deep imports
- **Tree shaking**: Eliminate dead code from removed modules

### Loading Performance
- **Static data**: JSON files load faster than database queries
- **Reduced JavaScript**: ~70% less code to parse and execute
- **Simplified hydration**: Fewer components to hydrate

## Migration Strategy

### Backward Compatibility
- **Preserve all localStorage keys**: User settings remain intact
- **Maintain export formats**: CSV/JSON/TXT exports identical
- **Keep URL structure**: All routes and navigation unchanged
- **Preserve translations**: All i18n keys and translations maintained

### Testing Strategy
- **Component tests**: Ensure all UI components work identically
- **Integration tests**: Verify all user workflows function correctly
- **Performance tests**: Confirm improved loading times
- **Export tests**: Validate identical export file formats

## Risk Mitigation

### Feature Preservation Validation
1. **UI Regression Testing**: Every component renders identically
2. **Calculation Accuracy**: All financial calculations produce same results
3. **Export Validation**: Generated files match current format exactly
4. **Internationalization**: All translations work correctly
5. **Theme Switching**: Light/Dark/System themes function properly

### Rollback Strategy
- **Git branching**: Maintain current version in separate branch
- **Feature flags**: Ability to toggle between old/new implementations
- **Incremental migration**: Phase-by-phase rollout with validation

## Success Metrics

### Code Reduction
- **Target**: 70% reduction in total lines of code
- **Measure**: From ~10,000 lines to ~3,000 lines
- **Validation**: Automated line counting in CI/CD

### Performance Improvement
- **Bundle size**: 30-50% reduction in JavaScript bundle
- **Loading time**: 20-40% faster initial page load
- **Memory usage**: Reduced runtime memory footprint

### Maintainability Enhancement
- **Cyclomatic complexity**: Reduced code complexity metrics
- **Duplicate code**: Elimination of code duplication
- **Test coverage**: Maintained or improved test coverage
