# Modular Architecture Standards

> Version: 1.0.0
> Last updated: 2025-01-09
> Scope: Bitcoin Simulation Tool Repository Organization

## Context

This file defines the modular architecture standards for the Bitcoin simulation tool repository reorganization. These standards ensure consistent implementation of microservices principles, proper data flow management, and maintainable code organization.

## Core Principles

### Microservices Architecture
- **Independent Modules**: Each module must function independently with minimal external dependencies
- **Clear Boundaries**: Modules communicate only through well-defined interfaces
- **Single Responsibility**: Each module handles one primary functional area
- **Testable Isolation**: Modules can be tested independently with mocked dependencies

### Module Structure Standards

```
src/modules/[module-name]/
├── components/          # React components specific to this module
├── services/           # Business logic and API integration
├── hooks/              # React hooks for module functionality
├── types/              # TypeScript type definitions
├── constants/          # Module-specific constants
├── utils/              # Module-specific utility functions
├── __tests__/          # Unit and integration tests
└── index.ts            # Barrel export for public API
```

### Cross-Module Data Flow Standards

#### Data Interface Contracts
- All modules MUST define clear input/output interfaces in `src/modules/shared/interfaces/`
- Data transformation MUST happen in dedicated adapter classes
- No direct imports between modules - use shared interfaces only
- All cross-module data must be strongly typed with TypeScript

#### Price Projection → Strategy Flow
- Price projections MUST be converted via `PriceProjectionAdapter`
- Strategy modules MUST NOT directly import price model types
- Price line selection (volatile/support/resistance) handled in adapter
- Strategy context includes both price data and historical context

#### Strategy → Results Flow  
- Strategy results MUST include original price projection context
- Results modules MUST NOT directly access strategy internals
- Analysis MUST use provided `StrategyExecutionResult` interface
- Results maintain traceability to original price projections

#### Module Independence Requirements
- Each module MUST be testable in isolation
- Mock interfaces MUST be provided for cross-module dependencies
- Circular dependencies are STRICTLY FORBIDDEN
- Modules must gracefully handle missing or invalid dependencies

## Data Flow Architecture

### Primary Data Pipeline
```
Price Projection → Strategy Execution → Results Analysis
```

### Key Integration Points
1. **Price Selection**: Users select which price line (volatile/support/resistance) strategies use
2. **Strategy Context**: Strategies receive both price projections and historical data
3. **Results Context**: Results analysis includes original price projection for accuracy assessment

### Adapter Pattern Implementation

#### PriceProjectionAdapter
```typescript
// src/modules/strategies/adapters/PriceProjectionAdapter.ts
export class PriceProjectionAdapter {
  static convertForStrategy(
    projectionResult: PriceProjectionResult,
    selectedPriceLine: PriceLineType = 'volatile'
  ): StrategyPriceData
}
```

#### StrategyResultsAdapter
```typescript
// src/modules/results/adapters/StrategyResultsAdapter.ts
export class StrategyResultsAdapter {
  static enhanceWithProjectionContext(
    strategyResult: StrategyExecutionResult,
    originalProjection: PriceProjectionResult
  ): EnhancedResultsAnalysis
}
```

## Module Specifications

### Parameters Module
- **Responsibility**: Loan parameters, platform configurations, user input validation
- **Key Components**: Parameter cards, validation services, calculation utilities
- **Dependencies**: None (fully independent)
- **Exports**: Parameter validation, calculation services, platform presets

### Price Projection Module
- **Responsibility**: Bitcoin price forecasting models and projection generation
- **Key Components**: Price models, registry, generation services
- **Dependencies**: Price Data module for historical data
- **Exports**: Price projection service, model registry, projection results

### Strategies Module
- **Responsibility**: Investment strategy implementations and execution
- **Key Components**: Strategy classes, execution service, decision logic
- **Dependencies**: Price Projection module (via adapter), Price Data module
- **Exports**: Strategy execution service, strategy implementations

### Results Module
- **Responsibility**: Simulation results analysis and visualization
- **Key Components**: Charts, analysis services, export functionality
- **Dependencies**: Strategies module, Price Projection module (via adapter)
- **Exports**: Results analysis service, visualization components

### Price Data Module
- **Responsibility**: Historical Bitcoin data management and API integration
- **Key Components**: Data loaders, API services, caching mechanisms
- **Dependencies**: None (fully independent)
- **Exports**: Historical data service, API integration, caching utilities

### Shared Module
- **Responsibility**: Cross-module interfaces, adapters, and common utilities
- **Key Components**: Interface definitions, adapter classes, utility functions
- **Dependencies**: None (provides dependencies to others)
- **Exports**: Interfaces, adapters, shared types, common utilities

## Performance Standards

### Module Loading
- Lazy loading for non-critical modules
- Tree shaking optimization for unused code
- Barrel exports to minimize bundle size
- Dynamic imports for large components

### Data Flow Optimization
- Memoization for expensive calculations
- Efficient data transformation in adapters
- Minimal data copying between modules
- Caching strategies for frequently accessed data

### Build Performance
- Incremental TypeScript compilation
- Module-based testing for faster feedback
- Optimized import resolution
- Parallel processing where possible

## Testing Standards

### Unit Testing
- Each module must have comprehensive unit tests
- Tests co-located in `__tests__/` directories
- Mock external dependencies and cross-module interfaces
- Minimum 80% code coverage for new modules

### Integration Testing
- Cross-module data flow must be integration tested
- Test complete pipeline: Price Projection → Strategy → Results
- Test error handling and recovery scenarios
- Performance testing for data transformation

### Test Organization
```
src/modules/[module-name]/__tests__/
├── unit/               # Unit tests for module components
├── integration/        # Integration tests with other modules
└── mocks/              # Mock implementations for testing
```

## Migration Guidelines

### Incremental Migration Strategy
1. Create shared interfaces and adapters first
2. Migrate modules one at a time
3. Maintain backward compatibility during transition
4. Test each module thoroughly before proceeding
5. Update documentation and configuration last

### Validation Requirements
- All existing functionality must work identically after migration
- No performance regression allowed
- All tests must pass in new locations
- Import paths must resolve correctly
- Build and deployment processes must work unchanged

## Error Handling Standards

### Module-Level Error Boundaries
- Each module should implement error boundaries
- Graceful degradation when dependencies fail
- Clear error messages for debugging
- Logging and monitoring integration

### Cross-Module Error Propagation
- Errors should not cascade between modules
- Each module handles its own error states
- Adapter classes validate data and handle transformation errors
- User-friendly error messages for UI components
