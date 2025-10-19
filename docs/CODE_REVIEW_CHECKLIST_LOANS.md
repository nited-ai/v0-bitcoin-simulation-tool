# Code Review Checklist: Loan Calculations

## Purpose

This checklist ensures that all code changes involving loan calculations follow the centralized calculation pattern and maintain consistency across the application.

## When to Use This Checklist

Use this checklist when reviewing:
- ✅ New loan creation logic
- ✅ Loan rollover scenarios
- ✅ Debt calculations
- ✅ Display of loan amounts
- ✅ Strategy implementations
- ✅ Debug or results pages
- ✅ Any code that touches `Loan` objects

## Quick Reference

### ✅ Must Use
- `centralizedLoanCalculationService.calculateLoanDetails()`
- `centralizedLoanCalculationService.calculateInvestmentMultiplier()`
- `centralizedLoanCalculationService.calculateMinimumLoanForRollover()`

### ❌ Must NOT Use
- Manual loan amount calculations
- Custom repayment formulas
- Direct multiplication for fees/interest
- Unrounded monetary values

---

## Checklist

### 1. Service Usage ✅

#### 1.1 Centralized Service Import
- [ ] Code imports `centralizedLoanCalculationService`
- [ ] Import path is correct: `@/modules/strategies/services/CentralizedLoanCalculationService`
- [ ] No other loan calculation utilities are imported

```typescript
// ✅ CORRECT
import { centralizedLoanCalculationService } from '@/modules/strategies/services/CentralizedLoanCalculationService'

// ❌ WRONG
import { calculateLoanAmount } from './utils'
```

#### 1.2 Service Method Usage
- [ ] Uses `calculateLoanDetails()` for all loan calculations
- [ ] Uses `calculateInvestmentMultiplier()` for BTC accumulation
- [ ] Uses `calculateMinimumLoanForRollover()` for rollover scenarios
- [ ] No manual calculations of principal, fees, or interest

```typescript
// ✅ CORRECT
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

// ❌ WRONG
const repayment = principal * (1 + interestRate)
```

---

### 2. Loan Creation ✅

#### 2.1 Principal Calculation
- [ ] Principal is rounded before passing to service
- [ ] Uses `Math.round()` to eliminate decimals
- [ ] No floating-point arithmetic without rounding

```typescript
// ✅ CORRECT
const principal = Math.round(collateralValue * 0.10)

// ❌ WRONG
const principal = collateralValue * 0.10  // Has decimals
```

#### 2.2 Loan Object Creation
- [ ] Uses `loanDetails.principal` for `loan.principal`
- [ ] Uses `loanDetails.totalRepayment` for `loan.repaymentAmount`
- [ ] All required fields are populated
- [ ] No manual calculation of repayment amount

```typescript
// ✅ CORRECT
const newLoan: Loan = {
  id: loanIdCounter++,
  month,
  principal: loanDetails.principal,
  maturityMonth: month + params.loanTermMonths,
  repaymentAmount: loanDetails.totalRepayment,
  lockedBtc: loanDetails.principal / btcPrice
}

// ❌ WRONG
const newLoan: Loan = {
  principal: loanAmount,
  repaymentAmount: loanAmount * 1.065  // Manual calculation
}
```

#### 2.3 Loan Storage
- [ ] Loan is added to active loans array
- [ ] Loan is not mutated after creation
- [ ] Loan ID is unique

---

### 3. Display Logic ✅

#### 3.1 Label Clarity
- [ ] Uses "Principal (received)" for principal amounts
- [ ] Uses "Total Repayment (owed)" for repayment amounts
- [ ] Labels clearly distinguish between the two
- [ ] No ambiguous labels like "Loan Amount"

```typescript
// ✅ CORRECT
<div>Principal (received): ${loan.principal.toLocaleString()}</div>
<div>Total Repayment (owed): ${loan.repaymentAmount.toLocaleString()}</div>

// ❌ WRONG
<div>Loan Amount: ${loan.principal.toLocaleString()}</div>
```

#### 3.2 Value Display
- [ ] Shows both principal and repayment where appropriate
- [ ] Uses `.toLocaleString()` for formatting
- [ ] No decimal places in displayed amounts
- [ ] Breakdown shows fees and interest separately

```typescript
// ✅ CORRECT
<div>
  <div>Principal: ${loanDetails.principal.toLocaleString()}</div>
  <div>Origination Fee: ${loanDetails.originationFee.toLocaleString()}</div>
  <div>Total Interest: ${loanDetails.totalInterest.toLocaleString()}</div>
  <div>Total Repayment: ${loanDetails.totalRepayment.toLocaleString()}</div>
</div>

// ❌ WRONG
<div>Loan: ${loan.principal.toFixed(2)}</div>
```

#### 3.3 Reasoning Text
- [ ] Reasoning includes complete breakdown
- [ ] Shows principal + fee + interest = total
- [ ] Uses formatted values from service
- [ ] Matches displayed values

```typescript
// ✅ CORRECT
reasoning: `Taking initial loan: ${formatted.principalFormatted} principal + 
            ${formatted.originationFeeFormatted} fee + 
            ${formatted.totalInterestFormatted} interest = 
            ${formatted.totalRepaymentFormatted} total`

// ❌ WRONG
reasoning: `Taking loan of ${principal}`
```

---

### 4. Debt Calculations ✅

#### 4.1 Total Debt
- [ ] Uses `loan.repaymentAmount` for debt calculations
- [ ] Does NOT use `loan.principal` for debt totals
- [ ] Sums all active loans correctly

```typescript
// ✅ CORRECT
const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)

// ❌ WRONG
const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.principal, 0)
```

#### 4.2 Rollover Calculations
- [ ] Uses `calculateMinimumLoanForRollover()` for minimum loan
- [ ] Accounts for origination fee in rollover
- [ ] Calculates excess proceeds correctly

```typescript
// ✅ CORRECT
const minimumLoan = centralizedLoanCalculationService.calculateMinimumLoanForRollover(
  repaymentDue,
  params.loanOriginationFeePercent
)

// ❌ WRONG
const minimumLoan = repaymentDue  // Missing fee adjustment
```

#### 4.3 LTV Calculations
- [ ] Uses `loan.principal` for LTV (not repayment)
- [ ] Divides by collateral value
- [ ] Multiplies by 100 for percentage

```typescript
// ✅ CORRECT
const ltv = (loan.principal / collateralValue) * 100

// ❌ WRONG
const ltv = (loan.repaymentAmount / collateralValue) * 100
```

---

### 5. Strategy Integration ✅

#### 5.1 Investment Multiplier
- [ ] Uses `calculateInvestmentMultiplier()` from service
- [ ] Passes correct loan details and collateral value
- [ ] Returns multiplier in strategy decision

```typescript
// ✅ CORRECT
const investmentMultiplier = centralizedLoanCalculationService
  .calculateInvestmentMultiplier(loanDetails, collateralValue)

// ❌ WRONG
const investmentMultiplier = principal / collateralValue
```

#### 5.2 Strategy Decision
- [ ] Includes complete reasoning
- [ ] Shows loan breakdown
- [ ] Uses formatted values
- [ ] Matches actual loan creation

---

### 6. Testing ✅

#### 6.1 Unit Tests
- [ ] Tests use centralized service
- [ ] Tests verify principal and repayment separately
- [ ] Tests check for proper rounding
- [ ] Tests cover edge cases (zero fees, infinite term)

```typescript
// ✅ CORRECT
it('should calculate loan details correctly', () => {
  const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
    11724, 117242, params
  )
  expect(loanDetails.principal).toBe(11724)
  expect(loanDetails.totalRepayment).toBe(13659)
})

// ❌ WRONG
it('should calculate loan', () => {
  const amount = 11724 * 1.065
  expect(amount).toBe(12486)  // Wrong formula
})
```

#### 6.2 Integration Tests
- [ ] Tests verify loan creation uses service
- [ ] Tests check repayment > principal
- [ ] Tests verify display shows correct values
- [ ] Tests cover rollover scenarios

---

### 7. Documentation ✅

#### 7.1 Code Comments
- [ ] Complex logic has explanatory comments
- [ ] References to centralized service are noted
- [ ] Reasoning for calculations is documented

```typescript
// ✅ CORRECT
// CRITICAL: Use centralized calculation service for accurate loan details
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(...)

// ❌ WRONG
const loanDetails = calculateLoanDetails(...)  // No context
```

#### 7.2 JSDoc Comments
- [ ] Public methods have JSDoc comments
- [ ] Parameters are documented
- [ ] Return values are documented
- [ ] Examples are provided

---

### 8. Common Pitfalls ✅

#### 8.1 Avoid Manual Calculations
- [ ] No manual fee calculations
- [ ] No manual interest calculations
- [ ] No manual repayment calculations
- [ ] No custom formulas

#### 8.2 Avoid Ambiguous Names
- [ ] No variables named just "amount"
- [ ] No variables named just "total"
- [ ] Clear distinction between principal and repayment

#### 8.3 Avoid Decimal Issues
- [ ] All monetary values are rounded
- [ ] No `.toFixed(2)` for amounts
- [ ] No floating-point arithmetic without rounding

#### 8.4 Avoid Display Confusion
- [ ] Labels clearly indicate principal vs repayment
- [ ] Both values shown where appropriate
- [ ] Breakdown includes all components

---

## Review Summary Template

Use this template when completing a review:

```markdown
## Loan Calculation Review

### Service Usage
- [x] Uses centralizedLoanCalculationService
- [x] No manual calculations
- [x] Correct method calls

### Loan Creation
- [x] Principal is rounded
- [x] Uses loanDetails.principal
- [x] Uses loanDetails.totalRepayment

### Display Logic
- [x] Clear labels (received vs owed)
- [x] Shows both principal and repayment
- [x] Proper formatting

### Debt Calculations
- [x] Uses repaymentAmount for debt
- [x] Uses principal for LTV
- [x] Correct rollover logic

### Testing
- [x] Tests use centralized service
- [x] Tests verify both values
- [x] Edge cases covered

### Documentation
- [x] Code comments present
- [x] JSDoc comments complete
- [x] Examples provided

### Overall Assessment
✅ APPROVED - Follows centralized calculation pattern
❌ NEEDS CHANGES - See comments below
```

---

## Quick Decision Tree

```
Does the code create or modify loans?
├─ YES
│  └─ Does it use centralizedLoanCalculationService?
│     ├─ YES → ✅ Continue review
│     └─ NO → ❌ REQUEST CHANGES
└─ NO
   └─ Does it display loan amounts?
      ├─ YES
      │  └─ Does it show both principal and repayment?
      │     ├─ YES → ✅ Continue review
      │     └─ NO → ❌ REQUEST CHANGES
      └─ NO → ✅ Not applicable
```

---

## Resources

- **Developer Guide**: `docs/DEVELOPER_GUIDE_LOAN_CALCULATIONS.md`
- **Architecture**: `docs/architecture/LOAN_CALCULATION_ARCHITECTURE.md`
- **Implementation Summary**: `docs/LOAN_AMOUNT_REFACTORING_SUMMARY.md`
- **Service Code**: `src/modules/strategies/services/CentralizedLoanCalculationService.ts`

---

## Questions?

If you're unsure about any aspect of loan calculations:

1. Check the Developer Guide first
2. Review existing examples in the codebase
3. Look at the centralized service implementation
4. Ask for clarification in the PR

**Remember**: When in doubt, use the centralized service!

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0

