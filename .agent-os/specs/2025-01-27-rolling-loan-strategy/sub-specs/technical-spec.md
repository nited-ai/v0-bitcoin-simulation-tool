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
- Calculate minimum loan amount required to pay off previous loan (principal + interest + fees)
- Determine maximum loan amount based on target percentage of current BTC stack value
- Handle edge cases where BTC price drops require larger loans than target percentage
- Implement compounding BTC accumulation through reinvestment of excess loan proceeds

### Risk Management Integration
- Calculate updated liquidation prices for each new loan based on current BTC price and LTV
- Compute price drop tolerance showing how much BTC can decline before liquidation
- Update collateral value and debt ratios dynamically throughout simulation
- Integrate with existing risk calculation services in `calculationsService.ts`

### Results Tab Enhancement
- Activate Results tab in TabNavigation.tsx by setting `enabled: true`
- Extend existing results visualization to show strategy-specific metrics
- Add BTC accumulation chart showing growth over time through rolling loans
- Display loan history table with rollover events and reinvestment amounts

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
- Support strategy switching without losing configuration
