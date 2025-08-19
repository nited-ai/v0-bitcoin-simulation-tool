# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-18-dynamic-ath-calculation/spec.md

> Created: 2025-08-18
> Version: 1.0.0

## Test Coverage

### Unit Tests

**ATH Service**
- getCurrentATH() returns correct initial value (124277.98)
- getCurrentATH() reads from JSON file when available
- getCurrentATH() falls back to constant when JSON file unavailable
- updateATH() updates JSON file on server side correctly
- checkAndUpdateATH() compares prices and updates when higher
- Service handles JSON file errors gracefully
- JSON file structure matches expected format

**PriceDropToleranceCard Component**
- Component uses ATH service getCurrentATH() correctly
- ATH calculations use service instead of hard-coded value
- Fallback ATH calculations use service
- Component renders with correct ATH value in UI
- Component updates when ATH value changes

**Calculations Service**
- Service uses ATH service getCurrentATH() correctly
- ATH calculations use service instead of hard-coded value
- Liquidation metrics calculations use the current ATH value
- Service returns accurate calculations with dynamic ATH value

### Integration Tests

**Daily Update Service Integration**
- Daily update service calls ATH service when processing new prices
- ATH service correctly compares processed high prices with stored ATH from JSON
- ATH updates automatically when higher prices are detected
- JSON file persists updated ATH values correctly on server side
- Multiple concurrent updates handle correctly

**Component Integration**
- PriceDropToleranceCard displays correct initial ATH value (124277.98)
- Components update when ATH value changes in localStorage
- All ATH-related calculations are consistent across components
- No hard-coded ATH values remain in the codebase

**Calculation Integration**
- ATH metrics calculations use the dynamic ATH service
- Price drop percentages calculate correctly with current ATH
- Liquidation tolerance displays accurate values with updated ATH
- All dependent calculations update when ATH value changes

### Feature Tests

**End-to-End ATH Functionality**
- User opens Parameters tab and sees correct initial ATH value (124277.98)
- ATH automatically updates when daily update service processes new highs
- Updated ATH persists in JSON file and is accessible to all users
- Liquidation tolerance calculations reflect the current ATH from JSON
- Price drop analysis shows correct percentages from current ATH
- All ATH-related UI elements display consistent updated values

**Automatic Update Scenarios**
- System detects new ATH when daily processed price exceeds stored value
- ATH updates when daily update service runs with higher prices
- Multiple daily updates handle correctly (only update when higher)
- Edge cases: same price, lower price, invalid price data, JSON file errors

**Backward Compatibility**
- Existing simulations continue to work with dynamic ATH
- No breaking changes to existing functionality
- All parameter calculations remain accurate with updated ATH
- User experience improves with automatic ATH updates

### Mocking Requirements

- **File System:** Mock JSON file read/write operations for testing
- **Fetch API:** Mock HTTP requests to ATH JSON file
- **Daily Update Service:** Mock daily update API calls
- **React Components:** Mock component imports for unit testing

## Test Data Requirements

### Mock ATH JSON Data
- Valid ATH JSON file structure for testing
- Correct ATH value (124277.98) for validation
- Different ATH values for testing calculation accuracy
- Invalid JSON data for error handling testing

### Mock Price Data
- Historical high prices for ATH comparison testing
- New ATH scenarios (prices higher than current ATH)
- Edge cases: same price, lower price, invalid price data

## Validation Criteria

- ATH constant value matches specification (124277.98)
- All hard-coded 125000 values are replaced
- Calculations produce accurate results with new ATH
- UI displays correct ATH value consistently
