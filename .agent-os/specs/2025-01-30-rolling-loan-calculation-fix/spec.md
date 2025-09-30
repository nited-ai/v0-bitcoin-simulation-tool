# Spec Requirements Document

> Spec: Rolling Loan Strategy Calculation Fix
> Created: 2025-01-30
> Status: Planning

## Overview

Fix critical calculation errors in the Rolling Loan Strategy implementation that prevent the strategy from maintaining the target loan percentage of BTC stack value. The current implementation produces incorrect loan amounts ($34,236 instead of expected $10,000) and fails to follow the core strategy logic defined in the technical specification.

## User Stories

### Strategy Calculation Accuracy

As a Bitcoin investor using the rolling loan strategy, I want the system to accurately calculate loan amounts based on my target percentage of BTC stack value, so that I can maintain consistent leverage ratios and achieve predictable portfolio growth.

**Detailed Workflow:**
1. User sets target loan percentage (e.g., 10% of BTC stack)
2. System calculates exact loan amount: target % × current BTC stack value
3. For rollovers: System compares minimum needed vs maximum allowed
4. System takes appropriate loan amount and reinvests excess (if BTC accumulation enabled)
5. Results display accurate loan history and portfolio progression

### Price Projection Integration

As a user running simulations with different price models, I want the rolling loan strategy to use the correct BTC price data from my selected price projection model, so that loan calculations reflect the projected price movements accurately.

**Detailed Workflow:**
1. User selects price projection model (Power Law, Cycle Repeat, etc.)
2. Strategy execution uses projected prices for each month
3. Loan calculations based on current projected BTC price
4. Portfolio value calculations match price projection data
5. Results show consistent price progression across all components

### Calculation Transparency

As a developer maintaining the system, I want all loan calculation formulas to match the authoritative calculation document, so that the implementation is consistent, auditable, and maintainable.

**Detailed Workflow:**
1. All calculation services reference the same source of truth
2. Formulas are documented and validated against specification
3. Test cases verify expected outcomes for known scenarios
4. Error handling provides clear feedback for edge cases

## Spec Scope

1. **Loan Amount Calculation Fix** - Correct the core logic to maintain target percentage of BTC stack value
2. **Price Projection Integration Audit** - Ensure BTC price data flows correctly from price models to strategy execution
3. **Platform Fee Calculation Verification** - Validate Firefish 1.5% annual fee and other platform fee calculations
4. **Rollover Logic Correction** - Fix minimum vs maximum loan amount comparison and decision logic
5. **BTC Accumulation Mode Fix** - Ensure excess proceeds correctly purchase additional BTC and grow the stack
6. **Calculation Service Audit** - Review all calculation services against authoritative documentation
7. **Test Case Implementation** - Create comprehensive test cases for the specific failing scenario

## Out of Scope

- UI/UX changes to the Parameters or Results tabs
- New features or strategy enhancements
- Performance optimizations
- Other strategy implementations (ATH-based, Moving Average, etc.)
- Price projection model modifications

## Expected Deliverable

1. **Accurate Loan Calculations** - First loan of $10,000 for the test scenario (1 BTC, $100k price, 10% target)
2. **Consistent Price Integration** - Portfolio values match Power Law price projections throughout simulation
3. **Validated Formulas** - All calculation services align with authoritative calculation document
4. **Comprehensive Test Coverage** - Test cases verify correct behavior for normal rollover, forced exceedance, and BTC accumulation scenarios
5. **Working Results Display** - Results tab shows accurate loan history, portfolio progression, and metrics without JavaScript errors

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-30-rolling-loan-calculation-fix/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-30-rolling-loan-calculation-fix/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-01-30-rolling-loan-calculation-fix/sub-specs/tests.md
