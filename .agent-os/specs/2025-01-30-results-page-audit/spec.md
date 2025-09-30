# Results Page Comprehensive Audit and Fix Specification

> **Created:** 2025-01-30  
> **Status:** Ready for Implementation  
> **Context:** Following completion of rolling loan calculation fixes (Tasks 1-3)

## Overview

This specification outlines a systematic audit of the Bitcoin Simulation Tool's Results page to identify and fix calculation errors, improve user experience, and ensure all components provide meaningful value.

## Background

The Results page is the culmination of the simulation experience, displaying complex financial calculations and projections. Recent work on rolling loan calculation fixes revealed the need for a comprehensive audit of all Results page components to ensure accuracy and user value.

## Methodology: Bottom-to-Top Analysis

### Phase 1: Component Inventory and Prioritization
1. **Identify all components** on the Results page
2. **Categorize by complexity**: Simple → Moderate → Complex
3. **Order components** from simplest to most complex for systematic review

### Phase 2: Value Assessment
For every component, evaluate:
- **Necessity**: Do we actually need this component?
- **User Value**: Does it provide meaningful value to the user?
- **Placement**: Does it make sense at its current location?
- **Optimal Location**: Where would it make the most sense on the page?

### Phase 3: Calculation Validation
For each retained component:
- **Review calculation logic**: Examine how values are computed
- **Identify logical issues**: Check for incorrect formulas, missing parameters, inconsistencies
- **Create example scenarios** using easy-to-understand numbers:
  - BTC Price: $100,000
  - LTV percentages: 10%, 50%, 85%
  - BTC amounts: 1.0 BTC, 0.5 BTC
  - Loan amounts: $10,000, $50,000
- **Document calculations**: Write clear explanations for each calculation
- **Add tooltips**: Ensure each card has explanatory tooltips

## Component Inventory

### Simple Components (Priority 1)
1. **ResultsExport** - Export functionality
2. **Basic ResultsSummary metrics** - Simple calculated values

### Moderate Components (Priority 2)
3. **FinalPortfolioSummary** - Portfolio vs Buy & Hold comparison
4. **LoanHistoryTable** - Loan event tracking and display
5. **RollingLoanMetricsCard** - Rolling loan strategy metrics
6. **RiskAssessment** - Risk level calculations and display
7. **EventsAnalysis** - Event categorization and analysis

### Complex Components (Priority 3)
8. **useResultsAnalysis hook** - Core analysis calculations engine
9. **Chart Components** (7 total):
   - PortfolioValueChart
   - DebtCollateralChart
   - LTVProgressionChart
   - CashFlowChart
   - BTCAccumulationChart
   - RiskProgressionChart
   - CashFlowSummaryChart
10. **ResultsTable** - Detailed monthly results display

## Key Validation Scenarios

### Scenario 1: Simple Rolling Loan Case
- **Initial**: 1.0 BTC at $100,000 = $100,000
- **Month 1**: Take $10,000 loan (10% LTV)
- **Month 6**: BTC price $120,000, rollover loan
- **Final**: 1.1 BTC at $150,000 = $165,000, $12,000 debt
- **Expected Net**: $153,000
- **Buy & Hold**: $150,000
- **Expected Outperformance**: +$3,000 (2%)

### Scenario 2: High LTV Case
- **Initial**: 0.5 BTC at $100,000 = $50,000
- **Month 1**: Take $42,500 loan (85% LTV)
- **Price drops to $80,000**: Risk of liquidation
- **Expected calculations**: LTV jumps to 106.25%

## Success Criteria

- [ ] All Results page components evaluated for necessity and value
- [ ] All calculations validated with example scenarios
- [ ] Clear keep/remove decisions with justifications
- [ ] Tooltip content drafted for all retained components
- [ ] Calculation interdependencies identified and documented
- [ ] Actionable task list created in priority order
- [ ] Handover document ready for implementation session

## Dependencies

- Completion of rolling loan calculation fixes (Tasks 1-3)
- Access to current Results page component implementations
- Understanding of simulation data flow and calculation services

## Deliverables

1. **Handover Document** (`handover.md`) - Detailed component analysis
2. **Task List** (`tasks.md`) - Prioritized implementation tasks
3. **Updated component documentation** with calculation explanations
