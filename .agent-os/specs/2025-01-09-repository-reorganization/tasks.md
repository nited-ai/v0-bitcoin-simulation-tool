# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-01-09-repository-reorganization/spec.md

> Created: 2025-01-09
> Status: Ready for Implementation

## Tasks

- [ ] 1. Create Shared Module Infrastructure
  - [ ] 1.1 Write tests for PriceProjectionInterface, StrategyInterface, ResultsInterface in `src/modules/shared/__tests__/interfaces/`
  - [ ] 1.2 Create complete directory structure: `src/modules/shared/{interfaces,adapters,types,utils,__tests__}/`
  - [ ] 1.3 Create `src/modules/shared/interfaces/PriceProjectionInterface.ts` with PriceProjectionService, StrategyPriceData, StrategyPricePoint interfaces
  - [ ] 1.4 Create `src/modules/shared/interfaces/StrategyInterface.ts` with StrategyExecutionService, StrategyExecutionResult interfaces
  - [ ] 1.5 Create `src/modules/shared/interfaces/ResultsInterface.ts` with ResultsAnalysisService, EnhancedResultsAnalysis interfaces
  - [ ] 1.6 Create `src/modules/shared/adapters/PriceProjectionAdapter.ts` with convertForStrategy method and price line selection logic
  - [ ] 1.7 Create `src/modules/shared/adapters/StrategyResultsAdapter.ts` with enhanceWithProjectionContext method
  - [ ] 1.8 Create `src/modules/shared/types/index.ts` with shared TypeScript types (PriceLineType, ProjectionPoint, etc.)
  - [ ] 1.9 Create `src/modules/shared/utils/index.ts` with data validation and transformation utilities
  - [ ] 1.10 Create `src/modules/shared/index.ts` barrel export with all public APIs
  - [ ] 1.11 Verify all shared module tests pass and interfaces are properly typed

- [ ] 2. Migrate Parameters Module
  - [ ] 2.1 Write tests for migrated Parameters components in `src/modules/parameters/__tests__/`
  - [ ] 2.2 Create complete directory structure: `src/modules/parameters/{components,services,constants,hooks,__tests__}/`
  - [ ] 2.3 Move `LoanParametersCard.tsx` from `app/simulation/components/parameters/` to `src/modules/parameters/components/`
  - [ ] 2.4 Move `PlatformSelector.tsx` from `app/simulation/components/parameters/` to `src/modules/parameters/components/`
  - [ ] 2.5 Move `CollateralVisualizationCard.tsx` from `app/simulation/components/parameters/` to `src/modules/parameters/components/`
  - [ ] 2.6 Move `PriceDropToleranceCard.tsx` from `app/simulation/components/parameters/` to `src/modules/parameters/components/`
  - [ ] 2.7 Move `LoanUsageVisualizationCard.tsx` from `app/simulation/components/parameters/` to `src/modules/parameters/components/`
  - [ ] 2.8 Move `calculationsService.ts` from `app/simulation/components/parameters/` to `src/modules/parameters/services/`
  - [ ] 2.9 Move `platformPresets.ts` from `app/simulation/constants/` to `src/modules/parameters/constants/`
  - [ ] 2.10 Move `riskLevelPresets.ts` from `app/simulation/constants/` to `src/modules/parameters/constants/`
  - [ ] 2.11 Move `useParameterValidation.ts` from `app/simulation/hooks/` to `src/modules/parameters/hooks/`
  - [ ] 2.12 Move `useCalculationsIntegration.ts` from `app/simulation/hooks/` to `src/modules/parameters/hooks/`
  - [ ] 2.13 Update all import paths in moved files to use new module structure
  - [ ] 2.14 Create `src/modules/parameters/index.ts` barrel export
  - [ ] 2.15 Verify all Parameters module tests pass and components render correctly

- [ ] 3. Migrate Price Projection Module
  - [ ] 3.1 Write tests for all price models in `src/modules/price-projection/__tests__/models/`
  - [ ] 3.2 Create complete directory structure: `src/modules/price-projection/{models,services,components,hooks,__tests__}/`
  - [ ] 3.3 Move `ManualGrowthModel.ts` from `app/simulation/price-models/models/` to `src/modules/price-projection/models/`
  - [ ] 3.4 Move `PowerLawModel.ts` from `app/simulation/price-models/models/` to `src/modules/price-projection/models/`
  - [ ] 3.5 Move `CycleRepeatModel.ts` from `app/simulation/price-models/models/` to `src/modules/price-projection/models/`
  - [ ] 3.6 Move `EnhancedCycleRepeatModel.ts` from `app/simulation/price-models/models/` to `src/modules/price-projection/models/`
  - [ ] 3.7 Move `LogarithmicCurveRepeatModel.ts` from `app/simulation/price-models/models/` to `src/modules/price-projection/models/`
  - [ ] 3.8 Move `PriceModelRegistry.ts` from `app/simulation/price-models/` to `src/modules/price-projection/services/`
  - [ ] 3.9 Move `types.ts` from `app/simulation/price-models/` to `src/modules/price-projection/types/`
  - [ ] 3.10 Create `src/modules/price-projection/services/PriceProjectionService.ts` implementing PriceProjectionInterface
  - [ ] 3.11 Move price model selection components from `app/simulation/components/price-models/` to `src/modules/price-projection/components/`
  - [ ] 3.12 Move `usePriceGeneration.ts` from `app/simulation/hooks/` to `src/modules/price-projection/hooks/`
  - [ ] 3.13 Update all import paths in moved files to use new module structure and shared interfaces
  - [ ] 3.14 Create `src/modules/price-projection/index.ts` barrel export
  - [ ] 3.15 Verify all Price Projection module tests pass and models generate correct projections

- [ ] 4. Migrate Strategies Module
  - [ ] 4.1 Write tests for all strategy implementations in `src/modules/strategies/__tests__/implementations/`
  - [ ] 4.2 Create complete directory structure: `src/modules/strategies/{implementations,services,adapters,components,hooks,__tests__}/`
  - [ ] 4.3 Move `DefaultStrategy.ts` from `lib/strategy-engine/strategies/` to `src/modules/strategies/implementations/`
  - [ ] 4.4 Move `AthBasedStrategy.ts` from `lib/strategy-engine/strategies/` to `src/modules/strategies/implementations/`
  - [ ] 4.5 Move `MovingAverageStrategy.ts` from `lib/strategy-engine/strategies/` to `src/modules/strategies/implementations/`
  - [ ] 4.6 Move `AthCollateralStrategy.ts` from `lib/strategy-engine/strategies/` to `src/modules/strategies/implementations/`
  - [ ] 4.7 Move strategy engine core from `lib/strategy-engine/index.ts` to `src/modules/strategies/services/StrategyExecutionService.ts`
  - [ ] 4.8 Move strategy types from `lib/strategy-engine/types.ts` to `src/modules/strategies/types/`
  - [ ] 4.9 Create `src/modules/strategies/adapters/PriceProjectionAdapter.ts` using shared adapter base class
  - [ ] 4.10 Update all strategy implementations to consume StrategyPriceData interface instead of raw projections
  - [ ] 4.11 Create strategy selection components in `src/modules/strategies/components/`
  - [ ] 4.12 Move `useSimulationRunner.ts` from `app/simulation/hooks/` to `src/modules/strategies/hooks/`
  - [ ] 4.13 Update all import paths in moved files to use new module structure and shared interfaces
  - [ ] 4.14 Create `src/modules/strategies/index.ts` barrel export
  - [ ] 4.15 Verify all Strategies module tests pass and strategies execute correctly with new data flow

- [ ] 5. Migrate Results Module
  - [ ] 5.1 Write tests for all results components in `src/modules/results/__tests__/components/`
  - [ ] 5.2 Create complete directory structure: `src/modules/results/{components,services,adapters,hooks,__tests__}/`
  - [ ] 5.3 Move `ResultsPage.tsx` from `app/simulation/components/results/` to `src/modules/results/components/`
  - [ ] 5.4 Move `ResultsSummary.tsx` from `app/simulation/components/results/` to `src/modules/results/components/`
  - [ ] 5.5 Move `ResultsTable.tsx` from `app/simulation/components/results/` to `src/modules/results/components/`
  - [ ] 5.6 Move `RiskAssessment.tsx` from `app/simulation/components/results/` to `src/modules/results/components/`
  - [ ] 5.7 Move `UnifiedPriceChart.tsx` from `app/simulation/components/charts/` to `src/modules/results/components/`
  - [ ] 5.8 Move `PortfolioValueChart.tsx` from `app/simulation/components/charts/` to `src/modules/results/components/`
  - [ ] 5.9 Move `DebtCollateralChart.tsx` from `app/simulation/components/charts/` to `src/modules/results/components/`
  - [ ] 5.10 Move `LTVProgressionChart.tsx` from `app/simulation/components/charts/` to `src/modules/results/components/`
  - [ ] 5.11 Move `CashFlowChart.tsx` from `app/simulation/components/charts/` to `src/modules/results/components/`
  - [ ] 5.12 Move `CollateralAnalysisChart.tsx` from `app/simulation/components/charts/` to `src/modules/results/components/`
  - [ ] 5.13 Create `src/modules/results/services/ResultsAnalysisService.ts` implementing ResultsInterface
  - [ ] 5.14 Create `src/modules/results/services/ResultsProcessor.ts` for data aggregation and processing
  - [ ] 5.15 Create `src/modules/results/adapters/PriceProjectionResultsAdapter.ts` for projection context integration
  - [ ] 5.16 Move `useResultsAnalysis.ts` from `app/simulation/hooks/` to `src/modules/results/hooks/`
  - [ ] 5.17 Move `useResultsExport.ts` from `app/simulation/hooks/` to `src/modules/results/hooks/`
  - [ ] 5.18 Move `useResultsSummary.ts` from `app/simulation/hooks/` to `src/modules/results/hooks/`
  - [ ] 5.19 Move `useFinancialChartData.ts` from `app/simulation/hooks/` to `src/modules/results/hooks/`
  - [ ] 5.20 Update all import paths in moved files to use new module structure and shared interfaces
  - [ ] 5.21 Create `src/modules/results/index.ts` barrel export
  - [ ] 5.22 Verify all Results module tests pass and charts render correctly with new data flow

- [ ] 6. Migrate Price Data Module
  - [ ] 6.1 Write tests for all data services in `src/modules/price-data/__tests__/services/`
  - [ ] 6.2 Create complete directory structure: `src/modules/price-data/{services,processors,hooks,__tests__}/`
  - [ ] 6.3 Move `bitcoinJsonDataService.ts` from `lib/services/` to `src/modules/price-data/services/`
  - [ ] 6.4 Move `multiApiBitcoinService.ts` from `lib/services/` to `src/modules/price-data/services/`
  - [ ] 6.5 Move `centralizedDataService.ts` from `lib/services/` to `src/modules/price-data/services/`
  - [ ] 6.6 Move `bitcoinApiService.ts` from `app/simulation/data/` to `src/modules/price-data/services/`
  - [ ] 6.7 Move `AutoUpdateService.ts` from `app/simulation/data/` to `src/modules/price-data/services/`
  - [ ] 6.8 Move `csvUpdateManager.ts` from `app/simulation/data/` to `src/modules/price-data/services/`
  - [ ] 6.9 Move `comprehensiveGapFiller.ts` from `lib/services/` to `src/modules/price-data/processors/`
  - [ ] 6.10 Move `comprehensiveGapAnalyzer.ts` from `lib/services/` to `src/modules/price-data/processors/`
  - [ ] 6.11 Move `validationService.ts` from `lib/services/` to `src/modules/price-data/processors/`
  - [ ] 6.12 Create `src/modules/price-data/processors/DataValidator.ts` for data integrity checks
  - [ ] 6.13 Move `useCentralizedData.ts` from `app/simulation/hooks/` to `src/modules/price-data/hooks/`
  - [ ] 6.14 Move `useHistoricalData.ts` from `app/simulation/hooks/` to `src/modules/price-data/hooks/`
  - [ ] 6.15 Move `useATH.ts` from `app/simulation/hooks/` to `src/modules/price-data/hooks/`
  - [ ] 6.16 Update all import paths in moved files to use new module structure
  - [ ] 6.17 Create `src/modules/price-data/index.ts` barrel export
  - [ ] 6.18 Verify all Price Data module tests pass and data loading works correctly

- [ ] 7. Implement Cross-Module Integration
  - [ ] 7.1 Write integration tests in `__tests__/integration/cross-module-data-flow.test.ts`
  - [ ] 7.2 Test complete pipeline: PriceProjectionService → PriceProjectionAdapter → StrategyExecutionService
  - [ ] 7.3 Test Strategy → Results flow: StrategyExecutionResult → ResultsAnalysisService
  - [ ] 7.4 Test Price Projection → Results direct integration for accuracy analysis
  - [ ] 7.5 Test PriceProjectionAdapter.convertForStrategy() with all price line types (volatile, support, resistance, average)
  - [ ] 7.6 Test StrategyResultsAdapter.enhanceWithProjectionContext() preserves original projection data
  - [ ] 7.7 Validate data integrity: timestamps, prices, confidence scores throughout pipeline
  - [ ] 7.8 Test error handling: invalid projections, missing data, adapter failures
  - [ ] 7.9 Test performance: data transformation under 100ms, complete pipeline under 10 seconds
  - [ ] 7.10 Verify all integration tests pass and data flows correctly between modules

- [ ] 8. Clean Up Root Directory and Migrate Tests
  - [ ] 8.1 Write validation tests to ensure migrated functionality works identically
  - [ ] 8.2 Move `test-ath-strategy.js` to `src/modules/strategies/__tests__/implementations/ath-strategy.test.ts`
  - [ ] 8.3 Move `test-calculations.js` to `src/modules/parameters/__tests__/calculationsService.test.ts`
  - [ ] 8.4 Move `test-collateral-analysis.js` to `src/modules/parameters/__tests__/collateral-analysis.test.ts`
  - [ ] 8.5 Move `test-preset-integration.js` to `src/modules/parameters/__tests__/preset-integration.test.ts`
  - [ ] 8.6 Move `test-preset-system.js` to `src/modules/parameters/__tests__/preset-system.test.ts`
  - [ ] 8.7 Move `test-price-models.js` to `src/modules/price-projection/__tests__/price-models.test.ts`
  - [ ] 8.8 Move `test-savings-withdrawal.js` to `src/modules/strategies/__tests__/savings-withdrawal.test.ts`
  - [ ] 8.9 Move `verify-calculations.js` to `src/modules/parameters/__tests__/calculations-verification.test.ts`
  - [ ] 8.10 Move `verify-collateral-consolidation.js` to `src/modules/parameters/__tests__/collateral-consolidation.test.ts`
  - [ ] 8.11 Move `verify-component-refactoring.js` to `__tests__/integration/component-refactoring.test.ts`
  - [ ] 8.12 Move `verify-liquidation-extraction.js` to `src/modules/parameters/__tests__/liquidation-extraction.test.ts`
  - [ ] 8.13 Move `verify-react-integration.js` to `__tests__/integration/react-integration.test.ts`
  - [ ] 8.14 Remove obsolete files: `analyze-api-status.ts`, `api-based-data-insert.ts`, `backup-data-inserter.ts`, etc.
  - [ ] 8.15 Move analysis documentation from `analysis/` to `docs/architecture/`
  - [ ] 8.16 Remove duplicate directories: `app/simulation-fixed/`, `app/simulation-new/`
  - [ ] 8.17 Update test configurations in `vitest.config.ts` for new module structure
  - [ ] 8.18 Update all test import paths to use new module structure
  - [ ] 8.19 Verify all migrated tests pass in new locations and produce identical results

- [ ] 9. Update Application Integration
  - [ ] 9.1 Write tests for updated application entry points in `app/__tests__/`
  - [ ] 9.2 Update `app/simulation/SimulationPage.tsx` to import from new module structure
  - [ ] 9.3 Update `app/simulation/page.tsx` to use new module imports
  - [ ] 9.4 Update `app/simulation/context/SimulationContext.tsx` to use shared interfaces and new module imports
  - [ ] 9.5 Update `app/simulation/components/navigation/TabNavigation.tsx` to import from new modules
  - [ ] 9.6 Update all remaining files in `app/simulation/` to use new import paths: `@/modules/parameters`, `@/modules/price-projection`, etc.
  - [ ] 9.7 Update `components/price-model-chart.tsx` to use new price projection module
  - [ ] 9.8 Update `lib/utils.ts`, `lib/fonts.ts`, `lib/i18n.ts` import paths if needed
  - [ ] 9.9 Update `tsconfig.json` paths mapping to include new module structure
  - [ ] 9.10 Update `next.config.mjs` if needed for new module resolution
  - [ ] 9.11 Test complete application functionality: parameter input → price projection → strategy execution → results display
  - [ ] 9.12 Test all navigation tabs work correctly with new module structure
  - [ ] 9.13 Test all charts and visualizations render correctly
  - [ ] 9.14 Verify all application integration tests pass and user workflows function identically

- [ ] 10. Update Agent OS Configuration and Finalize
  - [ ] 10.1 Write validation tests for Agent OS configuration updates
  - [ ] 10.2 Verify `.agent-os/standards/modular-architecture.md` is complete and accurate
  - [ ] 10.3 Verify `.agent-os/instructions/modular-development.md` is complete and accurate
  - [ ] 10.4 Verify `.agent-os/product/data-flow-architecture.md` is complete and accurate
  - [ ] 10.5 Create `docs/architecture/migration-guide.md` with step-by-step migration documentation
  - [ ] 10.6 Create `docs/architecture/module-overview.md` with module responsibilities and interfaces
  - [ ] 10.7 Update `package.json` scripts if needed for new module structure
  - [ ] 10.8 Update `.gitignore` if needed for new directory structure
  - [ ] 10.9 Update `README.md` to reflect new modular architecture
  - [ ] 10.10 Run complete test suite: `pnpm test` and verify all tests pass
  - [ ] 10.11 Run build process: `pnpm build` and verify successful compilation
  - [ ] 10.12 Run development server: `pnpm dev` and verify application works correctly
  - [ ] 10.13 Verify all configuration updates are valid and functional
