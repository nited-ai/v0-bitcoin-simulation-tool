# Cycle Repeat Volatility Guide

> **Added**: 2025-10-02 (PR #36)  
> **Version**: Power Law Model v2.0.0  
> **Reference**: Based on algorithm from `docs/reference/ROLLING LOAN STRATEGY.html`

## Overview

Cycle Repeat Volatility is a new feature for the Power Law price projection model that applies historical Bitcoin price volatility patterns to create more realistic price projections while maintaining the mathematical integrity of Power Law regression lines.

## Key Concepts

### What is Cycle Repeat Volatility?

Cycle Repeat Volatility extracts historical price deviation patterns from Bitcoin's price history and applies them to future projections. It calculates the ratio between actual historical prices and Power Law predictions, then cycles through these patterns for future projections.

### How It Works

1. **Pattern Extraction**: Calculates price-to-PowerLaw ratios from historical data
2. **Pattern Application**: Applies these ratios to future price projections
3. **Pattern Cycling**: Repeats the historical pattern for extended projections
4. **Diminishing Factor**: Optionally reduces volatility impact over time

## Critical Design Decision

**Volatility Scope** ⚠️

- ✅ **Price Projection Line**: Applies volatility for realistic market movements
- ✅ **Power Law Regression Lines**: Remain pure mathematical curves (Support/Fit/Resistance)
- ✅ **Strategy Engine**: Uses volatility-enhanced price projection for decisions

This ensures that the mathematical integrity of Power Law regression lines is preserved while providing realistic market movement simulation for strategy testing.

## User Interface

### Volatility Controls

The Power Law model interface includes new volatility controls:

#### 1. Volatility Toggle
- **Location**: Main Power Law controls section
- **Function**: Enable/disable cycle repeat volatility
- **Default**: Disabled (maintains backward compatibility)
- **Icon**: Lightning bolt (⚡) indicator

#### 2. Pattern Length Slider
- **Range**: 24-120 months (2-10 years)
- **Default**: 96 months (8 years)
- **Function**: Controls how much historical data to use for pattern extraction
- **Display**: Shows current value in months and years

#### 3. Diminishing Factor Slider
- **Range**: 0.5-1.0
- **Default**: 1.0 (no diminishing)
- **Function**: Reduces volatility impact over time
- **Effect**: 1.0 = full volatility, 0.5 = strong reduction over time

#### 4. Apply to Price Projection Button
- **Function**: Copies Fit line parameters to custom projection baseline
- **Use Case**: Creates independent price projection parameters
- **Result**: Allows volatility on custom baseline instead of standard regression lines

#### 5. Parameter Display
- **Shows**: Current custom projection parameters (slope/intercept)
- **Updates**: Real-time when parameters change
- **Format**: Mathematical notation for clarity

### Tooltips and Help

Each control includes informational tooltips explaining:
- Parameter effects on projections
- Recommended ranges and values
- Impact on strategy calculations
- Performance considerations

## Configuration Options

### Pattern Length (24-120 months)

**Purpose**: Controls how much historical data to use for volatility pattern extraction.

**Recommendations**:
- **24-36 months**: Recent market behavior, higher volatility
- **48-72 months**: Medium-term patterns, balanced approach
- **96 months (default)**: Long-term patterns, matches original implementation
- **120 months**: Maximum historical context, smoothed patterns

### Diminishing Factor (0.5-1.0)

**Purpose**: Reduces volatility impact over time to account for market maturation.

**Recommendations**:
- **1.0 (default)**: No reduction, full historical volatility preserved
- **0.8-0.9**: Moderate reduction, accounts for some market maturation
- **0.5-0.7**: Strong reduction, assumes significant market evolution

### Custom Price Projection Parameters

**Purpose**: Allows volatility application to custom baseline instead of standard regression lines.

**Use Cases**:
- Testing specific slope/intercept scenarios
- Creating independent projection baselines
- Advanced strategy testing with custom parameters

## Technical Implementation

### VolatilityService

**Location**: `app/simulation/price-models/services/VolatilityService.ts`

**Key Methods**:
- `extractDeviationPattern()`: Extracts historical price-to-PowerLaw ratios
- `applyVolatility()`: Applies volatility to base price projections
- `validateParameters()`: Ensures parameter validity
- `getDefaultParameters()`: Provides default configuration

### Enhanced PowerLawModel

**Location**: `app/simulation/price-models/models/PowerLawModel.ts`

**Enhancements**:
- Integrated VolatilityService for pattern calculations
- Deviation pattern caching for performance
- Extended parameter validation
- Backward compatibility preservation

### Type System Extensions

**Location**: `app/simulation/price-models/types.ts`

**New Interfaces**:
```typescript
interface PowerLawModelParams extends PriceModelParams {
  modelSpecificParams: {
    prognosisLine: 'fit' | 'support' | 'resistance'
    priceProjectionParams?: {
      slope: number
      intercept: number
    }
    cycleRepeatVolatility?: {
      enabled: boolean
      patternLengthMonths: number
      diminishingFactor: number
    }
  }
}
```

## Performance Considerations

### Caching Strategy

- **Deviation Pattern Caching**: Patterns cached by configuration to avoid recalculation
- **Cache Key**: Based on pattern length, prognosis line, and custom parameters
- **Memory Efficiency**: Automatic cleanup of unused patterns

### Computational Complexity

- **Pattern Extraction**: O(n) where n = pattern length
- **Pattern Application**: O(1) per projection point
- **Overall Impact**: Minimal performance overhead with caching

## Testing Coverage

### Comprehensive Test Suite

**Total Tests**: 42 tests (100% pass rate)

**Test Categories**:
- **Type System Tests**: Interface validation and backward compatibility
- **VolatilityService Tests**: Core algorithm validation
- **PowerLawModel Tests**: Integration and regression line preservation
- **UI Component Tests**: Control behavior and parameter validation
- **Integration Tests**: End-to-end workflow validation

### Quality Assurance

- ✅ **TypeScript Compilation**: No type errors
- ✅ **Backward Compatibility**: Existing functionality preserved
- ✅ **Performance**: Caching optimizations implemented
- ✅ **Error Handling**: Graceful degradation with insufficient data

## Migration and Compatibility

### Backward Compatibility

- **Default Behavior**: Volatility disabled by default
- **Existing Simulations**: Continue to work unchanged
- **API Compatibility**: All existing interfaces preserved
- **Zero Breaking Changes**: Full backward compatibility maintained

### Migration Path

**For Existing Users**:
1. No action required - feature is opt-in
2. Existing Power Law projections remain unchanged
3. New volatility controls available when desired

**For New Users**:
1. Feature available immediately in Power Law model
2. Default settings provide conservative behavior
3. Tooltips and documentation guide usage

## Best Practices

### When to Use Volatility

**Recommended For**:
- Strategy testing with realistic market movements
- Risk assessment with historical volatility patterns
- Long-term projections requiring market cycle simulation

**Not Recommended For**:
- Pure mathematical Power Law analysis
- Regression line validation
- Academic or research applications requiring clean mathematical curves

### Parameter Selection

**Conservative Approach**:
- Pattern Length: 96 months (default)
- Diminishing Factor: 1.0 (no reduction)
- Use standard regression lines as baseline

**Aggressive Approach**:
- Pattern Length: 24-48 months (recent patterns)
- Diminishing Factor: 0.5-0.7 (strong reduction)
- Custom projection parameters for specific scenarios

## Troubleshooting

### Common Issues

**Issue**: Volatility not applying
**Solution**: Ensure volatility toggle is enabled and pattern length is appropriate

**Issue**: Unexpected projection results
**Solution**: Check diminishing factor setting and baseline parameters

**Issue**: Performance concerns
**Solution**: Verify caching is working, check browser console for cache hits

### Support Resources

- **Technical Specification**: `.agent-os/specs/2025-10-02-power-law-cycle-volatility/`
- **Test Coverage**: `app/simulation/__tests__/` (volatility-related tests)
- **Source Code**: `app/simulation/price-models/services/VolatilityService.ts`

## Related Documentation

- [Price Projection Models](./price-projection-models.md) - Complete model overview
- [Power Law Model Technical Spec](./.agent-os/specs/2025-10-02-power-law-cycle-volatility/sub-specs/technical-spec.md)
- [Test Coverage Documentation](./.agent-os/specs/2025-10-02-power-law-cycle-volatility/sub-specs/tests.md)

---

**The Cycle Repeat Volatility feature provides realistic market movement simulation while preserving the mathematical integrity of Power Law regression analysis. It's designed to enhance strategy testing without compromising the foundational Power Law model.**
