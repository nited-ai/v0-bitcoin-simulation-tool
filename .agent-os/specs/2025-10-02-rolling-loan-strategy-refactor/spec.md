# Spec Requirements Document

> Spec: Create New Dynamic Rolling Loan Strategy
> Created: 2025-10-02
> Updated: 2025-10-02 (User Feedback Incorporated)
> Status: Planning

## Overview

Create a new Dynamic Rolling Loan Strategy implementation from scratch that matches the exact functionality demonstrated in the working HTML prototype (`docs/ROLLING LOAN STRATEGY.html`). This new strategy will be an independent microservice that automatically selects between Dynamic LTV (infinite loan term) and Fixed Term (specific loan term) approaches based on the existing `loanTermMonths` parameter. The implementation includes monthly savings with annual increases and updates all Results tab components and calculations to display accurate strategy execution data.

**Key Change from Original Plan:** Instead of refactoring the existing `RollingLoanStrategy.ts`, we will create a new `DynamicRollingLoanStrategy.ts` from scratch. This approach avoids technical debt, eliminates architectural conflicts, and follows microservices principles.

## User Stories

### Story 1: Dynamic LTV Strategy User (Infinite Loan Term)

As a Bitcoin holder using the Dynamic LTV strategy, I want the system to automatically reset my loan-to-value ratio to my target percentage every month, so that I can maintain consistent leverage and maximize my Bitcoin accumulation through compound growth.

**Workflow:**
1. User selects "Dynamic Rolling Loan" from strategy dropdown
2. User sets loan term to "Infinity" in Parameters tab (automatically enables Dynamic LTV mode)
3. User sets target LTV (e.g., 15%)
4. User configures monthly savings amount with annual increase rate
5. System creates initial loan at Month 0
6. Each month: System applies savings, accrues interest, resets LTV to target, purchases BTC with proceeds
7. User views detailed monthly results showing BTC purchased, interest accrued, and LTV progression

**Problem Solved:** Eliminates manual loan management and ensures consistent leverage throughout market cycles.

**Note:** Strategy automatically uses Dynamic LTV approach when loan term is set to Infinity.

### Story 2: Fixed Term Strategy User (Specific Loan Term)

As a conservative Bitcoin investor, I want to use fixed-term loans that only rollover at maturity, so that I can minimize transaction fees and have predictable loan management dates.

**Workflow:**
1. User selects "Dynamic Rolling Loan" from strategy dropdown
2. User sets loan term to specific duration (e.g., 12 months) in Parameters tab (automatically enables Fixed Term mode)
3. User sets target LTV (e.g., 15%)
4. System creates initial loan at Month 0
5. System applies monthly savings but does NOT accrue interest monthly
6. At maturity: System calculates full term interest, rolls over loan, purchases BTC with excess proceeds
7. User views rollover events in results table with detailed cost breakdown

**Problem Solved:** Provides lower-fee alternative for users who prefer less frequent loan management.

**Note:** Strategy automatically uses Fixed Term approach when loan term is set to specific months (3, 6, 12, 18, 24).

### Story 3: Income Generation User

As a Bitcoin retiree, I want to generate monthly income from my Bitcoin holdings using loan proceeds, so that I can live off my Bitcoin without selling it.

**Workflow:**
1. User enables "Cash Generation Mode" in BTC Accumulation settings
2. User specifies monthly withdrawal amount in Financial Flow card (e.g., -$2,500)
3. User sets annual increase rate to account for inflation (e.g., 10%)
4. System executes rolling loan strategy but withdraws specified amount instead of reinvesting
5. User views cash flow chart showing monthly withdrawals increasing annually
6. User monitors sustainability through risk assessment metrics

**Problem Solved:** Enables sustainable income generation from Bitcoin holdings with inflation-adjusted withdrawals.

## Spec Scope

1. **Create DynamicRollingLoanStrategy.ts** - New strategy implementation from scratch matching HTML prototype logic
2. **Automatic Strategy Selection** - Use existing `loanTermMonths` parameter (Infinity = Dynamic LTV, Specific = Fixed Term)
3. **Implement Monthly Savings Integration** - Apply monthly savings/withdrawals with annual compound increases in main simulation loop
4. **Update TypeScript Interfaces** - Add `annualSavingsIncrease` and new MonthlyResult fields (`btcPurchased`, `monthlySavingsApplied`, `interestAccrued`, `loanRollover`)
5. **Fix Cash Generation Mode** - Use user-specified withdrawal amount instead of automatic percentage calculation
6. **Update Results Tab Components and Calculations** - Modify all results components, cards, and calculation services to display accurate strategy execution data
7. **Add Annual Increase Parameter** - New input field in FinancialFlowCard for annual savings/withdrawal increase rate
8. **Strategy Registry Integration** - Register new strategy and optionally deprecate old RollingLoanStrategy
9. **Create Comprehensive Monthly Results Table** - Implement detailed monthly results table matching HTML prototype with 9 columns and German localization
10. **Comprehensive Testing** - Unit tests for strategy logic, integration tests for simulation execution, HTML prototype validation

## Monthly Results Table Component

### Overview

The Monthly Results Table is the primary component for displaying detailed simulation results. It provides a comprehensive month-by-month view of all key metrics, matching the structure and functionality of the HTML prototype (`docs/ROLLING LOAN STRATEGY.html`).

### Table Structure

The table displays 9 columns with German labels, showing monthly progression of the simulation:

| Column # | German Label | English Translation | Data Source | Format |
|----------|--------------|---------------------|-------------|---------|
| 1 | Datum | Date | `MonthlyResult.date` | MM/YYYY |
| 2 | BTC Preis (€) | BTC Price (€) | `MonthlyResult.btcPrice` | €XX,XXX (no decimals) |
| 3 | BTC Bestand | BTC Holdings | `MonthlyResult.totalBtcAmount` | X.XXXX BTC (4 decimals) |
| 4 | Wert (€) | Portfolio Value (€) | `totalBtcAmount × btcPrice` | €XXX,XXX (no decimals) |
| 5 | Gekaufte BTC | BTC Purchased | `MonthlyResult.btcPurchased` | +X.XXXX BTC (4 decimals, green) |
| 6 | Spar./Entn. d. Zyklus (€) | Savings/Withdrawals of Cycle (€) | `MonthlyResult.monthlySavingsApplied` | €X,XXX (no decimals, color-coded) |
| 7 | Akt. LTV (%) | Current LTV (%) | `MonthlyResult.ltv` | XX.XX% (2 decimals) |
| 8 | Schulden (€) | Debt (€) | `MonthlyResult.totalDebt` | €XXX,XXX (no decimals) |
| 9 | Netto BTC | Net BTC | Calculated: `totalBtcAmount - (totalDebt / btcPrice)` | X.XXXX BTC (4 decimals, teal) |

### Data Mapping

**Direct Mappings (from MonthlyResult):**
- `date` → Datum (Column 1)
- `btcPrice` → BTC Preis (Column 2)
- `totalBtcAmount` → BTC Bestand (Column 3)
- `btcPurchased` → Gekaufte BTC (Column 5)
- `monthlySavingsApplied` → Spar./Entn. d. Zyklus (Column 6)
- `ltv` → Akt. LTV (Column 7)
- `totalDebt` → Schulden (Column 8)

**Calculated Values:**
- **Wert (€)** (Column 4): `totalBtcAmount × btcPrice`
- **Netto BTC** (Column 9): `totalBtcAmount - (totalDebt / btcPrice)`
  - This represents the "free" or "unlocked" BTC not used as collateral
  - Equivalent to `freeBtc` field if available in MonthlyResult

### Formatting Requirements

**Currency (€):**
- Format: German locale with Euro symbol
- No decimal places (use `Math.round()`)
- Thousands separator: dot (.)
- Example: €95.234

**BTC Amounts:**
- Format: 4 decimal places
- Suffix: " BTC"
- Example: 1.2345 BTC

**Percentages:**
- Format: 2 decimal places
- Suffix: "%"
- Example: 15.75%

**Dates:**
- Format: MM/YYYY or localized month name
- Example: "01/2025" or "Januar 2025"

### Color Coding

**Gekaufte BTC (Column 5):**
- Always green (`text-green-400` or similar)
- Shows positive BTC acquisition from loan proceeds
- Prefix with "+" sign

**Spar./Entn. d. Zyklus (Column 6):**
- Positive values (savings): Green
- Negative values (withdrawals): Red or neutral
- Zero: Neutral gray

**Netto BTC (Column 9):**
- Teal/cyan color (`text-teal-300` or similar)
- Emphasizes this as a key metric (free BTC available)

### Special Rows

**Liquidation Events:**
- Full-width row spanning all 9 columns
- Red background (`bg-red-900/80`)
- Bold text: "LIQUIDATION am [DATE]"
- Stops table rendering at liquidation point

**Summary Rows (Dynamic LTV Mode):**
- Yearly summary rows showing aggregated data
- Slightly different background color for distinction
- Shows cumulative BTC purchased for the year

### UI/UX Requirements

**Table Container:**
- Responsive design with horizontal scroll on mobile
- Sticky header row for easy column reference
- Alternating row colors for readability
- Hover effects on rows

**Pagination/Scrolling:**
- For long simulations (>120 months), implement pagination or virtual scrolling
- Show month range indicator (e.g., "Showing months 1-12 of 120")
- Jump to specific month functionality

**Empty State:**
- Show placeholder message when no results available
- German text: "Bitte starten Sie die Simulation."
- Center-aligned, gray text

**Loading State:**
- Show loading indicator while simulation runs
- Disable table interaction during loading

### Integration Points

**Data Source:**
- Primary: `results` array from SimulationContext (`MonthlyResult[]`)
- All data comes from strategy execution results

**Localization:**
- Use i18n for all column headers and UI text
- German as primary language
- English translations available

**Component Location:**
- File: `app/simulation/tabs/results/ResultsTable.tsx`
- Parent: Results tab component
- Siblings: ResultsSummary, charts components

### Technical Considerations

**Performance:**
- For large datasets (>1000 months), use virtualization
- Memoize calculated columns (Wert, Netto BTC)
- Debounce sorting/filtering operations

**Accessibility:**
- Proper table semantics (`<table>`, `<thead>`, `<tbody>`)
- Column headers with `scope="col"`
- ARIA labels for screen readers
- Keyboard navigation support

**Testing:**
- Unit tests for data mapping and calculations
- Integration tests with mock MonthlyResult data
- Visual regression tests for formatting
- Test with both Dynamic LTV and Fixed Term mode data

## Out of Scope

- Multi-strategy portfolios (Phase 5 feature)
- Real-time market integration (Phase 5 feature)
- User authentication and saved simulations (Phase 6 feature)
- Database persistence of simulation results (Phase 3 feature)
- Mobile-specific optimizations (Phase 5 feature)
- Refactoring or modifying existing `RollingLoanStrategy.ts` (will create new strategy instead)
- Removing old `RollingLoanStrategy.ts` immediately (can be deprecated gradually)
- Creating new UI components for strategy type selection (uses existing loan term parameter)

## Expected Deliverable

1. **New DynamicRollingLoanStrategy.ts** - Clean, independent strategy implementation from scratch
2. **Working Dynamic LTV Mode** - Monthly interest accrual, automatic LTV reset (when loan term = Infinity)
3. **Working Fixed Term Mode** - Rollover at maturity only, full term interest calculation (when loan term = specific months)
4. **Automatic Strategy Selection** - Strategy behavior determined by existing `loanTermMonths` parameter
5. **Monthly Savings Integration** - Savings/withdrawals applied every month with annual compound increases
6. **Updated Results Tab** - All components, cards, and calculations display accurate data from new strategy execution
7. **Annual Increase Input** - New parameter in Financial Flow card with helpful tooltips
8. **Strategy Registry Integration** - New strategy registered and available in strategy dropdown
9. **Comprehensive Monthly Results Table** - Detailed 9-column table with German localization matching HTML prototype
10. **Passing Test Suite** - All unit and integration tests pass with >90% code coverage
11. **Updated Documentation** - Developer guide, user help text, and migration notes

## Success Criteria

- [ ] New `DynamicRollingLoanStrategy.ts` created as independent microservice
- [ ] Dynamic LTV mode (Infinity loan term) resets LTV monthly and matches HTML prototype calculations within 0.1%
- [ ] Fixed Term mode (specific loan term) rolls over only at maturity with correct interest calculation
- [ ] Strategy automatically selects mode based on `loanTermMonths` parameter (no separate selector needed)
- [ ] Monthly savings are applied with annual compound increases matching HTML prototype
- [ ] Cash Generation Mode uses user-specified withdrawal amount (not automatic percentage)
- [ ] All Results tab components, cards, and calculations display accurate data from strategy execution
- [ ] Annual increase parameter is functional and persists in SimulationContext
- [ ] New strategy registered in StrategyRegistry and available in dropdown
- [ ] Monthly Results Table displays all 9 columns with correct data mapping and German labels
- [ ] Table formatting matches HTML prototype (currency, BTC, percentages)
- [ ] Netto BTC calculation is accurate (totalBtcAmount - locked collateral)
- [ ] All existing tests pass and new tests achieve >90% coverage
- [ ] No breaking changes to existing functionality (old strategy remains available)
- [ ] Build completes without errors (`pnpm build` succeeds)
- [ ] Type checking passes without errors (`pnpm type-check` succeeds)

## Related Documents

- **Specification Review & Updates:** @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/SPECIFICATION_REVIEW_AND_UPDATES.md
- **Technical Specification:** @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/sub-specs/technical-spec.md
- **Tests Specification:** @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/sub-specs/tests.md
- **Tasks Breakdown:** @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/tasks.md
- **Phase 1 Review Report:** @docs/PHASE1_SPECIFICATION_REVIEW_REPORT.md
- **HTML Prototype:** @docs/ROLLING LOAN STRATEGY.html

## Implementation Notes

1. **Create New Strategy:** Build `DynamicRollingLoanStrategy.ts` from scratch, do NOT modify existing `RollingLoanStrategy.ts`
2. **Use Existing Parameter:** Strategy mode determined by `loanTermMonths` (Infinity = Dynamic, Specific = Fixed Term)
3. **Follow TDD Approach:** Write tests first, then implement functionality
4. **Incremental Implementation:** Complete tasks in order, verify tests pass after each task
5. **Continuous Validation:** Run full test suite after each major change
6. **HTML Prototype Reference:** Always compare calculations with HTML prototype
7. **Microservices Principle:** New strategy should be independent and self-contained
8. **Backward Compatibility:** Old `RollingLoanStrategy` remains available (can be deprecated later)
9. **Code Review:** Request review after completing each major phase (strategy creation, monthly savings, results tab)

