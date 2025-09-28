# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-27-rolling-loan-strategy/spec.md

> Created: 2025-01-27
> Version: 1.0.0

## Test Coverage

### Unit Tests

**RollingLoanStrategy**
- Test strategy initialization and metadata
- Test loan rollover calculation logic with various BTC price scenarios
- Test minimum loan amount calculation for previous loan payoff
- Test maximum loan amount calculation based on target percentage
- Test BTC accumulation through reinvestment calculations
- Test edge cases where BTC price drops require larger loans than target

**Strategy Integration**
- Test strategy registration in StrategyRegistry
- Test strategy execution through StrategyExecutionService
- Test integration with existing SimulationContext
- Test parameter validation and error handling

**Risk Calculations**
- Test liquidation price calculations for rolling loans
- Test LTV ratio updates with new loan amounts
- Test price drop tolerance calculations
- Test collateral value updates with BTC accumulation

### Integration Tests

**Tab Navigation**
- Test Strategy tab activation and accessibility
- Test Results tab activation and functionality
- Test tab switching with rolling loan strategy selected
- Test parameter persistence across tab changes

**Strategy Execution Flow**
- Test complete rolling loan simulation over multiple periods
- Test loan rollover at maturity with reinvestment
- Test strategy performance with different price projection models
- Test risk management integration throughout simulation

**Results Visualization**
- Test BTC accumulation chart rendering with rolling loan data
- Test loan history table display with rollover events
- Test risk metrics display in Results tab
- Test strategy comparison functionality

### Feature Tests

**End-to-End Rolling Loan Simulation**
- User selects rolling loan strategy in Strategy tab
- User configures loan parameters and risk settings
- User runs simulation with Power Law price projection
- System displays BTC accumulation and loan rollover results
- User switches to different price model and re-runs simulation

**Risk Management Workflow**
- User configures conservative risk settings
- System calculates appropriate loan amounts to maintain safety margins
- Simulation handles market volatility without triggering liquidations
- Results show updated risk metrics for each loan period

### Mocking Requirements

**Price Projection Service:** Mock different price scenarios (bull market, bear market, sideways) to test strategy behavior
**Time-based Calculations:** Mock date progression to test loan maturity and rollover timing
**Risk Calculation Service:** Mock liquidation price and LTV calculations for consistent test results

## Test Data Requirements

### Sample Scenarios
- **Bull Market:** BTC price increases 50% during simulation
- **Bear Market:** BTC price decreases 30% during simulation  
- **Volatile Market:** BTC price fluctuates ±20% monthly
- **Stable Market:** BTC price grows steadily at 10% annually

### Edge Cases
- BTC price drops significantly requiring larger loans than target percentage
- Loan maturity coinciding with major price movements
- Maximum loan amount limits reached during accumulation
- Risk threshold breaches requiring strategy adjustments
