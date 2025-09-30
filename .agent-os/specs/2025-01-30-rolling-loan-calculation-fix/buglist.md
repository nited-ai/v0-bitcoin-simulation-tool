# Bug List - Rolling Loan Strategy Calculation Errors

> Created: 2025-01-30
> Status: Investigation Phase

## Discovered Bugs

### Bug #1: Incorrect First Loan Amount Calculation
**Status**: Root Cause Identified
**Severity**: Critical
**Description**: First loan calculates $50,000 instead of expected $12,300

**Test Scenario:**
- Initial BTC: 1 BTC at $100,000
- Target Percentage: 10% of BTC stack = $10,000
- Interest for 24 months: $2,000
- Platform fees (Firefish 1.5% annual): $300
- **Expected Minimum Loan Needed**: $10,000 + $2,000 + $300 = $12,300
- **Actual Result**: $50,000 (incorrect)

**Root Cause**: Strategy uses 50% LTV directly instead of calculating minimum loan needed
- Investment multiplier: 0.5 (50% LTV)
- Loan amount: 0.5 × $100,000 = $50,000
- Strategy reasoning: "Taking initial loan of $50000 for BTC accumulation (50% LTV)"

**Problem**: Strategy ignores target percentage (10%) and uses maximum LTV (50%) instead

### Bug #2: Missing Target Percentage Parameter
**Status**: Identified
**Severity**: Critical
**Description**: StrategyExecutionParams interface missing target loan percentage parameter

**Details**: The strategy needs to know what percentage of BTC stack to target for loans (e.g., 10%), but this parameter is not available in the current interface.

### Bug #3: Interest Calculation Returns NaN
**Status**: Identified
**Severity**: High
**Description**: Interest calculation produces NaN instead of expected $2,000

**Test Result**: `targetAmount * monthlyRate * termMonths` = NaN
**Expected**: $10,000 × (10%/12) × 24 = $2,000

### Bug #4: Platform Fee Calculation Returns NaN
**Status**: Identified
**Severity**: High
**Description**: Platform fee calculation produces NaN instead of expected $300

**Test Result**: `targetAmount * annualFeeRate * loanTermYears` = NaN
**Expected**: $10,000 × 1.5% × 2 years = $300

### Bug #5: Incorrect Maximum Loan Calculation Logic
**Status**: Root Cause Identified
**Severity**: Critical
**Description**: LoanRolloverCalculationService.calculateMaximumLoanAmount() uses targetLtvPercent instead of target loan percentage

**Root Cause**:
- Method: `calculateMaximumLoanAmount(btcStackValue, targetLtvPercent)`
- Current logic: `btcStackValue * (targetLtvPercent / 100)` = $100,000 × 50% = $50,000
- Should be: `btcStackValue * (loanAmountPercent / 100)` = $100,000 × 10% = $10,000

**Impact**: Strategy takes maximum LTV loan instead of target percentage loan

### Bug #6: Missing Parameter Mapping Between Interfaces
**Status**: Identified
**Severity**: Critical
**Description**: loanAmountPercent parameter exists in SimulationParams but missing from StrategyExecutionParams

**Details**:
- SimulationParams has `loanAmountPercent: 15` (default)
- StrategyExecutionParams interface missing this parameter
- Strategy cannot access target loan percentage from user input

### Bug #7: Strategy Uses Wrong Calculation Method for Initial Loans
**Status**: Root Cause Identified
**Severity**: Critical
**Description**: RollingLoanStrategy.handleInitialLoan() uses maxLoanAmount instead of calculating minimum needed

**Current Logic**:
```typescript
const maxLoanAmount = Math.min(
  params.maxLoanAmount,
  collateralValue * (targetLtv / 100)  // Uses 50% LTV
)
const loanAmount = maxLoanAmount  // Takes maximum instead of minimum needed
```

**Should Be**:
```typescript
const targetLoanAmount = collateralValue * (loanAmountPercent / 100)  // 10% of stack
const minimumNeeded = targetLoanAmount + interest + platformFees
const loanAmount = minimumNeeded
```

---

## Summary of Root Causes

1. **Missing Parameter**: `loanAmountPercent` not available in StrategyExecutionParams
2. **Wrong Calculation Logic**: Strategy uses LTV-based maximum instead of target percentage
3. **Incorrect Service Method**: LoanRolloverCalculationService uses wrong parameter for maximum calculation
4. **Interface Mismatch**: SimulationParams vs StrategyExecutionParams parameter inconsistency

---

## React Console Warnings (Lower Priority)

### Bug #8: Missing Key Prop in CollateralChart
**Status**: Identified
**Severity**: Low (UI Warning)
**File**: `CollateralChart.tsx:213`
**Description**: "Each child in a list should have a unique 'key' prop"
**Component**: `ForwardRef(_c)` (passed from Line component)
**Reference**: https://react.dev/link/warning-keys

### Bug #9: Key Prop Spread Warning in RiskProgressionChart
**Status**: Identified
**Severity**: Low (UI Warning)
**File**: `RiskProgressionChart.tsx:317`
**Description**: React keys must be passed directly to JSX, not spread via props object
**Current**: `<circle {...props} />` where props contains a `key` property
**Expected**: `<circle key={someKey} {...props} />` with key extracted from props

### Bug #10: Invalid DOM Prop Warning in RiskProgressionChart
**Status**: Identified
**Severity**: Low (UI Warning)
**File**: `RiskProgressionChart.tsx:317`
**Description**: `dataKey` prop is not recognized on DOM `<circle>` element
**Should**: Either be lowercase `datakey` or removed from DOM element

---

## Next Steps

1. Add `loanAmountPercent` parameter to StrategyExecutionParams interface
2. Fix RollingLoanStrategy to use target percentage instead of maximum LTV
3. Update LoanRolloverCalculationService to accept target loan percentage parameter
4. Fix parameter mapping between UI and strategy execution
5. **HIGH PRIORITY**: Fix Results page to use configured Price Projection parameters
6. **MEDIUM PRIORITY**: Fix React console warnings (Bugs #8-10)
