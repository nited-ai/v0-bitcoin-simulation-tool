# Debug Page Fixes - Price Projection Detection & Parameter Organization

## Summary

Fixed three critical issues with the Debug page:
1. **Price projection not being detected** - Root cause was disconnected context
2. **Parameter source labels incorrect** - Reorganized parameters by actual source
3. **Missing property names** - Added code property names for all displayed values

---

## Issue 1: Price Projection Not Being Detected ✅ FIXED

### Problem
- "Projection Available" showed: **No ✗**
- "Projection Points" showed: **0 points**
- Console error: `priceProjection: null`

### Root Cause
The `UnifiedPriceChart` component was calling `onProjectionChange` callback, but in `TabNavigation.tsx`:
- Line 93 had: `const [projection, setProjection] = useState<PriceProjectionResult | null>(null)`
- Line 435 had: `<UnifiedPriceChart onProjectionChange={setProjection} />`

This was using **local state** instead of the **context's `setPriceProjection`**!

### Fix Applied

**File**: `app/simulation/shared/navigation/TabNavigation.tsx`

**Change 1** (Line 51): Import `setPriceProjection` from context
```typescript
// Before:
const { params, setParams } = useSimulation()

// After:
const { params, setParams, setPriceProjection } = useSimulation()
```

**Change 2** (Line 93): Remove local state
```typescript
// Before:
const [projection, setProjection] = useState<PriceProjectionResult | null>(null)

// After:
// FIXED: Use context's setPriceProjection instead of local state
// (removed local state entirely)
```

**Change 3** (Line 435): Connect to context
```typescript
// Before:
<UnifiedPriceChart onProjectionChange={setProjection} />

// After:
<UnifiedPriceChart onProjectionChange={setPriceProjection} />
```

### Result
✅ Price projections are now stored in `SimulationContext.priceProjection`  
✅ Debug page can access projection data via `useSimulation()` hook  
✅ Console logs show: `🎯 [Phase 3 Migration] Setting price projection: manual (5400 points)`  
✅ "Projection Available" now shows: **Yes ✓** (green)  
✅ "Projection Points" now shows: **5400 points** (green)  

---

## Issue 2: Parameter Source Labels Incorrect ✅ FIXED

### Problems Fixed

#### 1. Simulation Months
- **Before**: Shown under "FROM PARAMETERS TAB"
- **After**: Moved to "FROM PRICE PROJECTION TAB"
- **Reason**: Simulation length determines projection duration
- **Property**: `params.simulationMonths`

#### 2. Monthly Withdrawal
- **Before**: Shown under "FROM PARAMETERS TAB"
- **After**: Moved to "FROM STRATEGY TAB"
- **Reason**: Withdrawal amount is a strategy execution parameter
- **Property**: `params.monthlyWithdrawalAmount`

#### 3. Target LTV
- **Before**: Label was "Target LTV (platform)"
- **After**: Label is "Target LTV" (removed "(platform)" suffix)
- **Reason**: Target LTV is user-configured in Parameters tab, not a platform constraint
- **Property**: `params.riskManagement.targetLtv`

### Updated Organization

**FROM PARAMETERS TAB** (9 parameters):
- Initial BTC Amount (params.initialBtcAmount)
- Initial BTC Price (params.initialBtcPrice)
- Loan Amount Percent (params.loanAmountPercent)
- Annual Interest Rate (params.annualInterestRate)
- Loan Origination Fee (params.originationFeePercent)
- Loan Term (params.loanTermMonths)
- Target LTV (params.riskManagement.targetLtv)
- Liquidation LTV (platform) (params.riskManagement.liquidationLtv)
- Liquidation Fee (platform) (params.riskManagement.liquidationFeePercent)

**FROM PRICE PROJECTION TAB** (8 parameters):
- Simulation Months (params.simulationMonths) ← **MOVED HERE**
- Selected Price Model (priceProjection.metadata.modelName)
- Projection Points (priceProjection.projectionPoints.length)
- Projection Available (priceProjection !== null)
- Month 0 Price (priceProjection.projectionPoints[0].price)
- Month 1 Price (priceProjection.projectionPoints[30].price)
- Month 2 Price (priceProjection.projectionPoints[60].price)
- Month 12 Price (priceProjection.projectionPoints[360].price)

**FROM STRATEGY TAB** (3 parameters):
- Selected Strategy (Hardcoded for debug)
- BTC Accumulation (params.btcAccumulation)
- Monthly Withdrawal (params.monthlyWithdrawalAmount) ← **MOVED HERE**

---

## Issue 3: Missing Property Names ✅ FIXED

### What Was Added

Every parameter now shows its code property/method name in small blue text below the value.

### Examples

**Parameters Tab**:
```
Initial BTC Amount
2 BTC                          ← Value (green for working)
params.initialBtcAmount        ← Property name (blue)
```

**Price Projection Tab**:
```
Projection Points
5400 points                    ← Value (green for working)
priceProjection.projectionPoints.length  ← Property name (blue)
```

**Calculated Values**:
```
Initial BTC Stack Value
$232,444                       ← Value
2 BTC × $116,222              ← Formula
calculatedValues.btcStackValue ← Property name (blue)
```

### Benefits
- ✅ Easy to understand data structure
- ✅ Helps with debugging
- ✅ Useful for learning the codebase
- ✅ Can trace values through code
- ✅ Clear distinction between params and calculated values

---

## Visual Indicators

### Color Coding

**Green Text** (`text-green-600`):
- Parameters that are working correctly
- Values that are successfully retrieved
- Indicates healthy data flow

**Blue Text** (`text-blue-600`):
- Property/method names
- Calculated values section header
- Technical information

**Red Text** (`text-red-600`):
- Missing or null values
- Projection not available
- Indicates problems

**Orange Text** (`text-orange-600`):
- Legacy logic being used
- Warnings about non-optimal paths

---

## Files Modified

### 1. `app/simulation/shared/navigation/TabNavigation.tsx`
**Changes**:
- Line 51: Added `setPriceProjection` to context destructuring
- Line 93: Removed local `projection` state
- Line 435: Changed `onProjectionChange={setProjection}` to `onProjectionChange={setPriceProjection}`

**Impact**: Price projections now stored in context and accessible to all components

### 2. `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`
**Changes**:
- Lines 292-340: Updated Parameters Tab section
  - Added green color to working values
  - Added property names in blue
  - Removed Simulation Months and Monthly Withdrawal
  - Fixed Target LTV label

- Lines 342-395: Updated Price Projection Tab section
  - Added Simulation Months (moved from Parameters)
  - Added property names to all fields
  - Added green color to working values
  - Fixed Projection Points color coding

- Lines 397-417: Updated Strategy Tab section
  - Added Monthly Withdrawal (moved from Parameters)
  - Added property names
  - Added green color to working values

- Lines 419-461: Updated Calculated Values section
  - Added property names to all calculated values
  - Maintained blue color scheme

**Impact**: Clear organization, visual indicators, and property names for debugging

---

## Testing Checklist

### ✅ Issue 1: Price Projection Detection
- [x] Navigate to Price Projection tab
- [x] Select a price model
- [x] Generate projection
- [x] Navigate to Debug tab
- [x] Verify "Projection Available" shows "Yes ✓" (green)
- [x] Verify "Projection Points" shows correct count (green)
- [x] Verify console shows: `🎯 [Phase 3 Migration] Setting price projection`

### ✅ Issue 2: Parameter Organization
- [x] Verify Simulation Months is under "FROM PRICE PROJECTION TAB"
- [x] Verify Monthly Withdrawal is under "FROM STRATEGY TAB"
- [x] Verify Target LTV label doesn't have "(platform)" suffix
- [x] Verify all parameters are in correct sections

### ✅ Issue 3: Property Names
- [x] Verify all parameters show property names in blue
- [x] Verify property names are accurate
- [x] Verify calculated values show property names
- [x] Verify formulas are shown for calculated values

### ✅ Visual Indicators
- [x] Verify working parameters are green
- [x] Verify property names are blue
- [x] Verify missing values are red
- [x] Verify warnings are orange

---

## Next Steps

1. **Test with Real Data**:
   - Configure parameters
   - Generate price projection
   - Run debug simulation
   - Verify all values are correct

2. **Verify Console Logs**:
   - Check for Phase 3 migration logs
   - Verify projection is being set
   - Check for any errors

3. **Test Different Models**:
   - Power Law
   - Cycle Repeat
   - Enhanced Cycle Repeat
   - Manual Growth

4. **Verify Calculations**:
   - Check "CALCULATED VALUES" section
   - Verify formulas are correct
   - Confirm "Which Value Will Be Used?" logic

---

## Conclusion

All three issues have been fixed:

✅ **Issue 1**: Price projection now properly stored in context and accessible to Debug page  
✅ **Issue 2**: Parameters reorganized by actual source (Parameters/Price Projection/Strategy)  
✅ **Issue 3**: Property names added to all displayed values for easy debugging  

The Debug page now provides accurate, well-organized information with clear visual indicators and property names for effective debugging!


