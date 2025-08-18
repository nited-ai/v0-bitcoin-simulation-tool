# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-18-centralized-calculations-service/spec.md

> Created: 2025-08-18
> Version: 1.0.0

## Test Coverage

### Unit Tests

**CalculationsService**
- Test core liquidation price calculations with various LTV ratios
- Test free collateral calculations with different BTC stack sizes
- Test collateral utilization percentage calculations
- Test loan capacity calculations for all platforms
- Test platform-specific fee calculations (origination, liquidation)
- Test risk level preset applications
- Test parameter validation with edge cases (zero values, negative values, extreme values)
- Test calculation precision for BTC amounts (8 decimal places) and fiat (2 decimal places)

**LiquidationMetrics**
- Test immediate vs. true liquidation price calculations
- Test price drop percentage calculations from current price and ATH
- Test liquidation scenarios with and without free collateral
- Test platform-specific liquidation LTV applications (Firefish 95%, Strike 99%, Custom 97%)

**CollateralMetrics**
- Test locked collateral calculations based on loan amount and target LTV
- Test free collateral calculations with various BTC stack configurations
- Test collateral ratio calculations and percentage displays
- Test collateral sufficiency validation across different scenarios

**LoanMetrics**
- Test current loan amount calculations based on percentage and stack value
- Test maximum loan capacity calculations for each platform
- Test loan utilization percentage calculations
- Test interest and fee calculations with various terms and rates

### Integration Tests

**useCalculations Hook**
- Test reactive recalculation when parameters change
- Test memoization behavior to prevent unnecessary recalculations
- Test error handling and recovery scenarios
- Test performance with rapid parameter changes
- Test integration with useSimulation context

**Component Integration**
- Test PriceDropToleranceCard integration with centralized calculations
- Test CollateralVisualizationCard integration with centralized calculations
- Test LoanUsageVisualizationCard integration with centralized calculations
- Test BasicParametersCard integration with centralized calculations
- Test LoanParametersCard integration with centralized calculations

**Platform Configuration Integration**
- Test calculations with Firefish platform configuration
- Test calculations with Strike platform configuration  
- Test calculations with Custom platform configuration
- Test platform switching scenarios and calculation updates

### Mocking Requirements

**Platform Configurations**: Mock platformPresets.ts to test various platform scenarios without external dependencies
**Risk Presets**: Mock riskPresets.ts to test risk level applications in isolation
**React Context**: Mock useSimulation context for isolated component testing
**Performance Timing**: Mock performance.now() for consistent timing tests

## Test Data Scenarios

### Standard Test Cases
- **Basic Scenario**: 1 BTC, $100k price, $10k loan (10%), 50% target LTV, Firefish platform
- **High Utilization**: 2 BTC, $80k price, $80k loan (50%), 70% target LTV, Strike platform
- **Low Utilization**: 5 BTC, $120k price, $30k loan (5%), 30% target LTV, Custom platform

### Edge Cases
- **Zero BTC Amount**: Test calculations with 0 BTC
- **Zero Loan Amount**: Test calculations with 0% loan
- **Maximum Loan**: Test calculations at platform maximum LTV limits
- **Price Extremes**: Test with very high ($1M) and very low ($1k) BTC prices
- **Precision Limits**: Test calculations at 8 decimal place precision boundaries

### Error Scenarios
- **Invalid Parameters**: Negative values, NaN values, undefined values
- **Platform Misconfigurations**: Missing platform data, invalid LTV ratios
- **Calculation Overflows**: Extremely large numbers that could cause precision loss

## Performance Benchmarks

### Calculation Speed Requirements
- **Individual Calculations**: Each calculation method must complete in <1ms
- **Full Recalculation**: Complete parameter update cycle must complete in <10ms
- **Memory Usage**: Service instance should not exceed 1MB memory footprint

### Load Testing
- **Rapid Parameter Changes**: Test 100 parameter changes per second
- **Concurrent Calculations**: Test multiple component subscriptions simultaneously
- **Memory Leak Detection**: Test for memory leaks during extended usage sessions
