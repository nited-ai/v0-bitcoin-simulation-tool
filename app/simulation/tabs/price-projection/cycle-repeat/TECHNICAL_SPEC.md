# Enhanced Cycle Repeat Model - Technical Specification

## Architecture Overview

The Enhanced Cycle Repeat Model is implemented as a TypeScript class that extends the base `PriceProjectionModel` interface. It follows the Bitcoin Cycle Repeat Chart methodology popularized by trading platforms like BPPO.

## Core Algorithm

### 1. Historical Data Extraction

```typescript
private extractPercentageMovements(
  historicalData: HistoricalDataPoint[], 
  fourYearsAgo: Date, 
  today: Date
): number[]
```

**Purpose**: Extract percentage movements from exactly 4 years of historical data

**Process**:
1. Convert date range to Unix timestamps
2. Filter historical data to 4-year window
3. Sort data chronologically
4. Calculate percentage movements between consecutive points
5. Return array of multipliers (e.g., 1.05 for +5%, 0.95 for -5%)

**Input**: 
- Historical data points with `time` and `close` fields
- Date range: exactly 4 years from today

**Output**: 
- Array of ~208 percentage movements (weekly data over 4 years)
- Range typically -30% to +30% for Bitcoin

### 2. Projection Generation

```typescript
for (let weekIndex = 0; weekIndex < totalWeeksNeeded; weekIndex++) {
  const movementIndex = weekIndex % percentageMovements.length
  const movement = percentageMovements[movementIndex]
  currentPrice *= adjustedMovement
}
```

**Purpose**: Apply historical movements sequentially to project future prices

**Process**:
1. Calculate total weeks needed (projectionMonths × 4.33)
2. Loop through each week of projection period
3. Use modulo operator to cycle through historical movements
4. Apply movement to current price
5. Generate monthly data points for output

**Key Features**:
- **Cycle Repetition**: Uses `%` operator to repeat 4-year pattern
- **Weekly Granularity**: Processes movements at weekly intervals
- **Monthly Output**: Generates points every ~4.33 weeks

### 3. Diminishing Returns (Optional)

```typescript
private applyDiminishingReturns(
  originalMovement: number,
  weekIndex: number,
  totalWeeks: number,
  params: DiminishingReturnsParams
): number
```

**Purpose**: Apply market maturation effects to reduce large gains over time

**Process**:
1. Preserve losses completely (market crashes remain realistic)
2. Preserve small gains below threshold
3. Apply progressive dampening to large gains
4. Ensure minimum gain ratio to prevent collapse

**Parameters**:
- `diminishingFactor`: 0-1 (strength of dampening effect)
- `cycleDegradation`: 0-0.3 (threshold for applying dampening)
- `maturityThreshold`: Market cap threshold (not currently used)
- `institutionalSaturation`: Saturation level (not currently used)

## Data Flow

### Input Data Structure

```typescript
interface HistoricalDataPoint {
  time: number;     // Unix timestamp in seconds
  close: number;    // Bitcoin closing price in USD
}

interface ProjectionParams {
  startPrice: number;           // Current Bitcoin price
  projectionMonths: number;     // Simulation length (typically 144)
  modelSpecificParams: {
    diminishingFactor: number;        // 0-1
    maturityThreshold: number;        // Market cap in USD
    cycleDegradation: number;         // 0-0.3
    institutionalSaturation: number;  // 0-1
  }
}
```

### Output Data Structure

```typescript
interface ProjectionPoint {
  price: number;        // Projected Bitcoin price
  timestamp: number;    // Unix timestamp in milliseconds
  confidence: number;   // 0.1-1.0 (decreases over time)
  metadata: {
    weekIndex: number;           // Week number in projection
    movementIndex: number;       // Index in historical movements array
    cycleNumber: number;         // Which cycle (1, 2, 3, etc.)
    originalMovement: number;    // Raw historical movement
    adjustedMovement: number;    // After diminishing returns
    approach: string;            // "cycle-repeat-percentage-movements"
  }
}
```

## Implementation Details

### Date Handling

```typescript
// Calculate exact 4-year lookback
const today = new Date()
const fourYearsAgo = new Date(today)
fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4)

// Convert to Unix timestamps for data filtering
const fourYearsAgoTimestamp = Math.floor(fourYearsAgo.getTime() / 1000)
const todayTimestamp = Math.floor(today.getTime() / 1000)
```

### Movement Calculation

```typescript
// Calculate percentage movements
for (let i = 1; i < fourYearData.length; i++) {
  const previousPrice = fourYearData[i - 1].close
  const currentPrice = fourYearData[i].close
  
  if (previousPrice > 0) {
    const percentageChange = currentPrice / previousPrice
    percentageMovements.push(percentageChange)
  }
}
```

### Cycle Repetition Logic

```typescript
// Repeat 4-year pattern over full projection period
const totalWeeksNeeded = Math.ceil(params.projectionMonths * 4.33)

for (let weekIndex = 0; weekIndex < totalWeeksNeeded; weekIndex++) {
  // Cycle through historical movements
  const movementIndex = weekIndex % percentageMovements.length
  const movement = percentageMovements[movementIndex]
  
  // Track which cycle we're in
  const cycleNumber = Math.floor(weekIndex / percentageMovements.length) + 1
}
```

### Monthly Point Generation

```typescript
// Generate monthly points (every ~4.33 weeks)
if (weekIndex % Math.round(4.33) === 0 || weekIndex === totalWeeksNeeded - 1) {
  const currentDate = new Date(startDate)
  currentDate.setDate(currentDate.getDate() + (weekIndex * 7))
  
  allProjectionPoints.push({
    price: currentPrice,
    timestamp: currentDate.getTime(),
    confidence: Math.max(0.1, 1 - (weekIndex / totalWeeksNeeded) * 0.5),
    metadata: { /* ... */ }
  })
}
```

## Performance Characteristics

### Time Complexity
- **Data Extraction**: O(n) where n = historical data points
- **Projection Generation**: O(m) where m = projection weeks
- **Overall**: O(n + m) - linear complexity

### Space Complexity
- **Historical Movements**: O(p) where p ≈ 208 (4 years of weekly data)
- **Projection Points**: O(q) where q ≈ 144 (monthly points)
- **Overall**: O(p + q) - linear space usage

### Typical Performance
- **Historical Data**: 621 weekly points (12+ years available)
- **Movements Extracted**: 208 weekly movements (4 years)
- **Projection Period**: 624 weeks (12 years)
- **Output Points**: 157 monthly points
- **Processing Time**: <100ms on modern hardware

## Error Handling

### Data Validation

```typescript
// Ensure sufficient historical data
if (historicalData.length < 2) {
  console.warn("Insufficient historical data")
  return []
}

// Validate 4-year period coverage
if (fourYearData.length < 2) {
  console.warn("Insufficient data in 4-year period")
  return []
}
```

### Fallback Mechanisms

```typescript
// Fallback for diminishing returns errors
try {
  adjustedMovement = this.applyDiminishingReturns(/* ... */)
} catch (error) {
  console.error("Error in applyDiminishingReturns:", error)
  adjustedMovement = movement // Use original movement
}
```

### Logging & Debugging

```typescript
// Comprehensive logging for validation
console.log(`📅 Today: ${today.toDateString()}`)
console.log(`📅 Four years ago: ${fourYearsAgo.toDateString()}`)
console.log(`📊 Extracted ${percentageMovements.length} percentage movements`)
console.log(`📈 Movement range: ${minMovement}% to ${maxMovement}%`)
console.log(`🔄 Starting projection loop: ${totalWeeksNeeded} weeks to process`)
console.log(`✅ Projection loop complete: Generated ${allProjectionPoints.length} points over ${totalCycles} cycles`)
```

## Integration Points

### Data Sources
- **Historical Data**: Centralized Data Service (weekly Bitcoin prices)
- **Current Price**: Real-time API (CoinGecko, CoinCap)
- **Parameters**: UI Controls (DiminishingReturnsControls.tsx)

### Output Consumers
- **Chart Component**: UnifiedPriceChart.tsx
- **Analytics**: Growth Rate Analysis component
- **Export**: CSV download functionality
- **Strategy Engine**: Future integration point

## Testing & Validation

### Unit Tests (Recommended)

```typescript
describe('EnhancedCycleRepeatModel', () => {
  test('extractPercentageMovements returns correct count', () => {
    // Test with 4 years of mock data
    // Expect ~208 movements for weekly data
  })
  
  test('projection covers full simulation period', () => {
    // Test with 144 month projection
    // Expect points extending to 2037
  })
  
  test('cycle repetition works correctly', () => {
    // Test movement cycling
    // Expect pattern to repeat every 208 weeks
  })
})
```

### Integration Tests

1. **End-to-End**: Full projection generation with real data
2. **Chart Rendering**: Verify chart displays full projection period
3. **Parameter Changes**: Test different diminishing returns settings
4. **Data Validation**: Test with various historical data scenarios

### Manual Validation

1. **Console Logs**: Verify extraction and projection metrics
2. **Chart Inspection**: Check for continuous curve from 2025-2037
3. **Growth Analysis**: Validate reasonable growth rates and volatility
4. **Cycle Verification**: Confirm pattern repetition in price movements
