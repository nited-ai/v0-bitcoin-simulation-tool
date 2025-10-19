# Month 0 Initial BTC Price Fix - Verification Guide

## Problem Summary

The Rolling Loan Strategy was incorrectly using the **projected price** from the price projection model for Month 0 calculations, instead of using the **user-entered initial BTC price** from the Parameters tab.

## Root Cause

Both `StrategyExecutionService.ts` and `RollingLoanDebugPage.tsx` were pulling the BTC price from the projection data for ALL months, including Month 0:

```typescript
// OLD CODE (INCORRECT)
const btcPrice = pricePoint.price  // Always used projected price
```

## Solution Implemented

Added conditional logic to use the user's initial BTC price for Month 0, and projected prices for subsequent months:

```typescript
// NEW CODE (CORRECT)
const btcPrice = month === 0 ? params.initialBtcPrice : pricePoint.price
```

## Files Modified

1. **`src/modules/strategies/services/StrategyExecutionService.ts`** (Line 60)
   - Main simulation engine fix
   - Used by Results tab, Debug tab, and all simulation execution paths
   
2. **`app/simulation/tabs/debug/RollingLoanDebugPage.tsx`** (Line 290)
   - Debug page simulation fix
   - Also fixed TypeScript type for optional `reasoning` property

3. **`src/modules/strategies/services/__tests__/StrategyExecutionService.test.ts`** (NEW)
   - Comprehensive test suite with 12 tests
   - Specifically tests Month 0 price fix
   - Prevents regression

## Execution Flow

### Results Tab Flow
```
ResultsPage 
  → useSimulationRunner 
    → LegacyStrategyAdapter.executeLegacyStrategy 
      → StrategyRegistry.executeStrategy 
        → StrategyExecutionService.executeStrategy (FIXED ✅)
```

### Debug Tab Flow
```
RollingLoanDebugPage 
  → runDebugSimulation 
    → RollingLoanStrategy.makeDecision (FIXED ✅)
```

## Verification Steps

### 1. Run Tests
```bash
pnpm test src/modules/strategies/services/__tests__/StrategyExecutionService.test.ts
```

**Expected Result:** All 12 tests pass ✅

### 2. Verify Debug Tab

1. Navigate to http://localhost:3000/simulation?tab=debug
2. Set Parameters:
   - Initial BTC Price: $50,000 (in Parameters tab)
   - Loan Amount Percent: 10%
3. Go to Price Projection tab and generate a projection with a DIFFERENT starting price (e.g., $55,000)
4. Go to Debug tab and click "Run Debug Simulation"
5. Check Month 0 output:
   - **Collateral**: Should be calculated using $50,000 (not $55,000)
   - **Expected**: Should match **Actual**

### 3. Verify Results Tab

1. Navigate to http://localhost:3000/simulation?tab=results
2. Set Parameters:
   - Initial BTC Price: $50,000 (in Parameters tab)
   - Initial BTC Amount: 1.0 BTC
3. Generate price projection with different starting price
4. Run simulation
5. Check Month 0 in results table:
   - **BTC Price**: Should be $50,000 (user-entered price)
   - **Collateral Value**: Should be $50,000 (1.0 BTC × $50,000)

### 4. Clear Browser Cache (If Issues Persist)

If you're still seeing incorrect values:

1. **Hard Refresh**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear Application Cache**:
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear storage"
   - Check all boxes
   - Click "Clear site data"
3. **Restart Dev Server**:
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

## Test Coverage

### Month 0 Price Fix Tests

1. ✅ **should use initialBtcPrice for Month 0, not projected price**
   - Verifies Month 0 uses $50,000 (initialBtcPrice)
   - Verifies Month 0 does NOT use $55,000 (projected price)
   - Verifies Month 1+ use projected prices

2. ✅ **should calculate collateral correctly for Month 0 using initialBtcPrice**
   - Verifies collateral = btcAmount × initialBtcPrice
   - Verifies collateral ≠ btcAmount × projectedPrice

3. ✅ **should pass correct btcPrice to strategy context for Month 0**
   - Verifies strategy receives correct price in context
   - Verifies collateral value is calculated correctly

4. ✅ **should handle edge case where initialBtcPrice equals projected price**
   - Ensures fix works even when prices match

5. ✅ **should handle very different initialBtcPrice vs projected price**
   - Tests with 2x difference (50k vs 100k)
   - Ensures initialBtcPrice is always used for Month 0

### Parameter Validation Tests

6. ✅ **should validate btcAmount**
7. ✅ **should validate initialBtcPrice**
8. ✅ **should validate simulationMonths**
9. ✅ **should validate targetLtv**
10. ✅ **should accept valid parameters**

### Execution Result Tests

11. ✅ **should return complete execution result**
12. ✅ **should generate monthly results for all months**

## Architecture Improvement Recommendations

To prevent this issue from happening again, consider:

### 1. Centralized Price Resolution Service

Create a `PriceResolutionService` that handles all price lookups:

```typescript
class PriceResolutionService {
  /**
   * Get BTC price for a specific month
   * ALWAYS uses initialBtcPrice for Month 0
   */
  getPriceForMonth(
    month: number,
    initialBtcPrice: number,
    priceProjection: PriceProjectionResult
  ): number {
    if (month === 0) {
      return initialBtcPrice
    }
    
    const pricePoint = priceProjection.projectionPoints[month]
    return pricePoint?.price || initialBtcPrice
  }
}
```

### 2. Type-Safe Month Indicator

Create a type that distinguishes Month 0 from other months:

```typescript
type Month0 = { month: 0; price: number } // Must use initialBtcPrice
type MonthN = { month: number; price: number } // Uses projected price
type MonthData = Month0 | MonthN
```

### 3. Automated Integration Tests

Add integration tests that verify:
- Debug tab calculations match Results tab calculations
- Month 0 always uses initialBtcPrice across all tabs
- Price projection changes don't affect Month 0

### 4. Documentation in Code

Add JSDoc comments to critical price-related code:

```typescript
/**
 * CRITICAL: Month 0 MUST use params.initialBtcPrice (user-entered current price)
 * Subsequent months (1+) use projected prices from the price projection model
 * 
 * @see docs/MONTH_0_PRICE_FIX_VERIFICATION.md
 */
const btcPrice = month === 0 ? params.initialBtcPrice : pricePoint.price
```

## Commit Information

**Commit Hash**: 0fc2210
**Branch**: price-projection-output-standardization
**Commit Message**: 
```
fix: Use initialBtcPrice for Month 0 in Rolling Loan Strategy
- Fixed StrategyExecutionService to use params.initialBtcPrice for Month 0 calculations
- Fixed RollingLoanDebugPage to use params.initialBtcPrice for Month 0 debug simulation
- Updated debug page TypeScript types to handle optional reasoning property
- Ensures initial loan calculations use user-entered current BTC price, not projected price
- Subsequent months (1+) continue to use projected prices as expected
```

## Related Documentation

- [Rolling Loan Strategy Fix](./ROLLING_LOAN_STRATEGY_FIX.md)
- [Debug Page Implementation](./DEBUG_PAGE_IMPLEMENTATION.md)
- [Strategy Execution Service Tests](../src/modules/strategies/services/__tests__/StrategyExecutionService.test.ts)

## Support

If you're still experiencing issues after following this guide:

1. Check that you're on the correct branch: `price-projection-output-standardization`
2. Verify the commit hash: `0fc2210`
3. Run all tests: `pnpm test:modules`
4. Check browser console for errors
5. Verify parameters are being passed correctly through the chain

