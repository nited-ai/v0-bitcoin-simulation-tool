# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-20-logarithmic-curve-control-model/spec.md

> Created: 2025-01-20
> Version: 1.0.0

## Technical Requirements

### Mathematical Transformation Engine

**Logarithmic Transformation Rules**
- Apply natural logarithm (ln) transformations to historical movements
- Use mathematical properties: ln(xy) = ln(x) + ln(y), ln(x/y) = ln(x) - ln(y), ln(x^m) = m × ln(x)
- Handle edge cases: ln(1) = 0, avoid ln(0) with minimum thresholds
- Transform percentage movements while preserving directional trends

**Core Algorithm**
```typescript
interface LogarithmicCurveParams {
  baseMultiplier: number      // 0.5-2.0 (amplifies/dampens movements)
  logarithmicStrength: number // 0-1.0 (how much ln transformation)
  smoothingFactor: number     // 0-1.0 (reduces volatility)
  growthAcceleration: number  // 0-2.0 (modifies curve steepness)
}

private transformMovement(originalMovement: number, params: LogarithmicCurveParams): number {
  const gain = originalMovement - 1
  if (Math.abs(gain) > 0.001) {
    const lnTransformed = Math.sign(gain) * Math.log(1 + Math.abs(gain) * params.logarithmicStrength)
    return 1 + (lnTransformed * params.baseMultiplier)
  }
  return originalMovement
}
```

### Model Architecture

**LogarithmicCurveRepeatModel Class**
- Implements PriceProjectionModel interface
- Reuses historical data extraction from existing cycle repeat logic
- Applies logarithmic transformations before price projection
- Maintains 4-year cycle extraction methodology (208 weekly movements)

**Default Parameter Calibration**
```typescript
const DEFAULT_PARAMS: LogarithmicCurveParams = {
  baseMultiplier: 1.0,        // No amplification initially
  logarithmicStrength: 0.0,   // Start with pure cycle repeat
  smoothingFactor: 0.0,       // No smoothing initially
  growthAcceleration: 1.0     // Linear acceleration
}
```

### UI Component Architecture

**LogarithmicCurveControls Component**
- Four parameter sliders with real-time updates
- Preset system with sessionStorage persistence
- Integration with existing simulation context
- Debounced updates for performance

**SessionStorage Integration**
```typescript
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-logarithmic-curve-preset',
  customParams: 'bitcoin-sim-logarithmic-curve-params',
  advancedExpanded: 'bitcoin-sim-logarithmic-curve-advanced'
}
```

## Approach Options

**Option A: Modify Existing Enhanced Cycle Repeat Model**
- Pros: Reuses existing code, faster implementation
- Cons: Creates technical debt, complex parameter interactions

**Option B: Create New Independent Model** (Selected)
- Pros: Clean architecture, no technical debt, focused functionality
- Cons: More initial development work, duplicate some logic

**Rationale:** Creating a new model ensures clean separation of concerns and allows for focused mathematical implementation without affecting existing functionality.

## External Dependencies

**No New Dependencies Required**
- Uses existing PriceProjectionModel interface
- Leverages current sessionStorage patterns
- Integrates with existing chart system
- Utilizes native JavaScript Math functions for logarithmic calculations
