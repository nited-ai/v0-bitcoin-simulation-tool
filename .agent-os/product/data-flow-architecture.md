# Data Flow Architecture

> Version: 1.0.0
> Last updated: 2025-01-09
> Scope: Bitcoin Simulation Tool Data Flow Specifications

## Overview

This document defines the data flow architecture for the Bitcoin simulation tool, specifying how data moves between modules, the interfaces used for communication, and the performance requirements for each integration point.

## Core Data Pipeline

### Primary Flow
```
Price Projection → Strategy Execution → Results Analysis
```

### Secondary Flows
```
Price Data → Price Projection (historical data input)
Price Data → Strategy Execution (historical context)
Price Projection → Results Analysis (accuracy assessment)
Parameters → All Modules (configuration)
```

## Data Flow Specifications

### 1. Price Projection → Strategy Integration

#### Data Interface
```typescript
interface StrategyPriceData {
  projectionPoints: StrategyPricePoint[]
  metadata: PriceProjectionMetadata
  supportLines?: number[]
  resistanceLines?: number[]
}

interface StrategyPricePoint {
  timestamp: number
  price: number           // Main price for strategy decisions
  supportPrice?: number   // Conservative price estimate
  resistancePrice?: number // Optimistic price estimate
  confidence: number
}
```

#### Transformation Process
1. **Price Line Selection**: User selects which price line (volatile/support/resistance) strategies should use
2. **Adapter Conversion**: `PriceProjectionAdapter` converts `PriceProjectionResult` to `StrategyPriceData`
3. **Data Validation**: Adapter validates data integrity and completeness
4. **Context Preservation**: Original projection metadata maintained for traceability

#### Performance Requirements
- Conversion time: < 100ms for 144-month projections
- Memory overhead: < 10% of original projection size
- Data integrity: 100% accuracy in transformation

### 2. Strategy → Results Integration

#### Data Interface
```typescript
interface StrategyExecutionResult {
  monthlyResults: MonthlyResult[]
  priceProjectionUsed: StrategyPriceData
  strategyMetadata: StrategyMetadata
  executionSummary: ExecutionSummary
}

interface EnhancedResultsAnalysis {
  monthlyResults: MonthlyResult[]
  priceProjectionAccuracy: ProjectionAccuracyMetrics
  strategyPerformance: StrategyPerformanceMetrics
  riskAssessment: RiskAssessmentData
}
```

#### Context Preservation
1. **Original Projection Context**: Strategy results include the price projection data used
2. **Strategy Metadata**: Decision logic and parameters preserved for analysis
3. **Execution Summary**: Performance metrics and key decisions tracked
4. **Traceability**: Full audit trail from price projection through strategy to results

#### Performance Requirements
- Strategy execution: < 5 seconds for 144-month simulations
- Results processing: < 1 second for analysis generation
- Memory usage: < 50MB for complete simulation

### 3. Price Projection → Results Direct Integration

#### Purpose
- **Accuracy Assessment**: Compare projected prices with actual strategy performance
- **Visualization**: Display original projections alongside strategy results
- **Analysis**: Evaluate projection model effectiveness

#### Data Interface
```typescript
interface ProjectionAccuracyMetrics {
  modelUsed: string
  projectionConfidence: number
  actualVsProjected: ComparisonData[]
  accuracyScore: number
  deviationAnalysis: DeviationMetrics
}
```

#### Performance Requirements
- Accuracy calculation: < 500ms
- Comparison data generation: < 200ms
- Visualization data preparation: < 300ms

## Module Integration Specifications

### Parameters Module Integration

#### Input to All Modules
- **Loan Parameters**: Interest rates, terms, LTV ratios
- **Platform Configurations**: Firefish, Strike, custom platform settings
- **Risk Management**: Target LTV, liquidation thresholds
- **User Preferences**: BTC accumulation, withdrawal amounts

#### Validation Requirements
- Parameter validation before module consumption
- Cross-parameter consistency checks
- Platform-specific constraint enforcement
- Real-time validation feedback

### Price Data Module Integration

#### Historical Data Provision
- **To Price Projection**: Historical price data for model training and validation
- **To Strategy Execution**: Market context for decision making
- **To Results Analysis**: Baseline data for performance comparison

#### Data Quality Standards
- **Completeness**: No gaps in historical data
- **Accuracy**: Validated against multiple sources
- **Timeliness**: Updated within 24 hours of market close
- **Format Consistency**: Standardized timestamp and price formats

### Shared Module Integration

#### Interface Management
- **Type Definitions**: Shared TypeScript interfaces for all modules
- **Adapter Classes**: Data transformation utilities
- **Validation Utilities**: Common validation logic
- **Error Handling**: Standardized error types and handling

#### Performance Optimization
- **Memoization**: Cache expensive calculations
- **Lazy Loading**: Load modules on demand
- **Tree Shaking**: Eliminate unused code
- **Bundle Optimization**: Minimize module interdependencies

## Data Consistency Standards

### Timestamp Standardization
- **Format**: Unix milliseconds (number)
- **Timezone**: UTC for all calculations
- **Precision**: Millisecond accuracy maintained
- **Validation**: Timestamp range and format validation

### Price Data Standardization
- **Currency**: EUR (base currency for all calculations)
- **Precision**: 2 decimal places for display, full precision for calculations
- **Validation**: Positive values, reasonable range checks
- **Normalization**: Consistent formatting across modules

### Percentage Standardization
- **Format**: Decimal format (0.05 = 5%)
- **Range Validation**: Appropriate ranges for different percentage types
- **Display**: Percentage format for user interface
- **Calculations**: Decimal format for all computations

## Error Handling and Recovery

### Data Flow Error Scenarios

#### Price Projection Failures
- **Fallback**: Use last successful projection
- **User Notification**: Clear error message with retry option
- **Logging**: Detailed error information for debugging
- **Recovery**: Automatic retry with exponential backoff

#### Strategy Execution Failures
- **Graceful Degradation**: Continue with default strategy
- **Partial Results**: Display available results with warnings
- **Error Boundaries**: Prevent cascade failures
- **User Feedback**: Actionable error messages

#### Cross-Module Communication Failures
- **Timeout Handling**: Reasonable timeouts for all operations
- **Retry Logic**: Automatic retry for transient failures
- **Circuit Breaker**: Prevent repeated failures
- **Monitoring**: Track failure rates and performance

### Data Validation Standards

#### Input Validation
- **Type Checking**: Strict TypeScript type validation
- **Range Validation**: Appropriate value ranges for all inputs
- **Format Validation**: Consistent data formats
- **Completeness**: Required fields validation

#### Output Validation
- **Data Integrity**: Verify data consistency after transformation
- **Completeness**: Ensure all required fields are present
- **Accuracy**: Validate calculation results
- **Performance**: Monitor transformation performance

## Performance Monitoring

### Key Performance Indicators

#### Data Flow Performance
- **Price Projection Generation**: Target < 2 seconds
- **Strategy Execution**: Target < 5 seconds
- **Results Analysis**: Target < 1 second
- **Cross-Module Data Transformation**: Target < 100ms

#### System Performance
- **Memory Usage**: Monitor memory consumption per module
- **CPU Usage**: Track computational efficiency
- **Network Requests**: Minimize external API calls
- **Cache Hit Rates**: Optimize caching strategies

### Performance Optimization Strategies

#### Caching
- **Price Projections**: Cache generated projections
- **Historical Data**: Cache frequently accessed data
- **Calculation Results**: Cache expensive calculations
- **User Preferences**: Cache user settings

#### Lazy Loading
- **Module Loading**: Load modules on demand
- **Component Loading**: Lazy load heavy components
- **Data Loading**: Progressive data loading
- **Image Loading**: Optimize image loading

## Security Considerations

### Data Privacy
- **User Data**: Protect user simulation parameters
- **API Keys**: Secure storage of API credentials
- **Local Storage**: Encrypt sensitive local data
- **Session Management**: Secure session handling

### Data Integrity
- **Input Sanitization**: Validate all user inputs
- **Output Validation**: Verify calculation results
- **Cross-Module Validation**: Validate data at module boundaries
- **Audit Trail**: Maintain data transformation logs
