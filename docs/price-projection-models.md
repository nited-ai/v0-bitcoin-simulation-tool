# Price Projection Models Documentation

## Overview

The Bitcoin Simulation Tool provides multiple sophisticated price projection models for forecasting Bitcoin prices. This document covers all available models, their parameters, and recent enhancements.

**Last Updated**: 2025-10-02
**Related PRs**: #23 (Power Law Correction), #27 (Manual Growth Fixes), #25 (Manual Growth Drawer), #36 (Cycle Repeat Volatility)

---

## Available Models

### 1. Power Law Model 📈

**Type**: Mathematical regression model  
**Basis**: Logarithmic price growth over time

#### Model Parameters

| Parameter | Fit Line | Support Line | Resistance Line |
|-----------|----------|--------------|-----------------|
| **Slope** | 5.844 | 5.844 | 5.06 |
| **Intercept** | -17.01 | -17.46 | -13.5 |

**Updated**: PR #23 (2025-09-27) - Standardized parameters across unified and individual display modes

#### Features

- ✅ Three projection lines (Fit, Support, Resistance)
- ✅ Log/log view for historical data (from 2013)
- ✅ Curve-based support lines connecting bottoms
- ✅ Prognosis line selector for strategy engine
- ✅ Cross-model visibility (can overlay on other models)
- ✅ Interactive legend controls with toggle functionality

#### Usage

```typescript
import { PowerLawModel } from '@/app/simulation/price-models/models/PowerLawModel'

const model = new PowerLawModel({
  fitSlope: 5.844,
  fitIntercept: -17.01,
  supportSlope: 5.844,
  supportIntercept: -17.46,
  resistanceSlope: 5.06,
  resistanceIntercept: -13.5
})

const projections = model.generateProjections(simulationMonths)
```

#### Default Visibility

- **On Power Law model**: Support and Resistance lines visible by default
- **On other models**: All Power Law lines hidden by default (can be toggled on)

#### 🌊 Cycle Repeat Volatility (NEW in v2.0.0)

**Added**: 2025-10-02 (PR #36)
**Reference**: Based on algorithm from `docs/reference/ROLLING LOAN STRATEGY.html`
**Version**: Power Law Model v2.0.0

Applies historical Bitcoin price volatility patterns to create more realistic price projections while maintaining the mathematical integrity of Power Law regression lines.

##### Key Features

- **Historical Pattern Application**: Uses price-to-PowerLaw ratios from historical data
- **Configurable Pattern Length**: 24-120 months of historical data (default: 96 months)
- **Diminishing Factor**: Reduces volatility impact over time (0.5-1.0, default: 1.0)
- **Selective Application**: Applies only to price projection line, not regression lines
- **Performance Optimized**: Deviation pattern caching prevents recalculation

##### Critical Design Decision

- ✅ **Price Projection Line**: Applies volatility for realistic market movements
- ✅ **Power Law Regression Lines**: Remain pure mathematical curves (Support/Fit/Resistance)
- ✅ **Strategy Engine**: Uses volatility-enhanced price projection for decisions

##### UI Controls

- **Volatility Toggle**: Enable/disable cycle repeat volatility
- **Pattern Length Slider**: Adjust historical data period (2-10 years)
- **Diminishing Factor Slider**: Control volatility reduction over time
- **Apply to Price Projection Button**: Copy Fit line parameters to projection baseline
- **Parameter Display**: Shows current custom projection parameters
- **Informational Tooltips**: Explains feature behavior and parameter effects

##### Default Behavior

- ✅ **Volatility Disabled**: Maintains existing Power Law behavior by default
- ✅ **96-Month Pattern**: Uses 8 years of historical data (matches original)
- ✅ **No Diminishing**: Factor of 1.0 preserves full volatility impact
- ✅ **Backward Compatible**: Existing simulations unchanged

##### Technical Implementation

- **VolatilityService**: Handles deviation pattern calculations and application
- **Enhanced PowerLawModel**: Integrates volatility while preserving regression lines
- **Extended Type System**: Full TypeScript support with backward compatibility
- **Performance Optimization**: Deviation pattern caching prevents recalculation
- **Microservices Architecture**: Self-contained components with clear APIs

##### Testing & Validation

- ✅ **42 Tests Passing** - Comprehensive coverage of all functionality
- ✅ **Type System Tests** - Interface validation and backward compatibility
- ✅ **VolatilityService Tests** - Core algorithm validation
- ✅ **PowerLawModel Tests** - Integration and regression line preservation
- ✅ **UI Component Tests** - Control behavior and parameter validation
- ✅ **Integration Tests** - End-to-end workflow validation

---

### 2. Manual Growth Rate Model 📊

**Type**: User-defined growth rate model  
**Basis**: Annual growth rate percentages

#### Presets

##### Conservative
- **Philosophy**: Steady, realistic growth with moderate volatility
- **Target Audience**: Risk-averse investors
- **Growth Pattern**: Balanced approach with controlled fluctuations

##### Moderate
- **Philosophy**: Balanced growth with typical Bitcoin cycles
- **Target Audience**: Standard investment approach
- **Growth Pattern**: Reflects historical Bitcoin market behavior

##### Optimistic
- **Philosophy**: High growth potential with significant volatility
- **Target Audience**: Growth-focused investors
- **Growth Pattern**: Aggressive growth with market corrections

##### Moonshot
- **Philosophy**: Extreme bull case scenario
- **Target Audience**: High-risk, high-reward investors
- **Growth Pattern**: Maximum growth potential with high volatility

##### Custom
- **Philosophy**: Complete user control over growth rates
- **Target Audience**: Advanced users with specific scenarios
- **Growth Pattern**: User-defined individual year rates

#### Custom Growth Rate Interface

**Added**: PR #25 (2025-09-28)

Features:
- ✅ Compact bottom drawer with frosted glass effect
- ✅ 12 individual year sliders (-100% to +300% range)
- ✅ Dynamic orange fill tracks showing current value
- ✅ Perfectly centered slider thumbs
- ✅ Accurate zero line positioning
- ✅ SessionStorage persistence
- ✅ Debounced updates for performance
- ✅ Toggle behavior (open/close)

**Usage**:
1. Select "Custom" from preset dropdown
2. Click "Customize Growth Rates" button
3. Adjust individual year sliders
4. Drawer auto-saves to sessionStorage
5. Close drawer to apply changes

#### Recent Fixes

**PR #27** (2025-09-29): Manual Growth Preset Selection + ATH Distance Fixes

**Issues Resolved**:
1. ✅ Preset selection now applies immediately
2. ✅ Chart regenerates instantly when presets change
3. ✅ No need to change other parameters for updates
4. ✅ Enhanced dependency tracking in UnifiedPriceChart

**Technical Changes**:
```typescript
// Added annualGrowthRates to dependency array
useEffect(() => {
  // Generate projections
}, [
  params.priceModel,
  params.simulationMonths,
  params.lastUpdated,
  JSON.stringify(params.annualGrowthRates) // ✅ Added
])

// Enhanced state updates with timestamp
setParams(prev => ({ 
  ...prev, 
  annualGrowthRates: adjustedRates,
  lastUpdated: Date.now() // ✅ Triggers chart regeneration
}))
```

#### Usage

```typescript
import { ManualGrowthModel } from '@/app/simulation/price-models/models/ManualGrowthModel'

const model = new ManualGrowthModel({
  annualGrowthRates: [50, 40, 30, 25, 20, 15, 12, 10, 8, 6, 5, 4]
})

const projections = model.generateProjections(simulationMonths)
```

---

### 3. Cycle Repeat Model 🔄

**Type**: Historical cycle analysis model  
**Basis**: Repeating Bitcoin market cycles

#### Features

- ✅ Analyzes historical Bitcoin cycles
- ✅ Projects future cycles based on past patterns
- ✅ Accounts for diminishing returns
- ✅ Cycle-specific volatility patterns

#### Cycle Calculation

Each cycle is calculated from the **1,458 days of the last cycle**, not from the previous cycle's endpoint.

---

### 4. Enhanced Models 🚀

**Type**: Advanced economic models  
**Basis**: Comprehensive economic factors

#### Features

- ✅ Multiple curve types (Logarithmic, Linear, S-Curve, Exponential)
- ✅ Curve controls (formerly "diminishing returns")
- ✅ Institutional saturation factors
- ✅ Competition effects
- ✅ Multi-curve chart visualization

---

## ATH (All-Time High) Calculations

**Updated**: PR #27 (2025-09-29)

### ATH Distance Calculation

**Previous Issue**: ATH distance showed incorrect percentages (19.5% instead of 8.1%)

**Root Cause**: 
- Used `useCurrentPriceOnly()` hook which didn't trigger data service initialization
- Fell back to hardcoded $100,000 instead of actual market price (~$114,209)

**Solution**:
```typescript
// Before: Doesn't trigger data service initialization
const { currentPrice: currentPriceData } = useCurrentPriceOnly()

// After: Triggers centralized data service initialization
const { currentPrice: currentPriceData } = useCentralizedData(true)

// Realistic fallback price
const currentPrice = currentPriceData?.price || 114209 // Use realistic current price
```

### ATH Calculation Method

Uses 'high' field from daily JSON data with real-time variable comparison:

```typescript
const athPrice = Math.max(...dailyData.map(d => d.high))
const athDistance = ((athPrice - currentPrice) / athPrice) * 100
```

### Display Format

- **Percentage**: "8.1% below ATH"
- **USD Difference**: "$10,069 below ATH"
- **Risk-based color coding**: Green (safe) → Yellow (caution) → Red (danger)

---

## Chart Integration

### UnifiedPriceChart Component

**File**: `app/simulation/components/charts/UnifiedPriceChart.tsx`

#### Features

- ✅ Historical data + projections
- ✅ Multiple model overlay support
- ✅ Interactive legend controls
- ✅ Power Law reference lines
- ✅ Liquidation price overlays
- ✅ Real-time updates

#### Dependency Management

**Enhanced**: PR #27 (2025-09-29)

```typescript
useEffect(() => {
  // Regenerate projections when any of these change
}, [
  params.priceModel,              // Model selection
  params.simulationMonths,        // Simulation length
  params.lastUpdated,             // Manual update trigger
  JSON.stringify(params.annualGrowthRates) // ✅ Growth rates
])
```

### Reference Lines

#### Liquidation Prices

- **Green line**: Liquidation with top-up (true liquidation price)
- **Yellow line**: Immediate liquidation (without top-up)
- **1px stroke width**: Clean, minimal design
- **Dotted style**: `strokeDasharray='2 2'`
- **Interactive legend**: Toggle visibility

#### Power Law Lines

- **Support line**: Lower bound projection
- **Fit line**: Best-fit projection
- **Resistance line**: Upper bound projection
- **Model-specific defaults**: Visible on Power Law, hidden on others
- **Manual toggle**: Can be enabled on any model for comparison

---

## Simulation Length Control

**Global Parameter**: Moved from individual models to global selector (PR #4)

### Features

- ✅ Single slider control (1-20 years)
- ✅ Persists across model switches
- ✅ Full-width layout in PriceModelSelector card
- ✅ Dynamic month count generation

### Usage

```typescript
<PriceModelSelector
  selectedModel={params.priceModel}
  simulationMonths={params.simulationMonths}
  onModelChange={handleModelChange}
  onSimulationLengthChange={handleSimulationLengthChange}
/>
```

---

## Performance Optimizations

### 1. Debounced Updates

Manual Growth sliders use 300ms debouncing:

```typescript
const debouncedUpdate = debounce((value) => {
  setParams(prev => ({
    ...prev,
    annualGrowthRates: value,
    lastUpdated: Date.now()
  }))
}, 300)
```

### 2. Memoization

Chart projections are memoized to prevent unnecessary recalculations:

```typescript
const projections = useMemo(() => {
  return generateProjections(params)
}, [params.priceModel, params.simulationMonths, /* ... */])
```

### 3. Conditional Generation

Price projections are **never cached** and always recalculated when parameters change (by design).

---

## Model Comparison

| Feature | Power Law | Manual Growth | Cycle Repeat | Enhanced |
|---------|-----------|---------------|--------------|----------|
| **Basis** | Mathematical | User-defined | Historical | Economic |
| **Complexity** | Low | Low | Medium | High |
| **Customization** | Medium | High | Low | High |
| **Volatility** | Low | Variable | High | Variable |
| **Presets** | No | Yes (5) | No | Yes |
| **Historical Data** | Yes | No | Yes | Yes |
| **Max Decline** | 0% | Variable | 80%+ | Variable |

---

## Best Practices

### 1. Model Selection

- **Conservative investors**: Power Law or Manual Growth (Conservative preset)
- **Moderate investors**: Manual Growth (Moderate/Optimistic presets)
- **Aggressive investors**: Manual Growth (Moonshot preset) or Enhanced models
- **Custom scenarios**: Manual Growth (Custom preset)

### 2. Parameter Tuning

- Start with presets before customizing
- Test multiple scenarios for risk assessment
- Compare models side-by-side using Power Law overlay
- Validate projections against historical data

### 3. Chart Interpretation

- Use log/log view for long-term trends
- Enable Power Law lines for reference
- Monitor liquidation price proximity
- Check ATH distance for risk assessment

---

## Troubleshooting

### Issue: Preset Selection Not Working

**Cause**: Missing dependency in chart regeneration  
**Solution**: Ensure `annualGrowthRates` in dependency array (Fixed in PR #27)

### Issue: ATH Distance Incorrect

**Cause**: Using wrong current price data source  
**Solution**: Use `useCentralizedData(true)` instead of `useCurrentPriceOnly()` (Fixed in PR #27)

### Issue: Chart Not Updating

**Cause**: Missing `lastUpdated` timestamp trigger  
**Solution**: Update `lastUpdated` when changing parameters (Fixed in PR #27)

---

## Related Documentation

- [Platform Configuration Guide](platform-configuration-guide.md)
- [Localization Guide](localization-guide.md)
- [Parameters Module Documentation](parameters/README.md)

---

**Maintained By**: AI Assistant (Augment Agent)  
**Last Updated**: 2025-09-30  
**Version**: 2.0 (Comprehensive updates from PRs #23, #25, #27)

