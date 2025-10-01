# Developer Guide: Loan Calculations

## 🎯 Purpose

This guide explains how to properly work with loan calculations in the Bitcoin Simulation Tool. Following these guidelines ensures consistency, accuracy, and maintainability across the codebase.

## ⚠️ Golden Rule

**ALL loan calculations MUST use `CentralizedLoanCalculationService`**

This is not optional. This is not a suggestion. This is a requirement.

## 📚 Table of Contents

1. [Why We Have Centralized Loan Calculations](#why-we-have-centralized-loan-calculations)
2. [Key Concepts](#key-concepts)
3. [How to Use the Service](#how-to-use-the-service)
4. [Common Scenarios](#common-scenarios)
5. [Common Pitfalls](#common-pitfalls)
6. [Code Review Checklist](#code-review-checklist)
7. [Testing Guidelines](#testing-guidelines)

---

## Why We Have Centralized Loan Calculations

### The Problem We Solved

Before centralization, we had:

❌ **Multiple calculation methods** scattered across files
❌ **Inconsistent formulas** (some included fees, some didn't)
❌ **Decimal precision issues** ($11,724 vs $11,724.2)
❌ **Display confusion** (showing principal when repayment was needed)
❌ **Maintenance nightmare** (fixing bugs in multiple places)

### The Solution

✅ **Single source of truth**: `CentralizedLoanCalculationService`
✅ **Consistent formulas**: Same calculation everywhere
✅ **Standardized precision**: No decimals for amounts
✅ **Clear semantics**: Principal vs repayment distinction
✅ **Easy maintenance**: Fix once, works everywhere

---

## Key Concepts

### Principal vs Repayment

**This is the most important distinction to understand:**

| Concept | Definition | Example | When to Use |
|---------|------------|---------|-------------|
| **Principal** | Amount you **receive** | $11,724 | Creating loans, calculating LTV, investment multiplier |
| **Repayment** | Amount you **owe** | $13,659 | Calculating debt, rollover amounts, liquidation risk |

**Formula**:
```
Total Repayment = Principal + Origination Fee + Total Interest
$13,659 = $11,724 + $176 + $1,759
```

### Loan Cost Components

1. **Principal**: The actual loan proceeds you receive
2. **Origination Fee**: One-time or annual fee charged when taking out loan
3. **Interest**: Cost over loan term based on annual interest rate
4. **Total Repayment**: Principal + Origination Fee + Interest (what you owe)
5. **Effective Cost**: Origination Fee + Interest (excludes principal)

### Decimal Precision

**Rule**: All monetary amounts are rounded to eliminate decimals.

```typescript
// ✅ CORRECT
const principal = Math.round(collateralValue * 0.10)  // $11,724

// ❌ WRONG
const principal = collateralValue * 0.10  // $11,724.2
```

---

## How to Use the Service

### Step 1: Import the Service

```typescript
import { centralizedLoanCalculationService } from '@/modules/strategies/services/CentralizedLoanCalculationService'
```

### Step 2: Calculate Loan Details

```typescript
// Calculate principal (round first!)
const principal = Math.round(collateralValue * (loanPercent / 100))

// Get complete loan details
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)
```

### Step 3: Use the Results

```typescript
// Create loan with correct values
const newLoan: Loan = {
  id: loanIdCounter++,
  month,
  principal: loanDetails.principal,              // Amount received
  maturityMonth: month + params.loanTermMonths,
  repaymentAmount: loanDetails.totalRepayment,   // Amount owed
  lockedBtc: loanDetails.principal / btcPrice
}

// Display breakdown
console.log(`Principal (received): $${loanDetails.principal.toLocaleString()}`)
console.log(`Origination Fee: $${loanDetails.originationFee.toLocaleString()}`)
console.log(`Total Interest: $${loanDetails.totalInterest.toLocaleString()}`)
console.log(`Total Repayment (owed): $${loanDetails.totalRepayment.toLocaleString()}`)
```

---

## Common Scenarios

### Scenario 1: Creating an Initial Loan

```typescript
// 1. Calculate principal based on target LTV or percentage
const targetLoanPercent = params.loanAmountPercent || 10
const principal = Math.round(collateralValue * (targetLoanPercent / 100))

// 2. Get loan details
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

// 3. Calculate investment multiplier for BTC accumulation
const investmentMultiplier = centralizedLoanCalculationService.calculateInvestmentMultiplier(
  loanDetails,
  collateralValue
)

// 4. Create loan
const newLoan: Loan = {
  id: loanIdCounter++,
  month: 0,
  principal: loanDetails.principal,
  maturityMonth: params.loanTermMonths,
  repaymentAmount: loanDetails.totalRepayment,
  lockedBtc: loanDetails.principal / btcPrice
}

// 5. Return strategy decision
return {
  allowInvestment: true,
  investmentMultiplier,
  allowWithdrawal: false,
  withdrawalAmount: 0,
  reasoning: `Taking initial loan: $${loanDetails.principal} principal + $${loanDetails.originationFee} fee + $${loanDetails.totalInterest} interest = $${loanDetails.totalRepayment} total`
}
```

### Scenario 2: Rolling Over a Maturing Loan

```typescript
// 1. Calculate total repayment due from maturing loans
const maturingLoans = activeLoans.filter(l => l.maturityMonth === currentMonth)
const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)

// 2. Calculate minimum loan needed to pay off maturing loans
const minimumLoan = centralizedLoanCalculationService.calculateMinimumLoanForRollover(
  repaymentDue,
  params.loanOriginationFeePercent
)

// 3. Calculate target loan amount (maintain percentage of stack)
const targetLoanAmount = Math.round(collateralValue * (targetLoanPercent / 100))

// 4. Take the larger of minimum or target
const newPrincipal = Math.max(minimumLoan, targetLoanAmount)

// 5. Get loan details
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  newPrincipal,
  collateralValue,
  params
)

// 6. Calculate excess proceeds
const excessProceeds = loanDetails.principal - repaymentDue

// 7. Create new loan
const newLoan: Loan = {
  id: loanIdCounter++,
  month: currentMonth,
  principal: loanDetails.principal,
  maturityMonth: currentMonth + params.loanTermMonths,
  repaymentAmount: loanDetails.totalRepayment,
  lockedBtc: loanDetails.principal / btcPrice
}

// 8. Handle excess proceeds based on accumulation mode
if (params.btcAccumulation) {
  // Reinvest excess into more BTC
  totalBtcAmount += excessProceeds / btcPrice
} else {
  // Take excess as cash
  withdrawalAmount = excessProceeds * 0.8  // Keep some buffer
}
```

### Scenario 3: Displaying Loan Information

```typescript
// ✅ CORRECT: Show both principal and repayment
<div>
  <div className="text-sm text-muted-foreground">Principal (received):</div>
  <div className="font-mono font-semibold">${loan.principal.toLocaleString()}</div>
  
  <div className="text-sm text-muted-foreground mt-2">Total Repayment (owed):</div>
  <div className="font-mono font-bold text-green-600">${loan.repaymentAmount.toLocaleString()}</div>
</div>

// ❌ WRONG: Only showing principal
<div>
  <div className="text-sm text-muted-foreground">Loan Amount:</div>
  <div className="font-mono font-semibold">${loan.principal.toLocaleString()}</div>
</div>
```

### Scenario 4: Calculating Total Debt

```typescript
// ✅ CORRECT: Use repaymentAmount for debt calculations
const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)

// ❌ WRONG: Using principal (missing fees and interest)
const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.principal, 0)
```

---

## Common Pitfalls

### ❌ Pitfall 1: Calculating Loan Amounts Manually

```typescript
// ❌ WRONG
const loanAmount = collateralValue * 0.10
const repayment = loanAmount * (1 + (interestRate / 100) * (termMonths / 12))

// ✅ CORRECT
const principal = Math.round(collateralValue * 0.10)
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)
const repayment = loanDetails.totalRepayment
```

### ❌ Pitfall 2: Creating Loans Without the Service

```typescript
// ❌ WRONG
const newLoan: Loan = {
  principal: loanAmount,
  repaymentAmount: loanAmount * 1.065  // Missing fees, wrong formula
}

// ✅ CORRECT
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)
const newLoan: Loan = {
  principal: loanDetails.principal,
  repaymentAmount: loanDetails.totalRepayment
}
```

### ❌ Pitfall 3: Using Principal Where Repayment is Needed

```typescript
// ❌ WRONG: Calculating debt with principal
const totalDebt = loans.reduce((sum, l) => sum + l.principal, 0)

// ✅ CORRECT: Calculating debt with repaymentAmount
const totalDebt = loans.reduce((sum, l) => sum + l.repaymentAmount, 0)
```

### ❌ Pitfall 4: Not Rounding Monetary Values

```typescript
// ❌ WRONG: Decimals in loan amounts
const principal = collateralValue * 0.10  // $11,724.2

// ✅ CORRECT: Rounded to eliminate decimals
const principal = Math.round(collateralValue * 0.10)  // $11,724
```

### ❌ Pitfall 5: Inconsistent Display Labels

```typescript
// ❌ WRONG: Ambiguous label
<div>Loan Amount: ${loan.principal}</div>

// ✅ CORRECT: Clear distinction
<div>Principal (received): ${loan.principal}</div>
<div>Total Repayment (owed): ${loan.repaymentAmount}</div>
```

---

## Code Review Checklist

When reviewing code that touches loan calculations, verify:

### ✅ Service Usage
- [ ] Uses `centralizedLoanCalculationService` for all loan calculations
- [ ] No manual loan amount calculations
- [ ] No custom repayment formulas

### ✅ Loan Creation
- [ ] Calls `calculateLoanDetails()` before creating loans
- [ ] Uses `loanDetails.principal` for `loan.principal`
- [ ] Uses `loanDetails.totalRepayment` for `loan.repaymentAmount`
- [ ] Rounds principal before passing to service

### ✅ Display Logic
- [ ] Shows both principal and repayment where appropriate
- [ ] Uses clear labels ("received" vs "owed")
- [ ] Formats amounts consistently (no decimals)

### ✅ Debt Calculations
- [ ] Uses `loan.repaymentAmount` for debt totals
- [ ] Uses `loan.principal` for LTV calculations
- [ ] Correctly distinguishes between the two

### ✅ Testing
- [ ] Tests use centralized service
- [ ] Tests verify correct principal and repayment values
- [ ] Tests check for proper rounding

---

## Testing Guidelines

### Unit Tests

```typescript
import { centralizedLoanCalculationService } from './CentralizedLoanCalculationService'

describe('Loan Calculations', () => {
  it('should calculate loan details correctly', () => {
    const principal = 11724
    const collateralValue = 117242
    const params = {
      loanOriginationFeePercent: 1.5,
      annualInterestRate: 10,
      loanTermMonths: 18,
      // ... other params
    }
    
    const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
      principal,
      collateralValue,
      params
    )
    
    expect(loanDetails.principal).toBe(11724)
    expect(loanDetails.originationFee).toBe(176)  // 1.5% of 11724
    expect(loanDetails.totalInterest).toBe(1759)  // 10% annual over 18 months
    expect(loanDetails.totalRepayment).toBe(13659)  // 11724 + 176 + 1759
  })
})
```

### Integration Tests

```typescript
it('should create loans with correct repayment amounts', async () => {
  const result = await strategyExecutionService.executeStrategy(
    strategy,
    params,
    priceProjection
  )
  
  const month0 = result.monthlyResults[0]
  const loan = month0.activeLoans[0]
  
  // Verify loan has both principal and repayment
  expect(loan.principal).toBeGreaterThan(0)
  expect(loan.repaymentAmount).toBeGreaterThan(loan.principal)
  
  // Verify repayment includes fees and interest
  const expectedFee = Math.round(loan.principal * 0.015)
  const expectedInterest = Math.round(loan.principal * 0.10 * (18 / 12))
  const expectedRepayment = loan.principal + expectedFee + expectedInterest
  
  expect(loan.repaymentAmount).toBe(expectedRepayment)
})
```

---

## Quick Reference

### Import Statement
```typescript
import { centralizedLoanCalculationService } from '@/modules/strategies/services/CentralizedLoanCalculationService'
```

### Basic Usage
```typescript
const principal = Math.round(collateralValue * 0.10)
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(principal, collateralValue, params)
```

### Key Methods
- `calculateLoanDetails()` - Complete loan calculation
- `calculateInvestmentMultiplier()` - For BTC accumulation
- `calculateMinimumLoanForRollover()` - For rolling loans
- `formatLoanCalculation()` - For display

### Remember
- ✅ Always use the service
- ✅ Round principal before calculating
- ✅ Use `principal` for received amount
- ✅ Use `totalRepayment` for owed amount
- ✅ Show both values in displays
- ✅ Test with the service

---

## Need Help?

- **Documentation**: See `docs/CENTRALIZED_LOAN_CALCULATIONS.md`
- **Implementation**: See `docs/LOAN_AMOUNT_REFACTORING_SUMMARY.md`
- **Code**: See `src/modules/strategies/services/CentralizedLoanCalculationService.ts`
- **Examples**: See `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0

