# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-30-rolling-loan-calculation-fix/spec.md

> Created: 2025-01-30
> Version: 1.0.0

## Test Coverage

### Unit Tests

**LoanRolloverCalculationService**
- Test minimum loan calculation with various fee structures
- Test maximum loan calculation with different target percentages
- Test conflict resolution logic (normal vs forced exceedance)
- Test platform fee integration for all platform types
- Test edge cases (zero fees, 100% target, price volatility)

**PlatformFeeIntegrationService**
- Test Firefish 1.5% annual fee calculation accuracy
- Test Strike 0% fee handling
- Test custom platform fee configurations
- Test fee timing and recurring calculations
- Test fee integration with loan amounts

**RollingLoanStrategy**
- Test initial loan decision logic
- Test rollover decision logic with price changes
- Test BTC accumulation mode vs cash generation mode
- Test investment multiplier calculations
- Test target LTV override scenarios

**StrategyExecutionService**
- Test price projection data integration
- Test monthly BTC price usage in calculations
- Test portfolio value calculation accuracy
- Test result data structure consistency

### Integration Tests

**Complete Rolling Loan Workflow**
- Test full simulation with Power Law price projection
- Test loan rollover sequence over multiple months
- Test BTC accumulation and stack growth
- Test forced exceedance and recovery scenarios
- Test platform fee impact on loan sizing

**Price Projection Integration**
- Test with different price projection models (Power Law, Cycle Repeat, Manual Growth)
- Test price data flow from projection to strategy execution
- Test portfolio value consistency across components
- Test edge cases (extreme price movements, negative growth)

**Multi-Platform Testing**
- Test calculation accuracy across all platform types
- Test fee structure differences impact on loan amounts
- Test custom platform configurations
- Test platform switching scenarios

### Specific Test Scenarios

**Primary Failing Scenario**
```typescript
describe('Primary Failing Scenario', () => {
  const testParams = {
    initialBtcAmount: 1,
    initialBtcPrice: 100000,
    targetLoanPercentage: 10, // 10% of BTC stack
    platform: 'firefish',
    btcAccumulation: true,
    priceModel: 'powerLaw'
  }
  
  it('should calculate first loan as ~$10,000', () => {
    // Expected: $10,000 loan (10% of $100,000 stack)
    // Current: $34,236 (incorrect)
  })
  
  it('should use Power Law price projections', () => {
    // Verify BTC prices match Power Law model
  })
  
  it('should reinvest excess proceeds into BTC', () => {
    // Verify BTC stack growth from loan proceeds
  })
})
```

**Rollover Scenarios**
```typescript
describe('Rollover Scenarios', () => {
  it('should handle normal rollover (price stable)', () => {
    // minimum < maximum → take maximum
  })
  
  it('should handle forced exceedance (price drop)', () => {
    // minimum > maximum → take minimum
  })
  
  it('should return to target after price recovery', () => {
    // forced exceedance → recovery → normal rollover
  })
})
```

**BTC Accumulation Mode**
```typescript
describe('BTC Accumulation Mode', () => {
  it('should purchase additional BTC with excess proceeds', () => {
    // Verify BTC purchase calculation
  })
  
  it('should grow BTC stack for future calculations', () => {
    // Verify stack growth impacts next loan sizing
  })
  
  it('should compound over multiple months', () => {
    // Verify compounding effect over time
  })
})
```

### Mocking Requirements

- **Price Projection Models**: Mock to return predictable price sequences for testing
- **Platform Fee Services**: Mock to isolate fee calculation testing
- **Time-based Calculations**: Mock date/time for consistent test results
- **External Price APIs**: Mock to prevent network dependencies in tests

### Performance Tests

- **Large Simulation Periods**: Test 10+ year simulations for performance
- **Complex Price Scenarios**: Test with volatile price movements
- **Memory Usage**: Verify no memory leaks in long simulations
- **Calculation Speed**: Ensure reasonable execution times

### Validation Tests

- **Formula Accuracy**: Compare results against manual calculations
- **Calculation Document Compliance**: Verify all formulas match source of truth
- **Edge Case Handling**: Test boundary conditions and error scenarios
- **Data Consistency**: Verify result data structure consistency across components
