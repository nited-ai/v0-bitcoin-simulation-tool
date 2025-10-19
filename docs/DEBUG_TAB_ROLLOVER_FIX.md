# Debug Tab Rollover Calculation Fix

## Overview

Fixed two critical issues in the Debug tab's "Expected vs Actual Comparison" section that were causing incorrect loan amount calculations and displaying the wrong months for rollover scenarios.

## Issues Fixed

### Issue 1: Hardcoded Months in Comparison

**Problem**:
The comparison section was hardcoded to show Month 0 and Month 12, regardless of the actual loan term.

**Impact**:
- For 18-month loans, it showed Month 12 instead of Month 18 (maturity month)
- For 6-month loans, it showed Month 12 instead of Month 6
- Users couldn't see the actual rollover calculation at maturity

**Root Cause**:
```typescript
// ❌ WRONG: Hardcoded months
{[0, 12].map(month => {
  // ...
})}
```

**Solution**:
```typescript
// ✅ CORRECT: Use actual loan term
{[0, calculatedValues.maturityMonth].map(month => {
  // ...
})}
```

**Changes Made**:
- Line 721: Changed from `[0, 12]` to `[0, calculatedValues.maturityMonth]`
- Line 716: Updated description to show actual maturity month
- Lines 728-730: Added descriptive labels ("Initial Loan" and "First Rollover")
- Lines 740-747: Added display of total BTC at maturity

### Issue 2: Incorrect Collateral Calculation for Rollover

**Problem**:
The expected loan amount at maturity was calculated using only the initial BTC amount, ignoring BTC accumulated from the first loan proceeds.

**Impact**:
- Expected values didn't match actual values
- Debug tab showed red X (incorrect) when calculations were actually correct
- Users couldn't verify that the Rolling Loan Strategy was working properly

**Root Cause**:
```typescript
// ❌ WRONG: Only uses initial BTC amount
month12Expected: priceProjection?.projectionPoints?.[360]?.price
  ? params.initialBtcAmount * priceProjection.projectionPoints[360].price * (loanPercent / 100)
  : 0
```

This calculation ignored the fact that when `btcAccumulation` is enabled, the first loan principal is used to purchase additional BTC, which increases the collateral value for the rollover loan.

**Solution**:
```typescript
// ✅ CORRECT: Includes accumulated BTC
// Calculate total BTC at maturity (initial + BTC purchased with first loan)
let totalBtcAtMaturity = params.initialBtcAmount
if (params.btcAccumulation && maturityPrice > 0) {
  const firstLoanPrincipal = calculatedByPercent
  const btcPurchasedWithFirstLoan = firstLoanPrincipal / params.initialBtcPrice
  totalBtcAtMaturity += btcPurchasedWithFirstLoan
}

// Expected loan at maturity = total BTC × maturity price × loan percent
const maturityExpected = maturityPrice > 0
  ? totalBtcAtMaturity * maturityPrice * (loanPercent / 100)
  : 0
```

**Changes Made**:
- Lines 259-277: Added calculation of total BTC at maturity
- Line 266-272: Conditional logic to add accumulated BTC when `btcAccumulation` is enabled
- Line 275-277: Calculate expected loan using total BTC (not just initial)
- Lines 289-291: Return new values (`maturityMonth`, `maturityExpected`, `totalBtcAtMaturity`)

## Example Scenario

### Configuration
- Initial BTC: 1.0 BTC
- Initial Price: $117,242
- Loan Amount: 10%
- Loan Term: 18 months
- BTC Accumulation: Enabled

### Month 0 (Initial Loan)

**Collateral**:
- BTC Amount: 1.0 BTC
- BTC Price: $117,242
- Collateral Value: $117,242

**Loan**:
- Loan Amount: $117,242 × 10% = $11,724
- BTC Purchased: $11,724 / $117,242 = 0.1 BTC
- New Total BTC: 1.0 + 0.1 = 1.1 BTC

### Month 18 (First Rollover)

**Before Fix** ❌:
```
Expected Calculation:
- BTC Amount: 1.0 BTC (WRONG - ignored accumulated BTC)
- BTC Price: $150,000 (projected)
- Collateral Value: $150,000
- Expected Loan: $150,000 × 10% = $15,000

Actual Calculation:
- BTC Amount: 1.1 BTC (CORRECT - includes accumulated BTC)
- BTC Price: $150,000
- Collateral Value: $165,000
- Actual Loan: $165,000 × 10% = $16,500

Result: Expected ≠ Actual (Red X shown)
```

**After Fix** ✅:
```
Expected Calculation:
- BTC Amount: 1.1 BTC (CORRECT - includes accumulated BTC)
- BTC Price: $150,000 (projected)
- Collateral Value: $165,000
- Expected Loan: $165,000 × 10% = $16,500

Actual Calculation:
- BTC Amount: 1.1 BTC (CORRECT - includes accumulated BTC)
- BTC Price: $150,000
- Collateral Value: $165,000
- Actual Loan: $165,000 × 10% = $16,500

Result: Expected = Actual (Green checkmark shown)
```

## Visual Changes

### Before Fix

```
2. Expected vs Actual Comparison
Based on 10% configuration

┌─────────────────────────────────────────────────────────┐
│ Month 0                                                 │
│ Collateral: $117,242                                    │
│ Expected: $11,724    Actual: $11,724    ✓              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Month 12                                                │
│ Collateral: $145,000                                    │
│ Expected: $14,500    Actual: $15,950    ✗              │
└─────────────────────────────────────────────────────────┘
```

### After Fix

```
2. Expected vs Actual Comparison
Comparing Month 0 (initial loan) and Month 18 (first rollover)

┌─────────────────────────────────────────────────────────┐
│ Month 0                                                 │
│ Initial Loan                                            │
│ Collateral: $117,242                                    │
│ Expected: $11,724    Actual: $11,724    ✓              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Month 18                                                │
│ First Rollover (18-month term)                          │
│ Collateral: $165,000                                    │
│ Total BTC: 1.1000 BTC (includes accumulated BTC)       │
│ Expected: $16,500    Actual: $16,500    ✓              │
└─────────────────────────────────────────────────────────┘
```

## Technical Details

### File Modified
- `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`

### Lines Changed
- **Lines 259-277**: Added maturity month calculation and total BTC tracking
- **Lines 279-294**: Updated return object with new values
- **Lines 710-772**: Updated comparison section UI

### Key Concepts

**Maturity Month**:
- Determined by `params.loanTermMonths`
- First loan matures at Month 0 + loan term
- Example: 18-month loan matures at Month 18

**Total BTC at Maturity**:
- Initial BTC + BTC purchased with first loan
- Only includes accumulated BTC if `btcAccumulation` is enabled
- Formula: `totalBtc = initialBtc + (firstLoanPrincipal / initialPrice)`

**Expected Loan at Maturity**:
- Based on total BTC holdings (not just initial)
- Uses projected price at maturity month
- Formula: `expectedLoan = totalBtc × maturityPrice × (loanPercent / 100)`

### Integration with Simulation Loop

The debug simulation loop (lines 334-450) already correctly:
- Tracks `totalBtcAmount` throughout the simulation
- Adds accumulated BTC when `btcAccumulation` is enabled (lines 446-448)
- Uses total BTC for collateral calculations (line 343)

The fix ensures the **expected values** match the **actual simulation behavior**.

## Testing

### Manual Testing Steps

1. **Navigate to Debug Tab**
2. **Set Parameters**:
   - Initial BTC: 1.0 BTC
   - Initial Price: $117,242
   - Loan Amount: 10%
   - Loan Term: 18 months
   - BTC Accumulation: Enabled
3. **Generate Price Projection** (any model)
4. **Run Debug Simulation**
5. **Verify Results**:
   - Section 2 shows "Month 0" and "Month 18"
   - Month 18 shows "First Rollover (18-month term)"
   - Month 18 displays total BTC with green indicator
   - Both months show green checkmarks (Expected = Actual)

### Expected Behavior

✅ **Correct**:
- Comparison shows Month 0 and maturity month (based on loan term)
- Expected values include accumulated BTC
- Green checkmarks for both months
- Total BTC displayed at maturity month

❌ **Incorrect** (before fix):
- Comparison showed Month 0 and Month 12 (hardcoded)
- Expected values ignored accumulated BTC
- Red X at maturity month (values didn't match)
- No indication of total BTC

## Impact

### User Experience
- ✅ Debug tab now accurately reflects Rolling Loan Strategy behavior
- ✅ Users can verify calculations are correct
- ✅ Clear indication of BTC accumulation effect
- ✅ Proper display of rollover timing

### Code Quality
- ✅ Removed hardcoded values
- ✅ Dynamic calculation based on actual parameters
- ✅ Clear comments explaining logic
- ✅ Consistent with simulation loop behavior

### Future Maintenance
- ✅ Works with any loan term (6, 12, 18, 24 months, etc.)
- ✅ Correctly handles both accumulation modes
- ✅ Easy to understand and modify
- ✅ Self-documenting code with clear variable names

## Related Documentation

- **Developer Guide**: `docs/DEVELOPER_GUIDE_LOAN_CALCULATIONS.md`
- **Architecture**: `docs/architecture/LOAN_CALCULATION_ARCHITECTURE.md`
- **Refactoring Summary**: `docs/LOAN_AMOUNT_REFACTORING_SUMMARY.md`

## Commit

**Commit Hash**: a3515e3
**Commit Message**: `fix: Correct rollover loan calculation display in Debug tab`

---

**Status**: ✅ **COMPLETE**

**Last Updated**: 2025-10-01
**Version**: 1.0.0

