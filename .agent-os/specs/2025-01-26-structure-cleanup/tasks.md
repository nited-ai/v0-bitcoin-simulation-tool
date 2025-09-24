# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-01-26-structure-cleanup/spec.md

> Created: 2025-01-26
> Status: Ready for Implementation

## Tasks

- [ ] 1. Remove Redundant and Broken Files
  - [ ] 1.1 Write tests to verify current application functionality as baseline
  - [ ] 1.2 Remove empty `src/app/` directory (completely empty, safe to delete)
  - [ ] 1.3 Remove broken duplicate components in `src/modules/parameters/components/` (broken imports)
  - [ ] 1.4 Remove broken duplicate components in `src/modules/results/components/` (broken imports)
  - [ ] 1.5 Remove broken duplicate components in `src/modules/price-projection/components/` (broken imports)
  - [ ] 1.6 Remove broken duplicate components in `src/modules/strategies/components/` (broken imports)
  - [ ] 1.7 Remove broken duplicate hooks in `src/modules/parameters/hooks/` (broken imports)
  - [ ] 1.8 Remove broken duplicate hooks in `src/modules/results/hooks/` (broken imports)
  - [ ] 1.9 Verify application still starts and functions after cleanup
  - [ ] 1.10 Verify all tests pass after redundant file removal

- [ ] 2. Consolidate Library Structure
  - [ ] 2.1 Write tests for library import functionality
  - [ ] 2.2 Move `src/lib/database/` to `lib/database/` (database utilities)
  - [ ] 2.3 Move `src/lib/price-engine/` to `lib/price-engine/` (price modeling)
  - [ ] 2.4 Move `src/lib/services/` to `lib/services/` (business services)
  - [ ] 2.5 Move `src/lib/strategy-engine/` to `lib/strategy-engine/` (strategy implementations)
  - [ ] 2.6 Move `src/lib/fonts.ts` to `lib/fonts.ts` (font configurations)
  - [ ] 2.7 Move `src/lib/i18n.ts` to `lib/i18n.ts` (internationalization)
  - [ ] 2.8 Move `src/lib/utils.ts` to `lib/utils.ts` (utility functions)
  - [ ] 2.9 Move `src/lib/load-btc-price.ts` to `lib/load-btc-price.ts` (price loading)
  - [ ] 2.10 Update import paths from `@/src/lib/*` to `@/lib/*` in all affected files
  - [ ] 2.11 Update tsconfig.json path mappings for consolidated lib structure
  - [ ] 2.12 Test that all services and utilities work with new import paths
  - [ ] 2.13 Verify all tests pass after library consolidation

- [ ] 3. Reorganize Components by Feature/Tab
  - [ ] 3.1 Write tests for component organization and imports
  - [ ] 3.2 Create new tab-based directory structure: `app/simulation/tabs/`
  - [ ] 3.3 Create `app/simulation/tabs/parameters/` and move BasicParametersCard, LoanParametersCard, RiskLevelSelector, PlatformSelector, CollateralVisualizationCard, PriceDropToleranceCard
  - [ ] 3.4 Create `app/simulation/tabs/price-projection/` and move PriceModelSelector, UnifiedPriceChart, and all price model components
  - [ ] 3.5 Create `app/simulation/tabs/results/` and move ResultsPage, ResultsSummary, ResultsTable, and all chart components
  - [ ] 3.6 Create `app/simulation/shared/` and move TabNavigation, SimulationHeader, and cross-tab components
  - [ ] 3.7 Create barrel export `index.ts` files for each tab directory
  - [ ] 3.8 Update TabNavigation.tsx to import from new tab locations
  - [ ] 3.9 Update all internal component imports to use new tab-based structure
  - [ ] 3.10 Verify all components render correctly in new locations
  - [ ] 3.11 Verify all tests pass after component reorganization

- [ ] 4. Update Configuration and Final Validation
  - [ ] 4.1 Write tests for TypeScript compilation and import resolution
  - [ ] 4.2 Update tsconfig.json with final path mappings for all new structures
  - [ ] 4.3 Fix any remaining import path issues discovered by TypeScript compiler
  - [ ] 4.4 Run complete test suite to ensure no regressions
  - [ ] 4.5 Test all user workflows end-to-end (parameters → price projection → results)
  - [ ] 4.6 Verify application performance is not negatively impacted
  - [ ] 4.7 Document new file structure in project documentation
  - [ ] 4.8 Verify all tests pass and application is fully functional
