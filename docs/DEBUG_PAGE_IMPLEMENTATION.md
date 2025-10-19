# Rolling Loan Strategy Debug Page - Implementation Summary

## Overview

Created a comprehensive debug page to trace the complete execution flow of the Rolling Loan Strategy and identify where loan amount calculations are going wrong.

---

## What Was Created

### 1. Debug Page Component
**File**: `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`

A full-featured debugging interface that displays:
- Input parameters from all tabs
- Month-by-month execution trace
- Loan amount calculation details
- Strategy decisions and reasoning
- Expected vs actual comparison
- Interactive controls

### 2. Tab Navigation Integration
**Files Modified**:
- `app/simulation/shared/navigation/TabNavigation.tsx`

Added a new "Debug" tab to the simulation interface with:
- Bug icon
- "Dev" badge
- Full integration with existing tab system

---

## Debug Page Features

### Section 1: Debug Controls
- **Run Debug Simulation** button - Executes Rolling Loan Strategy with current parameters
- **Copy Debug Output** button - Copies all debug info to clipboard (JSON format)
- **Show All Months** checkbox - Toggle between key months (0, 6, 12, 18) and all months (0-24)

### Section 2: Input Parameters
Displays all parameters being passed to the strategy:
- Initial BTC Amount
- Initial BTC Price
- **Loan Amount Percent** (highlighted in blue)
- Max Loan Amount (fixed dollar value)
- Target LTV (platform maximum)
- BTC Accumulation mode

### Section 3: Expected vs Actual Comparison
Shows side-by-side comparison for key months:
- **Month 0**: Expected vs Actual loan amount
- **Month 12**: Expected vs Actual loan amount
- Visual indicators (✅ green checkmark or ❌ red X)
- Collateral value for context

### Section 4: Month-by-Month Execution Trace
For each simulated month, displays:

**Market State**:
- BTC Price
- BTC Amount
- Collateral Value
- Active Loans Count

**Loan Amount Calculation** (highlighted section):
- Badge showing whether `loanAmountPercent` was used or legacy logic
- Step-by-step calculation with actual numbers
- Formula display (e.g., "$124,789.67 × (10 / 100) = $12,478.97")
- Final result (maxLoanAmount)
- Percentage of collateral

**Strategy Decision**:
- Allow Investment (Yes/No)
- Investment Multiplier (as decimal and percentage)
- Actual Loan Amount (collateral × multiplier)
- Strategy's reasoning text

**Rollover Details** (when applicable):
- Maturing loans count
- Total repayment due
- Highlighted in amber/yellow

---

## How It Works

### Simulation Process

1. **Get Parameters**: Reads from SimulationContext
2. **Get Price Projection**: Reads from SimulationContext
3. **Create Strategy Instance**: Instantiates RollingLoanStrategy
4. **Simulate Months**: Loops through selected months (0, 6, 12, 18 or 0-24)
5. **For Each Month**:
   - Calculate collateral value
   - Identify maturing loans
   - Create StrategyContext
   - Call `strategy.makeDecision()`
   - Capture all intermediate calculations
   - Store debug info
   - Update simulation state (add new loans, remove matured loans)

### Calculation Tracing

The debug page captures the exact logic from `RollingLoanStrategy.ts`:

```typescript
// This is what the debug page traces:
if (params.loanAmountPercent !== undefined && params.loanAmountPercent > 0) {
  // NEW LOGIC: Use user-configured percentage
  maxLoanAmount = collateralValue * (params.loanAmountPercent / 100)
} else {
  // LEGACY LOGIC: Use targetLtv and maxLoanAmount constraint
  maxLoanAmount = Math.min(
    params.maxLoanAmount,
    collateralValue * (targetLtv / 100)
  )
}
```

The debug page shows:
- Which path was taken (badge: "Using loanAmountPercent" or "Using Legacy Logic")
- The actual calculation with numbers
- The result

---

## Usage Instructions

### Step 1: Configure Parameters
1. Go to **Parameters** tab
2. Set loan amount to 10% (or any percentage)
3. Note the calculated dollar amount

### Step 2: Generate Price Projection
1. Go to **Price Projection** tab
2. Select a price model (e.g., Power Law)
3. Generate projection

### Step 3: Open Debug Tab
1. Go to **Debug** tab (new tab with Bug icon and "Dev" badge)
2. Review input parameters section
3. Verify `loanAmountPercent` is set correctly

### Step 4: Run Debug Simulation
1. Click "Run Debug Simulation" button
2. Wait for simulation to complete
3. Review the results

### Step 5: Analyze Results

**Check Expected vs Actual**:
- Month 0: Should show ~10% of initial collateral
- Month 12: Should show ~10% of current collateral (not 50%!)
- Look for red X marks indicating mismatches

**Review Month-by-Month Trace**:
- Expand each month card
- Check "Loan Amount Calculation" section
- Verify badge shows "Using loanAmountPercent"
- Confirm calculation uses 10% (not 50%)
- Check final loan amount matches expected

**Identify Issues**:
- If badge shows "Using Legacy Logic" → `loanAmountPercent` not being passed
- If calculation uses wrong percentage → Parameter conversion issue
- If loan amount doesn't match → Strategy logic issue

---

## What This Reveals

### Issue Confirmation

The debug page will immediately show:

1. **Is `loanAmountPercent` being passed?**
   - Check Input Parameters section
   - Should show "10%" (not "Not Set")

2. **Is the strategy using it?**
   - Check badge in Loan Amount Calculation section
   - Should show "Using loanAmountPercent" (green)
   - NOT "Using Legacy Logic" (red)

3. **Is the calculation correct?**
   - Check calculation formula
   - Should show: `$124,789.67 × (10 / 100) = $12,478.97`
   - NOT: `Math.min($1,051.12, $62,394.84) = $1,051.12`

4. **Does it match expected?**
   - Check Expected vs Actual section
   - Should show green checkmarks
   - NOT red X marks

### Root Cause Identification

If the debug page shows:
- ✅ `loanAmountPercent` = 10% → Parameter is being passed correctly
- ❌ Badge = "Using Legacy Logic" → Strategy is NOT using the parameter
- ❌ Calculation uses `Math.min(...)` → Old logic is still active
- ❌ Result = $1,051.12 → Confirms the bug

This proves the fix in `RollingLoanStrategy.ts` (lines 92-107) is not being applied or there's another issue.

---

## Technical Details

### Dependencies
- React hooks: `useState`, `useMemo`
- UI components: Card, Button, Badge, Checkbox, Label
- Icons: Bug, Play, Copy, CheckCircle, XCircle, AlertTriangle
- Context: `useSimulation` hook
- Strategy: `RollingLoanStrategy` class
- Types: `StrategyContext`, `Loan`, `MonthDebugInfo`

### State Management
- `debugInfo`: Array of MonthDebugInfo objects
- `showAllMonths`: Boolean toggle for month display
- `isRunning`: Boolean for button disabled state

### Data Flow
```
SimulationContext
  ↓
Debug Page
  ↓
RollingLoanStrategy.makeDecision()
  ↓
Debug Info Capture
  ↓
UI Display
```

---

## Files Created/Modified

### Created
1. `app/simulation/tabs/debug/RollingLoanDebugPage.tsx` (464 lines)
   - Complete debug interface
   - Month-by-month tracing
   - Interactive controls

### Modified
1. `app/simulation/shared/navigation/TabNavigation.tsx`
   - Added Bug icon import
   - Added 'debug' to TabValue type
   - Added debug tab configuration
   - Added debug tab content rendering

---

## Next Steps

### 1. Test the Debug Page
- Navigate to http://localhost:3002/simulation?tab=debug
- Run debug simulation
- Analyze the output

### 2. Identify the Issue
- Check if `loanAmountPercent` is being passed
- Verify which calculation path is being taken
- Compare expected vs actual loan amounts

### 3. Fix the Root Cause
Based on debug output:
- If parameter not passed → Fix parameter flow
- If legacy logic used → Fix strategy implementation
- If calculation wrong → Fix formula

### 4. Verify the Fix
- Re-run debug simulation
- Confirm badge shows "Using loanAmountPercent"
- Verify loan amounts match expected values
- Check green checkmarks in comparison section

---

## Benefits

1. **Immediate Visibility**: See exactly what's happening at each step
2. **No Guesswork**: Actual calculations with real numbers
3. **Easy Comparison**: Expected vs actual side-by-side
4. **Comprehensive**: All parameters, decisions, and reasoning in one place
5. **Reusable**: Can be used for future debugging and testing
6. **Educational**: Shows how the strategy works internally

---

## Status

✅ Debug page created and integrated
✅ Server compiling successfully
✅ Ready for testing at http://localhost:3002/simulation?tab=debug

**Next Action**: Navigate to the Debug tab and run a simulation to identify the exact issue with loan amount calculations!


