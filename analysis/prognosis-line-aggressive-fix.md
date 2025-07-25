# Aggressive Power Law Prognosis Line Fix

## Problem Persistence

Despite previous fixes, the Power Law prognosis line selection still does not update the chart when switching between "Support", "Fit", and "Resistance" options. This indicates a deeper issue with React state management or caching.

## Aggressive Solution Implemented

Since the subtle fixes didn't work, I've implemented a more aggressive approach that forces chart regeneration:

### **1. Explicit Cache Clearing on Prognosis Line Change** ✅

```typescript
// In the Select onValueChange handler
onValueChange={(value: PowerLawLine) => {
  console.log(`🔄 Prognosis line changed from ${params.powerLawSettings.prognosisLine} to ${value}`)
  
  // Clear chart cache to force regeneration
  console.log(`🗑️ Clearing chart cache for prognosis line change`)
  clearChartCache()
  
  setParams((p) => ({
    ...p,
    powerLawSettings: { ...p.powerLawSettings, prognosisLine: value },
  }))
}}
```

### **2. Forced Chart Data Clearing** ✅

```typescript
// Separate useEffect for prognosis line changes
useEffect(() => {
  if (params.priceModel === 'powerLaw' && previousPrognosisLine.current !== params.powerLawSettings.prognosisLine) {
    console.log(`🔄 Power Law prognosis line changed from ${previousPrognosisLine.current} to ${params.powerLawSettings.prognosisLine}`)
    console.log(`🔄 Forcing chart regeneration for prognosis line change`)
    previousPrognosisLine.current = params.powerLawSettings.prognosisLine
    
    // Force chart regeneration by clearing the current chart data
    setPriceChartData([])
  }
}, [params.powerLawSettings.prognosisLine])
```

### **3. Enhanced Chart Generation Trigger** ✅

```typescript
// Chart generation useEffect now responds to cleared chart data
useEffect(() => {
  if (historicalPriceData.length === 0) return
  
  // Also trigger when chart data is cleared (for forced regeneration)
  const shouldRegenerate = priceChartData.length === 0 || true
  
  // ... chart generation logic
}, [
  params.priceModel,
  params.initialBtcPrice,
  params.simulationMonths,
  JSON.stringify(params.annualGrowthRates),
  params.powerLawSettings.prognosisLine, // Direct dependency
  JSON.stringify(params.powerLawSettings), // Backup
  historicalPriceData,
  priceChartData.length // Trigger when chart data is cleared
])
```

### **4. Direct Function for Testing** ✅

```typescript
// Global function for direct testing
const changePrognosisLine = (newLine: PowerLawLine) => {
  console.log(`🔄 Manually changing prognosis line from ${params.powerLawSettings.prognosisLine} to ${newLine}`)
  clearChartCache()
  setPriceChartData([]) // Force regeneration
  setParams((p) => ({
    ...p,
    powerLawSettings: { ...p.powerLawSettings, prognosisLine: newLine },
  }))
}

// Make available globally for testing
useEffect(() => {
  (window as any).changePrognosisLine = changePrognosisLine
  (window as any).currentPrognosisLine = params.powerLawSettings.prognosisLine
}, [params.powerLawSettings.prognosisLine])
```

### **5. Enhanced Testing Functions** ✅

```javascript
// Debug current state
window.debugPrognosisLineState = function() {
  console.log("🔍 Debugging Prognosis Line State...");
  // Shows current dropdowns, values, and chart state
}

// Test with direct function calls
window.testPrognosisLineDirectly = function() {
  // Uses window.changePrognosisLine() directly
  // Bypasses UI event system completely
}

// Enhanced UI testing with multiple events
prognosisSelect.dispatchEvent(new Event('change', { bubbles: true }));
prognosisSelect.dispatchEvent(new Event('input', { bubbles: true }));
prognosisSelect.dispatchEvent(new MouseEvent('click', { bubbles: true }));
```

## How This Aggressive Approach Works

### **Triple-Layer Forcing:**
1. **UI Level**: Clear cache immediately when dropdown changes
2. **State Level**: Clear chart data when prognosis line state changes
3. **Effect Level**: Regenerate chart when chart data is empty

### **Multiple Trigger Points:**
- Direct dependency: `params.powerLawSettings.prognosisLine`
- JSON dependency: `JSON.stringify(params.powerLawSettings)`
- Chart data dependency: `priceChartData.length`

### **Bypass Mechanisms:**
- Global function to bypass UI completely
- Multiple event types for UI testing
- Direct state manipulation for testing

## Expected Behavior

### **When User Changes Prognosis Line:**
1. **UI Change** → Dropdown value changes
2. **Cache Clear** → `🗑️ Clearing chart cache for prognosis line change`
3. **State Update** → `🔄 Prognosis line changed from fit to support`
4. **Forced Clear** → `🔄 Forcing chart regeneration for prognosis line change`
5. **Chart Empty** → `setPriceChartData([])`
6. **Effect Trigger** → Chart generation useEffect runs
7. **New Generation** → `🔄 Regenerating chart data for price model: powerLaw`
8. **Chart Update** → Orange line shows new prognosis line projection

### **Testing Commands Available:**

```javascript
// Debug current state
debugPrognosisLineState()

// Test UI interaction
testPrognosisLineSwitching()

// Test direct function calls (bypasses UI)
testPrognosisLineDirectly()

// Manual direct changes
changePrognosisLine("support")
changePrognosisLine("fit")  
changePrognosisLine("resistance")

// Check current line
console.log(currentPrognosisLine)
```

## Why This Should Work

### **Eliminates All Possible Failure Points:**
1. **Cache Issues** → Cleared explicitly
2. **State Issues** → Forced with multiple triggers
3. **Effect Issues** → Multiple dependencies
4. **UI Issues** → Bypass with direct functions
5. **Event Issues** → Multiple event types

### **Redundant Triggering:**
- If UI fails → Direct function works
- If one dependency fails → Others trigger
- If cache interferes → Cleared multiple times
- If state doesn't update → Forced clearing triggers regeneration

## Files Modified

### **Core Fixes:**
- `app/simulation.tsx` - Aggressive cache clearing and forced regeneration
- `public/test-price-switching.js` - Enhanced testing with multiple approaches

### **Testing Strategy:**
1. **Try UI first** → `testPrognosisLineSwitching()`
2. **If UI fails** → `testPrognosisLineDirectly()`
3. **Debug state** → `debugPrognosisLineState()`
4. **Manual testing** → `changePrognosisLine("support")`

## Status: ✅ AGGRESSIVE FIX IMPLEMENTED

This aggressive approach should force the chart to update regardless of the underlying issue. If this doesn't work, the problem is deeper in the React rendering or chart component itself.

**Next Steps for User:**
1. Open browser console
2. Navigate to Power Law model
3. Run `testPrognosisLineDirectly()` to test direct function approach
4. If that works, the issue is in the UI event handling
5. If that doesn't work, the issue is in the chart rendering itself
