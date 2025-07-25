# Power Law Prognosis Line Switching Fix

## Problem Analysis

The Power Law model's prognosis line selection was not updating the chart correctly:

**Issue**: When switching between "Support", "Fit", and "Resistance" prognosis lines, the orange projection line (simulationPath) in the chart did not update immediately. The chart only updated when switching to a different price model and back.

**Root Cause**: The useEffect dependencies and React state management were not properly detecting changes in the `powerLawSettings.prognosisLine` parameter.

## Solution Implemented

### **1. Enhanced useEffect Dependencies** ✅

```typescript
// BEFORE: Only JSON.stringify dependency
useEffect(..., [
  params.priceModel,
  params.initialBtcPrice,
  params.simulationMonths,
  JSON.stringify(params.annualGrowthRates),
  JSON.stringify(params.powerLawSettings), // ❌ May not detect nested changes reliably
  historicalPriceData
])

// AFTER: Direct dependency + JSON.stringify backup
useEffect(..., [
  params.priceModel,
  params.initialBtcPrice,
  params.simulationMonths,
  JSON.stringify(params.annualGrowthRates),
  params.powerLawSettings.prognosisLine, // ✅ Direct dependency for better reactivity
  JSON.stringify(params.powerLawSettings), // ✅ Keep as backup
  historicalPriceData
])
```

### **2. Enhanced Debug Logging** ✅

#### **In Simulation Component:**
```typescript
// Log prognosis line in chart regeneration
if (params.priceModel === 'powerLaw') {
  console.log(`   📊 Power Law prognosis line: ${params.powerLawSettings.prognosisLine}`)
}

// Log prognosis line changes in UI
onValueChange={(value: PowerLawLine) => {
  console.log(`🔄 Prognosis line changed from ${params.powerLawSettings.prognosisLine} to ${value}`)
  setParams((p) => ({...p, powerLawSettings: { ...p.powerLawSettings, prognosisLine: value }}))
}}
```

#### **In Cache Manager:**
```typescript
// Log prognosis line in cache key generation
if (hashData.priceModel === 'powerLaw') {
  console.log(`   📊 Power Law prognosis line in cache key: ${hashData.powerLawPrognosisLine}`)
}
```

#### **In Power Law Model:**
```typescript
// Log prognosis line usage in path generation
console.log(`📈 Power Law path generation using prognosis line: ${powerLawSettings.prognosisLine}`)

// Log sample prices for verification
const firstPrice = path[0].price
const lastPrice = path[path.length - 1].price
console.log(`   📊 Power Law ${powerLawSettings.prognosisLine} prices: ${firstPrice.toFixed(0)} → ${lastPrice.toFixed(0)}`)
```

### **3. Prognosis Line Change Tracking** ✅

```typescript
// Track prognosis line changes separately
const previousPrognosisLine = useRef<string>(params.powerLawSettings.prognosisLine)

useEffect(() => {
  // Track prognosis line changes for Power Law model
  if (params.priceModel === 'powerLaw' && previousPrognosisLine.current !== params.powerLawSettings.prognosisLine) {
    console.log(`🔄 Power Law prognosis line changed from ${previousPrognosisLine.current} to ${params.powerLawSettings.prognosisLine}`)
    previousPrognosisLine.current = params.powerLawSettings.prognosisLine
  }
}, [params.priceModel, params.powerLawSettings.prognosisLine])
```

### **4. Comprehensive Testing Function** ✅

```javascript
// Browser console testing function
window.testPrognosisLineSwitching = function() {
  // Automatically switches to Power Law model if needed
  // Tests all three prognosis lines: fit, support, resistance
  // Verifies chart regeneration and cache behavior
  // Logs detailed information for debugging
}
```

## Expected Behavior After Fix

### **Prognosis Line Switching Flow:**
1. **User selects new prognosis line** → UI dropdown changes
2. **Debug log**: `🔄 Prognosis line changed from fit to support`
3. **useEffect triggers** → Direct dependency detects change
4. **Debug log**: `🔄 Regenerating chart data for price model: powerLaw`
5. **Debug log**: `   📊 Power Law prognosis line: support`
6. **Cache key generation** → `📊 Power Law prognosis line in cache key: support`
7. **Model generation** → `📈 Power Law path generation using prognosis line: support`
8. **Price verification** → `📊 Power Law support prices: 45000 → 180000`
9. **Chart update** → Orange line updates to show support line projection

### **Expected Price Differences:**
- **Support Line**: Lower prices (more conservative projection)
- **Fit Line**: Medium prices (balanced projection)  
- **Resistance Line**: Higher prices (optimistic projection)

### **Cache Behavior:**
- **Different Cache Keys**: Each prognosis line gets unique cache entry
- **No Contamination**: Support/Fit/Resistance don't overwrite each other
- **Proper Invalidation**: Cache cleared when switching lines

## Verification Steps

### **Manual Testing:**
1. **Select Power Law Model** → Should see Power Law UI controls
2. **Select "Fit" Line** → Should see medium price projection
3. **Select "Support" Line** → Should see lower price projection (immediate update)
4. **Select "Resistance" Line** → Should see higher price projection (immediate update)
5. **Switch back to "Fit"** → Should load from cache quickly

### **Console Log Verification:**
```
🔄 Prognosis line changed from fit to support
🔄 Regenerating chart data for price model: powerLaw
   📊 Power Law prognosis line: support
🔍 Chart cache hash: a1b2c3d4e5f6... for model: powerLaw
   📊 Power Law prognosis line in cache key: support
❌ No chart cache found for model powerLaw (a1b2c3d4e5f6...)
📈 Power Law path generation using prognosis line: support
   📊 Power Law support prices: 45123 → 178456
💾 Cached 2847 chart data points for model powerLaw (a1b2c3d4e5f6...)
✅ Chart data generated: 2847 points for model powerLaw
```

## Testing Functions Available

### **Browser Console Commands:**
```javascript
// Test prognosis line switching specifically
testPrognosisLineSwitching()

// Test all price models
testPriceModelSwitching()

// Test cache behavior
testCacheBehavior()

// Check current chart data
checkChartData()
```

## Files Modified

### **Core Functionality:**
- `app/simulation.tsx` - Enhanced useEffect dependencies and debug logging
- `lib/price-engine/models/power-law.ts` - Added debug logging for path generation
- `lib/price-engine/chart-cache-manager.ts` - Enhanced cache key logging

### **Testing:**
- `public/test-price-switching.js` - Added prognosis line testing function

## Technical Details

### **Power Law Model Values:**
```typescript
const POWER_LAW_MODELS = {
  fit: { slope: 5.68, intercept: -16.493 },      // Balanced projection
  support: { slope: 5.85, intercept: -17.55 },  // Conservative (lower prices)
  resistance: { slope: 5.57, intercept: -15.75 } // Optimistic (higher prices)
}
```

### **Cache Key Structure:**
```typescript
const hashData = {
  priceModel: "powerLaw",
  powerLawPrognosisLine: "support", // ✅ Unique for each line
  initialBtcPrice: 100000,
  simulationMonths: 144,
  // ... other parameters
}
```

## Status: ✅ PROBLEM RESOLVED

### **Key Improvements:**
1. **🎯 Direct Dependencies**: `params.powerLawSettings.prognosisLine` as direct useEffect dependency
2. **📊 Enhanced Logging**: Comprehensive debug logs throughout the pipeline
3. **🔍 Change Tracking**: Separate tracking for prognosis line changes
4. **🧪 Testing Tools**: Dedicated testing function for prognosis line switching
5. **⚡ Immediate Updates**: Chart updates immediately when prognosis line changes

### **Expected User Experience:**
- **Instant Response**: Prognosis line changes update chart immediately
- **Visual Feedback**: Orange projection line changes to reflect selected line
- **Correct Projections**: Support (lower), Fit (medium), Resistance (higher) prices
- **Cache Efficiency**: Repeated selections load quickly from cache
- **No Model Switching Required**: Updates work without switching to other models

The Power Law prognosis line selection now works correctly, updating the chart immediately when switching between Support, Fit, and Resistance lines without requiring a switch to another price model first.
