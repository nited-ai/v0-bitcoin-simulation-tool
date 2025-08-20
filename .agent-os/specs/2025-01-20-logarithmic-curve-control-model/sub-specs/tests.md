# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-20-logarithmic-curve-control-model/spec.md

> Created: 2025-01-20
> Version: 1.0.0

## Test Coverage

### Unit Tests

**LogarithmicCurveRepeatModel Class**
- `generateProjection()` returns valid PriceProjectionResult with correct structure
- `validateParams()` correctly validates required parameters and ranges
- `getDefaultParams()` returns properly structured default parameters
- Historical data extraction produces expected number of movements (~208 weekly)
- Mathematical transformations follow logarithmic rules correctly

**Mathematical Transformation Functions**
- `transformMovement()` applies logarithmic transformations using ln() properties
- Edge cases handled: ln(1) = 0, avoid ln(0) with minimum thresholds
- Parameter ranges respected: baseMultiplier (0.5-2.0), logarithmicStrength (0-1.0)
- Default parameters (strength=0) produce identical results to pure cycle repeat
- Extreme parameter values don't break mathematical calculations

**LogarithmicCurveControls Component**
- Renders all four parameter sliders with correct labels and ranges
- Parameter changes update sessionStorage correctly
- Preset selection applies correct parameter combinations
- Real-time chart updates triggered when parameters change
- Component integrates with simulation context properly

### Integration Tests

**Model Registry Integration**
- LogarithmicCurveRepeatModel registers successfully in PriceModelRegistry
- Model appears in UI model selection dropdown
- Model selection triggers correct parameter loading from sessionStorage
- Chart integration receives and processes logarithmic curve parameters

**Chart Integration**
- UnifiedPriceChart handles logarithmic curve model parameters
- Parameter changes trigger chart recalculation
- Chart displays logarithmic curve projections correctly
- Performance remains acceptable with real-time parameter updates

**SessionStorage Persistence**
- Parameter values persist across browser sessions
- Preset selections save and restore correctly
- Parameter changes mark as unapplied until explicitly applied
- Storage keys don't conflict with existing models

### Feature Tests

**End-to-End Mathematical Accuracy**
- Default parameters produce results very similar to cycle repeat model
- Logarithmic strength parameter creates mathematically smooth curves
- Base multiplier correctly amplifies/dampens all movements
- Smoothing factor reduces volatility while preserving trends
- Growth acceleration modifies curve steepness appropriately

**User Workflow Testing**
- User can select logarithmic curve model from dropdown
- Parameter sliders respond immediately with visual feedback
- Preset selection updates all parameters and chart simultaneously
- Apply/Reset buttons function correctly
- Chart updates reflect mathematical transformations accurately

**Parameter Calibration Validation**
- Default parameters match cycle repeat behavior within acceptable tolerance
- Preset configurations produce distinct, meaningful curve variations
- Parameter combinations don't produce unrealistic price projections
- Mathematical transformations maintain economic reasonableness

### Mocking Requirements

**Historical Data**: Mock 4 years of Bitcoin price data for consistent testing
**Chart Components**: Mock Recharts for unit test performance
**SessionStorage**: Mock browser storage for parameter persistence testing
**Date Functions**: Mock current date for consistent projection timeline testing
**Mathematical Functions**: Mock Math.log for edge case testing
