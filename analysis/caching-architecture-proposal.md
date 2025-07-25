# Simplified Caching Architecture Proposal

## Current Problem Analysis

### **What's Currently Cached:**
1. **HistoricalDataCache**: Raw historical data (`HistoricalDataPoint[]`) ✅ GOOD
2. **ChartDataCache**: Complete chart data (`PriceChartDataPoint[]`) ❌ PROBLEMATIC

### **The Issue:**
`PriceChartDataPoint` contains mixed data:
```typescript
export interface PriceChartDataPoint {
  date: string
  days: number
  historicalPrice?: number    // ✅ Should be cached (static)
  simulationPath?: number     // ❌ Should NEVER be cached (dynamic)
  support?: number           // ✅ Could be cached (deterministic)
  resistance?: number        // ✅ Could be cached (deterministic)  
  fit?: number              // ✅ Could be cached (deterministic)
}
```

## Proposed Solution

### **New Architecture:**

#### **1. Keep Historical Data Caching (No Changes)**
```typescript
// lib/price-engine/cache-manager.ts - KEEP AS IS
class HistoricalDataCache {
  // Caches raw HistoricalDataPoint[] from API
  // 24-hour cache, incremental updates
  // This is working perfectly
}
```

#### **2. Remove Chart Data Caching Entirely**
```typescript
// lib/price-engine/chart-cache-manager.ts - DELETE THIS FILE
// No more caching of PriceChartDataPoint[]
```

#### **3. Simplified Price Engine**
```typescript
// lib/price-engine/index.ts - SIMPLIFIED
export async function generatePriceChartData(
  params: PriceEngineParams,
  historicalData: HistoricalDataPoint[], // Already cached separately
): Promise<PriceChartDataPoint[]> {
  
  // 1. Generate projection (NEVER cached)
  const futurePath = generateProjectionForModel(params)
  
  // 2. Combine with historical data (already cached)
  const chartData = combineHistoricalAndProjection(historicalData, futurePath)
  
  // 3. Add Power Law lines (deterministic, could be cached separately if needed)
  addPowerLawLines(chartData)
  
  return chartData // Always fresh projections
}
```

#### **4. Optional: Power Law Line Caching (Future Enhancement)**
```typescript
// If Power Law calculation becomes expensive, cache separately
class PowerLawCache {
  // Cache only the deterministic Power Law lines
  // Key: date range + genesis date
  // Value: {support, resistance, fit} values
}
```

## Benefits of This Approach

### **✅ Immediate Benefits:**
1. **Historical Data**: Still cached (fast loading)
2. **Projections**: Always fresh (immediate updates)
3. **No Cache Invalidation**: No complex cache key management
4. **Simpler Code**: Remove entire ChartDataCache system
5. **No More Bugs**: Eliminates all cache-related projection issues

### **✅ Performance Impact:**
- **Historical Data Loading**: Still fast (cached)
- **Projection Calculation**: Minimal overhead (simple math operations)
- **Power Law Lines**: Deterministic calculation (could cache later if needed)
- **Overall**: Negligible performance impact, much more reliable

### **✅ Maintenance:**
- **Fewer Cache Systems**: Only one cache to maintain
- **No Cache Keys**: No complex parameter hashing
- **No Cache Invalidation**: No need to clear caches on parameter changes
- **Simpler Debugging**: Clear separation of concerns

## Implementation Plan

### **Phase 1: Remove Chart Caching**
1. Delete `lib/price-engine/chart-cache-manager.ts`
2. Remove chart cache imports from `lib/price-engine/index.ts`
3. Simplify `generatePriceChartData()` to always generate fresh
4. Remove all chart cache clearing logic from UI

### **Phase 2: Clean Up UI**
1. Remove aggressive cache clearing workarounds
2. Remove `clearChartCache()` calls from prognosis line changes
3. Remove `setPriceChartData([])` force clearing
4. Simplify useEffect dependencies

### **Phase 3: Test & Verify**
1. Verify historical data still caches properly
2. Verify projections update immediately on parameter changes
3. Verify no performance regression
4. Clean up debug logs

## Expected Outcome

### **User Experience:**
- ✅ Historical data loads quickly (cached)
- ✅ Price projections update immediately when changing:
  - Price model (Manual → Power Law)
  - Prognosis line (Support → Fit → Resistance)  
  - Growth rates, simulation months, etc.
- ✅ No more cache-related bugs or workarounds needed

### **Developer Experience:**
- ✅ Simpler codebase (remove ~300 lines of cache management)
- ✅ Easier debugging (clear data flow)
- ✅ No cache invalidation logic needed
- ✅ Predictable behavior (projections always fresh)

### **Performance:**
- ✅ Historical data: Fast (cached)
- ✅ Projections: Instant (simple calculations)
- ✅ Overall: Same or better performance with much more reliability

## Files to Modify

### **Delete:**
- `lib/price-engine/chart-cache-manager.ts`

### **Modify:**
- `lib/price-engine/index.ts` - Remove chart caching
- `app/simulation.tsx` - Remove cache clearing workarounds
- `public/test-price-switching.js` - Update test functions

### **Keep Unchanged:**
- `lib/price-engine/cache-manager.ts` - Historical data caching
- `lib/price-engine/historical-data-loader.ts` - Historical data loading
- All price model files (`manual.ts`, `power-law.ts`, etc.)

This approach follows the principle: **Cache expensive operations (API calls), not cheap calculations (projections)**.
