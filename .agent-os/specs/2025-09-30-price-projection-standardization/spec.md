# Spec Requirements Document

> Spec: Price Projection Output Standardization & Legacy System Elimination  
> Created: 2025-09-30  
> Status: Planning

## Overview

Eliminate all legacy price projection formats and standardize on a single output format across the entire application, reducing maintenance burden by 50%+ and removing ~500 lines of adapter code. This refactoring will establish `app/simulation/price-models/types.ts` as the single source of truth for all price projection data, removing duplicate type definitions and incompatible formats.

## User Stories

### Complete Format Standardization

As a developer working on the Bitcoin Simulation Tool, I want all price projection models to output a single standardized format, so that I don't have to write conversion code or worry about format incompatibilities when integrating new features.

**Workflow**: Developer implements a new strategy or results visualization → Uses `PriceProjectionResult` from standard types → Data flows seamlessly through Parameters → Price Projection → Strategies → Results without any format conversion → Developer saves time and avoids bugs from format mismatches.

### Simplified Data Flow

As a maintainer of the codebase, I want clear, standardized interfaces for data exchange between tabs, so that I can easily understand how data flows through the application and quickly identify issues.

**Workflow**: Maintainer reviews code → Sees consistent `PriceProjectionResult` type everywhere → Understands data flow immediately → Can trace data from generation to consumption without navigating through multiple adapter layers → Maintenance becomes straightforward.

### Reduced Technical Debt

As a team lead, I want to eliminate duplicate code and legacy systems, so that the codebase is easier to maintain, test, and extend with new features.

**Workflow**: Team reviews codebase → Identifies ~500 lines of adapter code → Executes migration plan → Removes old type definitions and conversion layers → Codebase becomes 30% smaller → Team velocity increases due to reduced complexity.

## Spec Scope

1. **Single Standard Format** - Migrate all code to use ONLY `PriceProjectionResult` from `app/simulation/price-models/types.ts`
2. **Legacy System Removal** - Delete old format (`src/modules/price-projection/types/`) and legacy `PriceChartDataPoint[]` arrays
3. **Standardized Data Exchange** - Define clear interfaces for Parameters → Price Projection → Strategies → Results data flow
4. **Hook Migration** - Update all hooks (`usePriceProjection`, `usePriceGeneration`, `usePriceData`) to use `UnifiedPriceProjectionService`
5. **Component Migration** - Update all components to use `PriceProjectionAdapter` for format conversion
6. **Code Cleanup** - Remove duplicate type definitions, redundant adapters, and unnecessary conversion layers
7. **PriceDataService Refactoring** - Refactor to use `UnifiedPriceProjectionService` internally or deprecate entirely
8. **Test Updates** - Update all tests to use new standard format
9. **Documentation Updates** - Update all documentation to reflect new architecture

## Out of Scope

- Adding new price projection models (focus is on standardization)
- UI/UX changes to existing components (only internal data format changes)
- Performance optimizations beyond what standardization naturally provides
- Database schema changes (this is a code-level refactoring)
- API endpoint changes (internal refactoring only)

## Expected Deliverable

1. **Zero Format Conversions** - All code uses `PriceProjectionResult` directly without conversion adapters
2. **~500 Lines Removed** - Elimination of legacy adapter code, duplicate types, and old format definitions
3. **Single Type Definition** - `PriceProjectionResult` exists in only one location (`app/simulation/price-models/types.ts`)
4. **All Tests Passing** - Complete test suite passes with new standardized format
5. **Updated Documentation** - All docs reflect new architecture and migration is complete

## Spec Documentation

- Tasks: @.agent-os/specs/2025-09-30-price-projection-standardization/tasks.md
- Technical Specification: @.agent-os/specs/2025-09-30-price-projection-standardization/sub-specs/technical-spec.md
- Migration Plan: @.agent-os/specs/2025-09-30-price-projection-standardization/sub-specs/migration-plan.md
- Tests Specification: @.agent-os/specs/2025-09-30-price-projection-standardization/sub-specs/tests.md

