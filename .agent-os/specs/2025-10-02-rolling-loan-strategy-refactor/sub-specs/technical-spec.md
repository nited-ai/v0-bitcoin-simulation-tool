# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/spec.md

> Created: 2025-10-02
> Updated: 2025-10-02 (User Feedback Incorporated)
> Version: 1.1.0

## Technical Requirements

### 1. Architecture Decision: Create New Strategy from Scratch

**Problem:** Existing `RollingLoanStrategy.ts` has complex dependencies and architectural conflicts with HTML prototype.

**Selected Approach:** Create new `DynamicRollingLoanStrategy.ts` as independent microservice.

**Rationale:**
- Avoids technical debt from existing implementation
- Eliminates architectural conflicts with HTML prototype
- Follows microservices principle: independent, self-contained
- Can coexist with old strategy during transition
- Easier to test in isolation
- Cleaner implementation without legacy dependencies

**Implementation:**
- Create new file: `src/modules/strategies/implementations/DynamicRollingLoanStrategy.ts`
- Implement from scratch using HTML prototype as reference
- Register in StrategyRegistry as separate strategy
- Old `RollingLoanStrategy` remains available (can be deprecated later)
- Use existing `Loan[]` array structure for consistency

### 2. Automatic Strategy Mode Selection

**Requirement:** Automatically select between Dynamic LTV and Fixed Term modes based on loan term parameter

**Technical Approach:**

```typescript
// Add to StrategyExecutionParams interface
interface StrategyExecutionParams {
  // ... existing fields ...
  loanTermMonths: number // Can be Infinity or specific months (3, 6, 12, 18, 24)
  annualSavingsIncrease?: number // Percentage (e.g., 10 = 10%)
  // NO rollingLoanStrategyType parameter needed!
}
```

**Strategy Mode Selection:**
```typescript
makeDecision(context: StrategyContext): StrategyDecision {
  if (activeLoans.length === 0) {
    return this.handleInitialLoan(context)
  }

  // Automatic mode selection based on loan term
  if (params.loanTermMonths === Infinity) {
    // Dynamic LTV mode: monthly interest accrual, LTV reset
    return this.handleDynamicLtvMode(context)
  } else {
    // Fixed Term mode: rollover at maturity only
    return this.handleFixedTermMode(context)
  }
}
```

**Key Points:**
- No separate strategy type parameter needed
- Uses existing `loanTermMonths` from Parameters tab
- Infinity = Dynamic LTV mode
- Specific months (3, 6, 12, 18, 24) = Fixed Term mode
- More intuitive for users
- Eliminates need for separate UI component

### 3. Monthly Savings Integration

**Requirement:** Apply monthly savings/withdrawals with annual compound increases

**Technical Approach:**

**Location:** `StrategyExecutionService.ts` main simulation loop, BEFORE strategy decision

```typescript
// In main loop, before calling strategy.makeDecision()
if (params.monthlyWithdrawalAmount !== 0) {
  const yearsPassed = Math.floor(month / 12)
  const annualIncrease = (params.annualSavingsIncrease || 0) / 100
  const currentMonthlyFlow = params.monthlyWithdrawalAmount * 
    Math.pow(1 + annualIncrease, yearsPassed)
  
  // Apply to BTC holdings
  const btcChange = currentMonthlyFlow / btcPrice
  totalBtcAmount += btcChange
  
  // Track in monthly result
  monthlyResult.monthlySavingsApplied = currentMonthlyFlow
}
```

**Key Points:**
- Applied BEFORE strategy decision (matches HTML prototype)
- Uses `Math.floor(month / 12)` for years passed
- Positive values = savings (add BTC), Negative values = withdrawals (reduce BTC)
- Tracked in new `monthlySavingsApplied` field

### 4. Dynamic LTV Mode Logic (Infinite Loan Term)

**Requirement:** Monthly interest accrual and LTV reset when loan term is Infinity

**Technical Approach:**

```typescript
private handleDynamicLtvMode(context: StrategyContext): StrategyDecision {
  const { month, btcPrice, totalBtcAmount, activeLoans, params } = context
  
  // Skip if Month 0 (initial loan already created)
  if (month === 0) {
    return { allowInvestment: false, investmentMultiplier: 0, ... }
  }
  
  // 1. Accrue monthly interest on existing loan
  if (activeLoans.length > 0) {
    const monthlyRate = params.annualInterestRate / 100 / 12
    activeLoans[0].repaymentAmount *= (1 + monthlyRate)
  }
  
  // 2. Calculate target loan
  const collateralValue = totalBtcAmount * btcPrice
  const targetLtv = params.riskManagement.targetLtv / 100
  const targetLoan = collateralValue * targetLtv
  
  // 3. Calculate current loan balance
  const currentLoanBalance = activeLoans.length > 0 
    ? activeLoans[0].repaymentAmount 
    : 0
  
  // 4. Calculate amount to borrow
  const amountToBorrow = targetLoan - currentLoanBalance
  
  if (amountToBorrow <= 0) {
    return { allowInvestment: false, investmentMultiplier: 0, ... }
  }
  
  // 5. Calculate net proceeds after fees
  const loanFee = params.loanOriginationFeePercent / 100
  const netProceeds = amountToBorrow * (1 - loanFee)
  
  // 6. Update loan balance to target
  if (activeLoans.length > 0) {
    activeLoans[0].repaymentAmount = targetLoan
  }
  
  // 7. Return investment decision
  const investmentMultiplier = netProceeds / collateralValue
  return {
    allowInvestment: true,
    investmentMultiplier,
    allowWithdrawal: false,
    withdrawalAmount: 0,
    reasoning: `Dynamic LTV reset: borrowing $${Math.round(amountToBorrow)} to maintain ${targetLtv * 100}% LTV`
  }
}
```

**Key Points:**
- Skip Month 0 (initial loan already created)
- Accrue interest by multiplying repayment amount
- Reset loan balance to target (not create new loan)
- Only one loan in array at a time

### 5. Fixed Term Mode Logic (Specific Loan Term)

**Requirement:** Rollover only at maturity with full term interest when loan term is specific months

**Technical Approach:**

```typescript
private handleFixedTermMode(context: StrategyContext): StrategyDecision {
  const { month, btcPrice, totalBtcAmount, activeLoans, params } = context
  
  // Check if loan is maturing this month
  const maturingLoan = activeLoans.find(loan => loan.maturityMonth === month)
  
  if (!maturingLoan) {
    return { allowInvestment: false, investmentMultiplier: 0, ... }
  }
  
  // 1. Calculate full term interest
  const annualRate = params.annualInterestRate / 100
  const termYears = params.loanTermMonths / 12
  const interestDue = maturingLoan.principal * annualRate * termYears
  const debtToRepay = maturingLoan.principal + interestDue
  
  // 2. Calculate new target loan
  const collateralValue = totalBtcAmount * btcPrice
  const targetLtv = params.riskManagement.targetLtv / 100
  const targetLoan = collateralValue * targetLtv
  
  // 3. Calculate amount to borrow
  const amountToBorrow = targetLoan - debtToRepay
  
  if (amountToBorrow <= 0) {
    // Forced exceedance scenario - can't maintain target LTV
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      reasoning: `Rollover: repaying $${Math.round(debtToRepay)}, insufficient collateral`
    }
  }
  
  // 4. Calculate net proceeds
  const loanFee = params.loanOriginationFeePercent / 100
  const netProceeds = amountToBorrow * (1 - loanFee)
  
  // 5. Return investment decision (loan will be replaced in StrategyExecutionService)
  const investmentMultiplier = netProceeds / collateralValue
  return {
    allowInvestment: true,
    investmentMultiplier,
    allowWithdrawal: false,
    withdrawalAmount: 0,
    reasoning: `Rollover: repaying $${Math.round(debtToRepay)}, borrowing $${Math.round(targetLoan)}`
  }
}
```

**Key Points:**
- Only act when loan matures (check `maturityMonth`)
- Calculate full term interest (not monthly accrual)
- Replace old loan with new loan in StrategyExecutionService
- Handle forced exceedance when collateral insufficient

### 6. Initial Loan Simplification

**Requirement:** Simplify initial loan calculation to match HTML prototype

**Technical Approach:**

```typescript
private handleInitialLoan(context: StrategyContext): StrategyDecision {
  const { btcPrice, totalBtcAmount, params } = context
  
  // Simple formula from HTML prototype
  const targetLtv = params.riskManagement.targetLtv / 100
  const loanFee = params.loanOriginationFeePercent / 100
  
  // Calculate BTC to purchase
  const purchasedBtc = (totalBtcAmount * btcPrice * targetLtv * (1 - loanFee)) / btcPrice
  
  // Calculate loan balance (after BTC purchase)
  const newTotalBtc = totalBtcAmount + purchasedBtc
  const loanBalance = newTotalBtc * btcPrice * targetLtv
  
  // Calculate investment multiplier
  const collateralValue = totalBtcAmount * btcPrice
  const investmentMultiplier = (purchasedBtc * btcPrice) / collateralValue
  
  return {
    allowInvestment: true,
    investmentMultiplier,
    allowWithdrawal: false,
    withdrawalAmount: 0,
    reasoning: `Initial loan: ${purchasedBtc.toFixed(5)} BTC purchased, ${(targetLtv * 100).toFixed(1)}% LTV`
  }
}
```

**Key Points:**
- Matches HTML prototype formula exactly
- No complex service calls
- Simple, understandable calculation
- Loan will be created in StrategyExecutionService

### 7. Cash Generation Mode Fix

**Requirement:** Use user-specified withdrawal amount, not automatic percentage

**Current Problem:** Line 293 in RollingLoanStrategy.ts uses `rolloverResult.excessProceeds * 0.9`

**Solution:** Remove automatic withdrawal logic. Cash generation is handled through `monthlyWithdrawalAmount` parameter.

**Clarification:**
- `btcAccumulation = true`: Reinvest all loan proceeds into BTC
- `btcAccumulation = false`: Do NOT automatically withdraw. User controls withdrawals via `monthlyWithdrawalAmount`
- `monthlyWithdrawalAmount < 0`: User is withdrawing (separate from loan proceeds)

**Updated Logic:**
```typescript
// In both Dynamic and Fixed strategies
if (params.btcAccumulation) {
  return {
    allowInvestment: true,
    investmentMultiplier,
    allowWithdrawal: false,
    withdrawalAmount: 0,
    reasoning: "Reinvesting loan proceeds into BTC"
  }
} else {
  // Cash generation mode - do NOT automatically withdraw
  // User controls withdrawals via monthlyWithdrawalAmount
  return {
    allowInvestment: true,
    investmentMultiplier,
    allowWithdrawal: false,
    withdrawalAmount: 0,
    reasoning: "Cash generation mode - withdrawals via Financial Flow"
  }
}
```

### 8. MonthlyResult Interface Updates

**Requirement:** Add new fields to track strategy execution details

**Technical Approach:**

```typescript
interface MonthlyResult {
  // ... existing fields ...

  // NEW FIELDS
  btcPurchased?: number // BTC purchased this month from loan proceeds
  monthlySavingsApplied?: number // Monthly savings/withdrawal amount applied
  interestAccrued?: number // Interest accrued this month (Dynamic LTV mode only)
  loanRollover?: {
    oldLoanAmount: number
    newLoanAmount: number
    excessProceeds: number
  }
}
```

**Population:**
- `btcPurchased`: Set when strategy returns `allowInvestment: true`
- `monthlySavingsApplied`: Set when monthly savings are applied
- `interestAccrued`: Set in Dynamic LTV mode (Infinity loan term) after interest accrual
- `loanRollover`: Set in Fixed Term mode (specific loan term) at rollover

### 9. Strategy Registry Integration

**Requirement:** Register new strategy and make it available in strategy dropdown

**Technical Approach:**

**File:** `src/modules/strategies/implementations/index.ts`

```typescript
// Export new strategy
export { DynamicRollingLoanStrategy } from './DynamicRollingLoanStrategy'
```

**File:** Strategy initialization (where strategies are registered)

```typescript
import { DynamicRollingLoanStrategy } from './implementations'

// Register new strategy
strategyRegistry.registerStrategy(
  'dynamic-rolling-loan',
  new DynamicRollingLoanStrategy(),
  true, // enabled
  10 // priority (higher than old rolling loan)
)

// Optional: Deprecate old strategy
strategyRegistry.registerStrategy(
  'rolling-loan',
  new RollingLoanStrategy(),
  false, // disabled by default
  5 // lower priority
)
```

**Strategy Metadata:**
```typescript
// In DynamicRollingLoanStrategy.ts
getName(): string {
  return 'Dynamic Rolling Loan'
}

getDescription(): string {
  return 'Automated Bitcoin-backed loan strategy with Dynamic LTV (infinite term) or Fixed Term (specific months) modes'
}
```

### 10. Results Tab Calculation Services

**Requirement:** Update calculation services to process new monthly result fields

**Technical Approach:**

**Files to Update:**
- `app/simulation/tabs/results/ResultsSummary.tsx` - Calculate totals from new fields
- Calculation utilities that process monthly results

**New Calculations:**
```typescript
// Total BTC Purchased
const totalBtcPurchased = monthlyResults.reduce((sum, result) =>
  sum + (result.btcPurchased || 0), 0
)

// Total Savings/Withdrawals Applied
const totalSavingsApplied = monthlyResults.reduce((sum, result) =>
  sum + (result.monthlySavingsApplied || 0), 0
)

// Total Interest Accrued
const totalInterestAccrued = monthlyResults.reduce((sum, result) =>
  sum + (result.interestAccrued || 0), 0
)

// Count of Loan Rollovers
const rolloverCount = monthlyResults.filter(result =>
  result.loanRollover !== undefined
).length
```

## External Dependencies

None. All functionality uses existing dependencies:
- React 19 (UI components)
- TypeScript 5.x (type safety)
- Recharts (charts - already used)
- shadcn/ui (UI components - already used)

## Performance Considerations

1. **Simulation Speed:** No impact expected. Simplified logic should be faster than current complex calculations.
2. **Memory Usage:** No significant change. Still tracking same number of loans (1 at a time).
3. **Chart Rendering:** No change. Same data structure, just additional fields.

## Backward Compatibility

**Strategy:**
- Create new strategy as separate implementation
- Keep existing `RollingLoanStrategy` available (can be deprecated later)
- Use existing `Loan[]` array structure for consistency
- Add optional fields to interfaces (use `?:` syntax)
- New strategy uses existing `loanTermMonths` parameter (no new parameters for mode selection)
- Existing simulations continue to work with old strategy

**Migration Path:**
- No data migration needed
- Users can switch to new strategy via dropdown
- Old strategy remains available during transition
- New parameters (`annualSavingsIncrease`, new MonthlyResult fields) are optional with sensible defaults
- Existing parameters remain valid and compatible

**Deprecation Plan (Optional):**
1. Release new `DynamicRollingLoanStrategy` alongside old strategy
2. Mark old `RollingLoanStrategy` as deprecated in UI (badge or tooltip)
3. After transition period, disable old strategy by default
4. Eventually remove old strategy in future major version

