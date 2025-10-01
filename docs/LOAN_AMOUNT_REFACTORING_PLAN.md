# Loan Amount Refactoring Plan

## Problem Analysis

### Issue 1: Display Shows Principal Instead of Total Repayment

**Current Behavior**:
- Debug tab and Results tab show **principal only** ($11,724)
- Should show **total repayment amount** ($13,659 = principal + fees + interest)
- Reasoning text is correct but displayed values are misleading

**Root Cause**:
The `Loan` interface has two fields:
- `principal`: The loan proceeds received ($11,724)
- `repaymentAmount`: Total amount to repay ($13,659)

However, displays are showing `principal` when they should show `repaymentAmount`.

### Issue 2: Multiple Redundant Variables

**Current Variables Storing Loan Amount**:
1. `loanDetails.principal` = $11,724 (no decimals) - from CentralizedLoanCalculationService
2. `calculatedValues.calculatedByPercent` = $11,724.2 (with decimals) - from debug page
3. `calculatedValues.finalLoanAmount` = $11,724.2 (with decimals) - from debug page
4. `maxLoanAmount` (in strategy) = $11,724.2 (with decimals) - from strategy logic
5. `loan.principal` = $11,724 (no decimals) - stored in Loan object
6. `loan.repaymentAmount` = $13,659 (no decimals) - stored in Loan object

**Problems**:
- Redundancy creates confusion
- Inconsistent decimal precision
- Multiple sources of truth
- Maintenance burden

## Solution Architecture

### Phase 1: Standardize Loan Creation (IMMEDIATE)

**Goal**: Ensure all loans are created with correct `principal` and `repaymentAmount` using centralized calculations.

**Changes**:
1. Update `StrategyExecutionService.ts` to use `CentralizedLoanCalculationService` when creating loans
2. Ensure `loan.repaymentAmount` includes principal + fees + interest
3. Remove decimal places from all loan amounts (use `Math.round()`)

**Files to Modify**:
- `src/modules/strategies/services/StrategyExecutionService.ts` (lines 154-164)

### Phase 2: Fix Display Logic (IMMEDIATE)

**Goal**: Update all displays to show `repaymentAmount` instead of `principal` where appropriate.

**Display Rules**:
- **"New Loans" column**: Show `principal` (the amount received)
- **"Total Debt" column**: Show sum of all `repaymentAmount` (total owed)
- **"Loan Amount" in debug**: Show `principal` with breakdown showing fees/interest
- **"Actual Loan Amount" in debug**: Show `principal` (what you receive)
- **"Total Repayment" in breakdown**: Show `repaymentAmount` (what you owe)

**Files to Modify**:
- `app/simulation/tabs/debug/RollingLoanDebugPage.tsx` (Month-by-Month Execution Trace)
- `app/simulation/tabs/results/charts/LoanActivityTable.tsx` (if exists)
- Any other result displays

### Phase 3: Consolidate Variables (REFACTORING)

**Goal**: Eliminate redundant variables and use centralized calculation service as single source.

**Consolidation Strategy**:

#### Before (Multiple Variables):
```typescript
// Debug page calculates its own values
const calculatedByPercent = btcStackValue * (loanPercent / 100)  // $11,724.2
const finalLoanAmount = calculatedByPercent  // $11,724.2

// Strategy calculates its own value
const maxLoanAmount = collateralValue * (params.loanAmountPercent / 100)  // $11,724.2

// Centralized service calculates
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,  // $11,724
  collateralValue,
  params
)
```

#### After (Single Source):
```typescript
// Calculate once using centralized service
const principal = Math.round(collateralValue * (params.loanAmountPercent / 100))
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

// Use loanDetails everywhere
const displayPrincipal = loanDetails.principal  // $11,724
const displayRepayment = loanDetails.totalRepayment  // $13,659
```

**Files to Modify**:
- `app/simulation/tabs/debug/RollingLoanDebugPage.tsx` (remove redundant calculations)
- `src/modules/strategies/implementations/RollingLoanStrategy.ts` (use centralized service)

### Phase 4: Standardize Decimal Precision (CLEANUP)

**Goal**: Remove all decimal places from loan amounts for consistency.

**Rules**:
- All loan amounts: `Math.round()` - no decimals
- All percentages: `.toFixed(1)` - one decimal (e.g., "10.0%")
- All LTV ratios: `.toFixed(1)` - one decimal (e.g., "50.5%")

**Implementation**:
```typescript
// In CentralizedLoanCalculationService
calculateLoanDetails(principal, collateralValue, params) {
  // Round all monetary values
  const originationFee = Math.round(principal * (originationFeePercent / 100))
  const totalInterest = Math.round(monthlyInterest * loanTermMonths)
  const totalRepayment = Math.round(principal + originationFee + totalInterest)
  
  return {
    principal: Math.round(principal),
    originationFee,
    totalInterest,
    totalRepayment,
    // ... other fields
  }
}
```

## Implementation Steps

### Step 1: Update Loan Creation in StrategyExecutionService ✅

```typescript
// OLD CODE (lines 154-164)
const newLoan: Loan = {
  id: loanIdCounter++,
  month,
  principal: totalPrincipal,
  maturityMonth: month + params.loanTermMonths,
  repaymentAmount: this.calculateRepaymentAmount(totalPrincipal, params),
  lockedBtc: totalPrincipal / btcPrice
}

// NEW CODE
const principal = Math.round(totalPrincipal)
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

const newLoan: Loan = {
  id: loanIdCounter++,
  month,
  principal: loanDetails.principal,
  maturityMonth: month + params.loanTermMonths,
  repaymentAmount: loanDetails.totalRepayment,  // Now includes fees + interest
  lockedBtc: loanDetails.principal / btcPrice
}
```

### Step 2: Update Debug Page Display ✅

```typescript
// In RollingLoanDebugPage.tsx - Month-by-Month Execution Trace
// OLD: Shows principal
<div className="font-mono font-semibold">${(info.collateralValue * info.decision.investmentMultiplier).toLocaleString()}</div>

// NEW: Show both principal and total repayment
<div>
  <div className="text-sm text-muted-foreground">Principal (received):</div>
  <div className="font-mono font-semibold">${Math.round(info.collateralValue * info.decision.investmentMultiplier).toLocaleString()}</div>
  <div className="text-sm text-muted-foreground mt-1">Total Repayment (owed):</div>
  <div className="font-mono font-semibold text-green-600">${Math.round(info.totalRepaymentAmount).toLocaleString()}</div>
</div>
```

### Step 3: Update CentralizedLoanCalculationService ✅

Add rounding to all monetary calculations:

```typescript
calculateLoanDetails(principal, collateralValue, params): LoanCalculationResult {
  // Round input
  principal = Math.round(principal)
  
  // Calculate with rounding
  const originationFee = Math.round(principal * (originationFeePercent / 100))
  const monthlyInterest = principal * monthlyInterestRate
  const totalInterest = Math.round(monthlyInterest * loanTermMonths)
  const totalRepayment = Math.round(principal + originationFee + totalInterest)
  const effectiveCost = Math.round(originationFee + totalInterest)
  
  return {
    principal,
    originationFee,
    totalInterest,
    monthlyInterest,  // Keep precise for calculations
    totalRepayment,
    effectiveCost,
    // ... other fields
  }
}
```

### Step 4: Remove Redundant Variables ✅

In `RollingLoanDebugPage.tsx`:

```typescript
// REMOVE these redundant calculations
const calculatedByPercent = btcStackValue * (loanPercent / 100)
const finalLoanAmount = calculatedByPercent

// REPLACE with centralized calculation
const principal = Math.round(btcStackValue * (loanPercent / 100))
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  btcStackValue,
  strategyParams
)

// Use loanDetails.principal and loanDetails.totalRepayment everywhere
```

## Testing Strategy

### Unit Tests
1. Test `CentralizedLoanCalculationService` with rounding
2. Test loan creation in `StrategyExecutionService`
3. Test display formatting

### Integration Tests
1. Run simulation and verify Month 0 shows correct values
2. Verify debug page shows principal and repayment separately
3. Verify results table shows correct debt amounts

### Manual Testing
1. Navigate to Debug tab
2. Set parameters and run simulation
3. Verify "Loan Cost Breakdown" card shows rounded values
4. Verify "Month-by-Month Execution Trace" shows both principal and repayment
5. Navigate to Results tab
6. Verify table shows correct loan amounts

## Expected Outcomes

### Before Refactoring
- ❌ Multiple variables with same value but different precision
- ❌ Displays show principal when they should show repayment
- ❌ Inconsistent decimal places ($11,724.2 vs $11,724)
- ❌ Confusion about what amount is displayed

### After Refactoring
- ✅ Single source of truth (CentralizedLoanCalculationService)
- ✅ Clear distinction between principal (received) and repayment (owed)
- ✅ Consistent formatting (no decimals for amounts)
- ✅ Transparent display showing both values where appropriate

## Migration Path

1. **Phase 1** (Immediate): Fix loan creation and rounding
2. **Phase 2** (Immediate): Fix display logic
3. **Phase 3** (Next sprint): Remove redundant variables
4. **Phase 4** (Cleanup): Standardize all formatting

## Rollback Plan

If issues arise:
1. Revert commits in reverse order
2. Each phase is independent and can be rolled back separately
3. Tests will catch any breaking changes

## Success Metrics

- ✅ All tests pass
- ✅ Debug page shows correct principal and repayment
- ✅ Results table shows correct debt amounts
- ✅ No decimal places in loan amounts
- ✅ Single calculation path for all loan amounts

