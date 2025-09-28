# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-27-rolling-loan-strategy/spec.md

> Created: 2025-01-27
> Version: 1.0.0

## Technical Requirements

### Strategy Tab Activation
- Enable Strategy tab in TabNavigation.tsx by setting `enabled: true`
- Remove "Coming Soon" badge from strategy tab configuration
- Implement strategy selection interface with rolling loan strategy as default option
- Create strategy parameter configuration UI components

### Rolling Loan Strategy Implementation
- Extend existing strategy microservices architecture in `src/modules/strategies/`
- Implement `RollingLoanStrategy` class following `InvestmentStrategyInterface`
- Integrate with existing `StrategyExecutionService` and `StrategyRegistry`
- Support dynamic loan sizing based on BTC price changes and previous loan obligations

### Loan Rollover Logic
- Calculate minimum loan amount required to pay off previous loan (principal + interest + platform-specific fees)
- Determine maximum loan amount based on target percentage (loanAmountPercent) of current BTC stack value
- Handle conflict resolution when minimum required loan exceeds target percentage (system forced to exceed target if free collateral available)
- If no free collateral available for required loan amount, trigger liquidation event
- Calculate excess loan proceeds: New loan amount - (previous loan principal + accrued interest + platform fees)
- **BTC Accumulation ENABLED:** Reinvest excess proceeds into additional Bitcoin
- **BTC Accumulation DISABLED:** Take excess proceeds as cash for living expenses
- Use consistent loan term duration from Parameters tab for all rollovers

### Risk Management Integration
- Calculate updated liquidation prices for each new loan based on current BTC price and LTV
- Compute price drop tolerance showing how much BTC can decline before liquidation
- Update collateral consumption metrics (free vs locked collateral) using Parameters tab calculations
- Update collateral value and debt ratios dynamically throughout simulation
- Integrate with existing risk calculation services in `calculationsService.ts`
- Alert users when target percentage limits are exceeded due to minimum loan requirements

### Results Tab Enhancement
- Activate Results tab in TabNavigation.tsx by setting `enabled: true`
- Implement comprehensive rolling loan strategy results visualization:
  - **BTC Accumulation Chart:** Total BTC holdings growth over time through loan reinvestment
  - **Loan History Table:** Month-by-month loan events (new loans, rollovers, reinvestments)
  - **Rolling Loan Metrics Card:** Total loans taken, total interest paid, total BTC accumulated/cash generated
  - **Risk Progression Chart:** LTV and liquidation risk evolution with each loan rollover
  - **Cash Flow Summary:** Monthly loan proceeds, reinvestment amounts, net cash flows
  - **Final Portfolio Summary:** Ending BTC amount, total debt, net portfolio value vs buy-and-hold comparison
- Show end-of-simulation loan status: "Simulation ended with X active loans totaling $Y remaining debt"
- Display liquidation events clearly when insufficient collateral scenarios occur

## Approach Options

**Option A: Extend Existing Default Strategy**
- Pros: Minimal code changes, leverages existing infrastructure
- Cons: Mixes rolling loan logic with default strategy, less modular

**Option B: Create New Rolling Loan Strategy Module** (Selected)
- Pros: Clean separation of concerns, follows microservices architecture, extensible
- Cons: More initial development work, requires new strategy registration

**Option C: Modify Simulation Engine Directly**
- Pros: Direct control over loan mechanics
- Cons: Breaks microservices architecture, harder to maintain and test

**Rationale:** Option B aligns with the existing modular architecture and allows for future strategy extensions while maintaining clean separation of concerns.

## External Dependencies

**No new external dependencies required** - Implementation will use existing infrastructure:
- Existing strategy microservices framework
- Current loan calculation services
- Established price projection integration
- Present results visualization components

## Integration Points

### Price Projection Models
- Strategy must work with all existing models: Power Law, Cycle Repeat, Manual Growth, Enhanced
- Use `PriceProjectionResult` interface for accessing projected prices
- Handle different projection data formats and time periods

### Loan Parameter System
- Integrate with existing loan parameter configuration in Parameters tab
- Use current platform presets (Firefish, Strike, Custom) for loan terms
- Respect user-configured risk levels and LTV limits

### Simulation Context
- Extend `SimulationContext` to include rolling loan strategy state
- Maintain compatibility with existing parameter persistence
- Integrate with BTC accumulation checkbox functionality
- Handle platform-specific origination fee calculations (Firefish: 1.5% annual, Strike: 0%, Custom: 1% one-time)

### Initial Loan Implementation
- Automatically trigger first loan when user runs simulation with rolling loan strategy selected
- Use loan amount and BTC price from Parameters tab configuration
- No manual user intervention required after simulation start

### Validation and Error Handling
- Implement comprehensive parameter validation:
  - Minimum loan amount: $100
  - Maximum loan amount: 90% of total BTC stack value
  - Loan term range: 1-36 months
  - Interest rate range: 0.1%-50% annually
- Error message handling:
  - Calculation failures: "Calculation error - please check parameters and try again"
  - Price data unavailable: "Price data unavailable - cannot run simulation"
- Liquidation handling: Clear liquidation event display when insufficient collateral

### Platform Fee Integration
- Use existing platform preset system for fee calculations
- **Firefish:** 1.5% annual recurring fee (applied to each new loan annually)
- **Strike:** 0% origination fee
- **Custom:** User-configurable fee structure from platform settings

### Monthly Withdrawal Independence
- Rolling loan strategy operates independently of monthly withdrawal functionality
- Monthly withdrawals handled by separate withdrawal strategy
- No interaction between loan rollover calculations and withdrawal amounts
