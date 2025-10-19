# Rolling Loan Strategy Refactor Specification

**Date:** 2025-01-27  
**Status:** Planning Phase  
**Reference:** `docs/ROLLING LOAN STRATEGY.html`

## Executive Summary

This specification outlines the complete refactoring of the Rolling Loan Strategy implementation to match the exact functionality demonstrated in the working HTML prototype (`docs/ROLLING LOAN STRATEGY.html`). The refactor will align the Strategy tab implementation with the proven calculation logic and update all Results tab components to display accurate metrics.

## Current vs. Target Implementation

### Current Implementation Issues

1. **Strategy Logic Mismatch**:
   - Current: Uses `loanAmountPercent` and complex rollover calculations
   - Target: Uses `targetLtv` with simpler monthly reset logic

2. **BTC Accumulation Mode**:
   - Current: Correctly reinvests loan proceeds
   - Issue: Cash Generation Mode uses wrong withdrawal calculation (90% of excess)
   - Target: Should use user-specified withdrawal amount from Financial Flow card

3. **Price Data Source**:
   - Current: Uses price projection from Price Projection tab ✓
   - Target: Continue using projected prices (NOT historical)

4. **Monthly Savings/Withdrawals**:
   - Current: Handled separately in Financial Flow
   - Target: Should be integrated into strategy execution with annual increases

### Target Implementation (from HTML)

#### Strategy Types

**1. Dynamic Credit Line (Dynamische Kreditlinie)**
- Monthly LTV reset to target percentage
- Interest accrues monthly: `loanBalance *= (1 + (interestRate / 12))`
- After interest, reset to target: `targetLoan = btcHoldings * currentPrice * targetLtv`
- If `targetLoan > loanBalance`, borrow difference (minus fees)
- Purchase BTC with net proceeds: `purchasedBtc = netToInvest / currentPrice`

**2. Fixed Term (Feste Laufzeit)**
- Rollover only at loan maturity
- Calculate full interest for term: `interestDueForTerm = loanBalance * interestRate * (loanDuration / 12)`
- Total repayment: `debtToRepay = loanBalance + interestDueForTerm`
- New loan: `targetLoan = collateralValue * targetLtv`
- Borrow: `amountToBorrow = targetLoan - debtToRepay`

#### Initial Loan Calculation

```javascript
// At start (Month 0)
purchasedBtc = (btcHoldings * btcPrice * targetLtv * (1 - loanFee)) / btcPrice
btcHoldings += purchasedBtc
loanBalance = btcHoldings * btcPrice * targetLtv
```

#### Monthly Savings/Withdrawal Integration

```javascript
// Every month (including Month 0 loop)
const yearsPassed = loopDate.getFullYear() - startDate.getFullYear()
const currentMonthlySavings = initialMonthlySavings * Math.pow((1 + savingsRateIncrease), yearsPassed)
btcHoldings += currentMonthlySavings / currentPrice
totalSavings += currentMonthlySavings
```

**Key Points**:
- Positive values = savings (add BTC)
- Negative values = withdrawals (reduce BTC)
- Annual compound increase applied based on years passed

#### Liquidation Check

```javascript
const currentLtv = (collateralValue > 0) ? loanBalance / collateralValue : 0
if (currentLtv >= liquidationLtv) {
  // LIQUIDATION - stop simulation
}
```

## Implementation Plan

### Phase 1: Strategy Tab Refactoring

#### 1.1 Update RollingLoanStrategy.ts

**File:** `src/modules/strategies/implementations/RollingLoanStrategy.ts`

**Changes Required**:

1. **Add Strategy Type Parameter**:
   ```typescript
   // In StrategyExecutionParams interface
   rollingLoanStrategyType?: 'dynamic' | 'fixed' // Default: 'dynamic'
   ```

2. **Refactor makeDecision() Method**:
   - Remove complex rollover calculation service calls
   - Implement simple monthly LTV reset for dynamic mode
   - Implement fixed-term rollover for fixed mode
   - Integrate monthly savings/withdrawals with annual increases

3. **Fix Cash Generation Mode**:
   - Current: `withdrawalAmount: Math.max(0, rolloverResult.excessProceeds * 0.9)`
   - Target: Use `params.monthlyWithdrawalAmount` from Financial Flow card
   - Only withdraw when user has specified a withdrawal amount

4. **Simplify Initial Loan**:
   ```typescript
   // Replace complex calculation with simple formula
   const purchasedBtc = (totalBtcAmount * btcPrice * targetLtv * (1 - loanFee)) / btcPrice
   totalBtcAmount += purchasedBtc
   loanBalance = totalBtcAmount * btcPrice * targetLtv
   ```

#### 1.2 Update BtcAccumulationCard.tsx

**File:** `app/simulation/tabs/strategy/BtcAccumulationCard.tsx`

**Changes Required**:
- Update descriptions to clarify:
  - **Accumulation Mode**: Reinvest ALL loan proceeds into BTC
  - **Cash Generation Mode**: Take withdrawals as specified in Financial Flow card
  - Remove references to "90% of excess proceeds"

#### 1.3 Update FinancialFlowCard.tsx

**File:** `app/simulation/tabs/strategy/FinancialFlowCard.tsx`

**Changes Required**:
- Add annual increase rate parameter (default: 0%)
- Add tooltip explaining:
  - Positive = monthly savings (buy more BTC)
  - Negative = monthly withdrawals (sell BTC or take from loan proceeds)
  - Annual compound increase applies to both savings and withdrawals

#### 1.4 Add RollingLoanStrategyTypeSelector.tsx

**New File:** `app/simulation/tabs/strategy/RollingLoanStrategyTypeSelector.tsx`

**Purpose**: Allow users to choose between Dynamic and Fixed Term strategies

**UI Elements**:
- Radio buttons or toggle for strategy type
- Conditional loan duration input (only for Fixed Term)
- Info boxes explaining each strategy type

### Phase 2: Strategy Execution Service Updates

#### 2.1 Update StrategyExecutionService.ts

**File:** `src/modules/strategies/services/StrategyExecutionService.ts`

**Changes Required**:

1. **Monthly Savings/Withdrawal Integration**:
   ```typescript
   // In main simulation loop
   const yearsPassed = Math.floor(month / 12)
   const currentMonthlyFlow = params.monthlyWithdrawalAmount * 
     Math.pow(1 + (params.annualSavingsIncrease || 0), yearsPassed)
   
   // Apply to BTC holdings
   totalBtcAmount += currentMonthlyFlow / btcPrice
   ```

2. **Loan Interest Accrual** (for Dynamic mode):
   ```typescript
   // Every month after initial loan
   if (activeLoans.length > 0 && strategyType === 'dynamic') {
     activeLoans.forEach(loan => {
       loan.repaymentAmount *= (1 + params.annualInterestRate / 100 / 12)
     })
   }
   ```

3. **Cash Generation Withdrawal**:
   ```typescript
   // When btcAccumulation = false
   if (!params.btcAccumulation && params.monthlyWithdrawalAmount < 0) {
     // Take specified withdrawal amount
     const withdrawalAmount = Math.abs(params.monthlyWithdrawalAmount)
     // Deduct from BTC or loan proceeds
   }
   ```

### Phase 3: Results Tab Component Updates

#### 3.1 ResultsSummary.tsx

**File:** `app/simulation/tabs/results/ResultsSummary.tsx`

**Metrics to Update**:
- Final Portfolio Value: `finalBtcAmount * finalBtcPrice`
- Net Worth: `portfolioValue - totalDebt`
- Total BTC Purchased: Sum of all `btcPurchased` from monthly results
- Total Savings/Withdrawals: Sum of all monthly flows with annual increases
- Average LTV: Mean of monthly LTV values

#### 3.2 PortfolioValueChart.tsx

**File:** `app/simulation/tabs/results/charts/PortfolioValueChart.tsx`

**Data Points**:
- Portfolio Value: `btcHoldings * btcPrice` per month
- Net Worth: `portfolioValue - totalDebt` per month
- Total Debt: Sum of all active loan repayment amounts

#### 3.3 DebtCollateralChart.tsx

**File:** `app/simulation/tabs/results/charts/DebtCollateralChart.tsx`

**Data Points**:
- Current LTV: `totalDebt / portfolioValue * 100`
- Target LTV: User-configured target (horizontal line)
- Liquidation LTV: User-configured liquidation threshold (horizontal line)
- Active Loan Count: Number of active loans per month

#### 3.4 LTVProgressionChart.tsx

**File:** `app/simulation/tabs/results/charts/LTVProgressionChart.tsx`

**Data Points**:
- Monthly LTV progression
- Highlight months where LTV was reset (Dynamic mode)
- Highlight rollover events (Fixed Term mode)
- Show distance to liquidation threshold

#### 3.5 CashFlowChart.tsx

**File:** `app/simulation/tabs/results/charts/CashFlowChart.tsx`

**Data Points**:
- Monthly Savings/Withdrawals: With annual increases
- New Loan Proceeds: Amount borrowed each month
- Loan Repayments: Amount repaid at maturity
- BTC Purchases: Amount reinvested in BTC
- Net Cash Flow: Total in/out per month

#### 3.6 LoanActivityTable.tsx

**File:** `app/simulation/tabs/results/charts/LoanActivityTable.tsx`

**Columns**:
- Month
- Event Type (Initial Loan, Rollover, Repayment)
- Loan Amount
- Interest Accrued
- Fees Paid
- BTC Purchased
- Current LTV

#### 3.7 RiskAssessment.tsx

**File:** `app/simulation/tabs/results/RiskAssessment.tsx`

**Risk Metrics**:
- Maximum LTV Reached
- Months Above 80% LTV
- Liquidation Risk Score
- Volatility Exposure
- Strategy Risk Level

#### 3.8 EventsAnalysis.tsx

**File:** `app/simulation/tabs/results/EventsAnalysis.tsx`

**Events to Track**:
- Initial loan creation
- Loan rollovers (with amounts)
- LTV resets (Dynamic mode)
- High LTV warnings (>80%)
- Near-liquidation events (>90%)

## Data Flow Architecture

### Input Sources

1. **Parameters Tab**:
   - Initial BTC amount
   - Initial BTC price
   - Loan parameters (interest, fees, term, LTV)
   - Risk management (liquidation threshold)

2. **Price Projection Tab**:
   - Projected BTC prices for simulation duration
   - Model: Power Law, Manual, Cycle Repeat, etc.

3. **Strategy Tab**:
   - Strategy type (Dynamic vs Fixed Term)
   - BTC accumulation mode (on/off)
   - Monthly savings/withdrawal amount
   - Annual savings increase rate

### Processing Flow

```
Parameters + Price Projection + Strategy Config
           ↓
  StrategyExecutionService
           ↓
  RollingLoanStrategy.makeDecision()
           ↓
  Monthly Results Array
           ↓
  Results Tab Components
```

### Output Format

**MonthlyResult Interface** (to be enhanced):
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
  events: MonthlyEvent[]
  
  // New fields for Rolling Loan Strategy
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

## TypeScript Interfaces

### New/Updated Interfaces

```typescript
// Strategy Execution Parameters
interface StrategyExecutionParams {
  // ... existing fields ...
  
  // Rolling Loan Strategy specific
  rollingLoanStrategyType?: 'dynamic' | 'fixed'
  annualSavingsIncrease?: number // Percentage (e.g., 10 = 10%)
}

// Monthly Event Types
type MonthlyEventType = 
  | 'INITIAL_LOAN'
  | 'LOAN_ROLLOVER'
  | 'LTV_RESET'
  | 'LIQUIDATION_WARNING'
  | 'NEAR_LIQUIDATION'
  | 'SAVINGS_APPLIED'
  | 'WITHDRAWAL_TAKEN'

interface MonthlyEvent {
  type: MonthlyEventType
  description: string
  amount?: number
  metadata?: Record<string, any>
}
```

## Testing Strategy

### Unit Tests

1. **RollingLoanStrategy.test.ts**:
   - Test dynamic LTV reset logic
   - Test fixed term rollover logic
   - Test monthly savings integration
   - Test cash generation mode
   - Test liquidation detection

2. **StrategyExecutionService.test.ts**:
   - Test monthly simulation loop
   - Test interest accrual
   - Test savings/withdrawal application
   - Test annual increase calculation

### Integration Tests

1. **End-to-End Simulation**:
   - Run complete simulation with Dynamic strategy
   - Run complete simulation with Fixed Term strategy
   - Verify Results tab displays correct values
   - Compare with HTML prototype calculations

## Implementation Checklist

### Strategy Tab
- [ ] Refactor RollingLoanStrategy.ts to match HTML logic
- [ ] Add strategy type selector component
- [ ] Update BtcAccumulationCard descriptions
- [ ] Add annual savings increase to FinancialFlowCard
- [ ] Update RollingLoanConfigCard with new parameters

### Strategy Execution
- [ ] Update StrategyExecutionService monthly loop
- [ ] Implement monthly interest accrual
- [ ] Integrate savings/withdrawals with annual increases
- [ ] Fix cash generation withdrawal logic

### Results Tab
- [ ] Update ResultsSummary calculations
- [ ] Update PortfolioValueChart data
- [ ] Update DebtCollateralChart data
- [ ] Update LTVProgressionChart data
- [ ] Update CashFlowChart data
- [ ] Update LoanActivityTable data
- [ ] Update RiskAssessment metrics
- [ ] Update EventsAnalysis events

### Testing
- [ ] Write unit tests for new strategy logic
- [ ] Write integration tests for simulation
- [ ] Manual testing against HTML prototype
- [ ] Verify all Results tab components

### Documentation
- [ ] Update strategy documentation
- [ ] Update developer guide
- [ ] Add migration notes
- [ ] Update user-facing help text

## Success Criteria

1. **Calculation Accuracy**: Strategy calculations match HTML prototype exactly
2. **Mode Switching**: BTC Accumulation and Cash Generation modes work correctly
3. **Results Display**: All Results tab components show accurate data
4. **Test Coverage**: All tests pass with >90% coverage
5. **User Experience**: Clear UI with helpful tooltips and descriptions

## Timeline Estimate

- **Phase 1** (Strategy Tab): 2-3 days
- **Phase 2** (Execution Service): 1-2 days
- **Phase 3** (Results Tab): 3-4 days
- **Testing & Documentation**: 1-2 days

**Total**: 7-11 days

## Next Steps

1. Review and approve this specification
2. Create detailed task breakdown for each phase
3. Begin Phase 1 implementation
4. Iterate with testing and feedback

