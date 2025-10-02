# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-10-02-power-law-cycle-volatility/spec.md

> Created: 2025-10-02
> Version: 1.0.0

## Test Coverage

### Unit Tests

**VolatilityService**
- `extractDeviationPattern()` correctly calculates price-to-PowerLaw ratios
- `extractDeviationPattern()` handles insufficient historical data gracefully
- `applyVolatility()` correctly applies deviation pattern with modulo cycling
- `applyVolatility()` applies diminishing factor exponentially over time
- Pattern length validation (24-120 months range)
- Diminishing factor validation (0.5-1.0 range)

**PowerLawModel (Enhanced)**
- `generateProjection()` maintains existing behavior when volatility disabled
- `generateProjection()` applies volatility to price projection line only when enabled
- Regression lines (Support/Fit/Resistance) remain pure mathematical curves regardless of volatility settings
- Volatility integration works with all prognosis lines as baseline for price projection
- Custom price projection parameters work independently of regression line parameters
- Caching of deviation patterns prevents unnecessary recalculation
- Graceful fallback to standard Power Law when historical data insufficient

**PowerLawControls (Enhanced)**
- Volatility toggle enables/disables controls correctly
- Pattern length slider updates parameters and triggers chart regeneration (default: 96 months)
- Diminishing factor slider updates parameters and triggers chart regeneration (default: 1.0)
- "Apply to Price Projection" button copies Fit line parameters to price projection baseline
- Price projection parameter display shows current custom slope/intercept values
- Default values are set correctly on component initialization
- Parameter validation prevents invalid values

### Integration Tests

**Power Law Model with Volatility**
- End-to-end projection generation with volatility enabled affects price projection line only
- Regression lines remain unaffected by volatility settings
- Parameter changes trigger correct chart updates
- Volatility works correctly with unified parameter mode
- Volatility works correctly with individual parameter mode
- Custom price projection parameters work independently of regression line parameters
- Backward compatibility: existing simulations unaffected

**UI Component Integration**
- PowerLawControls integrates correctly with simulation context
- Parameter changes persist across component re-renders
- Real-time chart updates work with debounced parameter changes
- Tooltips display correct information for each parameter

### Feature Tests

**Volatility Feature Workflow**
- User can enable volatility and see immediate changes to price projection line only
- User can adjust pattern length (24-120 months, default: 96) and see projection changes
- User can adjust diminishing factor (0.5-1.0, default: 1.0) and see volatility reduction over time
- User can use "Apply to Price Projection" to set custom baseline parameters
- User can disable volatility and return to standard Power Law behavior
- Regression lines remain pure mathematical curves throughout all operations
- Settings persist across browser sessions (if sessionStorage implemented)

**Historical Data Integration**
- Feature works with various historical data lengths
- Graceful handling when historical data is shorter than pattern length
- Correct behavior with missing or invalid historical data points

## Mocking Requirements

- **Historical Data Service**: Mock HistoricalDataPoint[] arrays with known patterns for predictable test results
- **Date/Time Functions**: Mock current date for consistent projection calculations
- **Chart Regeneration**: Mock chart update calls to verify parameter changes trigger updates
- **Browser Storage**: Mock sessionStorage for parameter persistence testing (if implemented)
