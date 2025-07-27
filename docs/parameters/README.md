# Bitcoin Simulation Tool - Parameters Documentation

This documentation provides a comprehensive overview of all parameters available in the Bitcoin Simulation Tool, their usage, dependencies, and validation rules.

## Table of Contents

1. [Global Parameters Overview](#global-parameters-overview)
2. [Price Projection Model Parameters](#price-projection-model-parameters)
3. [Strategy Parameters](#strategy-parameters)
4. [Parameter Dependencies](#parameter-dependencies)
5. [Parameter Validation Rules](#parameter-validation-rules)

## Global Parameters Overview

These parameters are available across all components and affect the entire simulation.

### Basic Parameters

| Parameter | Type | Default | Description | Usage |
|-----------|------|---------|-------------|-------|
| `btcAmount` | number | 1 | Initial Bitcoin amount in BTC | Used as starting collateral for all calculations |
| `initialBtcPrice` | number | 100000 | Current Bitcoin price in EUR | Starting point for price projections |
| `monthlyWithdrawalAmount` | number | 0 | Monthly withdrawal in EUR | Amount withdrawn monthly from BTC stack |
| `simulationMonths` | number | 144 | Simulation duration in months | Global timeline for all models (1-300 months) |
| `btcAccumulation` | boolean | true | Enable BTC accumulation mode | When enabled, excess funds buy more BTC |

### Risk Management Parameters

| Parameter | Type | Default | Description | Usage |
|-----------|------|---------|-------------|-------|
| `riskLevel` | RiskLevel | "optimistic" | Overall risk preference | Influences preset selections across models |
| `platform` | Platform | "firefish" | Lending platform selection | Determines loan terms and conditions |

**Risk Levels:**
- `conservative`: Low risk, steady growth expectations
- `moderate`: Balanced risk/reward approach
- `optimistic`: Higher growth expectations with volatility
- `moonshots`: Maximum risk/reward scenarios

**Platforms:**
- `firefish`: Flexible lending platform with competitive rates
- `strike`: Lightning-fast loans with instant approval
- `custom`: Custom platform configuration (Coming Soon)

### Loan Parameters

| Parameter | Type | Default | Description | Usage |
|-----------|------|---------|-------------|-------|
| `maxLoanAmountPercent` | number | 15 | Max loan as % of BTC stack | Percentage of total BTC value available for loans |
| `annualInterestRate` | number | 6.5 | Annual interest rate (%) | Yearly interest charged on loans |
| `loanOriginationFeePercent` | number | 1.5 | Origination fee (%) | One-time fee when loan is created |
| `liquidationFeePercent` | number | 5.0 | Liquidation fee (%) | Fee charged when collateral is liquidated |
| `loanTermMonths` | number | 6 | Loan term in months | Duration of loan repayment (6, 12, 24, 36, or Infinity) |
| `riskManagement.targetLtv` | number | 50 | Initial LTV (%) | Target Loan-to-Value ratio when taking loans |
| `riskManagement.liquidationLtv` | number | 95 | Liquidation LTV (%) | LTV threshold that triggers liquidation |

## Price Projection Model Parameters

Parameters specific to different price projection models.

### Manual Growth Model

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `annualGrowthRates` | number[] | [180, -60, -20, ...] | Annual growth rates for each year (%) |
| `priceModel` | "manual" | "manual" | Identifies manual growth model |

**Presets Available:**
- Conservative: Steady growth with moderate volatility
- Moderate: Balanced growth reflecting typical Bitcoin cycles
- Optimistic: High growth potential with significant volatility
- Moonshot: Extreme bull case scenario
- Custom: User-defined individual year rates

### Power Law Model

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `priceModel` | "powerLaw" | "powerLaw" | Identifies Power Law model |
| `powerLawSettings.prognosisLine` | PowerLawLine | "fit" | Which Power Law line to use for projections |

**Prognosis Lines:**
- `fit`: Best-fit regression line through historical data
- `support`: Support line connecting major price bottoms
- `resistance`: Resistance line connecting major price peaks

### Cycle Repeat Model

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `priceModel` | "cycleRepeat" | "cycleRepeat" | Identifies Cycle Repeat model |
| `historicalDailyMultipliers` | number[] | null | Pre-calculated historical patterns |

### Cycle Repeat + Power Law Model

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `priceModel` | "cycleRepeatPowerLaw" | "cycleRepeatPowerLaw" | Identifies hybrid model |
| `historicalChannelPositions` | number[] | null | Historical channel position data |

## Strategy Parameters

Parameters for different investment strategies.

### Default Strategy

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `investmentStrategy` | "default" | "default" | Basic strategy with no special rules |

### ATH-Based Strategy

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `investmentStrategy` | "athBased" | "athBased" | ATH-based investment strategy |
| `athBasedParams.athThresholdPercent` | number | 80 | Investment limit at X% of ATH |
| `athBasedParams.investmentMultiplier` | number | 2.0 | Investment multiplier when conditions are met |

### Moving Average Strategy

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `investmentStrategy` | "movingAverage" | "movingAverage" | Moving average based strategy |
| `movingAverageParams.maPeriodDays` | number | 200 | Moving average period in days |
| `movingAverageParams.investmentMultiplier` | number | 1.5 | Multiplier when price is above MA |

### ATH Collateral Strategy

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `investmentStrategy` | "athCollateral" | "athCollateral" | Advanced ATH-based collateral management |
| `athCollateralParams.maxDrawdownPercent` | number | 80 | Maximum drawdown from ATH to tolerate |
| `athCollateralParams.collateralMultiplier` | number | 2.0 | Target collateral as multiple of debt |
| `athCollateralParams.athLookbackMonths` | number | 36 | Months to look back for ATH calculation |
| `athCollateralParams.emergencyCollateralBuffer` | number | 1.2 | Additional buffer for emergency situations |

## Parameter Usage Examples

### Basic Simulation Setup
```typescript
const basicParams: Partial<SimulationParams> = {
  btcAmount: 2.5,
  initialBtcPrice: 95000,
  monthlyWithdrawalAmount: 2000,
  simulationMonths: 120, // 10 years
  riskLevel: "moderate"
}
```

### Conservative Loan Configuration
```typescript
const conservativeLoan: Partial<SimulationParams> = {
  maxLoanAmountPercent: 10, // Only 10% of BTC stack
  annualInterestRate: 5.5,
  riskManagement: {
    targetLtv: 40,
    liquidationLtv: 85
  }
}
```

### Aggressive Growth Strategy
```typescript
const aggressiveStrategy: Partial<SimulationParams> = {
  priceModel: "manual",
  annualGrowthRates: [200, -40, 150, 300, -50, 180],
  investmentStrategy: "athCollateral",
  athCollateralParams: {
    maxDrawdownPercent: 85,
    collateralMultiplier: 2.5
  }
}
```

## Quick Reference

### Parameter Categories
- **[Global Parameters](#global-parameters-overview)**: Affect entire simulation
- **[Price Models](price-models.md)**: Control price projections
- **[Strategies](strategies.md)**: Investment decision logic
- **[Dependencies](dependencies.md)**: Parameter relationships
- **[Validation](validation.md)**: Rules and constraints

### Key Relationships
- BTC Stack Value = `btcAmount` × `initialBtcPrice`
- Max Loan = BTC Stack Value × (`maxLoanAmountPercent` / 100)
- Required Collateral = Max Loan / (`initialBtcPrice` × `targetLtv` / 100)
- Liquidation Price = Max Loan / (Required Collateral × `liquidationLtv` / 100)

### Common Validation Rules
- `targetLtv` < `liquidationLtv`
- `maxLoanAmountPercent` ≤ 100
- `simulationMonths` ≥ 1
- All percentages ≥ 0

For detailed information, see the specific documentation files:
- [Parameter Dependencies](dependencies.md)
- [Validation Rules](validation.md)
