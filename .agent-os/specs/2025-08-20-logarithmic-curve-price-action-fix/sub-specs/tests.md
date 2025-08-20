# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-20-logarithmic-curve-price-action-fix/spec.md

> Created: 2025-08-20
> Version: 1.0.0

## Test Coverage

### Unit Tests

**LogarithmicCurveRepeatModel**
- Test sequential movement application logic
- Test historical movement extraction (exactly 1460 movements)
- Test movement cycling for projections longer than historical period
- Test logarithmic transformation preservation for small movements
- Test realistic price bounds (no exponential explosion)
- Test volatility preservation (both positive and negative movements)
- Test parameter validation with corrected ranges
- Test metadata generation accuracy

**Movement Application Logic**
- Test day-to-movement mapping accuracy
- Test movement cycling when projection exceeds 1460 days
- Test price calculation without cumulative compounding
- Test transformation application only to movements > 1%

### Integration Tests

**Price Projection Generation**
- Test complete projection generation with realistic historical data
- Test monthly point generation accuracy
- Test confidence scoring calculation
- Test projection metadata consistency

**Model Comparison**
- Test LogarithmicCurveRepeatModel vs Enhanced Cycle Repeat Model alignment when logarithmic strength = 0%
- Test projection similarity with identical parameters
- Test volatility pattern preservation across models

**Parameter Validation**
- Test parameter range enforcement
- Test invalid parameter rejection
- Test default parameter behavior

### Regression Tests

**Existing Functionality**
- Ensure all existing LogarithmicCurveRepeatModel tests continue to pass
- Verify UI integration remains functional
- Test preset configurations produce expected results
- Verify model registry integration works correctly

**Performance Tests**
- Test projection generation performance with large datasets
- Verify memory usage remains reasonable
- Test responsiveness with maximum projection periods

### Mocking Requirements

**Historical Data Service**
- Mock historical Bitcoin price data with known movement patterns
- Create test datasets with specific volatility characteristics
- Mock edge cases (missing data, extreme movements)

**Time-based Tests**
- Mock current date for consistent test results
- Create deterministic historical data for reproducible tests
- Mock projection start dates for various scenarios

### Test Data Requirements

**Realistic Historical Data**
- 1460 days of Bitcoin price data with known movement patterns
- Include both bull and bear market periods
- Include high volatility and low volatility periods
- Include extreme movements (both positive and negative)

**Edge Case Data**
- Very small movements (< 0.1%)
- Large movements (> 10%)
- Consecutive positive/negative movements
- Zero or near-zero movements

### Validation Criteria

**Realistic Projections**
- Total growth over 24 months should be < 1000%
- Monthly volatility should include both positive and negative changes
- Price projections should remain finite and positive
- No exponential explosion patterns

**Volatility Preservation**
- Average monthly volatility > 1%
- Both positive and negative monthly changes present
- Significant movements (> 2%) preserved in projections
- Natural Bitcoin-like volatility patterns maintained

**Algorithm Correctness**
- Sequential movement application verified
- No cumulative compounding detected
- Exact 1460-day historical period usage confirmed
- Movement cycling logic validated for long projections
