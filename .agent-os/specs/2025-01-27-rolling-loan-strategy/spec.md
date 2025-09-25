# Spec Requirements Document

> Spec: Rolling Loan Strategy Implementation
> Created: 2025-01-27
> Status: Planning

## Overview

Implement a default rolling loan strategy that automatically rolls over Bitcoin-backed loans to maintain continuous leverage while reinvesting loan proceeds into additional Bitcoin. This feature will activate the Strategy and Results tabs and provide users with an automated approach to Bitcoin accumulation through strategic loan management.

## User Stories

### Bitcoin Accumulator Strategy

As a Bitcoin accumulator, I want to automatically roll over my Bitcoin-backed loans at maturity, so that I can continuously leverage my holdings to acquire more Bitcoin without manual intervention.

**Detailed Workflow:**
1. User configures initial loan parameters (amount, LTV, interest rate, term)
2. System takes initial loan and purchases additional Bitcoin with proceeds
3. At loan maturity, system automatically takes new loan to pay off previous loan plus reinvest excess
4. Process repeats throughout simulation period, compounding Bitcoin accumulation
5. User can monitor BTC growth, risk levels, and liquidation tolerance over time

### Risk-Aware Loan Management

As a conservative investor, I want the rolling loan strategy to dynamically adjust loan amounts based on Bitcoin price changes, so that I can maintain safe leverage levels even during market volatility.

**Detailed Workflow:**
1. System calculates minimum loan amount needed to pay off previous loan
2. If BTC price has increased, system can take larger loan (up to target percentage)
3. If BTC price has decreased, system takes minimum required loan to avoid liquidation risk
4. Risk calculations (liquidation prices, drop tolerance) update dynamically for each new loan
5. User receives clear feedback on risk levels and safety margins

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
4. **Risk Management Integration** - Real-time calculation of liquidation prices, LTV ratios, and price drop tolerance for each loan period
5. **Results Tab Enhancement** - Display rolling loan strategy outcomes with BTC accumulation charts and risk analysis over time

## Out of Scope

- Multiple simultaneous strategies (focus on single rolling loan strategy)
- Advanced strategy optimization algorithms or AI-powered recommendations
- Historical backtesting against real market data
- Integration with external lending platforms or APIs
- Custom strategy builder interface for user-defined strategies

## Expected Deliverable

1. **Functional Strategy Tab** - Users can access Strategy tab, select rolling loan strategy, and configure parameters
2. **Automated Loan Rollover Simulation** - System successfully simulates rolling loans over entire projection period with accurate calculations
3. **Enhanced Results Visualization** - Results tab displays BTC accumulation, loan history, and risk metrics with interactive charts
