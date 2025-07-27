# Price Projection Models

This document details the parameters and behavior of each price projection model available in the Bitcoin Simulation Tool.

## Overview

Price projection models determine how Bitcoin prices evolve over the simulation period. Each model has specific parameters and use cases.

## Manual Growth Model

### Description
User-defined annual growth rates for complete control over price projections.

### Parameters
| Parameter | Type | Description | Validation |
|-----------|------|-------------|------------|
| `priceModel` | "manual" | Model identifier | Fixed value |
| `annualGrowthRates` | number[] | Growth rate for each year (%) | -95% to 1000% per rate |

### Presets
- **Conservative**: Steady growth with moderate volatility
  - Average: ~15% annual growth
  - Volatility: ±30% typical range
  - Use case: Risk-averse investors

- **Moderate**: Balanced growth reflecting Bitcoin cycles
  - Average: ~25% annual growth
  - Volatility: ±50% typical range
  - Use case: Standard investment approach

- **Optimistic**: High growth with significant volatility
  - Average: ~40% annual growth
  - Volatility: ±80% typical range
  - Use case: Growth-focused investors

- **Moonshot**: Extreme bull case scenario
  - Average: ~60% annual growth
  - Volatility: ±150% typical range
  - Use case: Maximum risk/reward

- **Custom**: User-defined rates
  - Complete control over each year
  - No preset limitations
  - Use case: Specific scenarios

### Usage Example
```typescript
const manualGrowthParams = {
  priceModel: "manual" as const,
  annualGrowthRates: [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110],
  simulationMonths: 144
}
```

### Behavior
- Each year uses the corresponding growth rate from the array
- If simulation exceeds array length, last rate is repeated
- Rates compound annually from the initial BTC price
- Monthly prices interpolated between annual targets

## Power Law Model

### Description
Uses Bitcoin's historical power law regression for price projections.

### Parameters
| Parameter | Type | Description | Options |
|-----------|------|-------------|---------|
| `priceModel` | "powerLaw" | Model identifier | Fixed value |
| `powerLawSettings.prognosisLine` | PowerLawLine | Which line to use | "fit", "support", "resistance" |

### Prognosis Lines
- **Fit Line**: Best-fit regression through all historical data
  - Most balanced projection
  - Smooths out volatility
  - Good for long-term planning

- **Support Line**: Connects major price bottoms
  - Conservative projections
  - Represents price floor
  - Good for risk management

- **Resistance Line**: Connects major price peaks
  - Optimistic projections
  - Represents price ceiling
  - Good for maximum potential scenarios

### Usage Example
```typescript
const powerLawParams = {
  priceModel: "powerLaw" as const,
  powerLawSettings: {
    prognosisLine: "fit" as const
  },
  simulationMonths: 120
}
```

### Behavior
- Uses logarithmic regression on historical Bitcoin data
- Projects smooth exponential growth curve
- No volatility in projections (smooth line)
- Automatically adjusts for different time horizons

## Cycle Repeat Model

### Description
Repeats historical Bitcoin price patterns for future projections.

### Parameters
| Parameter | Type | Description | Usage |
|-----------|------|-------------|-------|
| `priceModel` | "cycleRepeat" | Model identifier | Fixed value |
| `historicalDailyMultipliers` | number[] | Pre-calculated patterns | Auto-generated |

### Behavior
- Analyzes historical 4-year Bitcoin cycles
- Identifies recurring patterns in price movements
- Projects future cycles based on historical behavior
- Includes realistic volatility patterns

### Usage Example
```typescript
const cycleRepeatParams = {
  priceModel: "cycleRepeat" as const,
  simulationMonths: 192, // 16 years (4 cycles)
  historicalDailyMultipliers: null // Auto-calculated
}
```

### Characteristics
- High volatility matching historical patterns
- Cyclical behavior with ~4-year periods
- Realistic boom/bust cycles
- Good for stress testing strategies

## Cycle Repeat + Power Law Model

### Description
Combines cycle patterns with Power Law channel boundaries.

### Parameters
| Parameter | Type | Description | Usage |
|-----------|------|-------------|-------|
| `priceModel` | "cycleRepeatPowerLaw" | Model identifier | Fixed value |
| `historicalChannelPositions` | number[] | Channel position data | Auto-calculated |

### Behavior
- Uses Power Law fit line as center channel
- Applies historical cycle patterns within channel bounds
- Provides both trend and volatility
- Most sophisticated projection model

### Usage Example
```typescript
const hybridParams = {
  priceModel: "cycleRepeatPowerLaw" as const,
  simulationMonths: 240, // 20 years
  historicalChannelPositions: null // Auto-calculated
}
```

### Characteristics
- Combines trend (Power Law) with cycles
- Bounded volatility within realistic ranges
- Long-term growth with short-term fluctuations
- Best for comprehensive analysis

## Model Selection Guidelines

### Choose Manual Growth When:
- You have specific growth expectations
- Testing particular scenarios
- Need complete control over projections
- Comparing different growth assumptions

### Choose Power Law When:
- Want smooth, trend-based projections
- Focus on long-term growth potential
- Need conservative/optimistic bounds
- Analyzing trend-following strategies

### Choose Cycle Repeat When:
- Want realistic volatility patterns
- Testing strategy resilience
- Analyzing cycle-based approaches
- Need historical pattern matching

### Choose Hybrid Model When:
- Want both trend and volatility
- Need comprehensive analysis
- Testing sophisticated strategies
- Balancing realism with trend

## Parameter Interactions

### With Simulation Length
- Longer simulations favor trend models (Power Law)
- Shorter simulations work well with Manual Growth
- Cycle models need sufficient time for pattern completion

### With Risk Level
- Conservative: Favor support lines, lower growth rates
- Moderate: Use fit lines, balanced approaches
- Optimistic: Use resistance lines, higher growth rates
- Moonshot: Maximum growth scenarios

### With Investment Strategies
- Trend-following strategies work well with Power Law
- Volatility-based strategies prefer Cycle models
- Manual Growth good for testing specific scenarios
- Hybrid models test strategy robustness

## Data Requirements

### Historical Data Needs
- Power Law: Requires complete Bitcoin price history
- Cycle Repeat: Needs multiple complete cycles
- Manual Growth: No historical data required
- Hybrid: Requires both price history and cycle data

### Calculation Complexity
- Manual Growth: Low (simple arithmetic)
- Power Law: Medium (logarithmic regression)
- Cycle Repeat: High (pattern analysis)
- Hybrid: Very High (combined calculations)

## Performance Considerations

### Calculation Speed
1. Manual Growth (fastest)
2. Power Law (fast)
3. Cycle Repeat (moderate)
4. Hybrid (slowest)

### Memory Usage
- Manual Growth: Minimal
- Power Law: Low
- Cycle Repeat: Moderate (historical patterns)
- Hybrid: High (multiple datasets)

### Update Frequency
- Manual Growth: Instant updates
- Power Law: Fast updates
- Cycle Repeat: Moderate delay
- Hybrid: Longer calculation time
