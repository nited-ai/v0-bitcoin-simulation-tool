# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-02-power-law-cycle-volatility/spec.md

> Created: 2025-10-02
> Version: 1.0.0

## Technical Requirements

### Core Algorithm Implementation

- **Deviation Pattern Extraction**: Calculate price-to-PowerLaw ratios from historical data (reference: `docs/ROLLING LOAN STRATEGY.html`)
- **Pattern Length Configuration**: Support 24-120 months of historical pattern data (default: 96 months)
- **Diminishing Factor Application**: Reduce volatility impact over time using exponential decay (default: 1.0 - no diminishing)
- **Cycle Application**: Apply historical deviation pattern to price projection line only using modulo cycling
- **Regression Line Preservation**: Power Law Support/Fit/Resistance lines remain pure mathematical curves without volatility
- **Graceful Degradation**: Fall back to standard Power Law if insufficient historical data

### Algorithm Details

```typescript
// 1. Extract deviation pattern from historical data
const extractDeviationPattern = (
  historicalData: HistoricalDataPoint[],
  patternLengthMonths: number,
  prognosisLine: PowerLawLine
): number[] => {
  const relevantHistory = historicalData.slice(-patternLengthMonths)
  return relevantHistory.map(point =>
    point.price / getPowerLawPrice(point.date, prognosisLine)
  )
}

// 2. Apply volatility to future projections
const applyVolatility = (
  basePrice: number,
  deviationPattern: number[],
  monthIndex: number,
  diminishingFactor: number
): number => {
  const patternIndex = monthIndex % deviationPattern.length
  const diminishingMultiplier = Math.pow(diminishingFactor, monthIndex / 12)
  const volatilityMultiplier = 1 + (deviationPattern[patternIndex] - 1) * diminishingMultiplier
  return basePrice * volatilityMultiplier
}
```

### UI/UX Specifications

- **Toggle Control**: Checkbox/switch to enable/disable volatility feature
- **Pattern Length Slider**: 24-120 months range with 96-month default
- **Diminishing Factor Slider**: 0.5-1.0 range with 1.0 default (no diminishing)
- **Apply to Price Projection Button**: Copy current Fit line parameters to price projection baseline
- **Price Projection Parameter Display**: Show current slope/intercept values used for price projection
- **Real-time Updates**: Chart regeneration on parameter changes with debounced updates
- **Informational Tooltips**: Explain each parameter's impact on price projection line only
- **Visual Distinction**: Clear indication that volatility affects price projection, not regression lines

### Integration Requirements

- **Backward Compatibility**: Existing Power Law behavior unchanged when volatility disabled
- **Prognosis Line Support**: Work with fit/support/resistance line selections for price projection baseline
- **Parameter Mode Compatibility**: Function with both unified and individual parameter modes
- **Historical Data Access**: Use existing HistoricalDataPoint[] parameter from generateProjection()
- **Regression Line Isolation**: Ensure Support/Fit/Resistance lines display pure mathematical curves
- **Price Projection Independence**: Enable custom slope/intercept for price projection separate from regression lines

### Performance Criteria

- **Pattern Calculation**: Cache deviation patterns to avoid recalculation on each projection
- **Memory Usage**: Limit pattern storage to maximum 120 data points
- **Update Responsiveness**: UI parameter changes reflected within 300ms
- **Fallback Performance**: No performance degradation when feature disabled

## Approach Options

**Option A: Extend Existing PowerLawModel Class**
- Pros: Maintains current architecture, minimal refactoring required
- Cons: Increases class complexity, couples volatility with core Power Law logic

**Option B: Create Separate VolatilityService** (Selected)
- Pros: Clean separation of concerns, testable in isolation, reusable for other models
- Cons: Additional abstraction layer, more files to maintain

**Option C: Implement as Plugin/Decorator Pattern**
- Pros: Maximum flexibility, could be applied to other models
- Cons: Over-engineering for current requirements, complex implementation

**Rationale:** Option B provides the best balance of maintainability and architectural cleanliness while keeping the implementation focused on the current requirements.

## Implementation Architecture

### File Structure Changes

```
app/simulation/price-models/models/
├── PowerLawModel.ts                    # Enhanced with volatility support
└── services/
    └── VolatilityService.ts           # New: Volatility calculation logic

app/simulation/tabs/price-projection/power-law/
└── PowerLawControls.tsx               # Enhanced with volatility controls

src/modules/price-data/types/
└── index.ts                           # Enhanced with volatility types
```

### Type System Extensions

```typescript
// Enhanced PowerLawSettings interface
interface PowerLawSettings {
  prognosisLine: PowerLawLine
  controlMode?: 'unified' | 'individual'
  unifiedSlope?: number
  unifiedIntercept?: number
  individualParams?: {
    fit: { slope: number; intercept: number }
    support: { slope: number; intercept: number }
    resistance: { slope: number; intercept: number }
  }
  // NEW: Independent price projection parameters
  priceProjectionParams?: {
    slope: number                  // Custom slope for price projection
    intercept: number              // Custom intercept for price projection
  }
  // NEW: Cycle Repeat Volatility settings
  cycleRepeatVolatility?: {
    enabled: boolean
    patternLengthMonths: number    // 24-120, default: 96
    diminishingFactor: number      // 0.5-1.0, default: 1.0
  }
}
```

## External Dependencies

No new external dependencies required. Implementation uses:
- **Existing TypeScript interfaces** - Extend current type definitions
- **React hooks and components** - Use established UI patterns
- **Mathematical operations** - Standard JavaScript Math functions
- **Historical data structures** - Leverage existing HistoricalDataPoint interface
