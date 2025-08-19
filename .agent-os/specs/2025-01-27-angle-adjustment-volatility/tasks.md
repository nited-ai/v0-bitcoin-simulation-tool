# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-01-27-angle-adjustment-volatility/spec.md

> Created: 2025-01-27
> Status: Ready for Implementation

## Tasks

- [x] 1. Implement Core Angle Adjustment Algorithm
  - [x] 1.1 Write tests for `calculateRawFinalPrice` method
  - [x] 1.2 Implement `calculateRawFinalPrice` method to determine endpoint without diminishing returns
  - [x] 1.3 Write tests for `applyDiminishingReturnsToEndpoint` method
  - [x] 1.4 Implement `applyDiminishingReturnsToEndpoint` method for economic theory application
  - [x] 1.5 Write tests for `calculateAngleAdjustment` method
  - [x] 1.6 Implement `calculateAngleAdjustment` method for trajectory factor calculation
  - [x] 1.7 Verify all core algorithm tests pass

- [x] 2. Implement Progressive Angle Adjustment
  - [x] 2.1 Write tests for `applyAngleAdjustmentToPrice` method
  - [x] 2.2 Implement `applyAngleAdjustmentToPrice` method for time-based trajectory modification
  - [x] 2.3 Write tests for time progress calculation and application
  - [x] 2.4 Implement time progress logic for gradual angle adjustment
  - [x] 2.5 Test edge cases with extreme angle adjustment values
  - [x] 2.6 Verify progressive adjustment tests pass

- [x] 3. Replace Enhanced Cycle Repeat Price Calculation
  - [x] 3.1 Write tests for new `getEnhancedCycleRepeatPrice` implementation
  - [x] 3.2 Backup current `getEnhancedCycleRepeatPrice` method implementation
  - [x] 3.3 Implement new `getEnhancedCycleRepeatPrice` using angle adjustment algorithm
  - [x] 3.4 Test volatility preservation with historical multiplier patterns
  - [x] 3.5 Test that 80%+ drawdowns are preserved in output
  - [x] 3.6 Test that dramatic pumps (50%+ gains) remain intact
  - [x] 3.7 Verify enhanced price calculation tests pass

- [ ] 4. Validate Volatility Preservation and Integration
  - [ ] 4.1 Write integration tests for chart display with increased volatility
  - [ ] 4.2 Test backward compatibility with existing parameters and presets
  - [ ] 4.3 Validate that diminishing returns still affect final trajectory
  - [ ] 4.4 Test performance benchmarks with new algorithm
  - [ ] 4.5 Verify UI components work without modification
  - [ ] 4.6 Test parameter persistence and recalculation functionality
  - [ ] 4.7 Run comprehensive regression tests
  - [ ] 4.8 Verify all integration and validation tests pass

## Implementation Notes

### Task Dependencies
- Task 2 depends on completion of Task 1 (core algorithm methods)
- Task 3 depends on completion of Tasks 1 and 2 (all supporting methods)
- Task 4 depends on completion of Task 3 (main implementation)

### Testing Strategy
- Follow TDD approach with tests written before implementation
- Use existing test infrastructure in `app/simulation/price-models/models/__tests__/`
- Maintain existing test patterns and naming conventions
- Include performance benchmarks in test suite

### Risk Mitigation
- Keep backup of current implementation during development
- Implement fallback mechanism if new algorithm fails
- Test extensively with various historical data patterns
- Validate against known Bitcoin volatility characteristics

### Success Criteria
- All tests pass including new volatility preservation tests
- Chart displays dramatic Bitcoin volatility (80%+ drawdowns visible)
- Performance remains within acceptable limits (< 500ms for 24-month projections)
- Backward compatibility maintained with existing Enhanced Cycle Repeat Model interface
