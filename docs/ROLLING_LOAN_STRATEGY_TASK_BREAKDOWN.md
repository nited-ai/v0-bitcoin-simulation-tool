# Rolling Loan Strategy - Detailed Task Breakdown

**Date:** 2025-01-27  
**Status:** Ready for Implementation  
**Reference:** `docs/ROLLING LOAN STRATEGY.html`

## Task Organization

Tasks are organized by phase and priority. Each task includes:
- **ID**: Unique task identifier
- **Component**: File or module to modify
- **Description**: What needs to be done
- **Dependencies**: Other tasks that must be completed first
- **Estimated Time**: Time estimate in hours
- **Acceptance Criteria**: How to verify completion

---

## Phase 1: Core Strategy Implementation

### Task 1.1: Update TypeScript Interfaces
**ID:** RLS-001  
**Component:** `src/modules/strategies/types/index.ts`  
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**
Add new fields to `StrategyExecutionParams` interface:
- `rollingLoanStrategyType?: 'dynamic' | 'fixed'`
- `annualSavingsIncrease?: number`

**Acceptance Criteria:**
- [ ] Interface updated with new fields
- [ ] TypeScript compilation succeeds
- [ ] No breaking changes to existing code

**Dependencies:** None

---

### Task 1.2: Update MonthlyResult Interface
**ID:** RLS-002  
**Component:** `src/modules/strategies/types/index.ts`  
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**
Add new fields to `MonthlyResult` interface:
- `btcPurchased?: number`
- `monthlySavingsApplied?: number`
- `interestAccrued?: number`
- `loanRollover?: { oldLoanAmount: number, newLoanAmount: number, excessProceeds: number }`

**Acceptance Criteria:**
- [ ] Interface updated with new fields
- [ ] TypeScript compilation succeeds
- [ ] Fields are optional to maintain backward compatibility

**Dependencies:** None

---

### Task 1.3: Refactor RollingLoanStrategy - Initial Loan
**ID:** RLS-003  
**Component:** `src/modules/strategies/implementations/RollingLoanStrategy.ts`  
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**
Simplify `handleInitialLoan()` method to match HTML prototype:
```typescript
const targetLtv = params.riskManagement.targetLtv / 100
const loanFee = params.loanOriginationFeePercent / 100
const purchasedBtc = (totalBtcAmount * btcPrice * targetLtv * (1 - loanFee)) / btcPrice
const loanBalance = (totalBtcAmount + purchasedBtc) * btcPrice * targetLtv
```

**Acceptance Criteria:**
- [ ] Initial loan calculation matches HTML prototype
- [ ] BTC accumulation mode reinvests proceeds
- [ ] Cash generation mode uses specified withdrawal amount
- [ ] Unit tests pass

**Dependencies:** RLS-001

---

### Task 1.4: Implement Dynamic LTV Strategy
**ID:** RLS-004  
**Component:** `src/modules/strategies/implementations/RollingLoanStrategy.ts`  
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**
Create new method `handleDynamicLtvStrategy()` that:
1. Accrues monthly interest on existing loans
2. Calculates target loan based on current collateral
3. Borrows difference if target > current
4. Returns investment decision

**Acceptance Criteria:**
- [ ] Monthly interest accrual works correctly
- [ ] Target LTV is maintained
- [ ] Excess proceeds calculated correctly
- [ ] BTC accumulation mode reinvests
- [ ] Cash generation mode withdraws specified amount
- [ ] Unit tests pass

**Dependencies:** RLS-001, RLS-003

---

### Task 1.5: Implement Fixed Term Strategy
**ID:** RLS-005  
**Component:** `src/modules/strategies/implementations/RollingLoanStrategy.ts`  
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**
Create new method `handleFixedTermStrategy()` that:
1. Checks for maturing loans
2. Calculates full term interest
3. Calculates new target loan
4. Handles rollover or forced exceedance
5. Returns investment decision

**Acceptance Criteria:**
- [ ] Rollover only occurs at maturity
- [ ] Full term interest calculated correctly
- [ ] Forced exceedance handled properly
- [ ] BTC accumulation mode reinvests
- [ ] Cash generation mode withdraws specified amount
- [ ] Unit tests pass

**Dependencies:** RLS-001, RLS-003

---

### Task 1.6: Update makeDecision() Method
**ID:** RLS-006  
**Component:** `src/modules/strategies/implementations/RollingLoanStrategy.ts`  
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**
Refactor `makeDecision()` to:
1. Route to appropriate strategy handler (dynamic vs fixed)
2. Remove complex rollover calculation service calls
3. Simplify logic flow

**Acceptance Criteria:**
- [ ] Correctly routes to dynamic or fixed strategy
- [ ] Initial loan handled properly
- [ ] No action months handled properly
- [ ] Unit tests pass

**Dependencies:** RLS-004, RLS-005

---

### Task 1.7: Update StrategyExecutionService - Monthly Savings
**ID:** RLS-007  
**Component:** `src/modules/strategies/services/StrategyExecutionService.ts`  
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**
Add monthly savings/withdrawal logic to main simulation loop:
1. Calculate years passed
2. Apply annual compound increase
3. Convert to BTC at current price
4. Update BTC holdings
5. Track in monthly result

**Acceptance Criteria:**
- [ ] Savings applied every month
- [ ] Annual increase calculated correctly
- [ ] BTC holdings updated correctly
- [ ] Monthly result tracks savings amount
- [ ] Integration tests pass

**Dependencies:** RLS-002

---

### Task 1.8: Update StrategyExecutionService - Interest Accrual
**ID:** RLS-008  
**Component:** `src/modules/strategies/services/StrategyExecutionService.ts`  
**Priority:** High  
**Estimated Time:** 1.5 hours

**Description:**
Add monthly interest accrual for dynamic strategy:
1. Check if dynamic strategy
2. Loop through active loans
3. Apply monthly interest rate
4. Update repayment amounts
5. Track in monthly result

**Acceptance Criteria:**
- [ ] Interest accrues monthly for dynamic strategy
- [ ] Interest does NOT accrue for fixed term strategy
- [ ] Repayment amounts updated correctly
- [ ] Monthly result tracks interest amount
- [ ] Integration tests pass

**Dependencies:** RLS-002

---

## Phase 2: UI Component Updates

### Task 2.1: Add Strategy Type Selector
**ID:** RLS-009  
**Component:** `app/simulation/tabs/strategy/RollingLoanStrategyTypeSelector.tsx` (NEW)  
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**
Create new component for selecting strategy type:
- Radio buttons for Dynamic vs Fixed Term
- Conditional loan duration input (only for Fixed Term)
- Info boxes explaining each strategy
- Tooltips with detailed descriptions

**Acceptance Criteria:**
- [ ] Component renders correctly
- [ ] Strategy type selection works
- [ ] Loan duration shows only for Fixed Term
- [ ] Info boxes display helpful information
- [ ] Integrates with SimulationContext

**Dependencies:** RLS-001

---

### Task 2.2: Update RollingLoanConfigCard
**ID:** RLS-010  
**Component:** `app/simulation/tabs/strategy/RollingLoanConfigCard.tsx`  
**Priority:** Medium  
**Estimated Time:** 1.5 hours

**Description:**
Integrate strategy type selector into existing config card:
- Import and render RollingLoanStrategyTypeSelector
- Update layout to accommodate new selector
- Ensure conditional rendering works

**Acceptance Criteria:**
- [ ] Strategy type selector integrated
- [ ] Layout looks clean and organized
- [ ] All existing functionality preserved
- [ ] Component tests pass

**Dependencies:** RLS-009

---

### Task 2.3: Update BtcAccumulationCard Descriptions
**ID:** RLS-011  
**Component:** `app/simulation/tabs/strategy/BtcAccumulationCard.tsx`  
**Priority:** Medium  
**Estimated Time:** 1 hour

**Description:**
Update descriptions to clarify:
- Accumulation Mode: "All loan proceeds are automatically reinvested into Bitcoin"
- Cash Generation Mode: "Take monthly withdrawals as specified in Financial Flow settings"
- Remove references to "90% of excess proceeds"

**Acceptance Criteria:**
- [ ] Descriptions updated
- [ ] No references to automatic withdrawal percentages
- [ ] Clear explanation of both modes
- [ ] Component tests pass

**Dependencies:** None

---

### Task 2.4: Add Annual Increase to FinancialFlowCard
**ID:** RLS-012  
**Component:** `app/simulation/tabs/strategy/FinancialFlowCard.tsx`  
**Priority:** Medium  
**Estimated Time:** 1.5 hours

**Description:**
Add annual savings/withdrawal increase parameter:
- Number input for percentage (0-50%)
- Tooltip explaining compound annual increase
- Example calculation in tooltip
- Update SimulationContext integration

**Acceptance Criteria:**
- [ ] Input field added
- [ ] Tooltip provides clear explanation
- [ ] Value persists in SimulationContext
- [ ] Component tests pass

**Dependencies:** RLS-001

---

## Phase 3: Results Tab Updates

### Task 3.1: Update ResultsSummary Calculations
**ID:** RLS-013  
**Component:** `app/simulation/tabs/results/ResultsSummary.tsx`  
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**
Update all summary calculations to use new monthly result fields:
- Final Portfolio Value
- Net Worth
- Total BTC Purchased
- Total Savings/Withdrawals
- Average LTV

**Acceptance Criteria:**
- [ ] All calculations use correct data sources
- [ ] Values match expected results
- [ ] Formatting is consistent
- [ ] Component tests pass

**Dependencies:** RLS-002, RLS-007, RLS-008

---

### Task 3.2: Update PortfolioValueChart
**ID:** RLS-014  
**Component:** `app/simulation/tabs/results/charts/PortfolioValueChart.tsx`  
**Priority:** Medium  
**Estimated Time:** 1.5 hours

**Description:**
Update chart data to display:
- Portfolio Value (BTC holdings * price)
- Net Worth (portfolio - debt)
- Total Debt

**Acceptance Criteria:**
- [ ] Chart displays correct data
- [ ] Lines are clearly labeled
- [ ] Tooltips show accurate values
- [ ] Chart is responsive

**Dependencies:** RLS-002

---

### Task 3.3: Update DebtCollateralChart
**ID:** RLS-015  
**Component:** `app/simulation/tabs/results/charts/DebtCollateralChart.tsx`  
**Priority:** Medium  
**Estimated Time:** 1.5 hours

**Description:**
Update chart data to display:
- Current LTV (%)
- Target LTV (horizontal line)
- Liquidation LTV (horizontal line)
- Active loan count

**Acceptance Criteria:**
- [ ] Chart displays correct LTV progression
- [ ] Reference lines show target and liquidation
- [ ] Loan count displayed accurately
- [ ] Chart is responsive

**Dependencies:** RLS-002

---

### Task 3.4: Update LTVProgressionChart
**ID:** RLS-016  
**Component:** `app/simulation/tabs/results/charts/LTVProgressionChart.tsx`  
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**
Update chart to highlight:
- Monthly LTV progression
- LTV reset events (Dynamic mode)
- Rollover events (Fixed Term mode)
- Distance to liquidation

**Acceptance Criteria:**
- [ ] Chart displays LTV progression
- [ ] Events are highlighted
- [ ] Distance to liquidation shown
- [ ] Chart is responsive

**Dependencies:** RLS-002

---

### Task 3.5: Update CashFlowChart
**ID:** RLS-017  
**Component:** `app/simulation/tabs/results/charts/CashFlowChart.tsx`  
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**
Update chart to display:
- Monthly savings/withdrawals (with annual increases)
- New loan proceeds
- Loan repayments
- BTC purchases
- Net cash flow

**Acceptance Criteria:**
- [ ] Chart displays all cash flow components
- [ ] Positive and negative flows clearly distinguished
- [ ] Annual increases reflected in data
- [ ] Chart is responsive

**Dependencies:** RLS-002, RLS-007

---

### Task 3.6: Update LoanActivityTable
**ID:** RLS-018  
**Component:** `app/simulation/tabs/results/charts/LoanActivityTable.tsx`  
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**
Update table to display:
- Month
- Event type (Initial, Rollover, Repayment)
- Loan amount
- Interest accrued
- Fees paid
- BTC purchased
- Current LTV

**Acceptance Criteria:**
- [ ] Table displays all loan events
- [ ] Data is accurate
- [ ] Formatting is consistent
- [ ] Table is sortable and filterable

**Dependencies:** RLS-002

---

### Task 3.7: Update RiskAssessment
**ID:** RLS-019  
**Component:** `app/simulation/tabs/results/RiskAssessment.tsx`  
**Priority:** Low  
**Estimated Time:** 1.5 hours

**Description:**
Update risk metrics to include:
- Maximum LTV reached
- Months above 80% LTV
- Liquidation risk score
- Strategy risk level

**Acceptance Criteria:**
- [ ] Risk metrics calculated correctly
- [ ] Visual indicators show risk levels
- [ ] Recommendations are helpful
- [ ] Component tests pass

**Dependencies:** RLS-002

---

### Task 3.8: Update EventsAnalysis
**ID:** RLS-020  
**Component:** `app/simulation/tabs/results/EventsAnalysis.tsx`  
**Priority:** Low  
**Estimated Time:** 1.5 hours

**Description:**
Update events tracking to include:
- Initial loan creation
- Loan rollovers
- LTV resets (Dynamic mode)
- High LTV warnings
- Near-liquidation events

**Acceptance Criteria:**
- [ ] All events tracked correctly
- [ ] Event descriptions are clear
- [ ] Timeline visualization works
- [ ] Component tests pass

**Dependencies:** RLS-002

---

## Phase 4: Testing & Documentation

### Task 4.1: Write Unit Tests for RollingLoanStrategy
**ID:** RLS-021  
**Component:** `src/modules/strategies/implementations/__tests__/RollingLoanStrategy.test.ts`  
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**
Write comprehensive unit tests:
- Initial loan calculation
- Dynamic LTV strategy
- Fixed term strategy
- BTC accumulation mode
- Cash generation mode
- Monthly savings integration
- Liquidation detection

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] Code coverage >90%
- [ ] Edge cases covered
- [ ] Tests are maintainable

**Dependencies:** RLS-006

---

### Task 4.2: Write Integration Tests
**ID:** RLS-022  
**Component:** `src/modules/strategies/__tests__/integration/rolling-loan-integration.test.ts` (NEW)  
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**
Write end-to-end integration tests:
- Full simulation with dynamic strategy
- Full simulation with fixed term strategy
- Comparison with HTML prototype results
- Results tab data verification

**Acceptance Criteria:**
- [ ] All integration tests pass
- [ ] Results match HTML prototype within 0.1%
- [ ] All Results tab components display correct data
- [ ] Tests are maintainable

**Dependencies:** RLS-021, All Phase 3 tasks

---

### Task 4.3: Update Documentation
**ID:** RLS-023  
**Component:** Multiple documentation files  
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**
Update documentation:
- Strategy documentation
- Developer guide
- User-facing help text
- Migration notes

**Acceptance Criteria:**
- [ ] All documentation updated
- [ ] Examples are accurate
- [ ] Screenshots updated if needed
- [ ] Documentation is clear and helpful

**Dependencies:** All implementation tasks

---

### Task 4.4: Manual Testing & Validation
**ID:** RLS-024  
**Component:** Entire application  
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**
Perform comprehensive manual testing:
- Test with positive monthly savings
- Test with negative monthly withdrawals
- Test with 0% annual increase
- Test with 10% annual increase
- Test BTC accumulation mode
- Test cash generation mode
- Verify liquidation detection
- Compare with HTML prototype

**Acceptance Criteria:**
- [ ] All scenarios tested
- [ ] Results match HTML prototype
- [ ] No bugs found
- [ ] User experience is smooth

**Dependencies:** All implementation tasks

---

## Summary

### Total Tasks: 24
### Total Estimated Time: 45.5 hours (~6 days)

### By Priority:
- **High Priority:** 11 tasks (23.5 hours)
- **Medium Priority:** 9 tasks (15 hours)
- **Low Priority:** 4 tasks (7 hours)

### By Phase:
- **Phase 1 (Core):** 8 tasks (16.5 hours)
- **Phase 2 (UI):** 4 tasks (6 hours)
- **Phase 3 (Results):** 8 tasks (12 hours)
- **Phase 4 (Testing):** 4 tasks (11 hours)

### Critical Path:
RLS-001 → RLS-002 → RLS-003 → RLS-004 → RLS-005 → RLS-006 → RLS-007 → RLS-008 → RLS-021 → RLS-022 → RLS-024

### Recommended Implementation Order:
1. Complete all Phase 1 tasks (core strategy)
2. Complete Phase 2 tasks (UI updates)
3. Complete Phase 3 tasks (results display)
4. Complete Phase 4 tasks (testing & validation)

