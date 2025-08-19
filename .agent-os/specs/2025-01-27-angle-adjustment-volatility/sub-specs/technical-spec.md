# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-27-angle-adjustment-volatility/spec.md

> Created: 2025-01-27
> Version: 1.0.0

## Technical Requirements

### Core Algorithm Changes

- **Replace `applyDiminishingReturns` method**: Current implementation dampens each daily multiplier proportionally
- **Implement angle adjustment calculation**: Calculate final destination with diminishing returns, then derive trajectory adjustment factor
- **Preserve historical multiplier patterns**: Apply original historical multipliers without dampening for volatility preservation
- **Progressive trajectory adjustment**: Apply angle adjustment gradually over time to create smooth trajectory modification

### Mathematical Implementation

- **Final Destination Calculation**: `adjustedFinalPrice = applyDiminishingReturnsToEndpoint(rawFinalPrice, diminishingParams)`
- **Angle Adjustment Factor**: `angleAdjustment = adjustedFinalPrice / rawFinalPrice`
- **Time-based Application**: Apply adjustment progressively using time progress factor
- **Volatility Preservation**: Maintain original daily multipliers for realistic boom-bust cycles

### Performance Requirements

- **Calculation Speed**: Maintain current projection generation performance (< 500ms for 24-month projection)
- **Memory Usage**: No significant increase in memory footprint
- **Chart Rendering**: Preserve current chart rendering performance with increased volatility data points

### Integration Requirements

- **Backward Compatibility**: All existing Enhanced Cycle Repeat Model parameters must continue to work
- **UI Integration**: No changes required to DiminishingReturnsControls component
- **Chart Integration**: UnifiedPriceChart should automatically display increased volatility without modifications

## Approach Options

**Option A: Complete Algorithm Replacement**
- Pros: Clean implementation, optimal performance, clear separation of concerns
- Cons: Requires extensive testing, higher risk of introducing bugs

**Option B: Hybrid Approach with Fallback** (Selected)
- Pros: Safer implementation, can fall back to current method if issues arise, easier testing
- Cons: Slightly more complex code structure, temporary code duplication

**Option C: Gradual Migration**
- Pros: Lowest risk, can be implemented incrementally
- Cons: Longer implementation time, temporary complexity

**Rationale:** Option B provides the best balance of safety and clean implementation. We can implement the new angle adjustment algorithm while keeping the current implementation as a fallback during testing and validation phases.

## External Dependencies

No new external dependencies required. The implementation uses existing:
- **TypeScript**: For type safety and mathematical calculations
- **Existing Historical Data**: Current historical multiplier calculation system
- **Current Parameter System**: Existing DiminishingReturnsParams interface

## Implementation Details

### New Methods Required

```typescript
// Calculate where the raw cycle would end without diminishing returns
private calculateRawFinalPrice(initialPrice: number, historicalMultipliers: number[]): number

// Apply diminishing returns to the final endpoint only
private applyDiminishingReturnsToEndpoint(rawFinalPrice: number, params: DiminishingReturnsParams): number

// Calculate the angle adjustment factor
private calculateAngleAdjustment(rawFinalPrice: number, adjustedFinalPrice: number): number

// Apply angle adjustment progressively over time
private applyAngleAdjustmentToPrice(basePrice: number, angleAdjustment: number, timeProgress: number): number
```

### Modified Methods

```typescript
// Replace current implementation with angle adjustment approach
private getEnhancedCycleRepeatPrice(
  month: number,
  initialPrice: number,
  historicalMultipliers: number[],
  diminishingParams: DiminishingReturnsParams
): number
```

### Algorithm Flow

1. **Calculate Raw Final Price**: Determine where the cycle would end with pure historical repetition
2. **Apply Diminishing Returns to Endpoint**: Calculate adjusted final price using economic theory
3. **Derive Angle Adjustment**: Calculate the trajectory modification factor
4. **Generate Daily Projections**: Apply original historical multipliers with progressive angle adjustment
5. **Preserve Volatility**: Maintain 80%+ drawdowns and dramatic pumps in the output
