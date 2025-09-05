# Module Overview

> Created: 2025-01-09
> Version: 1.0.0
> Status: Complete

## Overview

This document provides a comprehensive overview of all modules in the Bitcoin simulation tool, their responsibilities, interfaces, and relationships.

## Module Architecture

```
src/modules/
├── parameters/      # Loan and simulation parameter management
├── price-projection/# Bitcoin price forecasting models
├── strategies/      # Investment and accumulation strategies
├── results/         # Analysis and visualization of results
├── price-data/      # Historical data management and APIs
└── shared/          # Common interfaces and utilities
```

## Module Details

### 1. Parameters Module (`src/modules/parameters/`)

**Responsibility**: Manages all simulation parameters including loan configurations, platform settings, and risk levels.

**Key Components**:
- `LoanParametersCard.tsx` - Loan configuration UI
- `PlatformSelector.tsx` - Platform selection and custom platform creation
- `CollateralVisualizationCard.tsx` - Collateral usage visualization
- `PriceDropToleranceCard.tsx` - Risk tolerance configuration

**Key Services**:
- `calculationsService.ts` - Core financial calculations
- Platform and risk level preset management

**Public Interface**:
```typescript
// Types
export type { SimulationParams, PlatformConfig, RiskLevel }

// Services
export { calculationsService }

// Components
export { LoanParametersCard, PlatformSelector }

// Constants
export { PLATFORM_CONFIGS, RISK_LEVEL_PRESETS }
```

**Dependencies**: 
- Shared interfaces for type definitions
- UI components from `@/components/ui`

### 2. Price Projection Module (`src/modules/price-projection/`)

**Responsibility**: Provides Bitcoin price forecasting using various mathematical models.

**Key Models**:
- `ManualGrowthModel.ts` - User-defined growth rates
- `PowerLawModel.ts` - Power law price progression
- `CycleRepeatModel.ts` - Historical cycle repetition
- `EnhancedCycleRepeatModel.ts` - Advanced cycle modeling

**Key Services**:
- `PriceModelRegistry.ts` - Model registration and management
- `PriceProjectionService.ts` - Unified projection interface

**Key Components**:
- `PriceModelSelector.tsx` - Model selection UI
- `GrowthRateAnalysis.tsx` - Growth rate visualization
- Model-specific control components

**Public Interface**:
```typescript
// Types
export type { PriceProjectionResult, PriceModelParams }

// Services
export { priceModelRegistry, PriceProjectionService }

// Models
export { ManualGrowthModel, PowerLawModel }

// Components
export { PriceModelSelector, GrowthRateAnalysis }
```

**Dependencies**:
- Price data module for historical data
- Shared interfaces for data transformation

### 3. Strategies Module (`src/modules/strategies/`)

**Responsibility**: Implements investment and accumulation strategies based on price projections.

**Key Implementations**:
- `DefaultStrategy.ts` - Basic buy-and-hold strategy
- `AthBasedStrategy.ts` - All-time-high based decisions
- `MovingAverageStrategy.ts` - Moving average strategies
- `AthCollateralStrategy.ts` - ATH-based collateral management

**Key Services**:
- `StrategyExecutionService.ts` - Strategy execution engine

**Key Adapters**:
- `PriceProjectionAdapter.ts` - Converts price projections for strategy use

**Public Interface**:
```typescript
// Types
export type { StrategyExecutionResult, StrategyParams }

// Services
export { StrategyExecutionService }

// Implementations
export { DefaultStrategy, AthBasedStrategy }

// Adapters
export { PriceProjectionAdapter }
```

**Dependencies**:
- Price projection module for price data
- Parameters module for configuration
- Shared interfaces for data flow

### 4. Results Module (`src/modules/results/`)

**Responsibility**: Analyzes simulation results and provides visualization components.

**Key Components**:
- `ResultsPage.tsx` - Main results display
- `UnifiedPriceChart.tsx` - Price and projection visualization
- `PortfolioValueChart.tsx` - Portfolio value over time
- `DebtCollateralChart.tsx` - Debt and collateral tracking
- `LTVProgressionChart.tsx` - Loan-to-value progression
- `CashFlowChart.tsx` - Cash flow analysis

**Key Services**:
- `ResultsAnalysisService.ts` - Results analysis and insights
- `ResultsProcessor.ts` - Data aggregation and processing

**Key Adapters**:
- `PriceProjectionResultsAdapter.ts` - Integrates projection context

**Public Interface**:
```typescript
// Types
export type { EnhancedMonthlyResult, ResultsInsights }

// Services
export { ResultsAnalysisService }

// Components
export { ResultsPage, UnifiedPriceChart, PortfolioValueChart }

// Adapters
export { PriceProjectionResultsAdapter }
```

**Dependencies**:
- All other modules for comprehensive analysis
- Chart libraries for visualization

### 5. Price Data Module (`src/modules/price-data/`)

**Responsibility**: Manages historical Bitcoin price data, API integrations, and data validation.

**Key Services**:
- `bitcoinJsonDataService.ts` - JSON data management
- `multiApiBitcoinService.ts` - Multiple API integration
- `centralizedDataService.ts` - Unified data access
- `bitcoinApiService.ts` - API communication
- `AutoUpdateService.ts` - Automatic data updates

**Key Processors**:
- `comprehensiveGapFiller.ts` - Data gap filling
- `validationService.ts` - Data validation
- `DataValidator.ts` - Validation logic

**Key Hooks**:
- `useCentralizedData.ts` - Centralized data access
- `useHistoricalData.ts` - Historical data management
- `useATH.ts` - All-time-high tracking

**Public Interface**:
```typescript
// Services
export { centralizedDataService, bitcoinApiService }

// Hooks
export { useCentralizedData, useHistoricalData, useATH }

// Types
export type { HistoricalDataPoint, PriceDataConfig }
```

**Dependencies**:
- External APIs (CoinCap, CoinDesk)
- Database for data persistence
- Shared utilities for validation

### 6. Shared Module (`src/modules/shared/`)

**Responsibility**: Provides common interfaces, utilities, and base classes used across modules.

**Key Interfaces**:
- `PriceProjectionInterface.ts` - Price projection contracts
- `StrategyInterface.ts` - Strategy implementation contracts
- `ResultsInterface.ts` - Results analysis contracts

**Key Adapters**:
- `PriceProjectionAdapter.ts` - Base adapter for price data transformation
- `StrategyResultsAdapter.ts` - Base adapter for results enhancement

**Key Utilities**:
- Common utility functions
- Shared type definitions
- UI components (NumberInput)

**Public Interface**:
```typescript
// Interfaces
export type { IPriceProjectionService, IStrategyExecutionService }

// Adapters
export { PriceProjectionAdapter, StrategyResultsAdapter }

// UI Components
export { NumberInput }

// Utilities
export { formatCurrency, validateNumber }
```

**Dependencies**:
- UI component library
- Utility libraries

## Data Flow Between Modules

```
Parameters → Price Projection → Strategies → Results
     ↓              ↓              ↓         ↑
Price Data ←→ Shared Interfaces ←→ Shared ←→ All Modules
```

## Module Communication Patterns

1. **Interface-Based Communication**: Modules communicate through well-defined interfaces
2. **Adapter Pattern**: Data transformation handled by dedicated adapters
3. **Event-Driven Updates**: React hooks manage state updates across modules
4. **Barrel Exports**: Clean import/export through module index files

## Testing Strategy

Each module includes:
- Unit tests for services and utilities
- Component tests for React components
- Integration tests for cross-module communication
- Mock implementations for external dependencies

## Performance Considerations

- **Lazy Loading**: Components loaded on demand
- **Memoization**: Expensive calculations cached
- **Data Streaming**: Large datasets processed incrementally
- **Module Boundaries**: Clear separation prevents unnecessary re-renders
