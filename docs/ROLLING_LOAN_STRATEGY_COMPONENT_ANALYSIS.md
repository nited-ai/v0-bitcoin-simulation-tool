# Rolling Loan Strategy - Component-by-Component Analysis

**Date:** 2025-01-27  
**Purpose:** Detailed analysis of each component requiring updates

## HTML Prototype Analysis

### Core Calculation Logic (Lines 174-340)

#### Initial Setup
```javascript
// Line 227-236: Initial loan at start
let btcHoldings = initialBtc
let loanBalance = 0
let btcPrice = getPriceForDate(startDate)

let purchasedBtc = (btcHoldings * btcPrice * targetLtv * (1 - loanFee)) / btcPrice
btcHoldings += purchasedBtc
loanBalance = btcHoldings * btcPrice * targetLtv
```

**Key Insight**: Initial loan is calculated BEFORE the main loop, using simple formula.

#### Main Simulation Loop (Lines 253-326)

**Monthly Savings/Withdrawal** (Lines 257-263):
```javascript
if (initialMonthlySavings !== 0) {
  const yearsPassed = loopDate.getFullYear() - startDate.getFullYear()
  const currentMonthlySavings = initialMonthlySavings * Math.pow((1 + savingsRateIncrease), yearsPassed)
  btcHoldings += currentMonthlySavings / currentPrice
  totalSavings += currentMonthlySavings
  savingsInCycle += currentMonthlySavings
}
```

**Dynamic LTV Strategy** (Lines 265-277):
```javascript
if (strategyType === 'dynamicLtv' && loopDate.getTime() > startDate.getTime()) {
  // 1. Accrue interest
  loanBalance *= (1 + (interestRate / 12))
  
  // 2. Calculate target loan
  const targetLoan = btcHoldings * currentPrice * targetLtv
  const amountToBorrow = targetLoan - loanBalance
  
  // 3. If need more, borrow and buy BTC
  if (amountToBorrow > 0) {
    const netToInvest = amountToBorrow * (1 - loanFee)
    if(netToInvest > 0) {
      purchasedBtc = netToInvest / currentPrice
      btcHoldings += purchasedBtc
      btcPurchasedInYear += purchasedBtc
    }
    loanBalance = targetLoan
  }
}
```

**Fixed Term Strategy** (Lines 278-297):
```javascript
else if (strategyType === 'fixedTerm' && loopDate.getTime() >= nextActionDate.getTime()) {
  // 1. Calculate full interest for term
  const interestDueForTerm = loanBalance * interestRate * (loanDuration / 12)
  const debtToRepay = loanBalance + interestDueForTerm
  
  // 2. Calculate new loan
  const collateralValueOnAction = btcHoldings * currentPrice
  const targetLoan = collateralValueOnAction * targetLtv
  const amountToBorrow = targetLoan - debtToRepay
  
  // 3. Borrow and buy BTC if positive
  purchasedBtc = 0
  if (amountToBorrow > 0) {
    purchasedBtc = (amountToBorrow * (1 - loanFee)) / currentPrice
    btcHoldings += purchasedBtc
    loanBalance = targetLoan
  }
  
  // 4. Record rollover event
  // ... table row insertion ...
  
  // 5. Set next rollover date
  nextActionDate.setMonth(nextActionDate.getMonth() + loanDuration)
}
```

**Liquidation Check** (Lines 299-306):
```javascript
const collateralValue = btcHoldings * currentPrice
const currentLtv = (collateralValue > 0) ? loanBalance / collateralValue : 0
if (currentLtv >= liquidationLtv) {
  // Insert liquidation row and break
  break
}
```

## Component Update Requirements

### 1. RollingLoanStrategy.ts

**Current Issues**:
- Uses `LoanRolloverCalculationService` for complex calculations
- Uses `loanAmountPercent` instead of `targetLtv`
- Cash generation mode uses 90% of excess proceeds
- Doesn't integrate monthly savings/withdrawals

**Required Changes**:

#### A. Add Strategy Type Support
```typescript
interface StrategyExecutionParams {
  // ... existing ...
  rollingLoanStrategyType?: 'dynamic' | 'fixed' // NEW
  annualSavingsIncrease?: number // NEW (percentage)
}
```

#### B. Simplify makeDecision() Method
```typescript
makeDecision(context: StrategyContext): StrategyDecision {
  const { month, btcPrice, totalBtcAmount, activeLoans, params } = context
  
  // 1. Apply monthly savings/withdrawals FIRST
  const yearsPassed = Math.floor(month / 12)
  const currentMonthlyFlow = params.monthlyWithdrawalAmount * 
    Math.pow(1 + (params.annualSavingsIncrease || 0), yearsPassed)
  
  // This will be applied by StrategyExecutionService
  
  // 2. Check if initial loan or rollover
  if (activeLoans.length === 0) {
    return this.handleInitialLoan(context)
  }
  
  // 3. Handle based on strategy type
  if (params.rollingLoanStrategyType === 'fixed') {
    return this.handleFixedTermStrategy(context)
  } else {
    return this.handleDynamicLtvStrategy(context)
  }
}
```

#### C. Implement Dynamic LTV Strategy
```typescript
private handleDynamicLtvStrategy(context: StrategyContext): StrategyDecision {
  const { btcPrice, totalBtcAmount, activeLoans, params } = context
  
  // 1. Calculate current loan balance with accrued interest
  const monthlyInterestRate = params.annualInterestRate / 100 / 12
  let currentLoanBalance = 0
  activeLoans.forEach(loan => {
    currentLoanBalance += loan.repaymentAmount * (1 + monthlyInterestRate)
  })
  
  // 2. Calculate target loan
  const collateralValue = totalBtcAmount * btcPrice
  const targetLtv = params.riskManagement.targetLtv / 100
  const targetLoan = collateralValue * targetLtv
  
  // 3. Calculate amount to borrow
  const amountToBorrow = targetLoan - currentLoanBalance
  
  if (amountToBorrow <= 0) {
    // No borrowing needed
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: "LTV below target, no action needed"
    }
  }
  
  // 4. Calculate net proceeds after fees
  const loanFee = params.loanOriginationFeePercent / 100
  const netProceeds = amountToBorrow * (1 - loanFee)
  
  // 5. Determine action based on BTC accumulation mode
  if (params.btcAccumulation) {
    // Reinvest in BTC
    const investmentMultiplier = netProceeds / collateralValue
    return {
      allowInvestment: true,
      investmentMultiplier,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: `Dynamic LTV reset: borrowing $${Math.round(amountToBorrow)} to maintain ${targetLtv * 100}% LTV`
    }
  } else {
    // Cash generation mode - use specified withdrawal amount
    const withdrawalAmount = params.monthlyWithdrawalAmount < 0 
      ? Math.abs(params.monthlyWithdrawalAmount) 
      : 0
    
    return {
      allowInvestment: true,
      investmentMultiplier: netProceeds / collateralValue,
      allowWithdrawal: withdrawalAmount > 0,
      withdrawalAmount,
      reasoning: `Dynamic LTV reset: borrowing $${Math.round(amountToBorrow)}, withdrawing $${Math.round(withdrawalAmount)}`
    }
  }
}
```

#### D. Implement Fixed Term Strategy
```typescript
private handleFixedTermStrategy(context: StrategyContext): StrategyDecision {
  const { month, btcPrice, totalBtcAmount, activeLoans, params } = context
  
  // 1. Check if any loans are maturing this month
  const maturingLoans = activeLoans.filter(loan => loan.maturityMonth === month)
  
  if (maturingLoans.length === 0) {
    // No rollover this month
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: "No loans maturing this month"
    }
  }
  
  // 2. Calculate total debt to repay (principal + full term interest)
  const totalPrincipal = maturingLoans.reduce((sum, loan) => sum + loan.principal, 0)
  const annualInterestRate = params.annualInterestRate / 100
  const loanTermYears = params.loanTermMonths / 12
  const interestDue = totalPrincipal * annualInterestRate * loanTermYears
  const debtToRepay = totalPrincipal + interestDue
  
  // 3. Calculate new target loan
  const collateralValue = totalBtcAmount * btcPrice
  const targetLtv = params.riskManagement.targetLtv / 100
  const targetLoan = collateralValue * targetLtv
  
  // 4. Calculate amount to borrow
  const amountToBorrow = targetLoan - debtToRepay
  
  if (amountToBorrow <= 0) {
    // Can't maintain target LTV - forced exceedance scenario
    return {
      allowInvestment: false,
      investmentMultiplier: 0,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: `Rollover: repaying $${Math.round(debtToRepay)}, insufficient collateral for new loan`
    }
  }
  
  // 5. Calculate net proceeds
  const loanFee = params.loanOriginationFeePercent / 100
  const netProceeds = amountToBorrow * (1 - loanFee)
  
  // 6. Return decision based on accumulation mode
  if (params.btcAccumulation) {
    const investmentMultiplier = netProceeds / collateralValue
    return {
      allowInvestment: true,
      investmentMultiplier,
      allowWithdrawal: false,
      withdrawalAmount: 0,
      reasoning: `Rollover: repaying $${Math.round(debtToRepay)}, borrowing $${Math.round(targetLoan)}, reinvesting $${Math.round(netProceeds)}`
    }
  } else {
    const withdrawalAmount = params.monthlyWithdrawalAmount < 0 
      ? Math.abs(params.monthlyWithdrawalAmount) 
      : 0
    
    return {
      allowInvestment: true,
      investmentMultiplier: netProceeds / collateralValue,
      allowWithdrawal: withdrawalAmount > 0,
      withdrawalAmount,
      reasoning: `Rollover: repaying $${Math.round(debtToRepay)}, borrowing $${Math.round(targetLoan)}, withdrawing $${Math.round(withdrawalAmount)}`
    }
  }
}
```

### 2. StrategyExecutionService.ts

**Required Changes**:

#### A. Monthly Savings/Withdrawal Integration
```typescript
// In main simulation loop, BEFORE strategy decision
const yearsPassed = Math.floor(month / 12)
const annualIncrease = params.annualSavingsIncrease || 0
const currentMonthlyFlow = params.monthlyWithdrawalAmount * 
  Math.pow(1 + annualIncrease, yearsPassed)

// Apply to BTC holdings
if (currentMonthlyFlow !== 0) {
  const btcChange = currentMonthlyFlow / btcPrice
  totalBtcAmount += btcChange
  
  // Track in monthly result
  monthlyResult.monthlySavingsApplied = currentMonthlyFlow
  monthlyResult.btcPurchased = btcChange > 0 ? btcChange : 0
}
```

#### B. Interest Accrual (Dynamic Mode)
```typescript
// For dynamic strategy, accrue interest monthly
if (params.rollingLoanStrategyType === 'dynamic' && activeLoans.length > 0) {
  const monthlyInterestRate = params.annualInterestRate / 100 / 12
  
  activeLoans.forEach(loan => {
    const interestThisMonth = loan.repaymentAmount * monthlyInterestRate
    loan.repaymentAmount += interestThisMonth
    
    // Track in monthly result
    monthlyResult.interestAccrued = (monthlyResult.interestAccrued || 0) + interestThisMonth
  })
}
```

### 3. BtcAccumulationCard.tsx

**Required Changes**:

Update descriptions to clarify:
- **Accumulation Mode**: "All loan proceeds are automatically reinvested into Bitcoin to grow your holdings"
- **Cash Generation Mode**: "Take monthly withdrawals as specified in Financial Flow settings. Loan proceeds cover withdrawals and maintain target LTV."

Remove any references to "90% of excess proceeds" or automatic withdrawal calculations.

### 4. FinancialFlowCard.tsx

**Required Changes**:

Add annual increase rate parameter:
```typescript
<div className="space-y-2">
  <Label htmlFor="annualSavingsIncrease">
    Annual Savings/Withdrawal Increase (%)
    <HybridTooltip>
      <HybridTooltipContent>
        <p>Compound annual increase applied to monthly savings or withdrawals.</p>
        <p>Example: 10% means your monthly amount increases by 10% each year.</p>
      </HybridTooltipContent>
    </HybridTooltip>
  </Label>
  <NumberInput
    id="annualSavingsIncrease"
    value={params.annualSavingsIncrease || 0}
    onChange={(value) => setParams(prev => ({ ...prev, annualSavingsIncrease: value }))}
    min={0}
    max={50}
    step={1}
  />
</div>
```

### 5. Results Tab Components

#### ResultsSummary.tsx
**Calculations**:
- Final Portfolio Value: `results[results.length - 1].portfolioValue`
- Net Worth: `results[results.length - 1].netWorth`
- Total BTC Purchased: `results.reduce((sum, r) => sum + (r.btcPurchased || 0), 0)`
- Total Savings: `results.reduce((sum, r) => sum + (r.monthlySavingsApplied || 0), 0)`
- Average LTV: `results.reduce((sum, r) => sum + r.currentLtv, 0) / results.length`

#### PortfolioValueChart.tsx
**Data Points**:
```typescript
const chartData = results.map(r => ({
  month: r.month,
  portfolioValue: r.portfolioValue,
  netWorth: r.netWorth,
  totalDebt: r.totalDebt
}))
```

#### DebtCollateralChart.tsx
**Data Points**:
```typescript
const chartData = results.map(r => ({
  month: r.month,
  ltv: r.currentLtv,
  targetLtv: params.riskManagement.targetLtv,
  liquidationLtv: params.riskManagement.liquidationLtv,
  loanCount: r.activeLoans.length
}))
```

#### CashFlowChart.tsx
**Data Points**:
```typescript
const chartData = results.map(r => ({
  month: r.month,
  savings: r.monthlySavingsApplied > 0 ? r.monthlySavingsApplied : 0,
  withdrawals: r.monthlySavingsApplied < 0 ? Math.abs(r.monthlySavingsApplied) : 0,
  loanProceeds: r.loanRollover?.newLoanAmount || 0,
  btcPurchases: (r.btcPurchased || 0) * r.btcPrice,
  netCashFlow: r.monthlySavingsApplied + (r.loanRollover?.excessProceeds || 0)
}))
```

## Implementation Priority

### High Priority (Core Functionality)
1. RollingLoanStrategy.ts - Strategy logic
2. StrategyExecutionService.ts - Execution loop
3. FinancialFlowCard.tsx - Annual increase parameter
4. BtcAccumulationCard.tsx - Description updates

### Medium Priority (Results Display)
5. ResultsSummary.tsx
6. PortfolioValueChart.tsx
7. DebtCollateralChart.tsx
8. LTVProgressionChart.tsx

### Low Priority (Advanced Features)
9. CashFlowChart.tsx
10. LoanActivityTable.tsx
11. RiskAssessment.tsx
12. EventsAnalysis.tsx

## Testing Approach

### Unit Tests
- Test dynamic LTV calculation
- Test fixed term rollover calculation
- Test monthly savings with annual increase
- Test cash generation withdrawal logic

### Integration Tests
- Run full simulation with dynamic strategy
- Run full simulation with fixed term strategy
- Compare results with HTML prototype
- Verify all Results tab components display correct data

### Manual Testing
- Test with positive monthly savings
- Test with negative monthly withdrawals
- Test with 0% annual increase
- Test with 10% annual increase
- Test BTC accumulation mode
- Test cash generation mode
- Verify liquidation detection

## Success Metrics

1. **Calculation Accuracy**: Results match HTML prototype within 0.1%
2. **Mode Switching**: Both accumulation and cash generation work correctly
3. **Annual Increases**: Compound increases apply correctly
4. **Results Display**: All charts and tables show accurate data
5. **Test Coverage**: >90% code coverage with passing tests

