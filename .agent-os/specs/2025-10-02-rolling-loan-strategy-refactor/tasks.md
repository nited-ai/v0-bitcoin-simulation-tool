# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-10-02-rolling-loan-strategy-refactor/spec.md

> Created: 2025-10-02
> Updated: 2025-10-02 (User Feedback Incorporated - Revised Approach)
> Status: Ready for Implementation
> Version: 2.0.0

## Implementation Approach

**Key Change:** Create new `DynamicRollingLoanStrategy.ts` from scratch instead of refactoring existing strategy.

**Strategy Mode Selection:** Automatic based on `loanTermMonths` parameter:
- `loanTermMonths === Infinity` → Dynamic LTV mode (monthly interest accrual, LTV reset)
- `loanTermMonths === specific number` → Fixed Term mode (rollover at maturity)

## Tasks

- [x] 1. Update TypeScript Interfaces
  - [x] 1.1 Write tests for new interface fields
  - [x] 1.2 Add `annualSavingsIncrease` to StrategyExecutionParams
  - [x] 1.3 Add `btcPurchased` to MonthlyResult
  - [x] 1.4 Add `monthlySavingsApplied` to MonthlyResult
  - [x] 1.5 Add `interestAccrued` to MonthlyResult
  - [x] 1.6 Add `loanRollover` object to MonthlyResult
  - [x] 1.7 Verify TypeScript compilation succeeds
  - [x] 1.8 Verify all tests pass
  - [x] 1.9 Commit changes

- [x] 2. Create DynamicRollingLoanStrategy - Initial Setup
  - [x] 2.1 Create new file `src/modules/strategies/implementations/DynamicRollingLoanStrategy.ts`
  - [x] 2.2 Implement class structure with InvestmentStrategyInterface
  - [x] 2.3 Implement getName() method: "Dynamic Rolling Loan"
  - [x] 2.4 Implement getDescription() method with mode explanation
  - [x] 2.5 Write basic structure tests
  - [x] 2.6 Verify TypeScript compilation succeeds
  - [x] 2.7 Verify all tests pass
  - [x] 2.8 Commit changes

- [x] 3. Implement Initial Loan Logic
  - [x] 3.1 Write tests for initial loan calculation
  - [x] 3.2 Implement handleInitialLoan() method using CentralizedLoanCalculationService
  - [x] 3.3 Calculate investment multiplier using centralized service
  - [x] 3.4 Support both BTC accumulation and cash generation modes
  - [x] 3.5 Format loan details for display with reasoning
  - [x] 3.6 Test with various LTV and fee scenarios
  - [x] 3.7 Verify all tests pass (14/14)
  - [x] 3.8 Commit changes

- [x] 4. Implement Automatic Mode Selection
  - [x] 4.1 Write tests for mode selection logic (5 new tests)
  - [x] 4.2 Verify makeDecision() method routes correctly (already implemented in Task 2)
  - [x] 4.3 Confirm `params.loanTermMonths === Infinity` routes to Dynamic LTV mode
  - [x] 4.4 Confirm specific loan terms route to Fixed Term mode
  - [x] 4.5 Test mode selection with Infinity loan term
  - [x] 4.6 Test mode selection with specific loan terms (3, 6, 12, 24)
  - [x] 4.7 Verify all tests pass (19/19)
  - [x] 4.8 Commit changes

- [x] 5. Implement Dynamic LTV Mode (Infinite Loan Term)
  - [x] 5.1 Write tests for Dynamic LTV mode logic (8 new tests)
  - [x] 5.2 Create handleDynamicLtvMode() method
  - [x] 5.3 Implement Month 0 skip logic
  - [x] 5.4 Implement monthly interest accrual: `loanBalance *= (1 + rate/12)`
  - [x] 5.5 Calculate target loan: `collateralValue * targetLtv`
  - [x] 5.6 Calculate amount to borrow: `targetLoan - currentLoanBalance`
  - [x] 5.7 Apply loan fees to net proceeds
  - [x] 5.8 Update loan balance to target
  - [x] 5.9 Test with various LTV scenarios (accumulation, cash generation, exceeds target)
  - [x] 5.10 Support both BTC accumulation and cash generation modes
  - [x] 5.11 Verify all tests pass (26/26)
  - [x] 5.12 Commit changes

- [x] 6. Implement Fixed Term Mode (Specific Loan Term)
  - [x] 6.1 Write tests for Fixed Term mode logic (7 new tests)
  - [x] 6.2 Create handleFixedTermMode() method
  - [x] 6.3 Implement maturity month checking
  - [x] 6.4 Calculate full term interest: `principal * rate * (term/12)`
  - [x] 6.5 Calculate debt to repay: `principal + interest`
  - [x] 6.6 Calculate new target loan
  - [x] 6.7 Calculate amount to borrow: `targetLoan - debtToRepay`
  - [x] 6.8 Handle forced exceedance scenario (insufficient collateral)
  - [x] 6.9 Support both BTC accumulation and cash generation modes
  - [x] 6.10 Test rollover at various maturity dates and loan terms
  - [x] 6.11 Verify all tests pass (33/33)
  - [x] 6.12 Commit changes

- [x] 7. Integrate Monthly Savings in StrategyExecutionService
  - [x] 7.1 Write tests for monthly savings integration (6 new tests)
  - [x] 7.2 Locate main simulation loop in StrategyExecutionService
  - [x] 7.3 Add monthly savings logic BEFORE strategy decision
  - [x] 7.4 Calculate years passed: `Math.floor(month / 12)`
  - [x] 7.5 Apply annual compound increase: `initial * Math.pow(1 + increase, years)`
  - [x] 7.6 Convert to BTC: `savingsAmount / currentPrice`
  - [x] 7.7 Update BTC holdings (positive = add, negative = reduce)
  - [x] 7.8 Track monthlySavingsApplied in monthly result
  - [x] 7.9 Test with positive savings (adds BTC)
  - [x] 7.10 Test with negative withdrawals (reduces BTC)
  - [x] 7.11 Test annual increase over multiple years (compound growth)
  - [x] 7.12 Verify all tests pass (18/18)
  - [x] 7.13 Commit changes

- [x] 8. Track Strategy Execution Data in MonthlyResult
  - [x] 8.1 Write tests for monthly result tracking (4 new tests)
  - [x] 8.2 Track btcPurchased when strategy returns allowInvestment
  - [x] 8.3 Calculate btcPurchased from principalForReinvestment / btcPrice
  - [x] 8.4 Add btcPurchased field to monthly result
  - [x] 8.5 Test btcPurchased calculation accuracy
  - [x] 8.6 Test btcPurchased is separate from monthly savings
  - [x] 8.7 Verify all tests pass (22/22)
  - [x] 8.8 Commit changes
  - Note: interestAccrued and loanRollover tracking deferred (requires strategy interface changes)

- [ ] 9. Register New Strategy in StrategyRegistry
  - [ ] 9.1 Write tests for strategy registration
  - [ ] 9.2 Export DynamicRollingLoanStrategy from implementations/index.ts
  - [ ] 9.3 Register strategy with ID 'dynamic-rolling-loan'
  - [ ] 9.4 Set priority higher than old rolling loan strategy
  - [ ] 9.5 Verify strategy appears in dropdown
  - [ ] 9.6 Test strategy retrieval by ID
  - [ ] 9.7 Verify all tests pass
  - [ ] 9.8 Commit changes

- [ ] 10. Add Annual Increase Parameter to FinancialFlowCard
  - [ ] 10.1 Write tests for annual increase input
  - [ ] 10.2 Add number input for annualSavingsIncrease
  - [ ] 10.3 Add label: "Annual Increase Rate"
  - [ ] 10.4 Add tooltip with explanation and example
  - [ ] 10.5 Set min=0, max=50, step=1, decimals=1
  - [ ] 10.6 Update SimulationContext integration
  - [ ] 10.7 Test input field functionality
  - [ ] 10.8 Test tooltip display
  - [ ] 10.9 Test context persistence
  - [ ] 10.10 Verify all tests pass
  - [ ] 10.11 Commit changes

- [ ] 11. Update BtcAccumulationCard Descriptions
  - [ ] 11.1 Write tests for updated descriptions
  - [ ] 11.2 Update Accumulation Mode description
  - [ ] 11.3 Update Cash Generation Mode description
  - [ ] 11.4 Remove "90% of excess proceeds" references
  - [ ] 11.5 Add reference to Financial Flow settings
  - [ ] 11.6 Test component rendering
  - [ ] 11.7 Verify all tests pass
  - [ ] 11.8 Commit changes

- [ ] 12. Update ResultsSummary Component
  - [ ] 12.1 Write tests for updated ResultsSummary
  - [ ] 12.2 Add Total BTC Purchased metric
  - [ ] 12.3 Add Total Savings/Withdrawals metric
  - [ ] 12.4 Add Total Interest Accrued metric
  - [ ] 12.5 Add Loan Rollover Count metric
  - [ ] 12.6 Update calculation logic for new fields
  - [ ] 12.7 Test with Dynamic LTV mode data
  - [ ] 12.8 Test with Fixed Term mode data
  - [ ] 12.9 Verify all tests pass
  - [ ] 12.10 Commit changes

- [ ] 13. Update PortfolioValueChart Component
  - [ ] 13.1 Write tests for updated PortfolioValueChart
  - [ ] 13.2 Ensure chart handles new monthly result fields
  - [ ] 13.3 Update data series if needed
  - [ ] 13.4 Test chart rendering with new data
  - [ ] 13.5 Verify all tests pass
  - [ ] 13.6 Commit changes

- [ ] 14. Update DebtCollateralChart Component
  - [ ] 14.1 Write tests for updated DebtCollateralChart
  - [ ] 14.2 Update Current LTV data series
  - [ ] 14.3 Add Target LTV reference line
  - [ ] 14.4 Add Liquidation LTV reference line
  - [ ] 14.5 Test chart rendering
  - [ ] 14.6 Verify all tests pass
  - [ ] 14.7 Commit changes

- [ ] 15. Update LTVProgressionChart Component
  - [ ] 15.1 Write tests for updated LTVProgressionChart
  - [ ] 15.2 Update monthly LTV progression data
  - [ ] 15.3 Highlight LTV reset months (Dynamic LTV mode)
  - [ ] 15.4 Highlight rollover events (Fixed Term mode)
  - [ ] 15.5 Show distance to liquidation threshold
  - [ ] 15.6 Test chart rendering
  - [ ] 15.7 Verify all tests pass
  - [ ] 15.8 Commit changes

- [ ] 16. Update CashFlowChart Component
  - [ ] 16.1 Write tests for updated CashFlowChart
  - [ ] 16.2 Add Monthly Savings/Withdrawals series using monthlySavingsApplied
  - [ ] 16.3 Add BTC Purchases series using btcPurchased
  - [ ] 16.4 Add Interest Accrued series using interestAccrued
  - [ ] 16.5 Update chart legend and colors
  - [ ] 16.6 Test chart rendering
  - [ ] 16.7 Verify all tests pass
  - [ ] 16.8 Commit changes

- [ ] 17. Update LoanActivityTable Component
  - [ ] 17.1 Write tests for updated LoanActivityTable
  - [ ] 17.2 Add Interest Accrued column (Dynamic LTV mode)
  - [ ] 17.3 Add BTC Purchased column
  - [ ] 17.4 Add Monthly Savings column
  - [ ] 17.5 Add Rollover Event indicator (Fixed Term mode)
  - [ ] 17.6 Test table rendering
  - [ ] 17.7 Verify all tests pass
  - [ ] 17.8 Commit changes

- [ ] 18. Update RiskAssessment Component
  - [ ] 18.1 Write tests for updated RiskAssessment
  - [ ] 18.2 Add Maximum LTV Reached metric
  - [ ] 18.3 Add Months Above 80% LTV metric
  - [ ] 18.4 Add Liquidation Risk Score metric
  - [ ] 18.5 Add Strategy Mode indicator (Dynamic vs Fixed Term)
  - [ ] 18.6 Test risk calculations
  - [ ] 18.7 Verify all tests pass
  - [ ] 18.8 Commit changes

- [ ] 19. Create HTML Prototype Validation Tests
  - [ ] 19.1 Extract test data from HTML prototype
  - [ ] 19.2 Create test fixtures with expected results
  - [ ] 19.3 Write validation tests for initial loan
  - [ ] 19.4 Write validation tests for Dynamic LTV mode
  - [ ] 19.5 Write validation tests for monthly savings
  - [ ] 19.6 Write validation tests for annual increases
  - [ ] 19.7 Write validation tests for interest accrual
  - [ ] 19.8 Verify results within 0.1% of HTML prototype
  - [ ] 19.9 Verify all tests pass
  - [ ] 19.10 Commit changes

- [ ] 20. Integration Testing
  - [ ] 20.1 Write end-to-end Dynamic LTV mode simulation test
  - [ ] 20.2 Write end-to-end Fixed Term mode simulation test
  - [ ] 20.3 Test Dynamic LTV mode with monthly savings
  - [ ] 20.4 Test Dynamic LTV mode with withdrawals
  - [ ] 20.5 Test Fixed Term mode with monthly savings
  - [ ] 20.6 Test mode selection based on loan term
  - [ ] 20.7 Test annual increase over multiple years
  - [ ] 20.8 Verify all integration tests pass
  - [ ] 20.9 Commit changes

- [ ] 21. Documentation Updates
  - [ ] 21.1 Update developer guide with new strategy
  - [ ] 21.2 Document automatic mode selection
  - [ ] 21.3 Update user help text for strategy
  - [ ] 21.4 Update tooltips with clear explanations
  - [ ] 21.5 Add migration notes for users
  - [ ] 21.6 Document annual increase calculation
  - [ ] 21.7 Add examples for each mode
  - [ ] 21.8 Commit changes

- [ ] 22. Final Validation
  - [ ] 22.1 Run all unit tests (pnpm test)
  - [ ] 22.2 Run all module tests (pnpm test:modules)
  - [ ] 22.3 Run type checking (pnpm type-check)
  - [ ] 22.4 Run build (pnpm build)
  - [ ] 22.5 Verify code coverage >90%
  - [ ] 22.6 Manual testing: Dynamic LTV mode (Infinity loan term)
  - [ ] 22.7 Manual testing: Fixed Term mode (specific loan term)
  - [ ] 22.8 Manual testing: Mode switching
  - [ ] 22.9 Manual testing: Monthly savings with annual increase
  - [ ] 22.10 Compare results with HTML prototype
  - [ ] 22.11 Test backward compatibility (old strategy still works)
  - [ ] 22.12 Verify no breaking changes
  - [ ] 22.13 Final commit with summary message
