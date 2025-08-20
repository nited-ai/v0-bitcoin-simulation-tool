# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-20-logarithmic-curve-price-action-fix/spec.md

> Created: 2025-08-20
> Version: 1.0.0

## Technical Requirements

### Core Algorithm Fix

- **Sequential Movement Application**: Replace cumulative compounding logic with sequential day-by-day movement application matching the Enhanced Cycle Repeat Model
- **Exact Historical Period**: Use exactly 1460 days of historical movements, applied sequentially without compounding
- **Movement Calculation**: For each projection day N, apply the historical movement from day N of the 1460-day historical period
- **No Clamping Required**: Remove artificial movement clamping since sequential application prevents exponential growth

### Movement Extraction Logic

- **Historical Data Source**: Extract movements from the same daily Bitcoin price data used by working models
- **Movement Calculation**: Calculate percentage movements as `currentPrice / previousPrice` for each historical day
- **Data Validation**: Ensure exactly 1460 movements are extracted from 4 years of historical data
- **Movement Preservation**: Store raw movements without clamping or artificial limits

### Projection Generation Logic

- **Monthly Point Generation**: Generate projection points for each month of the simulation period
- **Day-to-Movement Mapping**: For projection day N, use historical movement from day (N % 1460) to cycle through the historical period
- **Logarithmic Transformation**: Apply curve transformations only to movements > 1% to preserve small-scale volatility
- **Price Calculation**: Start from initial price and apply movements sequentially, not cumulatively

## Approach Options

**Option A: Cumulative Compounding (Current - Broken)**
- Pros: Simple implementation
- Cons: Produces exponential price explosion, unrealistic projections

**Option B: Sequential Movement Application (Selected)**
- Pros: Matches working cycle repeat logic, realistic projections, preserves volatility
- Cons: Requires algorithm restructure

**Option C: Hybrid Approach with Clamping**
- Pros: Prevents extreme values
- Cons: Artificial constraints, doesn't address root cause

**Rationale:** Option B is selected because it addresses the fundamental algorithmic flaw and aligns with the proven working implementation in the Enhanced Cycle Repeat Model. This approach ensures mathematical correctness and realistic projections.

## External Dependencies

No new external dependencies required. The fix uses existing:
- **Historical data loading system** - Already provides the required daily Bitcoin price data
- **TypeScript interfaces** - Existing PriceModelParams and ProjectionPoint types
- **Testing framework** - Current Vitest setup for unit tests

## Implementation Details

### Key Algorithm Changes

1. **Replace `getLogarithmicCurvePrice` method**: Implement sequential movement application instead of cumulative calculation
2. **Update movement extraction**: Ensure raw movements are preserved without artificial clamping
3. **Fix projection loop**: Apply movements day-by-day rather than compounding all movements for each month
4. **Preserve transformation logic**: Keep logarithmic curve transformations but apply them correctly to sequential movements

### Mathematical Correction

**Current (Broken) Logic:**
```typescript
// Compounds ALL movements from day 0 to day N for each month
for (let i = 0; i < daysIntoSimulation; i++) {
  currentProjectedPrice *= transformedMovement // Exponential compounding
}
```

**Corrected Logic:**
```typescript
// Apply movement for specific day N from historical period
const dayInCycle = projectionDay % historicalMovements.length
const movement = historicalMovements[dayInCycle]
const transformedMovement = applyLogarithmicTransformation(movement, params)
currentPrice *= transformedMovement // Sequential application
```

### Volatility Preservation Strategy

- **Small movements (< 1%)**: Apply directly without transformation to maintain natural volatility
- **Large movements (> 1%)**: Apply logarithmic transformation based on user parameters
- **Blending approach**: Mix original and transformed movements to preserve realistic patterns
- **No artificial smoothing**: Avoid over-dampening that removes natural Bitcoin volatility patterns
