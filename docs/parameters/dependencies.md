# Parameter Dependencies

This document outlines how parameters interact with each other and their dependencies within the Bitcoin Simulation Tool.

## Core Dependencies

### BTC Stack Value Calculation
```
BTC Stack Value = btcAmount × initialBtcPrice
```

**Dependencies:**
- `maxLoanAmountPercent` → Calculates actual loan amount in EUR
- All loan calculations depend on this base value
- Collateral calculations use this as reference

### Max Loan Amount Calculation
```
Max Loan Amount (EUR) = (maxLoanAmountPercent / 100) × BTC Stack Value
```

**Dependencies:**
- `btcAmount` - Base BTC holdings
- `initialBtcPrice` - Current BTC price
- `maxLoanAmountPercent` - Percentage setting

### Collateral Requirements
```
Required Collateral (BTC) = Max Loan Amount / (initialBtcPrice × (targetLtv / 100))
```

**Dependencies:**
- `maxLoanAmountPercent` - Determines loan size
- `initialBtcPrice` - Price for collateral calculation
- `riskManagement.targetLtv` - Initial LTV ratio

### Liquidation Price Calculation
```
Liquidation Price = Max Loan Amount / (Collateral BTC × (liquidationLtv / 100))
```

**Dependencies:**
- Max Loan Amount calculation (see above)
- Required Collateral calculation (see above)
- `riskManagement.liquidationLtv` - Liquidation threshold

## Model-Specific Dependencies

### Manual Growth Model
- `annualGrowthRates` length must match or exceed simulation years
- `simulationMonths` determines how many growth rates are used
- `riskLevel` influences preset selection but doesn't override custom rates

### Power Law Model
- `powerLawSettings.prognosisLine` determines which line is used for projections
- `simulationMonths` affects projection length
- Historical data availability affects model accuracy

### Strategy Dependencies
- `investmentStrategy` determines which strategy parameters are active
- Strategy-specific parameters only apply when corresponding strategy is selected
- `riskLevel` may influence strategy behavior but doesn't override explicit parameters

## Cross-Component Dependencies

### Price Projection → Strategy Engine
- Price projections provide `btcPrice` for each month
- Strategy decisions depend on projected price movements
- Historical price data influences strategy calculations

### Parameters Tab → Price Models
- `riskLevel` passed to all price models for preset selection
- `simulationMonths` affects all price projections
- Basic parameters provide foundation for all calculations

### Loan Parameters → Risk Management
- `targetLtv` and `liquidationLtv` must maintain logical relationship (target < liquidation)
- `loanTermMonths` affects repayment calculations
- Interest rates compound over loan term

## Validation Dependencies

### Logical Constraints
- `riskManagement.targetLtv` < `riskManagement.liquidationLtv`
- `maxLoanAmountPercent` ≤ 100 (cannot exceed total BTC stack)
- `simulationMonths` ≥ 1 (minimum simulation length)
- `loanTermMonths` ≤ `simulationMonths` (loans cannot exceed simulation)

### Platform-Specific Constraints
- Different platforms may have different parameter limits
- Platform selection affects available loan terms
- Custom platform parameters (when available) override defaults

### Strategy-Specific Constraints
- ATH-based strategies require historical price data
- Moving average strategies need sufficient historical data for MA calculation
- Strategy parameters must be within valid ranges for strategy to function

## State Management Dependencies

### Context Propagation
- `SimulationContext` provides global parameter state
- Parameter changes trigger recalculation of dependent values
- State updates must maintain consistency across components

### Storage Dependencies
- Parameters persist in sessionStorage
- Changes to core parameters invalidate cached calculations
- Price data caching depends on parameter stability

## Performance Dependencies

### Calculation Triggers
- Price model changes trigger full recalculation
- Parameter changes may trigger partial or full recalculation
- Debounced updates prevent excessive recalculation during user input

### Data Loading Dependencies
- Historical price data must load before certain calculations
- Price projections depend on successful data loading
- Error states propagate through dependent calculations

## UI Dependencies

### Component Visibility
- Strategy parameter cards only show when relevant strategy is selected
- Price model interfaces change based on selected model
- Validation messages depend on parameter relationships

### Real-time Updates
- Helper text calculations update when dependencies change
- Chart data updates when price or simulation parameters change
- Analytics recalculate when growth rates or simulation length changes

## Error Propagation

### Validation Errors
- Invalid parameters prevent simulation execution
- Dependency violations show specific error messages
- Error states clear when dependencies are resolved

### Calculation Errors
- Price projection errors affect strategy calculations
- Strategy errors may prevent loan decisions
- Error recovery attempts to use fallback values where possible
