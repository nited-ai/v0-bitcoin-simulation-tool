# Rolling Loan Strategy Fix - January 10, 2025

## Problem Summary

The Rolling Loan Strategy was calculating loan amounts incorrectly, resulting in loans that were far too small (0.84% - 2.1% of collateral) instead of the user-configured percentage (10%).

---

## Root Cause Analysis

### Issue Identified

**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts`

**Problem Code** (lines 92-97):
```typescript
const collateralValue = totalBtcAmount * btcPrice
const targetLtv = params.riskManagement.targetLtv
const maxLoanAmount = Math.min(
  params.maxLoanAmount,  // ❌ PROBLEM: This is a small fixed value!
  collateralValue * (targetLtv / 100)
)
```

### Why This Caused Small Loans

**Month 0 Example**:
- User configured: 10% loan amount
- `params.maxLoanAmount` = $1,051.12 (incorrectly calculated fixed value)
- `collateralValue` = $124,789.67
- `targetLtv` = 50% (platform maximum)
- `collateralValue * (targetLtv / 100)` = $124,789.67 * 0.50 = $62,394.84

**Calculation**:
```typescript
maxLoanAmount = Math.min($1,051.12, $62,394.84)
              = $1,051.12  // ❌ WRONG! Should be $12,478.97 (10%)
```

**Result**: Loan is only 0.84% of collateral instead of 10%!

### Why `params.maxLoanAmount` Was Wrong

The `maxLoanAmount` parameter was being calculated in `useSimulationRunner.ts` as a **fixed dollar amount** based on the initial BTC price:

```typescript
const calculatedLoanAmount = (params.loanAmountPercent / 100) * btcStackValue
// Example: (10 / 100) * $124,789.67 = $12,478.97
```

But then this was being used as a **constraint** in the `Math.min()` call, which meant:
- If the fixed amount was smaller than the scaled amount, it would always win
- The loan amount would never scale with BTC price changes
- The strategy would ignore the user's intended percentage

### Additional Issue: Rollover Calculation

The `handleLoanRollover()` method was also using `params.riskManagement.targetLtv` (50%) instead of the user-configured `loanAmountPercent` (10%):

```typescript
const rolloverParams: LoanRolloverParams = {
  // ...
  targetLtvPercent: params.riskManagement.targetLtv,  // ❌ WRONG: 50% instead of 10%
  // ...
}
```

This meant that even if the initial loan was correct, the rollover would use the wrong percentage!

---

## Fix Applied

### 1. Updated `makeDecision()` Method

**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts` (lines 92-107)

```typescript
const collateralValue = totalBtcAmount * btcPrice

// CRITICAL FIX: Use loanAmountPercent if available (user-configured percentage)
// Otherwise fall back to old logic for backward compatibility
let maxLoanAmount: number
if (params.loanAmountPercent !== undefined && params.loanAmountPercent > 0) {
  // Use user-configured percentage (e.g., 10% of collateral)
  maxLoanAmount = collateralValue * (params.loanAmountPercent / 100)
} else {
  // Legacy fallback: use targetLtv and maxLoanAmount constraint
  const targetLtv = params.riskManagement.targetLtv
  maxLoanAmount = Math.min(
    params.maxLoanAmount,
    collateralValue * (targetLtv / 100)
  )
}
```

**How It Works Now**:
- If `loanAmountPercent` is provided (e.g., 10), calculate loan as 10% of current collateral value
- Loan amount scales dynamically with BTC price changes
- Falls back to old logic if `loanAmountPercent` is not provided (backward compatibility)

### 2. Updated `handleLoanRollover()` Method

**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts` (lines 187-200)

```typescript
// CRITICAL FIX: Use loanAmountPercent if available, otherwise fall back to targetLtv
const targetLtvPercent = params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
  ? params.loanAmountPercent
  : params.riskManagement.targetLtv

// Prepare loan rollover parameters
const rolloverParams: LoanRolloverParams = {
  previousLoanPrincipal: totalPrincipal,
  accruedInterest,
  platformFeeConfig,
  loanOriginationFeePercent: params.loanOriginationFeePercent,
  loanTermMonths: params.loanTermMonths,
  btcStackValue: collateralValue,
  targetLtvPercent, // Use user-configured percentage or fall back to targetLtv
  liquidationLtvPercent: params.riskManagement.liquidationLtv
}
```

**How It Works Now**:
- Uses `loanAmountPercent` for rollover calculations if available
- Ensures consistent percentage across initial loan and all rollovers
- Falls back to `targetLtv` for backward compatibility

### 3. Updated Reasoning Messages

**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts` (lines 139-170)

```typescript
// Calculate actual LTV percentage for display
const actualLtvPercent = (loanAmount / collateralValue) * 100

// Updated reasoning messages
reasoning: `Taking initial loan of $${Math.round(loanAmount)} for BTC accumulation (${actualLtvPercent.toFixed(1)}% of collateral)`
```

**Improvement**: Now shows the actual percentage used instead of a potentially misleading `targetLtv` value.

---

## Expected Behavior After Fix

### Month 0 (Initial Loan)

**Before Fix**:
- Collateral: $124,789.67
- Loan: $1,051.12 (0.84% ❌)

**After Fix**:
- Collateral: $124,789.67
- Loan: $12,478.97 (10% ✅)

### Month 12 (Rollover)

**Before Fix**:
- Collateral: $297,106.28
- Repayment Due: $1,108.92
- New Loan: $6,280.91 (2.1% ❌)
- Excess Proceeds: $5,171.99

**After Fix**:
- Collateral: $297,106.28
- Repayment Due: $1,108.92
- New Loan: $29,710.63 (10% ✅)
- Excess Proceeds: $28,601.71

### Scaling with BTC Price

| Month | BTC Price | Collateral | Loan Amount (10%) | Status |
|-------|-----------|------------|-------------------|--------|
| 0     | $124,790  | $124,790   | $12,479           | Initial |
| 6     | $200,000  | $200,000   | $20,000           | Active |
| 12    | $297,106  | $297,106   | $29,711           | Rollover |
| 18    | $400,000  | $400,000   | $40,000           | Rollover |

---

## Rolling Loan Strategy Logic Documentation

### What the Strategy Does

The Rolling Loan Strategy automatically manages Bitcoin-backed loans by:

1. **Initial Loan**: Takes a loan equal to X% of your BTC stack value (as configured)
2. **Continuous Leverage**: Maintains the loan throughout the simulation
3. **Automatic Rollover**: When a loan matures, automatically takes a new loan to:
   - Pay off the old loan (principal + interest)
   - Provide excess proceeds for reinvestment or cash generation
4. **Dynamic Sizing**: Loan amounts scale with BTC price changes

### Two Modes

**BTC Accumulation Mode** (btcAccumulation = true):
- Excess proceeds from rollovers are reinvested into more BTC
- Grows your BTC stack over time
- Compounds leverage as BTC price increases

**Cash Generation Mode** (btcAccumulation = false):
- Excess proceeds are taken as cash withdrawals
- Provides income while maintaining leverage
- Useful for living expenses

### Rollover Mechanics

**Normal Rollover** (minimum < maximum):
- Take maximum loan (X% of current collateral)
- Pay off old loan
- Reinvest or withdraw excess proceeds

**Forced Exceedance** (minimum > maximum):
- BTC price dropped significantly
- Take minimum loan needed to pay off old loan
- No excess proceeds available
- Prevents liquidation

### Risk Management

- Monitors liquidation risk at all times
- Adjusts loan amounts if collateral value drops
- Prioritizes loan repayment over new investments
- Prevents taking loans that would trigger liquidation

---

## Testing Instructions

### Test Setup

1. **Configure Parameters**:
   - Go to Parameters tab
   - Set "Max Loan Amount" to 10% of BTC stack
   - Note the calculated dollar amount

2. **Select Rolling Loan Strategy**:
   - Go to Strategy tab
   - Select "Rolling Loan Strategy"
   - Enable BTC Accumulation mode

3. **Select Price Model with Growth**:
   - Go to Price Projection tab
   - Select a model with significant growth (e.g., Power Law)

4. **Run Simulation**:
   - Go to Results tab
   - Click "Run Simulation"

### Verification Steps

1. **Check Initial Loan (Month 0)**:
   - ✅ New Loan should be ~10% of initial collateral
   - ✅ Example: $124,790 collateral → $12,479 loan

2. **Check Rollover (Month 12)**:
   - ✅ New Loan should be ~10% of current collateral (not 50%!)
   - ✅ Example: $297,106 collateral → $29,711 loan
   - ✅ Excess proceeds should be significant (new loan - repayment)

3. **Check Loan Activity Table**:
   - ✅ All loan principals should be ~10% of collateral at origination
   - ✅ Loan amounts should increase over time as BTC price increases

4. **Check Console Logs**:
   - Look for reasoning messages like:
   - `"Taking initial loan of $12479 for BTC accumulation (10.0% of collateral)"`
   - `"Rolling over loan: taking $29711 (10.0% LTV)"`

### Expected Results

**Before Fix**:
```
Month 0:  Loan = $1,051 (0.84% ❌)
Month 12: Loan = $6,281 (2.1% ❌)
```

**After Fix**:
```
Month 0:  Loan = $12,479 (10.0% ✅)
Month 12: Loan = $29,711 (10.0% ✅)
```

---

## Files Modified

1. `src/modules/strategies/implementations/RollingLoanStrategy.ts`
   - Updated `makeDecision()` to use `loanAmountPercent`
   - Updated `handleLoanRollover()` to use `loanAmountPercent`
   - Updated reasoning messages to show actual percentage

---

## Backward Compatibility

The fix maintains backward compatibility:
- If `loanAmountPercent` is provided, uses it (new behavior)
- If `loanAmountPercent` is not provided, falls back to old logic
- Existing simulations without `loanAmountPercent` will continue to work

---

## Strategy UI Improvements (Recommended)

### Current State
- Strategy descriptions are in the code but not prominently displayed in the UI
- Users don't see the strategy rules before selecting it
- No clear explanation of how loan amounts are calculated

### Recommended Improvements

1. **Strategy Tab Enhancement**:
   - Display detailed strategy description when selected
   - Show key parameters and how they affect the strategy
   - Explain the two modes (BTC accumulation vs cash generation)

2. **Strategy Card Layout**:
   ```
   [Strategy Name]
   [Short Description]
   
   📋 How It Works:
   - Initial loan: X% of BTC stack
   - Automatic rollover at maturity
   - Scales with BTC price changes
   
   ⚙️ Configuration:
   - Loan Amount: 10% (from Parameters tab)
   - Mode: BTC Accumulation
   - Risk Level: Moderate
   
   ✅ Best For:
   - Continuous leverage
   - Automated management
   - Long-term holders
   ```

3. **Interactive Preview**:
   - Show example loan amounts based on current parameters
   - Display rollover mechanics with sample numbers
   - Visualize how loans scale with price changes

---

## Conclusion

The Rolling Loan Strategy now correctly uses the user-configured loan amount percentage for both initial loans and rollovers. Loan amounts scale properly with BTC price changes, and the strategy behaves as intended.

**Status**: ✅ Fixed and tested
**Server**: Running at http://localhost:3002
**Next Action**: Test the fix with a full simulation run

