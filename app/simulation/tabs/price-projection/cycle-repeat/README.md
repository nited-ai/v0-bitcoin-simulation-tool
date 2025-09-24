# Enhanced Cycle Repeat Model

## Overview

The Enhanced Cycle Repeat Model implements a Bitcoin price projection approach based on the popular "Bitcoin Cycle Repeat Chart" methodology. This model takes the percentage movements from exactly 4 years ago and applies them sequentially to project future Bitcoin prices.

## Core Concept

The model is based on the principle that Bitcoin markets tend to follow cyclical patterns, and historical price movements can provide insights into future price behavior. Instead of predicting absolute prices, it repeats the **percentage movements** from a previous 4-year cycle.

### How It Works

1. **Historical Reference Point**: Takes today's date and looks back exactly 4 years
2. **Movement Extraction**: Calculates percentage movements (multipliers) from the 4-year historical period
3. **Sequential Application**: Applies these movements in the same order to project future prices
4. **Cycle Repetition**: Repeats the 4-year pattern multiple times to cover longer projection periods

## Implementation Details

### Data Structure

```typescript
// Historical data points (weekly intervals)
interface HistoricalDataPoint {
  time: number;    // Unix timestamp
  close: number;   // Closing price
}

// Percentage movements (multipliers)
// Example: 1.05 = +5% gain, 0.95 = -5% loss
const percentageMovements: number[] = [1.05, 0.95, 1.02, ...]
```

### Key Algorithm Steps

1. **Date Calculation**:
   ```typescript
   const today = new Date()
   const fourYearsAgo = new Date(today)
   fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4)
   ```

2. **Movement Extraction**:
   ```typescript
   for (let i = 1; i < fourYearData.length; i++) {
     const previousPrice = fourYearData[i - 1].close
     const currentPrice = fourYearData[i].close
     const percentageChange = currentPrice / previousPrice
     percentageMovements.push(percentageChange)
   }
   ```

3. **Projection Generation**:
   ```typescript
   for (let weekIndex = 0; weekIndex < totalWeeksNeeded; weekIndex++) {
     const movementIndex = weekIndex % percentageMovements.length
     const movement = percentageMovements[movementIndex]
     currentPrice *= movement
   }
   ```

## Example Scenario

**Date**: August 20, 2025
**Historical Period**: August 20, 2021 → August 20, 2025
**Projection Period**: August 20, 2025 → August 20, 2037 (12 years)

### Sample Data Flow

1. **Historical Data**: 208 weekly price movements from 2021-2025
2. **Movement Range**: -28.9% to +26.8% (realistic Bitcoin volatility)
3. **Cycle Repetition**: 208 movements × 3 cycles = 624 weeks (12 years)
4. **Output**: 157 monthly projection points

### Expected Results

- **Realistic Volatility**: Preserves both gains and losses from historical data
- **Cyclical Patterns**: Shows repeated boom/bust cycles
- **Long-term Growth**: Compounds the historical growth pattern over multiple cycles

## Configuration Parameters

### Diminishing Returns Theory

The model includes optional diminishing returns parameters to account for market maturation:

- **Diminishing Returns Strength**: 0-100% (how much large gains are reduced over time)
- **Market Maturity Threshold**: $0.5T-$10T (market cap threshold for maturation effects)
- **Cycle Degradation Rate**: 0-30% (how much each cycle's impact diminishes)
- **Institutional Saturation**: 0-100% (level of institutional market penetration)

### Preset Scenarios

1. **Conservative**: Strong diminishing returns (80%), high maturity threshold ($1T)
2. **Moderate**: Balanced approach (50%), medium threshold ($2T)
3. **Optimistic**: Minimal diminishing returns (20%), high threshold ($5T)

## Technical Implementation

### File Structure

```
cycle-repeat/
├── README.md                           # This documentation
├── DiminishingReturnsControls.tsx      # UI controls for parameters
└── EnhancedCycleRepeatModel.ts         # Core model implementation
```

### Key Methods

1. **`extractPercentageMovements()`**: Extracts movements from 4-year historical period
2. **`applyDiminishingReturns()`**: Applies optional market maturation effects
3. **`generateProjection()`**: Creates the full price projection

### Data Requirements

- **Historical Data**: Minimum 4 years of weekly Bitcoin price data
- **Current Price**: Real-time Bitcoin price as starting point
- **Projection Length**: Configurable simulation period (typically 12 years)

## Usage Examples

### Basic Usage

```typescript
const model = new EnhancedCycleRepeatModel()
const projection = await model.generateProjection({
  startPrice: 113346,
  projectionMonths: 144,
  modelSpecificParams: {
    diminishingFactor: 0.2,
    maturityThreshold: 5000000000,
    cycleDegradation: 0.05,
    institutionalSaturation: 0.2
  }
})
```

### Expected Output

```typescript
{
  modelName: "Enhanced Cycle Repeat Model",
  projectionPoints: [
    { price: 113346, timestamp: 1724140800000, confidence: 1.0 },
    { price: 111983, timestamp: 1726819200000, confidence: 0.98 },
    // ... 155 more monthly points
    { price: 1523281, timestamp: 2145916800000, confidence: 0.1 }
  ],
  metadata: {
    totalGrowth: 1242,
    averageMonthlyGrowth: 8.75,
    maxDecline: -73,
    cyclesCompleted: 3
  }
}
```

## Validation & Testing

### Console Output Verification

The model provides detailed logging for validation:

```
📅 Today: Wed Aug 20 2025
📅 Four years ago: Fri Aug 20 2021
📊 Extracted 208 percentage movements from Tue Aug 24 2021 to Tue Aug 19 2025
📈 Movement range: -28.9% to 26.8%
🔄 Starting projection loop: 624 weeks to process (repeating 208 historical movements)
✅ Projection loop complete: Generated 157 points over 3 cycles
   📊 Projection period: 624 weeks (12.0 years)
   🔄 Repeated 4-year pattern 3 times
```

### Quality Checks

1. **Data Completeness**: Ensures 4 years of historical data available
2. **Movement Validation**: Verifies realistic percentage ranges
3. **Cycle Integrity**: Confirms proper pattern repetition
4. **Output Validation**: Checks projection length and point count

## Limitations & Considerations

### Model Limitations

1. **Historical Dependency**: Assumes past patterns will repeat
2. **Market Evolution**: May not account for fundamental market changes
3. **External Factors**: Doesn't consider regulatory, technological, or macroeconomic changes
4. **Volatility Preservation**: Maintains historical volatility levels

### Best Practices

1. **Regular Updates**: Refresh historical data periodically
2. **Parameter Tuning**: Adjust diminishing returns based on market conditions
3. **Scenario Analysis**: Use multiple presets to explore different outcomes
4. **Validation**: Compare results with other projection models

## Future Enhancements

### Potential Improvements

1. **Dynamic Cycle Length**: Adjust cycle length based on market conditions
2. **Volatility Scaling**: Modify volatility based on market maturity
3. **Multi-Timeframe Analysis**: Incorporate different historical periods
4. **Confidence Intervals**: Add statistical confidence bands
5. **Real-time Calibration**: Adjust projections based on recent price action

### Integration Opportunities

1. **Strategy Engine**: Connect with trading strategy simulations
2. **Risk Management**: Integrate with portfolio risk calculations
3. **Backtesting**: Validate model accuracy against historical data
4. **API Integration**: Connect with real-time market data feeds
