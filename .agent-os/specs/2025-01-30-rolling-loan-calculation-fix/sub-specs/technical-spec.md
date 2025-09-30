# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-30-rolling-loan-calculation-fix/spec.md

> Created: 2025-01-30
> Version: 1.0.0

## Technical Requirements

### Core Calculation Logic Fix
- **Target Loan Amount Formula**: `targetLoanAmount = targetPercentage × currentBtcStackValue`
- **Current BTC Stack Value**: `totalBtcAmount × currentBtcPrice` (from price projection)
- **Minimum Loan Needed**: `previousLoanRepayment + platformFees + interestDue`
- **Maximum Loan Allowed**: `targetLoanAmount` (based on target percentage)
- **Decision Logic**: `if (minimumNeeded <= maximumAllowed) take maximumAllowed else take minimumNeeded`

### Price Projection Integration Requirements
- Strategy execution must receive `PriceProjectionResult` with monthly price data
- Each month's BTC price must come from the selected price projection model
- Portfolio value calculations must use projected prices, not historical or fixed prices
- Price data flow: `PriceProjectionModel → StrategyExecutionService → RollingLoanStrategy`

### Platform Fee Calculation Requirements
- **Firefish**: 1.5% annual recurring fee = `(loanAmount × 0.015) / 12` per month
- **Strike**: 0% fees
- **Custom**: User-configurable fee structure
- Fees must be added to minimum loan calculation for accurate rollover amounts

### BTC Accumulation Mode Requirements
- **Excess Proceeds**: `actualLoanAmount - minimumLoanNeeded`
- **BTC Purchase**: `excessProceeds / currentBtcPrice`
- **Stack Growth**: `totalBtcAmount += purchasedBtc`
- **Next Month Calculation**: Use grown BTC stack for future loan sizing

### Rollover Scenario Handling
- **Normal Rollover**: minimum < maximum → take maximum, reinvest excess
- **Forced Exceedance**: minimum > maximum → take minimum, temporarily exceed target
- **Recovery**: When price recovers, return to target percentage

## Approach Options

**Option A: Patch Current Implementation**
- Pros: Minimal code changes, faster implementation
- Cons: May miss underlying architectural issues, technical debt accumulation

**Option B: Comprehensive Audit and Refactor** (Selected)
- Pros: Identifies all calculation errors, ensures long-term maintainability, validates against source of truth
- Cons: More time-intensive, requires thorough testing

**Rationale:** Given the critical nature of financial calculations and the extent of the errors discovered, a comprehensive audit is necessary to ensure accuracy and prevent future issues.

## Investigation Areas

### 1. LoanRolloverCalculationService Audit
- Review `calculateLoanRollover()` method implementation
- Verify minimum loan calculation includes all fees and interest
- Validate maximum loan calculation uses target percentage correctly
- Check conflict resolution logic for forced exceedance scenarios

### 2. PlatformFeeIntegrationService Audit  
- Verify Firefish 1.5% annual fee calculation
- Confirm fee timing (upfront vs recurring)
- Validate custom platform fee handling
- Check fee integration with rollover calculations

### 3. RollingLoanStrategy Audit
- Review `makeDecision()` method for initial loans
- Verify rollover decision logic
- Check BTC accumulation mode implementation
- Validate investment multiplier calculations

### 4. StrategyExecutionService Integration
- Verify price data flow from projection models
- Check monthly BTC price usage in calculations
- Validate portfolio value calculations
- Confirm result data structure consistency

### 5. Calculation Document Comparison
- Locate authoritative calculation document
- Compare all implemented formulas against source of truth
- Identify discrepancies and document corrections needed
- Validate test scenarios against expected outcomes

## External Dependencies

No new external dependencies required. This is a bug fix and audit of existing calculation logic.

## Test Scenarios

### Primary Test Case (Currently Failing)
- Initial BTC: 1 BTC at $100,000
- Target Percentage: 10%
- Expected First Loan: ~$10,000 (not $34,236)
- Platform: Firefish (1.5% annual fee)
- Price Model: Power Law
- BTC Accumulation: Enabled

### Additional Test Scenarios
- Price increase scenario (normal rollover)
- Price decrease scenario (forced exceedance)  
- BTC accumulation disabled (cash generation mode)
- Different target percentages (5%, 15%, 20%)
- Different platforms (Strike 0%, Custom fees)
- Long-term simulation (12+ months)
