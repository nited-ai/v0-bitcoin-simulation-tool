# Debug Tab Rollover Chain Fix - Detailed Plan

## Problem Analysis

### Current Issues
1. **Only simulates ONE rollover**: Code stops at Month 18, doesn't continue to Month 36, 54, etc.
2. **Expected vs Actual shows wrong value**: Month 18 shows $601,850 expected (WRONG)
3. **Actual loan shows 0**: Simulation isn't calculating actual loan amounts
4. **Missing BTC price display**: Not showing BTC price for every month
5. **Incomplete rollover details**: Missing excess proceeds, BTC purchased, etc.

### Root Cause
The `calculatedValues` memo (lines 265-367) only simulates:
- Month 0 (initial loan)
- Month 18 (first rollover)
- STOPS HERE

It should simulate:
- Month 0 (initial loan)
- Month 18 (first rollover)
- Month 36 (second rollover)
- Month 54 (third rollover)
- And so on...

## Solution Design

### Step 1: Refactor `calculatedValues` Memo

**Goal**: Simulate complete rollover chain for at least 3 rollovers

**Algorithm**:
```typescript
// Initialize
let currentBtc = initialBtcAmount
let activeLoans = []
let rolloverResults = []

// Month 0: Initial Loan
const month0Price = initialBtcPrice
const month0Collateral = currentBtc × month0Price
const month0Principal = Math.round(month0Collateral × (loanPercent / 100))
const month0LoanDetails = calculateLoanDetails(month0Principal, month0Collateral)

activeLoans.push({
  principal: month0LoanDetails.principal,
  repaymentAmount: month0LoanDetails.totalRepayment,
  maturityMonth: loanTermMonths
})

if (btcAccumulation) {
  const btcPurchased = month0LoanDetails.principal / month0Price
  currentBtc += btcPurchased
}

rolloverResults.push({
  month: 0,
  btcPrice: month0Price,
  totalBtcBefore: initialBtcAmount,
  totalBtcAfter: currentBtc,
  loanPrincipal: month0LoanDetails.principal,
  loanRepayment: month0LoanDetails.totalRepayment,
  excessProceeds: month0LoanDetails.principal, // Entire principal for initial
  btcPurchased: btcPurchased,
  isInitial: true
})

// Loop through rollovers
for (let rolloverNum = 1; rolloverNum <= 3; rolloverNum++) {
  const rolloverMonth = rolloverNum × loanTermMonths
  
  // Get BTC price at rollover month
  const dailyIndex = Math.min(rolloverMonth × 30, projectionPoints.length - 1)
  const btcPrice = projectionPoints[dailyIndex].price
  
  // Find maturing loan
  const maturingLoan = activeLoans.find(l => l.maturityMonth === rolloverMonth)
  if (!maturingLoan) break
  
  const repaymentDue = maturingLoan.repaymentAmount
  
  // Calculate new loan
  const collateral = currentBtc × btcPrice
  const targetPrincipal = Math.round(collateral × (loanPercent / 100))
  
  // Minimum loan needed to pay off old loan
  const minimumLoan = repaymentDue / (1 - originationFeePercent / 100)
  
  // Actual loan is max of target and minimum
  const actualPrincipal = Math.max(targetPrincipal, Math.round(minimumLoan))
  
  const newLoanDetails = calculateLoanDetails(actualPrincipal, collateral)
  
  // Calculate excess proceeds
  const excessProceeds = newLoanDetails.principal - repaymentDue
  
  // Update BTC if accumulation enabled
  let btcPurchased = 0
  const totalBtcBefore = currentBtc
  
  if (btcAccumulation && excessProceeds > 0) {
    btcPurchased = excessProceeds / btcPrice
    currentBtc += btcPurchased
  }
  
  // Remove old loan, add new loan
  activeLoans = activeLoans.filter(l => l.maturityMonth !== rolloverMonth)
  activeLoans.push({
    principal: newLoanDetails.principal,
    repaymentAmount: newLoanDetails.totalRepayment,
    maturityMonth: rolloverMonth + loanTermMonths
  })
  
  rolloverResults.push({
    month: rolloverMonth,
    btcPrice,
    totalBtcBefore,
    totalBtcAfter: currentBtc,
    loanPrincipal: newLoanDetails.principal,
    loanRepayment: newLoanDetails.totalRepayment,
    oldLoanRepayment: repaymentDue,
    excessProceeds,
    btcPurchased,
    isInitial: false
  })
}

return {
  ...existingValues,
  rolloverResults // Array of all rollovers
}
```

### Step 2: Update UI to Display All Rollovers

**Expected vs Actual Comparison Section**:
```typescript
{rolloverResults.map(rollover => {
  const actual = debugInfo.find(d => d.month === rollover.month)
  const expected = rollover.loanPrincipal
  const actualLoan = actual?.loanAmountCalc.result || 0
  const isCorrect = Math.abs(actualLoan - expected) < 100
  
  return (
    <div key={rollover.month}>
      <div>Month {rollover.month}</div>
      <div>BTC Price: ${rollover.btcPrice.toLocaleString()}</div>
      <div>Total BTC: {rollover.totalBtcAfter.toFixed(4)} BTC</div>
      <div>Expected: ${expected.toLocaleString()}</div>
      <div>Actual: ${actualLoan.toLocaleString()}</div>
      <div>{isCorrect ? '✓' : '✗'}</div>
    </div>
  )
})}
```

### Step 3: Fix Actual Simulation Loop

The actual simulation loop (lines 420-610) needs to ensure it's calculating loan amounts correctly. Check that:
1. It uses the same formula as the expected calculation
2. It properly tracks BTC accumulation
3. It calculates excess proceeds correctly

## Detailed Formulas

### Initial Loan (Month 0)

```
Input:
- initialBtcAmount = 1.0 BTC
- initialBtcPrice = $100,000
- loanAmountPercent = 10%

Calculation:
1. collateral = 1.0 × $100,000 = $100,000
2. principal = Math.round($100,000 × 0.10) = $10,000
3. originationFee = Math.round($10,000 × 0.015) = $150
4. monthlyInterest = $10,000 × (0.10 / 12) = $83.33
5. totalInterest = Math.round($83.33 × 18) = $1,500
6. totalRepayment = Math.round($10,000 + $150 + $1,500) = $11,650

BTC Accumulation:
7. btcPurchased = $10,000 / $100,000 = 0.1 BTC
8. newTotalBtc = 1.0 + 0.1 = 1.1 BTC

Output:
- Loan Principal: $10,000
- Total Repayment: $11,650
- BTC Purchased: 0.1 BTC
- New Total BTC: 1.1 BTC
```

### First Rollover (Month 18)

```
Input:
- currentBtc = 1.1 BTC
- btcPrice = $200,000 (from projection)
- oldLoanRepayment = $11,650
- loanAmountPercent = 10%
- originationFeePercent = 1.5%

Calculation:
1. collateral = 1.1 × $200,000 = $220,000
2. targetPrincipal = Math.round($220,000 × 0.10) = $22,000
3. minimumLoan = $11,650 / (1 - 0.015) = $11,650 / 0.985 = $11,827.41
4. actualPrincipal = Math.max($22,000, $11,827) = $22,000
5. originationFee = Math.round($22,000 × 0.015) = $330
6. monthlyInterest = $22,000 × (0.10 / 12) = $183.33
7. totalInterest = Math.round($183.33 × 18) = $3,300
8. totalRepayment = Math.round($22,000 + $330 + $3,300) = $25,630

Excess Proceeds:
9. excessProceeds = $22,000 - $11,650 = $10,350

BTC Accumulation:
10. btcPurchased = $10,350 / $200,000 = 0.05175 BTC
11. newTotalBtc = 1.1 + 0.05175 = 1.15175 BTC

Output:
- Loan Principal: $22,000
- Total Repayment: $25,630
- Old Loan Repayment: $11,650
- Excess Proceeds: $10,350
- BTC Purchased: 0.05175 BTC
- New Total BTC: 1.15175 BTC
```

### Second Rollover (Month 36)

```
Input:
- currentBtc = 1.15175 BTC
- btcPrice = $300,000 (from projection)
- oldLoanRepayment = $25,630
- loanAmountPercent = 10%
- originationFeePercent = 1.5%

Calculation:
1. collateral = 1.15175 × $300,000 = $345,525
2. targetPrincipal = Math.round($345,525 × 0.10) = $34,553
3. minimumLoan = $25,630 / 0.985 = $26,015.23
4. actualPrincipal = Math.max($34,553, $26,015) = $34,553
5. originationFee = Math.round($34,553 × 0.015) = $518
6. monthlyInterest = $34,553 × (0.10 / 12) = $287.94
7. totalInterest = Math.round($287.94 × 18) = $5,183
8. totalRepayment = Math.round($34,553 + $518 + $5,183) = $40,254

Excess Proceeds:
9. excessProceeds = $34,553 - $25,630 = $8,923

BTC Accumulation:
10. btcPurchased = $8,923 / $300,000 = 0.02974 BTC
11. newTotalBtc = 1.15175 + 0.02974 = 1.18149 BTC

Output:
- Loan Principal: $34,553
- Total Repayment: $40,254
- Old Loan Repayment: $25,630
- Excess Proceeds: $8,923
- BTC Purchased: 0.02974 BTC
- New Total BTC: 1.18149 BTC
```

### Third Rollover (Month 54)

```
Input:
- currentBtc = 1.18149 BTC
- btcPrice = $400,000 (from projection)
- oldLoanRepayment = $40,254
- loanAmountPercent = 10%
- originationFeePercent = 1.5%

Calculation:
1. collateral = 1.18149 × $400,000 = $472,596
2. targetPrincipal = Math.round($472,596 × 0.10) = $47,260
3. minimumLoan = $40,254 / 0.985 = $40,867.51
4. actualPrincipal = Math.max($47,260, $40,868) = $47,260
5. originationFee = Math.round($47,260 × 0.015) = $709
6. monthlyInterest = $47,260 × (0.10 / 12) = $393.83
7. totalInterest = Math.round($393.83 × 18) = $7,089
8. totalRepayment = Math.round($47,260 + $709 + $7,089) = $55,058

Excess Proceeds:
9. excessProceeds = $47,260 - $40,254 = $7,006

BTC Accumulation:
10. btcPurchased = $7,006 / $400,000 = 0.01752 BTC
11. newTotalBtc = 1.18149 + 0.01752 = 1.19901 BTC

Output:
- Loan Principal: $47,260
- Total Repayment: $55,058
- Old Loan Repayment: $40,254
- Excess Proceeds: $7,006
- BTC Purchased: 0.01752 BTC
- New Total BTC: 1.19901 BTC
```

## Implementation Checklist

- [ ] Refactor `calculatedValues` memo to simulate 3+ rollovers
- [ ] Store rollover results in array with all details
- [ ] Update "Expected vs Actual" section to show all rollovers
- [ ] Display BTC price for each rollover
- [ ] Show complete rollover details (old repayment, new loan, excess, BTC purchased)
- [ ] Verify actual simulation loop matches expected calculations
- [ ] Add console.log debugging for each rollover
- [ ] Test with example parameters to verify calculations match manual calculations

## Expected Output

After fix, the Debug tab should show:

```
2. Expected vs Actual Comparison

Month 0 (Initial Loan)
BTC Price: $100,000
Total BTC: 1.1000 BTC
Expected: $10,000    Actual: $10,000    ✓

Month 18 (First Rollover)
BTC Price: $200,000
Total BTC: 1.1518 BTC
Expected: $22,000    Actual: $22,000    ✓

Month 36 (Second Rollover)
BTC Price: $300,000
Total BTC: 1.1815 BTC
Expected: $34,553    Actual: $34,553    ✓

Month 54 (Third Rollover)
BTC Price: $400,000
Total BTC: 1.1990 BTC
Expected: $47,260    Actual: $47,260    ✓
```

---

**Status**: PLAN COMPLETE - Ready for implementation
**Last Updated**: 2025-10-01

