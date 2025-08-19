# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-27-angle-adjustment-volatility/spec.md

> Created: 2025-01-27
> Version: 1.0.0

## Test Coverage

### Unit Tests

**EnhancedCycleRepeatModel**
- Test `calculateRawFinalPrice` method with various historical multiplier patterns
- Test `applyDiminishingReturnsToEndpoint` method with different diminishing returns parameters
- Test `calculateAngleAdjustment` method for correct trajectory factor calculation
- Test `applyAngleAdjustmentToPrice` method with various time progress values
- Test `getEnhancedCycleRepeatPrice` method with angle adjustment implementation
- Test volatility preservation by comparing output multipliers to historical patterns
- Test edge cases with extreme diminishing returns parameters (0% and 100%)
- Test mathematical accuracy of angle adjustment calculations

**Volatility Preservation Tests**
- Verify 80%+ drawdowns are preserved in projection output
- Verify dramatic pump multipliers (1.5x+ daily gains) remain intact
- Compare volatility metrics between old and new implementations
- Test that angle adjustment doesn't artificially smooth volatility patterns

**Diminishing Returns Integration Tests**
- Test that final prices still reflect diminishing returns theory
- Verify that different preset scenarios (Conservative/Moderate/Optimistic) produce different trajectories
- Test that market maturity effects are applied to endpoints, not daily movements
- Verify cycle degradation affects overall trajectory while preserving volatility

### Integration Tests

**Chart Integration**
- Test that UnifiedPriceChart displays increased volatility correctly
- Verify that support/resistance bands adjust appropriately with preserved volatility
- Test chart performance with more volatile data points
- Verify that chart legends and tooltips display correct volatility information

**Parameter Integration**
- Test that all existing DiminishingReturnsControls parameters work with new algorithm
- Verify that preset selection produces expected volatility patterns
- Test that parameter changes trigger correct recalculation with angle adjustment
- Verify backward compatibility with existing saved parameters

**Model Comparison**
- Test that Enhanced Cycle Repeat Model with angle adjustment differs appropriately from basic Cycle Repeat Model
- Verify that volatility patterns match between Enhanced model and historical data
- Test that diminishing returns effects are visible in trajectory but not in daily volatility

### Performance Tests

**Calculation Performance**
- Benchmark projection generation time with angle adjustment algorithm
- Verify memory usage remains within acceptable limits
- Test performance with various projection lengths (12, 24, 60 months)
- Compare performance between old and new implementations

**Chart Rendering Performance**
- Test chart rendering speed with increased volatility data points
- Verify smooth interaction with volatile projection data
- Test responsiveness of chart updates when parameters change

### Regression Tests

**Backward Compatibility**
- Test that all existing Enhanced Cycle Repeat Model functionality continues to work
- Verify that saved parameters from sessionStorage load correctly
- Test that preset scenarios produce expected results
- Verify that UI components continue to function without modification

**Data Integrity**
- Test that projection data structure remains compatible with chart components
- Verify that confidence calculations work correctly with angle adjustment
- Test that metadata includes appropriate angle adjustment information

## Mocking Requirements

- **Historical Data Service**: Mock historical Bitcoin price data for consistent test results
- **SessionStorage**: Mock browser sessionStorage for parameter persistence tests
- **Date/Time Functions**: Mock Date.now() for consistent timestamp testing
- **Mathematical Functions**: Mock complex mathematical calculations for edge case testing

## Test Data Requirements

- **Historical Multiplier Patterns**: Create test datasets with known volatility characteristics
- **Extreme Market Scenarios**: Test data representing 80%+ crashes and 100%+ pumps
- **Various Cycle Lengths**: Test data for different historical cycle patterns
- **Edge Case Parameters**: Diminishing returns parameters at extreme values (0%, 100%)

## Validation Criteria

- **Volatility Preservation**: Output must contain daily multipliers ≤ 0.2 (80%+ crashes) and ≥ 1.5 (50%+ pumps)
- **Trajectory Adjustment**: Final prices must reflect diminishing returns while daily patterns remain volatile
- **Performance Benchmarks**: Projection generation must complete within 500ms for 24-month projections
- **Backward Compatibility**: All existing tests must continue to pass without modification
