# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/spec.md

> Created: 2025-10-02
> Updated: 2025-10-02 (User Feedback Incorporated)
> Version: 1.1.0

## Test Coverage

### Unit Tests

#### DynamicRollingLoanStrategy.ts (NEW STRATEGY)

**Test File:** `src/modules/strategies/implementations/__tests__/DynamicRollingLoanStrategy.test.ts`

**Initial Loan Tests:**
- `creates initial loan with correct BTC purchase amount`
- `calculates correct loan balance after initial purchase`
- `uses correct investment multiplier for initial loan`
- `handles zero BTC amount gracefully`
- `handles negative BTC amount gracefully`

**Automatic Mode Selection Tests:**
- `selects Dynamic LTV mode when loanTermMonths is Infinity`
- `selects Fixed Term mode when loanTermMonths is specific number`
- `handles mode switching correctly`

**Dynamic LTV Mode Tests (Infinite Loan Term):**
- `skips Month 0 (initial loan already created)`
- `accrues monthly interest correctly when loan term is Infinity`
- `resets LTV to target percentage`
- `calculates correct amount to borrow`
- `applies loan fees correctly`
- `returns correct investment multiplier`
- `handles case when LTV already at target`
- `handles case when LTV exceeds target (no borrowing)`
- `updates existing loan repayment amount`
- `does NOT accrue interest when loan term is specific months`

**Fixed Term Mode Tests (Specific Loan Term):**
- `does nothing when loan not maturing`
- `calculates full term interest correctly`
- `rolls over loan at maturity month`
- `handles forced exceedance scenario`
- `creates new loan with correct maturity date`
- `calculates excess proceeds correctly`
- `applies loan fees to new loan`
- `respects loan term from parameters (3, 6, 12, 18, 24 months)`

**BTC Accumulation Mode Tests:**
- `reinvests all proceeds when btcAccumulation = true`
- `does not withdraw when btcAccumulation = false`
- `returns correct reasoning messages`

**Edge Cases:**
- `handles liquidation scenario`
- `handles zero interest rate`
- `handles zero loan fee`
- `handles very high LTV (near liquidation)`
- `handles price drops during simulation`

#### StrategyExecutionService.ts

**Test File:** `src/modules/strategies/services/__tests__/StrategyExecutionService.test.ts`

**Monthly Savings Integration Tests:**
- `applies positive monthly savings correctly`
- `applies negative monthly withdrawals correctly`
- `calculates annual increase correctly (year 0)`
- `calculates annual increase correctly (year 1)`
- `calculates annual increase correctly (year 5)`
- `handles zero monthly savings`
- `handles zero annual increase`
- `tracks monthlySavingsApplied in monthly result`

**Interest Accrual Tests:**
- `accrues interest monthly when loan term is Infinity (Dynamic LTV mode)`
- `does not accrue interest monthly when loan term is specific months (Fixed Term mode)`
- `tracks interestAccrued in monthly result for Dynamic LTV mode`
- `handles multiple months of interest accrual correctly`
- `calculates full term interest at rollover for Fixed Term mode`

**Loan Management Tests:**
- `creates initial loan at Month 0`
- `maintains single loan for dynamic strategy`
- `replaces loan at maturity for fixed term strategy`
- `tracks btcPurchased in monthly result`
- `tracks loanRollover in monthly result`

**Price Projection Integration Tests:**
- `uses projected prices from price projection`
- `handles missing price data gracefully`
- `interpolates between monthly data points`

### Integration Tests

#### End-to-End Dynamic LTV Mode Simulation (Infinite Loan Term)

**Test File:** `src/modules/strategies/__tests__/integration/DynamicLtvModeSimulation.test.ts`

**Scenario 1: Basic Dynamic LTV Mode (12 months, Infinity loan term)**
- Initial BTC: 10 BTC
- Initial Price: $100,000
- Target LTV: 15%
- Interest Rate: 8%
- Loan Term: Infinity
- Monthly Savings: $0
- Expected: LTV maintained at ~15% each month, monthly interest accrual

**Scenario 2: Dynamic LTV Mode with Monthly Savings (24 months)**
- Initial BTC: 10 BTC
- Initial Price: $100,000
- Target LTV: 15%
- Interest Rate: 8%
- Loan Term: Infinity
- Monthly Savings: $1,000
- Annual Increase: 10%
- Expected: BTC holdings increase, LTV maintained, monthly interest accrual

**Scenario 3: Dynamic LTV Mode with Withdrawals (12 months)**
- Initial BTC: 10 BTC
- Initial Price: $100,000
- Target LTV: 15%
- Interest Rate: 8%
- Loan Term: Infinity
- Monthly Withdrawals: -$2,500
- Annual Increase: 10%
- Expected: BTC holdings decrease, LTV maintained, monthly interest accrual

#### End-to-End Fixed Term Mode Simulation (Specific Loan Term)

**Test File:** `src/modules/strategies/__tests__/integration/FixedTermModeSimulation.test.ts`

**Scenario 1: Basic Fixed Term Mode (12 months, 6-month term)**
- Initial BTC: 10 BTC
- Initial Price: $100,000
- Target LTV: 15%
- Interest Rate: 8%
- Loan Term: 6 months (specific)
- Expected: Rollovers at months 6 and 12, full term interest calculation

**Scenario 2: Fixed Term Mode with Monthly Savings (24 months)**
- Initial BTC: 10 BTC
- Initial Price: $100,000
- Target LTV: 15%
- Interest Rate: 8%
- Loan Term: 12 months (specific)
- Monthly Savings: $1,000
- Annual Increase: 10%
- Expected: Rollover at month 12, increased collateral, no monthly interest accrual

#### Mode Selection Integration Tests

**Test File:** `src/modules/strategies/__tests__/integration/ModeSelectionSimulation.test.ts`

**Scenario 1: Switching from Infinity to Specific Term**
- Start with Infinity loan term (Dynamic LTV mode)
- Switch to 12 months (Fixed Term mode) mid-simulation
- Expected: Behavior changes appropriately

**Scenario 2: Switching from Specific Term to Infinity**
- Start with 6 months loan term (Fixed Term mode)
- Switch to Infinity (Dynamic LTV mode) mid-simulation
- Expected: Behavior changes appropriately

#### HTML Prototype Validation

**Test File:** `src/modules/strategies/__tests__/integration/HtmlPrototypeValidation.test.ts`

**Test Data:** Extract from HTML prototype with known inputs/outputs

**Validation Tests:**
- `matches HTML prototype initial loan calculation`
- `matches HTML prototype dynamic LTV month 1`
- `matches HTML prototype dynamic LTV month 12`
- `matches HTML prototype monthly savings application`
- `matches HTML prototype annual increase calculation`
- `matches HTML prototype interest accrual`
- `results within 0.1% of HTML prototype`

**Test Data Format:**
```typescript
const htmlTestData = {
  inputs: {
    initialBtc: 10,
    initialPrice: 100000,
    targetLtv: 0.15,
    interestRate: 0.08,
    loanFee: 0,
    monthlySavings: -2500,
    savingsIncrease: 0.10,
    simulationMonths: 12
  },
  expectedOutputs: {
    month0: {
      btcHoldings: 10.15,
      loanBalance: 1522500,
      purchasedBtc: 0.15
    },
    month1: {
      btcHoldings: 10.125,
      loanBalance: 1532675,
      interestAccrued: 10150
    },
    // ... more months
  }
}
```

### Component Tests

#### Strategy Registry Tests

**Test File:** `src/modules/strategies/services/__tests__/StrategyRegistry.test.ts`

- `registers DynamicRollingLoanStrategy successfully`
- `new strategy appears in strategy dropdown`
- `new strategy has correct name and description`
- `new strategy has higher priority than old strategy`
- `can retrieve new strategy by ID`

#### FinancialFlowCard.tsx

**Test File:** `app/simulation/tabs/strategy/__tests__/FinancialFlowCard.test.tsx`

- `renders annual increase input`
- `updates context when annual increase changes`
- `displays tooltip with explanation`
- `validates annual increase range (0-50%)`
- `shows example calculation in tooltip`

#### BtcAccumulationCard.tsx

**Test File:** `app/simulation/tabs/strategy/__tests__/BtcAccumulationCard.test.tsx`

- `displays updated descriptions`
- `does not mention "90% of excess"`
- `mentions Financial Flow settings in Cash Generation mode`
- `toggles between modes correctly`

### Results Tab Component Tests

**Test Files:** `app/simulation/tabs/results/__tests__/[ComponentName].test.tsx`

**For Each Component:**
- `renders with new monthly result fields`
- `displays btcPurchased correctly`
- `displays monthlySavingsApplied correctly`
- `displays interestAccrued correctly (Dynamic LTV mode)`
- `displays loanRollover data correctly (Fixed Term mode)`
- `handles missing optional fields gracefully`
- `distinguishes between Dynamic LTV and Fixed Term mode data`

### Results Tab Calculation Service Tests

**Test File:** `app/simulation/tabs/results/__tests__/ResultsCalculations.test.ts`

- `calculates total BTC purchased correctly`
- `calculates total savings/withdrawals applied correctly`
- `calculates total interest accrued correctly`
- `counts loan rollovers correctly`
- `calculates average LTV correctly`
- `handles Dynamic LTV mode calculations`
- `handles Fixed Term mode calculations`
- `processes new monthly result fields correctly`

## Mocking Requirements

### External Services

**PriceProjectionResult:**
```typescript
const mockPriceProjection: PriceProjectionResult = {
  projectionPoints: [
    { timestamp: Date.now(), price: 100000 },
    { timestamp: Date.now() + 30*24*60*60*1000, price: 105000 },
    // ... more points
  ],
  chartData: { /* ... */ },
  metadata: { /* ... */ }
}
```

**StrategyContext:**
```typescript
const mockContext: StrategyContext = {
  month: 0,
  currentDate: new Date(),
  btcPrice: 100000,
  totalBtcAmount: 10,
  activeLoans: [],
  collateralValue: 1000000,
  debtCapacity: 150000,
  historicalPriceData: [],
  priceProjectionData: mockPriceProjection,
  params: mockParams
}
```

### Time-Based Tests

**Date Mocking:**
```typescript
// Mock Date.now() for consistent test results
vi.spyOn(Date, 'now').mockReturnValue(1704067200000) // 2024-01-01
```

**Annual Increase Calculation:**
```typescript
// Test year transitions
const testYears = [0, 1, 2, 5, 10]
testYears.forEach(year => {
  const month = year * 12
  const expected = initialAmount * Math.pow(1 + increase, year)
  // ... test
})
```

## Test Execution

**Commands:**
- `pnpm test` - Run all tests
- `pnpm test:modules` - Run module-specific tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate coverage report

**Coverage Goals:**
- Overall: >90%
- DynamicRollingLoanStrategy.ts: >95%
- StrategyExecutionService.ts: >90%
- UI Components: >80%
- Calculation Services: >85%

## Continuous Integration

**Pre-commit Checks:**
1. Run all tests
2. Check code coverage
3. Run type checking
4. Run linting

**Pull Request Checks:**
1. All tests must pass
2. Coverage must not decrease
3. Build must succeed
4. Type checking must pass

## Test Data Management

**Fixtures Location:** `src/modules/strategies/__tests__/fixtures/`

**Fixture Files:**
- `htmlPrototypeData.ts` - Test data extracted from HTML prototype
- `mockPriceProjections.ts` - Mock price projection data
- `mockStrategyParams.ts` - Mock strategy parameters
- `expectedResults.ts` - Expected calculation results

**Fixture Format:**
```typescript
export const htmlPrototypeFixture = {
  scenario: 'Dynamic LTV with monthly savings',
  inputs: { /* ... */ },
  expectedMonthlyResults: [
    { month: 0, /* ... */ },
    { month: 1, /* ... */ },
    // ...
  ]
}
```

