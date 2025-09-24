# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-09-repository-reorganization/spec.md

> Created: 2025-01-09
> Version: 1.0.0

## Technical Requirements

### Exact Directory Structure

```
src/
├── modules/
│   ├── parameters/
│   │   ├── components/
│   │   │   ├── LoanParametersCard.tsx (from app/simulation/components/parameters/)
│   │   │   ├── PlatformSelector.tsx (from app/simulation/components/parameters/)
│   │   │   ├── CollateralVisualizationCard.tsx (from app/simulation/components/parameters/)
│   │   │   ├── PriceDropToleranceCard.tsx (from app/simulation/components/parameters/)
│   │   │   └── LoanUsageVisualizationCard.tsx (from app/simulation/components/parameters/)
│   │   ├── services/
│   │   │   └── calculationsService.ts (from app/simulation/components/parameters/)
│   │   ├── constants/
│   │   │   ├── platformPresets.ts (from app/simulation/constants/)
│   │   │   └── riskLevelPresets.ts (from app/simulation/constants/)
│   │   ├── hooks/
│   │   │   ├── useParameterValidation.ts (from app/simulation/hooks/)
│   │   │   └── useCalculationsIntegration.ts (from app/simulation/hooks/)
│   │   ├── __tests__/
│   │   └── index.ts
│   │
│   ├── price-projection/
│   │   ├── models/
│   │   │   ├── ManualGrowthModel.ts (from app/simulation/price-models/models/)
│   │   │   ├── PowerLawModel.ts (from app/simulation/price-models/models/)
│   │   │   ├── CycleRepeatModel.ts (from app/simulation/price-models/models/)
│   │   │   ├── EnhancedCycleRepeatModel.ts (from app/simulation/price-models/models/)
│   │   │   └── LogarithmicCurveRepeatModel.ts (from app/simulation/price-models/models/)
│   │   ├── services/
│   │   │   ├── PriceModelRegistry.ts (from app/simulation/price-models/)
│   │   │   └── PriceProjectionService.ts (new, implements PriceProjectionInterface)
│   │   ├── components/ (from app/simulation/components/price-models/)
│   │   ├── hooks/
│   │   │   └── usePriceGeneration.ts (from app/simulation/hooks/)
│   │   ├── types/
│   │   │   └── types.ts (from app/simulation/price-models/)
│   │   ├── __tests__/
│   │   └── index.ts
│   │
│   ├── strategies/
│   │   ├── implementations/
│   │   │   ├── DefaultStrategy.ts (from lib/strategy-engine/strategies/)
│   │   │   ├── AthBasedStrategy.ts (from lib/strategy-engine/strategies/)
│   │   │   ├── MovingAverageStrategy.ts (from lib/strategy-engine/strategies/)
│   │   │   └── AthCollateralStrategy.ts (from lib/strategy-engine/strategies/)
│   │   ├── services/
│   │   │   └── StrategyExecutionService.ts (from lib/strategy-engine/index.ts)
│   │   ├── adapters/
│   │   │   └── PriceProjectionAdapter.ts (new, uses shared adapter base)
│   │   ├── components/ (new, strategy selection UI)
│   │   ├── hooks/
│   │   │   └── useSimulationRunner.ts (from app/simulation/hooks/)
│   │   ├── types/
│   │   │   └── types.ts (from lib/strategy-engine/types.ts)
│   │   ├── __tests__/
│   │   └── index.ts
│   │
│   ├── results/
│   │   ├── components/
│   │   │   ├── ResultsPage.tsx (from app/simulation/components/results/)
│   │   │   ├── ResultsSummary.tsx (from app/simulation/components/results/)
│   │   │   ├── ResultsTable.tsx (from app/simulation/components/results/)
│   │   │   ├── RiskAssessment.tsx (from app/simulation/components/results/)
│   │   │   ├── UnifiedPriceChart.tsx (from app/simulation/components/charts/)
│   │   │   ├── PortfolioValueChart.tsx (from app/simulation/components/charts/)
│   │   │   ├── DebtCollateralChart.tsx (from app/simulation/components/charts/)
│   │   │   ├── LTVProgressionChart.tsx (from app/simulation/components/charts/)
│   │   │   ├── CashFlowChart.tsx (from app/simulation/components/charts/)
│   │   │   └── CollateralAnalysisChart.tsx (from app/simulation/components/charts/)
│   │   ├── services/
│   │   │   ├── ResultsAnalysisService.ts (new, implements ResultsInterface)
│   │   │   └── ResultsProcessor.ts (new, data aggregation)
│   │   ├── adapters/
│   │   │   └── PriceProjectionResultsAdapter.ts (new, projection context integration)
│   │   ├── hooks/
│   │   │   ├── useResultsAnalysis.ts (from app/simulation/hooks/)
│   │   │   ├── useResultsExport.ts (from app/simulation/hooks/)
│   │   │   ├── useResultsSummary.ts (from app/simulation/hooks/)
│   │   │   └── useFinancialChartData.ts (from app/simulation/hooks/)
│   │   ├── __tests__/
│   │   └── index.ts
│   │
│   ├── price-data/
│   │   ├── services/
│   │   │   ├── bitcoinJsonDataService.ts (from lib/services/)
│   │   │   ├── multiApiBitcoinService.ts (from lib/services/)
│   │   │   ├── centralizedDataService.ts (from lib/services/)
│   │   │   ├── bitcoinApiService.ts (from app/simulation/data/)
│   │   │   ├── AutoUpdateService.ts (from app/simulation/data/)
│   │   │   └── csvUpdateManager.ts (from app/simulation/data/)
│   │   ├── processors/
│   │   │   ├── comprehensiveGapFiller.ts (from lib/services/)
│   │   │   ├── comprehensiveGapAnalyzer.ts (from lib/services/)
│   │   │   ├── validationService.ts (from lib/services/)
│   │   │   └── DataValidator.ts (new)
│   │   ├── hooks/
│   │   │   ├── useCentralizedData.ts (from app/simulation/hooks/)
│   │   │   ├── useHistoricalData.ts (from app/simulation/hooks/)
│   │   │   └── useATH.ts (from app/simulation/hooks/)
│   │   ├── __tests__/
│   │   └── index.ts
│   │
│   └── shared/
│       ├── interfaces/
│       │   ├── PriceProjectionInterface.ts (new)
│       │   ├── StrategyInterface.ts (new)
│       │   └── ResultsInterface.ts (new)
│       ├── adapters/
│       │   ├── PriceProjectionAdapter.ts (new, base class)
│       │   └── StrategyResultsAdapter.ts (new, base class)
│       ├── types/
│       │   └── index.ts (shared TypeScript types)
│       ├── utils/
│       │   └── index.ts (common utilities)
│       ├── __tests__/
│       └── index.ts
```

### Cross-Module Data Flow Implementation

- **Price Projection → Strategy**: `PriceProjectionResult` converted to `StrategyPriceData` via `PriceProjectionAdapter.convertForStrategy()`
- **Strategy → Results**: `StrategyExecutionResult` includes original price projection context via `StrategyResultsAdapter.enhanceWithProjectionContext()`
- **Price Projection → Results**: Direct access through `ResultsAnalysisService.analyzeWithPriceProjection()`
- **Data transformation**: All conversions handled by dedicated adapter classes in `src/modules/shared/adapters/`

### Import Path Standards

- **Module imports**: `@/modules/parameters`, `@/modules/price-projection`, `@/modules/strategies`, `@/modules/results`, `@/modules/price-data`, `@/modules/shared`
- **Barrel exports**: Each module exports public API through `index.ts`
- **No relative imports**: Between modules, only use absolute module imports
- **Internal relative imports**: Within modules, use relative imports for internal files

## Approach Options

**Option A: Big Bang Migration**
- Pros: Complete reorganization in single effort, no intermediate states
- Cons: High risk, difficult to test incrementally, potential for breaking changes

**Option B: Incremental Module Migration** (Selected)
- Pros: Lower risk, testable at each step, maintains working system throughout
- Cons: Longer timeline, temporary mixed architecture states

**Option C: Parallel Development**
- Pros: Maintains current system while building new structure
- Cons: Code duplication, complex merge process, resource intensive

**Rationale:** Option B provides the best balance of risk management and systematic progress. Each module can be migrated and tested independently while maintaining system functionality.

## External Dependencies

**No new external dependencies required** - This reorganization uses existing libraries and frameworks:
- Existing TypeScript interfaces and types
- Current React patterns and hooks
- Established testing framework (Vitest)
- Present build and deployment tools

## Data Interface Specifications

### PriceProjectionInterface
```typescript
interface PriceProjectionService {
  generateProjectionForStrategy(
    modelId: string,
    params: PriceModelParams,
    historicalData: HistoricalDataPoint[]
  ): Promise<StrategyPriceData>
}
```

### StrategyInterface
```typescript
interface StrategyExecutionService {
  executeStrategy(
    strategyParams: StrategyParams,
    priceProjection: StrategyPriceData,
    historicalData: HistoricalDataPoint[]
  ): Promise<StrategyExecutionResult>
}
```

### ResultsInterface
```typescript
interface ResultsAnalysisService {
  analyzeWithPriceProjection(
    strategyResults: StrategyExecutionResult,
    originalProjection: PriceProjectionResult
  ): Promise<EnhancedResultsAnalysis>
}
```

## Migration Strategy

### Phase 1: Shared Interfaces
Create shared interface definitions and adapter base classes in `src/modules/shared/interfaces/`

### Phase 2: Module Creation
Create module directories and migrate code incrementally:
- Parameters module: Loan parameters, platform configurations, validation
- Price Projection module: Models, registry, generation services
- Strategies module: Strategy implementations, execution services
- Results module: Analysis, visualization, export functionality
- Price Data module: Historical data, API services, caching

### Phase 3: Data Flow Implementation
Implement cross-module data contracts and adapters:
- PriceProjectionAdapter for strategy consumption
- StrategyResultsAdapter for results analysis
- Data validation and transformation utilities

### Phase 4: Test Migration
Move and update all test files to new locations:
- Root test files → appropriate module `__tests__/` directories
- Integration tests → `__tests__/integration/`
- Update import paths and test configurations

### Phase 5: Agent OS Updates
Update documentation and configuration files:
- Standards for modular architecture
- Development instructions and workflows
- Product specifications and requirements

## Root Directory Cleanup Specifications

### Files to Remove (Obsolete/Temporary)
```
# Test files to migrate to appropriate modules
test-ath-strategy.js → src/modules/strategies/__tests__/implementations/ath-strategy.test.ts
test-calculations.js → src/modules/parameters/__tests__/calculationsService.test.ts
test-collateral-analysis.js → src/modules/parameters/__tests__/collateral-analysis.test.ts
test-preset-integration.js → src/modules/parameters/__tests__/preset-integration.test.ts
test-preset-system.js → src/modules/parameters/__tests__/preset-system.test.ts
test-price-models.js → src/modules/price-projection/__tests__/price-models.test.ts
test-savings-withdrawal.js → src/modules/strategies/__tests__/savings-withdrawal.test.ts
verify-calculations.js → src/modules/parameters/__tests__/calculations-verification.test.ts
verify-collateral-consolidation.js → src/modules/parameters/__tests__/collateral-consolidation.test.ts
verify-component-refactoring.js → __tests__/integration/component-refactoring.test.ts
verify-liquidation-extraction.js → src/modules/parameters/__tests__/liquidation-extraction.test.ts
verify-react-integration.js → __tests__/integration/react-integration.test.ts

# Files to remove (obsolete)
analyze-api-status.ts
api-based-data-insert.ts
backup-data-inserter.ts
comprehensive-database-fix.ts
debug-api-issues.ts
direct-database-insert.ts
direct-postgres-seeder.ts
final-gap-filling-process.ts
final-verification.ts
resume-gap-filling.ts
simple-gap-filler.ts
test-api-endpoints.ts
test-complete-migration.ts
test-comprehensive-gap-filling.ts
test-connection-manager.ts
test-daily-updates.ts
test-database-connection.ts
test-db-connection.ts
test-enhanced-apis-with-keys.ts
test-enhanced-apis.ts
test-gap-detection.ts
test-gap-filling.ts
test-large-historical-request.ts

# Directories to remove
app/simulation-fixed/
app/simulation-new/
273/ (if obsolete)
```

### Files to Relocate
```
# Analysis documentation
analysis/ → docs/architecture/
  - All .md files moved to docs/architecture/
  - .ts files evaluated for relevance or removal

# Bitcoin data files (if needed)
bitcoin-price-backup.json → public/data/bitcoin/ (if still needed)
bitcoin-price-insert.sql → scripts/database/ (if still needed)
```

## Performance Considerations

### Module Loading
- Lazy loading for non-critical modules
- Tree shaking optimization for unused code
- Barrel exports to minimize bundle size

### Data Flow Optimization
- Memoization for expensive calculations
- Efficient data transformation in adapters
- Minimal data copying between modules

### Build Performance
- Incremental TypeScript compilation
- Module-based testing for faster feedback
- Optimized import resolution
