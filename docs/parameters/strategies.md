# Investment Strategies

This document details the parameters and behavior of each investment strategy available in the Bitcoin Simulation Tool.

## Overview

Investment strategies determine when and how much to borrow against Bitcoin collateral. Each strategy has specific parameters and decision-making logic.

## Default Strategy

### Description
Basic strategy with no special rules - borrows consistently based on withdrawal needs.

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `investmentStrategy` | "default" | Strategy identifier |

### Behavior
- Borrows when monthly withdrawal exceeds available funds
- Uses standard LTV ratios without modification
- No market timing or risk adjustment
- Consistent borrowing pattern

### Usage Example
```typescript
const defaultStrategy = {
  investmentStrategy: "default" as const
}
```

### Characteristics
- **Security Rating**: 3/5 (Moderate)
- **Complexity Rating**: 1/5 (Very Simple)
- **Suitable For**: Beginners, consistent income needs
- **Criteria**: Withdrawal requirements only

## ATH-Based Strategy

### Description
Limits borrowing when Bitcoin price is below a percentage of its All-Time High.

### Parameters
| Parameter | Type | Default | Description | Range |
|-----------|------|---------|-------------|-------|
| `investmentStrategy` | "athBased" | "athBased" | Strategy identifier | Fixed |
| `athBasedParams.athThresholdPercent` | number | 80 | Investment limit threshold | 50-100% |
| `athBasedParams.investmentMultiplier` | number | 2.0 | Investment boost when above threshold | 0.1-5.0 |

### Behavior
- Calculates current price as percentage of ATH
- Reduces borrowing when below threshold
- Increases borrowing when above threshold
- Protects against borrowing in downtrends

### Usage Example
```typescript
const athBasedStrategy = {
  investmentStrategy: "athBased" as const,
  athBasedParams: {
    athThresholdPercent: 75, // More conservative
    investmentMultiplier: 1.8  // Moderate boost
  }
}
```

### Decision Logic
```typescript
if (currentPrice / athPrice >= athThresholdPercent / 100) {
  allowInvestment = true
  investmentMultiplier = athBasedParams.investmentMultiplier
} else {
  allowInvestment = false
  investmentMultiplier = 0.5 // Reduced borrowing
}
```

### Characteristics
- **Security Rating**: 4/5 (Safe)
- **Complexity Rating**: 2/5 (Simple)
- **Suitable For**: Conservative investors, trend followers
- **Criteria**: ATH percentage, market timing

## Moving Average Strategy

### Description
Adjusts borrowing based on Bitcoin price relative to its moving average.

### Parameters
| Parameter | Type | Default | Description | Range |
|-----------|------|---------|-------------|-------|
| `investmentStrategy` | "movingAverage" | "movingAverage" | Strategy identifier | Fixed |
| `movingAverageParams.maPeriodDays` | number | 200 | Moving average period | 50-500 days |
| `movingAverageParams.investmentMultiplier` | number | 1.5 | Multiplier when above MA | 0.1-3.0 |

### Behavior
- Calculates moving average over specified period
- Increases borrowing when price is above MA
- Reduces borrowing when price is below MA
- Smooths out short-term volatility

### Usage Example
```typescript
const movingAverageStrategy = {
  investmentStrategy: "movingAverage" as const,
  movingAverageParams: {
    maPeriodDays: 150,     // Shorter period, more responsive
    investmentMultiplier: 2.0  // Higher multiplier
  }
}
```

### Decision Logic
```typescript
const movingAverage = calculateMA(historicalPrices, maPeriodDays)
if (currentPrice >= movingAverage) {
  allowInvestment = true
  investmentMultiplier = movingAverageParams.investmentMultiplier
} else {
  allowInvestment = false
  investmentMultiplier = 0.7 // Reduced borrowing
}
```

### Characteristics
- **Security Rating**: 3/5 (Moderate)
- **Complexity Rating**: 3/5 (Moderate)
- **Suitable For**: Technical analysts, trend followers
- **Criteria**: Moving average crossover, trend direction

## ATH Collateral Strategy

### Description
Advanced strategy that dynamically adjusts collateral requirements based on drawdown from ATH.

### Parameters
| Parameter | Type | Default | Description | Range |
|-----------|------|---------|-------------|-------|
| `investmentStrategy` | "athCollateral" | "athCollateral" | Strategy identifier | Fixed |
| `athCollateralParams.maxDrawdownPercent` | number | 80 | Max drawdown tolerance | 50-95% |
| `athCollateralParams.collateralMultiplier` | number | 2.0 | Target collateral multiple | 1.1-5.0 |
| `athCollateralParams.athLookbackMonths` | number | 36 | ATH calculation period | 12-60 months |
| `athCollateralParams.emergencyCollateralBuffer` | number | 1.2 | Emergency buffer | 1.0-2.0 |

### Behavior
- Monitors drawdown from recent ATH
- Increases collateral requirements during drawdowns
- Provides emergency buffers for extreme scenarios
- Most sophisticated risk management

### Usage Example
```typescript
const athCollateralStrategy = {
  investmentStrategy: "athCollateral" as const,
  athCollateralParams: {
    maxDrawdownPercent: 85,        // Higher risk tolerance
    collateralMultiplier: 2.5,     // More conservative collateral
    athLookbackMonths: 24,         // Shorter lookback
    emergencyCollateralBuffer: 1.5 // Higher emergency buffer
  }
}
```

### Decision Logic
```typescript
const recentAth = calculateATH(historicalPrices, athLookbackMonths)
const currentDrawdown = (recentAth - currentPrice) / recentAth * 100

if (currentDrawdown <= maxDrawdownPercent) {
  allowInvestment = true
  targetLtvOverride = baseTargetLtv / collateralMultiplier
} else {
  allowInvestment = false
  targetLtvOverride = baseTargetLtv / (collateralMultiplier * emergencyCollateralBuffer)
}
```

### Characteristics
- **Security Rating**: 5/5 (Very Safe)
- **Complexity Rating**: 5/5 (Very Complex)
- **Suitable For**: Advanced users, risk-conscious investors
- **Criteria**: Drawdown analysis, dynamic collateral management

## Strategy Comparison

### Risk vs Reward
| Strategy | Risk Level | Potential Return | Complexity | Best For |
|----------|------------|------------------|------------|----------|
| Default | Medium | Medium | Low | Beginners |
| ATH-Based | Low | Medium-High | Low-Medium | Conservative |
| Moving Average | Medium | Medium-High | Medium | Technical |
| ATH Collateral | Very Low | Medium | High | Advanced |

### Market Conditions
| Strategy | Bull Market | Bear Market | Sideways | Volatile |
|----------|-------------|-------------|----------|----------|
| Default | Good | Poor | Fair | Poor |
| ATH-Based | Excellent | Good | Fair | Good |
| Moving Average | Good | Fair | Good | Fair |
| ATH Collateral | Good | Excellent | Good | Excellent |

## Parameter Optimization

### Conservative Settings
```typescript
// Lower risk, steady approach
const conservativeParams = {
  athBasedParams: {
    athThresholdPercent: 85,     // Higher threshold
    investmentMultiplier: 1.2    // Lower multiplier
  },
  athCollateralParams: {
    maxDrawdownPercent: 70,      // Lower drawdown tolerance
    collateralMultiplier: 3.0,   // Higher collateral requirement
    emergencyCollateralBuffer: 1.5
  }
}
```

### Aggressive Settings
```typescript
// Higher risk, higher potential return
const aggressiveParams = {
  athBasedParams: {
    athThresholdPercent: 60,     // Lower threshold
    investmentMultiplier: 3.0    // Higher multiplier
  },
  athCollateralParams: {
    maxDrawdownPercent: 90,      // Higher drawdown tolerance
    collateralMultiplier: 1.5,   // Lower collateral requirement
    emergencyCollateralBuffer: 1.1
  }
}
```

## Strategy Selection Guidelines

### Choose Default When:
- New to Bitcoin lending
- Want simple, predictable behavior
- Don't want to monitor market conditions
- Need consistent withdrawal amounts

### Choose ATH-Based When:
- Want to avoid borrowing in downtrends
- Believe in trend-following approach
- Want simple market timing
- Prefer conservative risk management

### Choose Moving Average When:
- Have technical analysis experience
- Want responsive market timing
- Comfortable with moderate complexity
- Believe in trend continuation

### Choose ATH Collateral When:
- Want maximum risk protection
- Have advanced understanding of markets
- Can handle complex parameter tuning
- Prioritize capital preservation

## Performance Metrics

### Strategy Effectiveness
- **Drawdown Reduction**: How much maximum drawdown is reduced
- **Return Enhancement**: Improvement in risk-adjusted returns
- **Volatility Management**: Reduction in portfolio volatility
- **Risk-Adjusted Return**: Sharpe ratio improvement

### Backtesting Results
- Historical performance across different market cycles
- Stress testing under extreme conditions
- Comparison with buy-and-hold approach
- Sensitivity analysis for parameter changes

## Implementation Notes

### Data Requirements
- All strategies need historical price data
- Moving Average requires sufficient history for MA calculation
- ATH strategies need complete price history for accurate ATH calculation
- Real-time price updates improve decision accuracy

### Computational Complexity
1. Default (lowest)
2. ATH-Based (low)
3. Moving Average (medium)
4. ATH Collateral (highest)

### Update Frequency
- Strategies recalculate decisions monthly
- Historical data updates affect future decisions
- Parameter changes trigger immediate recalculation
- Market data freshness impacts accuracy
