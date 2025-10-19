# Phase 1: Specification Review Report

**Date:** 2025-10-02  
**Reviewer:** AI Assistant  
**Purpose:** Comprehensive review of existing Rolling Loan Strategy specifications

---

## Executive Summary

This report documents the findings from a thorough review of all existing Rolling Loan Strategy specification documents and the HTML prototype. The review identified **critical gaps**, **outdated content**, **logical inconsistencies**, and **alignment issues** that must be addressed before implementation.

### Documents Reviewed

1. `docs/ROLLING LOAN STRATEGY.html` - Working HTML prototype (31,630 bytes)
2. `docs/ROLLING_LOAN_STRATEGY_REFACTOR_SPEC.md` (456 lines)
3. `docs/ROLLING_LOAN_STRATEGY_IMPLEMENTATION_GUIDE.md` (390 lines)
4. `docs/ROLLING_LOAN_STRATEGY_COMPONENT_ANALYSIS.md` (456 lines)
5. `docs/ROLLING_LOAN_STRATEGY_TASK_BREAKDOWN.md` (621 lines)

### Overall Assessment

**Status:** ⚠️ **SPECIFICATIONS REQUIRE SIGNIFICANT UPDATES**

The existing specifications provide a solid foundation but contain critical gaps and misalignments with both the HTML prototype and the current codebase. A new, consolidated specification is required.

---

## Critical Findings

### 1. Missing Information

#### 1.1 HTML Prototype Calculation Logic Not Fully Documented

**Issue:** The specifications reference the HTML prototype but don't fully document its exact calculation logic.

**HTML Prototype Key Logic (Lines 227-326):**

```javascript
// INITIAL LOAN (Month 0) - BEFORE main loop
let purchasedBtc = (btcHoldings * btcPrice * targetLtv * (1 - loanFee)) / btcPrice;
btcHoldings += purchasedBtc;
loanBalance = btcHoldings * btcPrice * targetLtv;

// MAIN LOOP - Monthly Savings FIRST
if (initialMonthlySavings !== 0) {
  const yearsPassed = loopDate.getFullYear() - startDate.getFullYear();
  const currentMonthlySavings = initialMonthlySavings * Math.pow((1 + savingsRateIncrease), yearsPassed);
  btcHoldings += currentMonthlySavings / currentPrice;
  totalSavings += currentMonthlySavings;
  savingsInCycle += currentMonthlySavings;
}

// DYNAMIC LTV STRATEGY (after savings, if loopDate > startDate)
if (strategyType === 'dynamicLtv' && loopDate.getTime() > startDate.getTime()) {
  loanBalance *= (1 + (interestRate / 12));  // Monthly interest accrual
  const targetLoan = btcHoldings * currentPrice * targetLtv;
  const amountToBorrow = targetLoan - loanBalance;
  if (amountToBorrow > 0) {
    const netToInvest = amountToBorrow * (1 - loanFee);
    if(netToInvest > 0) {
      purchasedBtc = netToInvest / currentPrice;
      btcHoldings += purchasedBtc;
      btcPurchasedInYear += purchasedBtc;
    }
    loanBalance = targetLoan;
  }
}

// FIXED TERM STRATEGY (only at nextActionDate)
else if (strategyType === 'fixedTerm' && loopDate.getTime() >= nextActionDate.getTime()) {
  const interestDueForTerm = loanBalance * interestRate * (loanDuration / 12);
  const debtToRepay = loanBalance + interestDueForTerm;
  const collateralValueOnAction = btcHoldings * currentPrice;
  const targetLoan = collateralValueOnAction * targetLtv;
  const amountToBorrow = targetLoan - debtToRepay;
  
  purchasedBtc = 0;
  if (amountToBorrow > 0) {
    purchasedBtc = (amountToBorrow * (1 - loanFee)) / currentPrice;
    btcHoldings += purchasedBtc;
    loanBalance = targetLoan;
  }
  
  nextActionDate.setMonth(nextActionDate.getMonth() + loanDuration);
}

// LIQUIDATION CHECK
const collateralValue = btcHoldings * currentPrice;
const currentLtv = (collateralValue > 0) ? loanBalance / collateralValue : 0;
if (currentLtv >= liquidationLtv) {
  // LIQUIDATION - break simulation
  break;
}
```

**Missing from Specs:**
- Initial loan happens BEFORE the main loop (Month 0 special handling)
- Monthly savings are applied FIRST in each loop iteration
- Dynamic LTV only applies if `loopDate > startDate` (skips Month 0)
- Fixed Term uses `nextActionDate` tracking, not maturity month checking
- Liquidation check uses `loanBalance / collateralValue`, not debt from active loans

**Impact:** HIGH - Implementation will fail without these details

---

#### 1.2 Price Data Source Not Clearly Specified

**Issue:** Specifications mention "use projected prices from Price Projection tab" but don't specify:
- How to access the price projection data structure
- What format the prices are in
- How to handle missing price data
- Whether to use `priceProjection.projectionPoints` or `priceProjection.chartData`

**Current Codebase Reality:**
```typescript
// From StrategyExecutionService.ts
const priceChartData = priceProjection.projectionPoints.map((point: any) => ({
  timestamp: point.timestamp,
  price: point.price,
  date: new Date(point.timestamp).toISOString().split('T')[0]
}))
```

**Missing from Specs:**
- Exact data structure to use
- Error handling for missing prices
- How to interpolate between monthly data points

**Impact:** MEDIUM - Could cause runtime errors

---

#### 1.3 Cash Generation Mode Withdrawal Logic Unclear

**Issue:** Specifications state "use user-specified withdrawal amount" but don't clarify:
- When is the withdrawal taken? (Every month? Only on rollover?)
- What if withdrawal exceeds loan proceeds?
- How does it interact with monthly savings/withdrawals?

**HTML Prototype:** Does NOT implement cash generation mode - only BTC accumulation

**Current Implementation:**
```typescript
// Line 293 in RollingLoanStrategy.ts
withdrawalAmount: Math.max(0, rolloverResult.excessProceeds * 0.9)
```

**Spec Says:**
```typescript
// From COMPONENT_ANALYSIS.md line 193
const withdrawalAmount = params.monthlyWithdrawalAmount < 0 
  ? Math.abs(params.monthlyWithdrawalAmount) 
  : 0
```

**Contradiction:** Spec uses `monthlyWithdrawalAmount`, but this is already used for monthly savings/withdrawals!

**Impact:** HIGH - Fundamental logic error

---

### 2. Outdated Content

#### 2.1 References to Removed Services

**Issue:** Specifications reference services that should be removed or simplified:

**REFACTOR_SPEC.md Line 103:**
> "Remove complex rollover calculation service calls"

**But COMPONENT_ANALYSIS.md Line 103 still says:**
> "Uses `LoanRolloverCalculationService` for complex calculations"

**Current Reality:** `LoanRolloverCalculationService` is still actively used in `RollingLoanStrategy.ts` lines 33, 258

**Impact:** MEDIUM - Confusion about whether to keep or remove service

---

#### 2.2 Incorrect Parameter Names

**Issue:** Specifications use inconsistent parameter names:

**REFACTOR_SPEC.md uses:**
- `targetLtv` (from `params.riskManagement.targetLtv`)
- `loanAmountPercent` (from `params.loanAmountPercent`)

**COMPONENT_ANALYSIS.md Line 104 says:**
> "Uses `loanAmountPercent` instead of `targetLtv`"

**HTML Prototype uses:**
- `targetLtv` (single variable, not nested)

**Current Codebase:**
```typescript
// Line 98-108 in RollingLoanStrategy.ts
if (params.loanAmountPercent !== undefined && params.loanAmountPercent > 0) {
  maxLoanAmount = collateralValue * (params.loanAmountPercent / 100)
} else {
  const targetLtv = params.riskManagement.targetLtv
  maxLoanAmount = Math.min(
    params.maxLoanAmount,
    collateralValue * (targetLtv / 100)
  )
}
```

**Confusion:** Should we use `loanAmountPercent` OR `targetLtv`? Specs are unclear.

**Impact:** HIGH - Core parameter confusion

---

#### 2.3 MonthlyResult Interface Incomplete

**Issue:** TASK_BREAKDOWN.md Line 48-52 proposes new fields:

```typescript
btcPurchased?: number
monthlySavingsApplied?: number
interestAccrued?: number
loanRollover?: { oldLoanAmount: number, newLoanAmount: number, excessProceeds: number }
```

**Current MonthlyResult Interface:** Does NOT have these fields

**Impact:** HIGH - Results tab components can't display data without these fields

---

### 3. Logical Inconsistencies

#### 3.1 Strategy Type Handling Contradiction

**REFACTOR_SPEC.md Line 37 says:**
> "Monthly LTV reset to target percentage"

**But COMPONENT_ANALYSIS.md Line 139 says:**
> "Handle based on strategy type"
> ```typescript
> if (params.rollingLoanStrategyType === 'fixed') {
>   return this.handleFixedTermStrategy(context)
> } else {
>   return this.handleDynamicLtvStrategy(context)
> }
> ```

**HTML Prototype:**
- Uses `strategyType` variable (not `params.rollingLoanStrategyType`)
- Checks strategy type in EVERY loop iteration
- Does NOT route to separate handler methods

**Inconsistency:** Specs propose method routing, HTML uses inline conditionals

**Impact:** MEDIUM - Different architectural approach

---

#### 3.2 Initial Loan Timing Confusion

**REFACTOR_SPEC.md Line 52-57:**
```javascript
// At start (Month 0)
purchasedBtc = (btcHoldings * btcPrice * targetLtv * (1 - loanFee)) / btcPrice
btcHoldings += purchasedBtc
loanBalance = btcHoldings * btcPrice * targetLtv
```

**COMPONENT_ANALYSIS.md Line 132:**
```typescript
if (activeLoans.length === 0) {
  return this.handleInitialLoan(context)
}
```

**HTML Prototype:**
- Initial loan happens BEFORE main loop starts
- Main loop starts at Month 1 (or first month after start date)

**Current Implementation:**
- Initial loan happens in Month 0 inside main loop
- Uses `handleInitialLoan()` method

**Inconsistency:** When does initial loan happen? Before loop or in Month 0?

**Impact:** HIGH - Affects all subsequent calculations

---

### 4. Alignment Issues with HTML Prototype

#### 4.1 Loan Balance Tracking

**HTML Prototype:**
- Uses single `loanBalance` variable
- Accrues interest directly: `loanBalance *= (1 + (interestRate / 12))`
- Resets to target: `loanBalance = targetLoan`

**Current Implementation:**
- Uses `activeLoans` array with `Loan` objects
- Each loan has `principal`, `repaymentAmount`, `maturityMonth`
- Tracks multiple loans simultaneously

**Misalignment:** Fundamentally different data structures

**Impact:** CRITICAL - Cannot directly port HTML logic to current architecture

---

#### 4.2 Monthly Savings Integration

**HTML Prototype:**
- Applies savings FIRST in each loop iteration
- Uses `yearsPassed = loopDate.getFullYear() - startDate.getFullYear()`
- Directly modifies `btcHoldings`

**Specifications:**
- Propose applying in `StrategyExecutionService` main loop
- Use `Math.floor(month / 12)` for years passed

**Current Implementation:**
- Does NOT apply monthly savings in strategy execution
- `monthlyWithdrawalAmount` is only used in strategy decision

**Misalignment:** Savings not integrated into simulation loop

**Impact:** HIGH - Feature completely missing

---

#### 4.3 Interest Accrual Method

**HTML Prototype (Dynamic LTV):**
```javascript
loanBalance *= (1 + (interestRate / 12))
```

**Specifications (COMPONENT_ANALYSIS.md Line 152-155):**
```typescript
const monthlyInterestRate = params.annualInterestRate / 100 / 12
activeLoans.forEach(loan => {
  currentLoanBalance += loan.repaymentAmount * (1 + monthlyInterestRate)
})
```

**Misalignment:** 
- HTML: Multiplies balance by (1 + rate)
- Spec: Adds interest to repayment amount

**Impact:** MEDIUM - Different calculation results

---

## Recommendations

### Priority 1: Critical Issues (Must Fix)

1. **Document exact HTML prototype logic** with line-by-line explanation
2. **Resolve loan balance tracking architecture** - single variable vs. array
3. **Clarify cash generation mode** - separate from monthly savings/withdrawals
4. **Fix MonthlyResult interface** - add missing fields
5. **Resolve parameter naming** - `loanAmountPercent` vs `targetLtv`

### Priority 2: High Impact Issues

6. **Specify price data access pattern** - exact data structure and error handling
7. **Clarify initial loan timing** - before loop or in Month 0
8. **Document monthly savings integration** - where and how to apply
9. **Resolve strategy type handling** - method routing vs inline conditionals

### Priority 3: Medium Impact Issues

10. **Update service references** - keep or remove `LoanRolloverCalculationService`
11. **Standardize interest accrual** - multiplication vs addition
12. **Align terminology** - consistent naming across all docs

---

## Conclusion

The existing specifications provide valuable groundwork but require significant updates to serve as an implementation guide. The most critical issue is the **fundamental architectural mismatch** between the HTML prototype (single loan balance variable) and the current TypeScript implementation (multiple loan objects in array).

**Recommendation:** Create a NEW comprehensive specification that:
1. Resolves all identified contradictions
2. Documents the exact HTML prototype logic
3. Provides a clear migration path from current architecture
4. Serves as the single source of truth for implementation

This new specification should be created following the `.augment/rules/create-spec.md` workflow and stored in `.agent-os/specs/` directory.

---

## Additional Findings

### 5. Component-Specific Issues

#### 5.1 BtcAccumulationCard.tsx

**Current State:**
- Has two modes: "BTC Accumulation Mode" and "Cash Generation Mode"
- Lines 59, 63, 67, 71: Describes accumulation mode correctly
- Lines 91, 95, 99, 103: Describes cash generation mode

**Issue:** Cash generation description says "Generate monthly income from loan proceeds" but doesn't specify:
- How much income?
- When is it generated?
- Relationship to `monthlyWithdrawalAmount`?

**Spec Says (TASK_BREAKDOWN.md Line 267-269):**
> "Cash Generation Mode: Take monthly withdrawals as specified in Financial Flow settings"

**Misalignment:** UI doesn't mention Financial Flow settings

**Impact:** MEDIUM - User confusion

---

#### 5.2 FinancialFlowCard.tsx

**Current State:**
- Has `monthlyWithdrawalAmount` input (Line 58-69)
- Positive = savings, Negative = withdrawals
- Does NOT have annual increase parameter

**Spec Says (TASK_BREAKDOWN.md Line 282-293):**
> "Add annual savings/withdrawal increase parameter"

**Missing:** Annual increase input field

**Impact:** HIGH - Feature not implemented

---

#### 5.3 RollingLoanConfigCard.tsx

**Current State:**
- Shows preview calculations (Lines 26-41)
- Uses `params.loanAmountPercent` (Line 28)
- Does NOT have strategy type selector

**Spec Says (TASK_BREAKDOWN.md Line 215-234):**
> "Create new component for selecting strategy type"

**Missing:** Strategy type selector component

**Impact:** HIGH - Cannot choose between Dynamic/Fixed strategies

---

### 6. Results Tab Component Gaps

#### 6.1 Missing Data Fields

**Current MonthlyResult Interface** (from codebase retrieval):
```typescript
interface MonthlyResult {
  month: number
  btcPrice: number
  btcHoldings: number
  portfolioValue: number
  totalDebt: number
  netWorth: number
  currentLtv: number
  activeLoans: Loan[]
  // MISSING: btcPurchased, monthlySavingsApplied, interestAccrued, loanRollover
}
```

**Spec Proposes (REFACTOR_SPEC.md Line 314-335):**
```typescript
interface MonthlyResult {
  // ... existing fields ...
  btcPurchased?: number
  monthlySavingsApplied?: number
  interestAccrued?: number
  loanRollover?: {
    oldLoanAmount: number
    newLoanAmount: number
    excessProceeds: number
  }
}
```

**Impact:** HIGH - Results tab components cannot display proposed metrics

---

#### 6.2 Chart Component Updates Not Detailed

**Spec Lists Components to Update (REFACTOR_SPEC.md Lines 202-275):**
- ResultsSummary.tsx
- PortfolioValueChart.tsx
- DebtCollateralChart.tsx
- LTVProgressionChart.tsx
- CashFlowChart.tsx
- LoanActivityTable.tsx
- RiskAssessment.tsx
- EventsAnalysis.tsx

**Missing from Specs:**
- Exact data transformations needed
- Chart configuration changes
- New chart types or series
- Color schemes and styling

**Impact:** MEDIUM - Implementation details missing

---

### 7. Testing Gaps

#### 7.1 Test Coverage Not Specified

**TASK_BREAKDOWN.md Line 497-520** mentions unit tests but doesn't specify:
- Test scenarios for Dynamic vs Fixed strategies
- Edge cases (liquidation, negative proceeds, etc.)
- Integration test scenarios
- Expected vs actual value comparisons

**Missing:**
- Test data fixtures
- Expected calculation results
- Tolerance levels for floating-point comparisons

**Impact:** MEDIUM - Testing will be ad-hoc

---

#### 7.2 HTML Prototype Validation Not Documented

**Spec Says (IMPLEMENTATION_GUIDE.md Line 308):**
> "Results match HTML prototype within 0.1%"

**Missing:**
- How to extract test data from HTML prototype
- Which scenarios to test
- How to compare results programmatically

**Impact:** MEDIUM - Cannot verify correctness

---

### 8. Migration Path Not Defined

#### 8.1 Backward Compatibility

**Issue:** Specs don't address:
- What happens to existing simulations?
- Do we need data migration?
- Can old and new strategies coexist?

**Current Reality:**
- `RollingLoanStrategy` already exists
- Users may have saved simulations
- Parameters may be incompatible

**Missing:**
- Migration strategy
- Deprecation plan
- Compatibility layer

**Impact:** HIGH - Could break existing functionality

---

#### 8.2 Incremental Implementation Not Planned

**Issue:** Specs propose "big bang" refactor:
- Replace entire strategy implementation
- Update all Results tab components
- Add new UI components

**Risk:** High chance of breaking changes

**Missing:**
- Phased rollout plan
- Feature flags
- A/B testing approach

**Impact:** HIGH - Risky deployment

---

### 9. Documentation Inconsistencies

#### 9.1 Terminology Variations

**Different Terms for Same Concept:**
- "Dynamic LTV Strategy" vs "Dynamische Kreditlinie" (German)
- "Fixed Term Strategy" vs "Feste Laufzeit" (German)
- "Rolling Loan" vs "Loan Rollover"
- "BTC Accumulation" vs "Reinvestment Mode"

**Impact:** LOW - Confusing but not blocking

---

#### 9.2 Formula Notation Inconsistencies

**Example 1 - Interest Calculation:**
- HTML: `loanBalance *= (1 + (interestRate / 12))`
- Spec: `loan.repaymentAmount * (1 + monthlyInterestRate)`

**Example 2 - LTV Calculation:**
- HTML: `loanBalance / collateralValue`
- Spec: `totalDebt / portfolioValue * 100`

**Impact:** MEDIUM - Could lead to implementation errors

---

### 10. Critical Architecture Decision Not Addressed

#### 10.1 Single Loan vs Multiple Loans

**HTML Prototype:**
- Tracks single `loanBalance` variable
- No concept of individual loans
- No maturity dates or loan IDs

**Current TypeScript Implementation:**
- Tracks array of `Loan` objects
- Each loan has ID, maturity month, principal, repayment
- Supports multiple concurrent loans

**Fundamental Question:** Should we:
A. Simplify to single loan balance (match HTML)?
B. Keep multiple loans (current architecture)?
C. Hybrid approach?

**Specs Don't Address This!**

**Impact:** CRITICAL - Affects entire implementation

---

## Summary of Gaps by Priority

### CRITICAL (Blocking Implementation)
1. Loan balance architecture decision (single vs multiple)
2. MonthlyResult interface missing fields
3. Cash generation mode logic contradiction
4. Initial loan timing confusion

### HIGH (Major Impact)
5. HTML prototype logic not fully documented
6. Monthly savings integration missing
7. Strategy type selector not implemented
8. Annual increase parameter missing
9. Parameter naming confusion (loanAmountPercent vs targetLtv)
10. Backward compatibility not addressed

### MEDIUM (Significant Impact)
11. Price data access pattern not specified
12. Interest accrual method inconsistency
13. Service removal/retention unclear
14. Chart component updates not detailed
15. Test scenarios not specified

### LOW (Minor Impact)
16. Terminology variations
17. Formula notation inconsistencies

---

**Next Step:** Proceed to Phase 2 - Create New Specification

