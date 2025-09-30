# Investigation Summary - Rolling Loan Strategy Calculation Errors

> **Task 1 Complete**: Investigation and Root Cause Analysis  
> **Date**: 2025-01-30  
> **Status**: ✅ Complete - All root causes identified

## Executive Summary

The rolling loan strategy produces incorrect loan amounts because it uses **LTV-based maximum calculations** instead of **target percentage calculations**. The strategy calculates $50,000 (50% LTV) instead of the expected $12,300 (10% target + fees).

## Test Case Results

**Failing Scenario:**
- Initial BTC: 1 BTC at $100,000
- Target Percentage: 10% of BTC stack = $10,000
- Expected First Loan: $12,300 (target + interest + fees)
- **Actual Result: $50,000** ❌

**Test Output:**
```
Expected loan amount: ~$12,300
Actual loan amount: $50,000
Investment multiplier: 0.5
Reasoning: Taking initial loan of $50000 for BTC accumulation (50% LTV)
```

## Root Cause Analysis

### 1. Missing Parameter in Strategy Interface
**File**: `src/modules/strategies/types/index.ts`  
**Issue**: `StrategyExecutionParams` missing `loanAmountPercent` parameter

```typescript
// ❌ MISSING from StrategyExecutionParams:
loanAmountPercent: number  // Target loan percentage (e.g., 10%)

// ✅ EXISTS in SimulationParams:
loanAmountPercent: 15  // Default 15% of BTC stack
```

### 2. Wrong Calculation Logic in Strategy
**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts`  
**Lines**: 94-97, 135

```typescript
// ❌ CURRENT (incorrect):
const maxLoanAmount = Math.min(
  params.maxLoanAmount,
  collateralValue * (targetLtv / 100)  // Uses 50% LTV = $50,000
)
const loanAmount = maxLoanAmount

// ✅ SHOULD BE:
const targetLoanAmount = collateralValue * (loanAmountPercent / 100)  // 10% = $10,000
const minimumNeeded = targetLoanAmount + interest + platformFees  // $12,300
const loanAmount = minimumNeeded
```

### 3. Incorrect Service Method Logic
**File**: `src/modules/strategies/services/LoanRolloverCalculationService.ts`  
**Lines**: 46-47

```typescript
// ❌ CURRENT (incorrect):
calculateMaximumLoanAmount(btcStackValue: number, targetLtvPercent: number): number {
  return btcStackValue * (targetLtvPercent / 100)  // Uses LTV instead of target %
}

// ✅ SHOULD BE:
calculateMaximumLoanAmount(btcStackValue: number, loanAmountPercent: number): number {
  return btcStackValue * (loanAmountPercent / 100)  // Uses target percentage
}
```

### 4. Parameter Mapping Issues
**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts`  
**Lines**: 184

```typescript
// ❌ CURRENT (passes wrong parameter):
targetLtvPercent: params.riskManagement.targetLtv,  // 50% LTV

// ✅ SHOULD BE:
loanAmountPercent: params.loanAmountPercent,  // 10% target
```

## Authoritative Documentation Comparison

### Original Technical Specification
**File**: `.agent-os/specs/2025-01-27-rolling-loan-strategy/sub-specs/technical-spec.md`  
**Line 24**: "Determine maximum loan amount based on target percentage (**loanAmountPercent**) of current BTC stack value"

### Correct Calculation Formula
**File**: `app/simulation/tabs/parameters/calculationsService.ts`  
**Line 540**: `currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue`

## Complete Bug List

1. **Missing Parameter**: `loanAmountPercent` not in `StrategyExecutionParams`
2. **Wrong Strategy Logic**: Uses `targetLtv` instead of `loanAmountPercent`
3. **Incorrect Service Method**: `calculateMaximumLoanAmount()` uses wrong parameter
4. **Parameter Mapping Error**: Strategy passes `targetLtv` instead of `loanAmountPercent`
5. **Interest Calculation NaN**: Test calculation produces NaN values
6. **Platform Fee Calculation NaN**: Test calculation produces NaN values

## Impact Assessment

- **Severity**: Critical - Strategy completely non-functional
- **User Impact**: Loans 5x larger than intended (400% error)
- **Financial Risk**: Massive over-leveraging, liquidation risk
- **Strategy Behavior**: Takes maximum LTV loans instead of conservative target percentage

## Next Steps (Task 2)

1. Add `loanAmountPercent` parameter to `StrategyExecutionParams` interface
2. Fix `RollingLoanStrategy.handleInitialLoan()` to use target percentage
3. Update `LoanRolloverCalculationService.calculateMaximumLoanAmount()` method signature
4. Fix parameter mapping in `RollingLoanStrategy.handleLoanRollover()`
5. Add comprehensive tests for corrected calculations

## Files Requiring Changes

- `src/modules/strategies/types/index.ts` - Add missing parameter
- `src/modules/strategies/implementations/RollingLoanStrategy.ts` - Fix calculation logic
- `src/modules/strategies/services/LoanRolloverCalculationService.ts` - Update method signature
- Parameter mapping between UI and strategy execution services

---

**Investigation Status**: ✅ Complete  
**Ready for**: Task 2 - Core Calculation Logic Fixes
