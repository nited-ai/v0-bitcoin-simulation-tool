# Spec Requirements Document

> Spec: Rolling Loan Strategy Implementation
> Created: 2025-01-27
> Status: Planning

## Overview

Implement a default rolling loan strategy that automatically rolls over Bitcoin-backed loans to maintain continuous leverage with dual functionality based on BTC accumulation settings. When BTC accumulation is enabled, loan proceeds are reinvested into additional Bitcoin for accumulation. When disabled, proceeds are taken as cash for living expenses while maintaining target loan percentage. This feature will activate the Strategy and Results tabs and provide users with automated loan management for both accumulation and income generation purposes.

## User Stories

### Bitcoin Accumulator Strategy

As a Bitcoin accumulator, I want to automatically roll over my Bitcoin-backed loans at maturity, so that I can continuously leverage my holdings to acquire more Bitcoin without manual intervention.

**Detailed Workflow:**
1. User configures initial loan parameters (amount, LTV, interest rate, term) in Parameters tab
2. User runs simulation with rolling loan strategy selected
3. System automatically takes initial loan using configured parameters and current BTC price
4. **BTC Accumulation ENABLED:** Loan proceeds purchase additional Bitcoin for accumulation
5. **BTC Accumulation DISABLED:** Loan proceeds taken as cash for living expenses
6. At loan maturity, system automatically takes new loan using same loan term duration to pay off previous loan (principal + interest + platform-specific fees)
7. Excess loan proceeds (if any) are either reinvested in Bitcoin or taken as cash based on accumulation setting
8. Process repeats throughout simulation period (defined in Price Projection Tab)
9. User can monitor portfolio growth, risk levels, collateral consumption, and liquidation tolerance over time

### Risk-Aware Loan Management

As a conservative investor, I want the rolling loan strategy to dynamically adjust loan amounts based on Bitcoin price changes, so that I can maintain safe leverage levels even during market volatility.

**Detailed Workflow:**
1. System calculates minimum loan amount needed to pay off previous loan (principal + interest + platform fees)
2. If BTC price has increased, system can take larger loan (up to target percentage of current BTC stack value)
3. If BTC price has decreased and minimum required loan exceeds target percentage, system is forced to exceed target (if free collateral available)
4. If no free collateral available for required loan amount, user is liquidated
5. Excess loan proceeds = New loan amount - (previous loan principal + accrued interest + platform fees)
6. Risk calculations (liquidation prices, drop tolerance, collateral consumption) update dynamically using Parameters tab formulas
7. User receives clear feedback on risk levels, safety margins, liquidation warnings, and target percentage exceedances

### Multi-Model Integration

As a simulation user, I want the rolling loan strategy to work seamlessly with all price projection models, so that I can analyze strategy performance under different market scenarios.

**Detailed Workflow:**
1. User selects any price projection model (Power Law, Cycle Repeat, Manual Growth, Enhanced)
2. Rolling loan strategy adapts to projected price movements from selected model
3. Strategy calculations use projected prices for loan sizing and risk assessment
4. Results display shows strategy performance across different price scenarios
5. User can compare strategy outcomes between different price models

## Spec Scope

1. **Strategy Tab Activation** - Enable and implement functional Strategy tab with rolling loan strategy selection and configuration
2. **Rolling Loan Strategy Engine** - Core algorithm that automatically rolls loans at maturity with reinvestment logic
3. **Dynamic Loan Sizing** - Calculate optimal loan amounts based on current BTC value, previous loan obligations, and risk parameters
4. **Risk Management Integration** - Real-time calculation of liquidation prices, LTV ratios, collateral consumption (free vs locked collateral) and price drop tolerance for each loan period
5. **Results Tab Enhancement** - Display rolling loan strategy outcomes with BTC accumulation charts and risk analysis over time

## Out of Scope

- Multiple simultaneous strategies (focus on single rolling loan strategy)
- Advanced strategy optimization algorithms or AI-powered recommendations
- Historical backtesting against real market data
- Integration with external lending platforms or APIs
- Custom strategy builder interface for user-defined strategies
- Mid-simulation strategy switching (users cannot change strategies during active simulation)
- Integration with monthly withdrawal functionality (handled by separate withdrawal strategy)

## Expected Deliverable

1. **Functional Strategy Tab** - Users can access Strategy tab, select rolling loan strategy, and configure parameters (integrates with BTC accumulation checkbox for dual functionality)
2. **Automated Loan Rollover Simulation** - System successfully simulates rolling loans over entire projection period with accurate fee calculations, liquidation handling, and end-of-simulation loan status
3. **Enhanced Results Visualization** - Results tab displays comprehensive rolling loan strategy outcomes with detailed metrics and analysis

## Results Page Output Requirements

### BTC Accumulation Chart
- Shows total BTC holdings growth over time through loan reinvestment
- Displays accumulation progression for enabled BTC accumulation mode

### Loan History Table
- Month-by-month loan events (new loans, rollovers, reinvestments)
- Shows loan amounts, interest payments, and rollover details

### Rolling Loan Metrics Card
- Total loans taken throughout simulation
- Total interest paid across all loans
- Total BTC accumulated through strategy (accumulation mode)
- Total cash generated (income mode)

### Risk Progression Chart
- How LTV and liquidation risk changed over time with each loan rollover
- Visual representation of risk evolution throughout simulation

### Cash Flow Summary
- Monthly loan proceeds breakdown
- Reinvestment amounts vs cash taken
- Net cash flows for income generation analysis

### Final Portfolio Summary
- Ending BTC amount and total debt
- Net portfolio value calculation
- Buy-and-hold comparison showing strategy performance vs simple holding

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-27-rolling-loan-strategy/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-27-rolling-loan-strategy/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-01-27-rolling-loan-strategy/sub-specs/tests.md

## Implementation Details

### Initial Loan Mechanism
- Initial loan automatically triggered when user runs simulation with rolling loan strategy selected
- Uses loan amount and BTC price from Parameters tab configuration
- No manual user intervention required after simulation start

### Loan Term Consistency
- All rollovers use same loan term duration as specified in Parameters tab
- Platform-offered terms at rollover time are ignored

### Platform-Specific Fee Structure
- **Firefish Platform:** 1.5% annual recurring fee (applied to each new loan annually)
- **Strike Platform:** 0% origination fee
- **Custom Platform:** User-configurable fee structure from platform settings
- Uses existing platform preset system for all fee calculations

### End-of-Simulation Resolution
- Display remaining active loans at simulation end with outstanding balances
- Show notification: "Simulation ended with X active loans totaling $Y remaining debt"
- No complex resolution needed - display final loan status only

### BTC Accumulation Integration
- **Enabled:** Rolling loan strategy reinvests loan proceeds into additional Bitcoin (accumulation mode)
- **Disabled:** Strategy maintains target loan percentage but takes proceeds as cash for living expenses (income mode)
- Rolling loan mechanism works in both modes with different purposes

### Collateral and Calculation Definitions
- **Free Collateral:** Uses existing calculation formulas from Parameters tab collateral consumption card
- **Locked Collateral:** Collateral securing current active loans (Parameters tab calculations)
- **Excess Loan Proceeds:** New loan amount - (previous loan principal + accrued interest + platform fees)

### Error Handling & Validation Rules
- **Minimum Loan Amount:** $100
- **Maximum Loan Amount:** 90% of total BTC stack value
- **Loan Term Range:** 1-36 months
- **Interest Rate Range:** 0.1%-50% annually
- **Calculation Failures:** Display "Calculation error - please check parameters and try again"
- **Price Data Unavailable:** Display "Price data unavailable - cannot run simulation"
- **Insufficient Collateral:** User liquidation with clear liquidation event display in results

### Integration Approach
- Implement as new standalone strategy in existing StrategyRegistry
- Follow existing strategy microservices architecture pattern
- No complex integration required initially
