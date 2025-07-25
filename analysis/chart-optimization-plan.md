# Chart Optimization - Separate Historical Data from Projections

## 🔍 **Current Problem**

When switching price models, the entire chart reloads because:

```typescript
// CURRENT: Re-processes EVERYTHING every time
async function generatePriceChartDataOriginal(params, historicalData) {
  // 1. Generate projection (changes with model) ✅ Should regenerate
  const futurePath = generateProjectionForModel(params)
  
  // 2. Re-process ALL historical data (never changes) ❌ Wasteful!
  historicalData.forEach((point) => {
    const date = new Date(point.time * 1000)
    const dateString = date.toISOString().split("T")[0]
    dataMap.set(dateString, {
      date: dateString,
      days: getDaysSinceGenesis(date),
      historicalPrice: point.close, // ❌ Same every time!
    })
  })
  
  // 3. Merge historical + projection
  // 4. Add Power Law lines (if applicable)
}
```

**Result**: 3407 historical data points are re-processed every time, even though they never change!

## 🎯 **Optimal Solution**

### **New Architecture:**

```typescript
// OPTIMIZED: Separate concerns
class HistoricalChartDataCache {
  // Cache processed historical data structure once
  // Only regenerate when new historical data arrives
}

async function generatePriceChartData(params, historicalData) {
  // 1. Get cached historical chart structure (fast)
  const historicalChartData = await getHistoricalChartData(historicalData)
  
  // 2. Generate only the projection (fast)
  const projectionPath = generateProjectionForModel(params)
  
  // 3. Merge cached historical + new projection (fast)
  const chartData = mergeHistoricalAndProjection(historicalChartData, projectionPath)
  
  return chartData
}
```

### **Performance Comparison:**

| Operation | Current | Optimized |
|-----------|---------|-----------|
| **Historical Processing** | Every time (slow) | Once per session (cached) |
| **Price Model Switch** | Full regeneration | Only projection (instant) |
| **Prognosis Line Switch** | Full regeneration | Only projection (instant) |
| **Parameter Changes** | Full regeneration | Only projection (instant) |

## 🛠️ **Implementation Plan**

### **1. Create Historical Chart Data Cache**
```typescript
// lib/price-engine/historical-chart-cache.ts
class HistoricalChartDataCache {
  private cache = new Map<string, PriceChartDataPoint[]>()
  
  async getHistoricalChartData(historicalData: HistoricalDataPoint[]): Promise<PriceChartDataPoint[]> {
    const cacheKey = `historical-${historicalData.length}`
    
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Using cached historical chart data (${historicalData.length} points)`)
      return this.cache.get(cacheKey)!
    }
    
    console.log(`🔄 Processing historical data for chart (${historicalData.length} points)`)
    const chartData = this.processHistoricalData(historicalData)
    this.cache.set(cacheKey, chartData)
    return chartData
  }
  
  private processHistoricalData(historicalData: HistoricalDataPoint[]): PriceChartDataPoint[] {
    return historicalData.map(point => ({
      date: new Date(point.time * 1000).toISOString().split("T")[0],
      days: getDaysSinceGenesis(new Date(point.time * 1000)),
      historicalPrice: point.close,
      // No projection data - will be added separately
    }))
  }
}
```

### **2. Create Projection Generator**
```typescript
// lib/price-engine/projection-generator.ts
export function generateProjectionPath(params: PriceEngineParams): { date: Date; price: number }[] {
  console.log(`🎯 Generating projection for model: ${params.priceModel}`)
  
  switch (params.priceModel) {
    case "manual":
      return generateManualPath(params)
    case "powerLaw":
      return generatePowerLawPath(params)
    case "cycleRepeat":
      return generateCycleRepeatPath(params)
    case "cycleRepeatPowerLaw":
      return generateCycleRepeatPowerLawPath(params)
    default:
      throw new Error(`Unknown price model: ${params.priceModel}`)
  }
}
```

### **3. Create Chart Data Merger**
```typescript
// lib/price-engine/chart-merger.ts
export function mergeHistoricalAndProjection(
  historicalChartData: PriceChartDataPoint[],
  projectionPath: { date: Date; price: number }[]
): PriceChartDataPoint[] {
  
  const dataMap = new Map<string, PriceChartDataPoint>()
  
  // Add cached historical data (already processed)
  historicalChartData.forEach(point => {
    dataMap.set(point.date, { ...point })
  })
  
  // Add projection data
  projectionPath.forEach(point => {
    const dateString = point.date.toISOString().split("T")[0]
    const existingPoint = dataMap.get(dateString) || {
      date: dateString,
      days: getDaysSinceGenesis(point.date),
    }
    dataMap.set(dateString, {
      ...existingPoint,
      simulationPath: point.price,
    })
  })
  
  return Array.from(dataMap.values()).sort((a, b) => a.days - b.days)
}
```

### **4. Optimized Main Function**
```typescript
// lib/price-engine/index.ts
const historicalChartCache = new HistoricalChartDataCache()

export async function generatePriceChartData(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[],
): Promise<PriceChartDataPoint[]> {
  console.log("🚀 Generating optimized price chart data...")
  const startTime = performance.now()

  // 1. Get cached historical chart data (fast)
  const historicalChartData = await historicalChartCache.getHistoricalChartData(historicalData)
  
  // 2. Generate only the projection (fast)
  const projectionPath = generateProjectionPath(params)
  
  // 3. Merge cached historical + new projection (fast)
  const chartData = mergeHistoricalAndProjection(historicalChartData, projectionPath)
  
  // 4. Add Power Law lines if needed
  if (params.priceModel === 'powerLaw') {
    addPowerLawLines(chartData, params)
  }

  const totalTime = performance.now() - startTime
  console.log(`✅ Optimized chart data generated in ${Math.round(totalTime)}ms (${chartData.length} points)`)
  
  return chartData
}
```

## ✅ **Expected Benefits**

### **Performance:**
- **First Load**: Same speed (historical data processed once)
- **Price Model Switch**: ~90% faster (only projection calculation)
- **Prognosis Line Switch**: ~90% faster (only projection calculation)
- **Parameter Changes**: ~90% faster (only projection calculation)

### **User Experience:**
- **Historical Data**: Loads once, cached for session
- **Price Model Switching**: Nearly instantaneous
- **Prognosis Line Changes**: Immediate updates
- **Smooth Interactions**: No more full chart reloads

### **Console Logs:**
```
✅ First load:
🔄 Processing historical data for chart (3407 points)
🎯 Generating projection for model: manual
✅ Optimized chart data generated in Xms

✅ Price model switch:
📦 Using cached historical chart data (3407 points)
🎯 Generating projection for model: powerLaw
✅ Optimized chart data generated in Xms (much faster!)

✅ Prognosis line switch:
📦 Using cached historical chart data (3407 points)
🎯 Generating projection for model: powerLaw
✅ Optimized chart data generated in Xms (instant!)
```

This optimization follows the principle: **"Cache expensive operations (historical data processing), not cheap calculations (projections)"** - but now we're caching the processed historical chart structure, not the final combined result.
