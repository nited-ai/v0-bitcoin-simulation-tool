# Rolling Loan Strategy - Implementation Guide

**Date:** 2025-01-27  
**Status:** Ready for Implementation  
**Reference:** `docs/ROLLING LOAN STRATEGY.html`

## Overview

This guide provides a comprehensive roadmap for refactoring the Rolling Loan Strategy to match the exact functionality demonstrated in the working HTML prototype. The implementation is organized into clear phases with detailed specifications for each component.

## Documentation Structure

This implementation consists of four interconnected documents:

### 1. **ROLLING_LOAN_STRATEGY_REFACTOR_SPEC.md**
- **Purpose:** High-level specification and architecture
- **Contents:**
  - Current vs. target implementation comparison
  - Strategy types (Dynamic vs Fixed Term)
  - Calculation formulas
  - Data flow architecture
  - TypeScript interfaces
  - Success criteria

### 2. **ROLLING_LOAN_STRATEGY_COMPONENT_ANALYSIS.md**
- **Purpose:** Detailed component-by-component analysis
- **Contents:**
  - HTML prototype logic breakdown
  - Line-by-line code analysis
  - Component update requirements
  - Implementation examples
  - Testing approach

### 3. **ROLLING_LOAN_STRATEGY_TASK_BREAKDOWN.md**
- **Purpose:** Actionable task list with estimates
- **Contents:**
  - 24 detailed tasks organized by phase
  - Dependencies and priorities
  - Acceptance criteria
  - Time estimates
  - Critical path

### 4. **This Document (ROLLING_LOAN_STRATEGY_IMPLEMENTATION_GUIDE.md)**
- **Purpose:** Quick reference and implementation workflow
- **Contents:**
  - Quick start guide
  - Key decisions and rationale
  - Common pitfalls
  - Verification checklist

## Quick Start

### Prerequisites

1. **Read the HTML Prototype**:
   - File: `docs/ROLLING LOAN STRATEGY.html`
   - Focus on lines 174-340 (calculation logic)
   - Understand the two strategy types

2. **Review Current Implementation**:
   - File: `src/modules/strategies/implementations/RollingLoanStrategy.ts`
   - Identify differences from HTML prototype
   - Note areas requiring refactoring

3. **Understand Data Flow**:
   - Parameters Tab → Price Projection Tab → Strategy Tab → Results Tab
   - Price data comes from Price Projection tab (NOT historical)
   - Monthly results flow to all Results tab components

### Implementation Workflow

#### Step 1: Update TypeScript Interfaces (1-2 hours)
**Tasks:** RLS-001, RLS-002

1. Open `src/modules/strategies/types/index.ts`
2. Add to `StrategyExecutionParams`:
   ```typescript
   rollingLoanStrategyType?: 'dynamic' | 'fixed'
   annualSavingsIncrease?: number
   ```
3. Add to `MonthlyResult`:
   ```typescript
   btcPurchased?: number
   monthlySavingsApplied?: number
   interestAccrued?: number
   loanRollover?: {
     oldLoanAmount: number
     newLoanAmount: number
     excessProceeds: number
   }
   ```

#### Step 2: Refactor RollingLoanStrategy (8-10 hours)
**Tasks:** RLS-003, RLS-004, RLS-005, RLS-006

1. **Simplify Initial Loan** (RLS-003):
   - Remove complex calculation service calls
   - Use simple formula from HTML prototype
   - Test with unit tests

2. **Implement Dynamic LTV Strategy** (RLS-004):
   - Create `handleDynamicLtvStrategy()` method
   - Monthly interest accrual
   - Target LTV reset
   - Test with unit tests

3. **Implement Fixed Term Strategy** (RLS-005):
   - Create `handleFixedTermStrategy()` method
   - Rollover at maturity only
   - Full term interest calculation
   - Test with unit tests

4. **Update makeDecision()** (RLS-006):
   - Route to appropriate strategy handler
   - Remove old rollover service calls
   - Test with unit tests

#### Step 3: Update StrategyExecutionService (3-4 hours)
**Tasks:** RLS-007, RLS-008

1. **Add Monthly Savings Integration** (RLS-007):
   - Calculate annual compound increase
   - Apply to BTC holdings
   - Track in monthly result

2. **Add Interest Accrual** (RLS-008):
   - For dynamic strategy only
   - Monthly interest on active loans
   - Track in monthly result

#### Step 4: Update UI Components (5-6 hours)
**Tasks:** RLS-009, RLS-010, RLS-011, RLS-012

1. **Create Strategy Type Selector** (RLS-009):
   - New component for Dynamic vs Fixed Term
   - Conditional loan duration input
   - Info boxes and tooltips

2. **Update RollingLoanConfigCard** (RLS-010):
   - Integrate strategy type selector
   - Update layout

3. **Update BtcAccumulationCard** (RLS-011):
   - Clarify descriptions
   - Remove "90% of excess" references

4. **Update FinancialFlowCard** (RLS-012):
   - Add annual increase parameter
   - Add helpful tooltips

#### Step 5: Update Results Tab (10-12 hours)
**Tasks:** RLS-013 through RLS-020

Update each Results tab component to use new monthly result fields:
- ResultsSummary
- PortfolioValueChart
- DebtCollateralChart
- LTVProgressionChart
- CashFlowChart
- LoanActivityTable
- RiskAssessment
- EventsAnalysis

#### Step 6: Testing & Validation (10-12 hours)
**Tasks:** RLS-021, RLS-022, RLS-023, RLS-024

1. **Unit Tests** (RLS-021):
   - Test all strategy methods
   - Test edge cases
   - Achieve >90% coverage

2. **Integration Tests** (RLS-022):
   - End-to-end simulations
   - Compare with HTML prototype
   - Verify Results tab data

3. **Documentation** (RLS-023):
   - Update all docs
   - Add examples
   - Update help text

4. **Manual Testing** (RLS-024):
   - Test all scenarios
   - Verify against HTML prototype
   - Check user experience

## Key Decisions & Rationale

### 1. Why Two Strategy Types?

**Dynamic LTV Strategy:**
- **Use Case:** Active management, frequent rebalancing
- **Behavior:** Monthly LTV reset to target
- **Pros:** Maintains consistent leverage, adapts to price changes
- **Cons:** More frequent transactions, higher fees

**Fixed Term Strategy:**
- **Use Case:** Passive management, lower fees
- **Behavior:** Rollover only at maturity
- **Pros:** Lower transaction costs, simpler management
- **Cons:** LTV drifts between rollovers

### 2. Why Simplify Initial Loan Calculation?

**Old Approach:**
- Used `CentralizedLoanCalculationService`
- Complex fee calculations
- Multiple service calls

**New Approach:**
- Simple formula: `purchasedBtc = (btcHoldings * btcPrice * targetLtv * (1 - loanFee)) / btcPrice`
- Matches HTML prototype exactly
- Easier to understand and maintain

**Rationale:** The HTML prototype works correctly with the simple formula. Complexity doesn't add value here.

### 3. Why Integrate Monthly Savings in Strategy Execution?

**Old Approach:**
- Handled separately in Financial Flow card
- Not integrated with strategy decisions

**New Approach:**
- Applied every month in simulation loop
- Annual compound increase
- Affects collateral value for loan calculations

**Rationale:** Monthly savings/withdrawals directly impact available collateral and should be part of the core simulation loop.

### 4. Why Fix Cash Generation Mode?

**Old Approach:**
- Automatically withdrew 90% of excess proceeds
- Ignored user-specified withdrawal amount

**New Approach:**
- Uses `params.monthlyWithdrawalAmount` from Financial Flow card
- User has full control over withdrawal amount

**Rationale:** Users should specify their desired withdrawal amount, not have it calculated automatically.

## Common Pitfalls

### Pitfall 1: Using Historical Prices Instead of Projected Prices
**Problem:** Strategy should use projected prices from Price Projection tab, not historical data.
**Solution:** Always use `priceProjection` from SimulationContext.

### Pitfall 2: Accruing Interest for Fixed Term Strategy
**Problem:** Fixed term strategy should NOT accrue interest monthly.
**Solution:** Only accrue interest for dynamic strategy. Fixed term calculates full interest at rollover.

### Pitfall 3: Forgetting Annual Savings Increase
**Problem:** Monthly savings/withdrawals should increase annually.
**Solution:** Apply compound increase: `currentAmount = initialAmount * Math.pow(1 + increase, yearsPassed)`

### Pitfall 4: Incorrect LTV Calculation
**Problem:** LTV = debt / collateral, not collateral / debt.
**Solution:** Always use `loanBalance / collateralValue * 100`

### Pitfall 5: Not Tracking Monthly Result Fields
**Problem:** Results tab components need new fields to display data.
**Solution:** Always populate `btcPurchased`, `monthlySavingsApplied`, `interestAccrued` in monthly results.

## Verification Checklist

### Core Functionality
- [ ] Initial loan calculation matches HTML prototype
- [ ] Dynamic LTV strategy resets monthly
- [ ] Fixed term strategy rolls over at maturity
- [ ] Monthly savings applied with annual increases
- [ ] Interest accrues correctly (dynamic only)
- [ ] BTC accumulation mode reinvests proceeds
- [ ] Cash generation mode uses specified withdrawal
- [ ] Liquidation detection works

### UI Components
- [ ] Strategy type selector works
- [ ] Loan duration shows only for fixed term
- [ ] BTC accumulation descriptions are clear
- [ ] Annual increase parameter added to Financial Flow
- [ ] All tooltips are helpful

### Results Tab
- [ ] ResultsSummary shows correct metrics
- [ ] PortfolioValueChart displays correct data
- [ ] DebtCollateralChart shows LTV progression
- [ ] LTVProgressionChart highlights events
- [ ] CashFlowChart shows all flows
- [ ] LoanActivityTable lists all events
- [ ] RiskAssessment calculates risk correctly
- [ ] EventsAnalysis tracks all events

### Testing
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing completed
- [ ] Results match HTML prototype within 0.1%
- [ ] Code coverage >90%

### Documentation
- [ ] Strategy documentation updated
- [ ] Developer guide updated
- [ ] User help text updated
- [ ] Migration notes added

## Success Metrics

1. **Calculation Accuracy**: Results match HTML prototype within 0.1%
2. **Mode Switching**: Both accumulation and cash generation work correctly
3. **Annual Increases**: Compound increases apply correctly
4. **Results Display**: All charts and tables show accurate data
5. **Test Coverage**: >90% code coverage with passing tests
6. **User Experience**: Clear UI with helpful tooltips

## Timeline

### Optimistic: 5-6 days
- Experienced developer
- No major blockers
- Minimal debugging needed

### Realistic: 7-9 days
- Normal development pace
- Some debugging and iteration
- Thorough testing

### Conservative: 10-12 days
- Includes learning curve
- Extensive testing and validation
- Documentation and polish

## Next Steps

1. **Review all documentation**:
   - Read ROLLING_LOAN_STRATEGY_REFACTOR_SPEC.md
   - Read ROLLING_LOAN_STRATEGY_COMPONENT_ANALYSIS.md
   - Read ROLLING_LOAN_STRATEGY_TASK_BREAKDOWN.md

2. **Set up development environment**:
   - Ensure all dependencies installed
   - Run existing tests to verify baseline
   - Create feature branch

3. **Start with Phase 1**:
   - Begin with RLS-001 (TypeScript interfaces)
   - Work through tasks sequentially
   - Test after each task

4. **Iterate and validate**:
   - Run tests frequently
   - Compare with HTML prototype
   - Get feedback early

5. **Complete all phases**:
   - Don't skip testing
   - Update documentation
   - Perform thorough validation

## Support & Resources

### Reference Files
- `docs/ROLLING LOAN STRATEGY.html` - Working prototype
- `src/modules/strategies/implementations/RollingLoanStrategy.ts` - Current implementation
- `app/simulation/tabs/strategy/` - Strategy UI components
- `app/simulation/tabs/results/` - Results UI components

### Key Services
- `CentralizedLoanCalculationService` - Loan calculations (may be simplified)
- `StrategyExecutionService` - Main simulation loop
- `SimulationContext` - Global state management

### Testing
- `src/modules/strategies/implementations/__tests__/` - Unit tests
- `pnpm test` - Run all tests
- `pnpm test:modules` - Run module tests

## Conclusion

This implementation guide provides a clear path from the current implementation to the target implementation that matches the HTML prototype. By following the phased approach and using the detailed task breakdown, you can systematically refactor the Rolling Loan Strategy while maintaining code quality and test coverage.

The key to success is:
1. **Understand the HTML prototype** - It's the source of truth
2. **Follow the task sequence** - Dependencies matter
3. **Test continuously** - Catch issues early
4. **Validate against prototype** - Ensure accuracy
5. **Document as you go** - Help future maintainers

Good luck with the implementation!

