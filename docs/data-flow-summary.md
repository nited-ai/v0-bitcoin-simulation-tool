# Bitcoin Simulation Tool - Data Flow Summary

## Quick Reference

### Current State (Post-Streamlining) ✅
- **Primary Data Source**: PostgreSQL Database (populated)
- **Database Status**: ✅ Active with 4,287 historical records
- **Data Points**: 4,287 historical records (2013-2024)
- **System Status**: ✅ Fully functional with centralized data service

## Data Flow Overview (Streamlined)

```
App Initialization → Centralized Data Service → PostgreSQL Database → All Components
                                ↓
                    Reactive State Management → Real-time Updates
```

## Key Files & Their Roles

### 🎯 Centralized Data Management (New)
| File | Role | Status |
|------|------|--------|
| `lib/services/centralized-data-service.ts` | Single source of truth | ✅ Active |
| `app/simulation/hooks/useCentralizedData.ts` | Main data hook | ✅ Active |
| `app/simulation/hooks/useHistoricalDataOnly.ts` | Lightweight historical hook | ✅ Active |
| `app/simulation/hooks/useCurrentPriceOnly.ts` | Lightweight current price hook | ✅ Active |

### 🗄️ Database Layer (Active)
| File | Role | Status |
|------|------|--------|
| `app/api/bitcoin-prices/historical/route.ts` | Historical data API | ✅ Populated DB |
| `app/api/bitcoin-prices/current/route.ts` | Current price API | ✅ Working |
| PostgreSQL Database | Primary data storage | ✅ 4,287 records |

### ❌ Removed/Deprecated Files
| File | Role | Status |
|------|------|--------|
| `app/simulation/data/historicalDataLoader.ts` | CSV fallback loader | ❌ Deleted |
| `lib/price-engine/cache-manager.ts` | Conflicting cache layer | ❌ Deleted |
| `lib/price-engine/historical-chart-cache.ts` | Chart-specific cache | ❌ Deleted |
| `app/simulation/hooks/useHistoricalData.ts` | Old data loading hook | ⚠️ Deprecated |

### 📊 Chart Components
| File | Role | Status |
|------|------|--------|
| `app/simulation/components/charts/UnifiedPriceChart.tsx` | Main price chart | ✅ Active |
| `app/simulation/components/charts/HistoricalDataChart.tsx` | Historical view | ✅ Active |
| `app/simulation/components/charts/PriceProjectionChart.tsx` | Price projections | ✅ Active |

## Data Sources

### 1. CSV File (Primary)
- **Location**: `public/btc-price-history.csv`
- **Format**: Currency,Date,Closing Price (USD),24h Open (USD),24h High (USD),24h Low (USD)
- **Range**: 2013-10-01 to present
- **Records**: 2,614 lines (2,613 data points + header)

### 2. External APIs (Live Data)
- **CoinGecko**: Free tier, 100 calls/day
- **CoinCap**: 1000 calls/day  
- **Binance**: 2400 calls/day
- **Usage**: Current price updates only

### 3. Database (Infrastructure Only)
- **Provider**: PostgreSQL (Vercel)
- **Status**: Schema exists, no data
- **Tables**: BitcoinPrice, DataUpdate

## Request Flow Details

### Historical Data Request
```
1. Component mounts
2. useHistoricalData hook triggers
3. loadHistoricalPriceData() called
4. Tries database-historical-loader (fails - empty DB)
5. Falls back to CSV loader
6. Fetches /btc-price-history.csv
7. Parses CSV to HistoricalDataPoint[]
8. Filters data (removes pre-2013)
9. Caches in memory/localStorage
10. Returns to component for chart rendering
```

### Current Price Request
```
1. loadCurrentBtcPrice() called
2. Tries /api/bitcoin-prices/current (fails - empty DB)
3. Falls back to external APIs
4. Returns latest price from CoinGecko/CoinCap/Binance
```

## Data Transformations

### CSV → Application Format
```typescript
// CSV Row
"BTC,2013-10-01,123.65499,124.30466,124.75166,122.56349"

// Becomes
{
  timestamp: 1380585600000,
  date: "2013-10-01",
  open: 124.30466,
  high: 124.75166,
  low: 122.56349,
  close: 123.65499
}
```

### Application → Chart Format
```typescript
// Application Data
{ timestamp: 1380585600000, close: 123.65499, ... }

// Becomes Chart Point
{
  date: "Oct 2013",
  price: 124,
  timestamp: 1380585600000,
  isHistorical: true,
  confidence: 1.0
}
```

## Performance Characteristics

### Loading Times
- **CSV Load**: ~200-500ms (first load)
- **Cached Load**: ~50-100ms (subsequent loads)
- **Chart Rendering**: ~100-200ms (4,287 points)

### Optimization Strategies
- **Data Sampling**: Every 7th point for weekly view
- **Memory Caching**: Parsed data cached in memory
- **localStorage**: Persistent cache across sessions
- **Lazy Loading**: Database loader only imported when needed

## Error Handling

### Fallback Chain
```
Database API → CSV File → Mock Data → Error State
```

### Error Recovery
- Database fails → CSV fallback
- CSV fails → Mock data generation
- Mock data fails → Error display to user
- All failures logged to console

## Monitoring & Debugging

### Console Logs
- `📊 Historical data loaded: X points in Yms`
- `💰 Current price: $X (source)`
- `❌ Database loader failed, using CSV method`
- `✅ Fallback CSV data loaded: X points`

### Performance Monitoring
- Load times tracked and reported
- Cache hit/miss ratios logged
- API response times measured

## Current Issues & Inconsistencies

### ⚠️ Problems
1. **Empty Database**: API routes exist but return no data
2. **Dual Loading Paths**: Two different historical data loaders
3. **Inconsistent Error Messages**: Don't reflect actual data source
4. **Unused Infrastructure**: Database seeding code present but disabled

### ✅ What Works Well
1. **Reliable CSV Fallback**: Always provides data
2. **Performance**: Fast loading with caching
3. **Chart Display**: Smooth rendering of 4,287 data points
4. **External APIs**: Current price updates work correctly

## Next Steps

### Option 1: Complete Database Migration
- Re-enable `prisma/seed.ts`
- Populate database from CSV
- Remove CSV fallback code

### Option 2: Simplify to CSV-Only
- Remove database infrastructure
- Simplify to single data loader
- Update documentation

### Option 3: Fix Hybrid Approach
- Improve error handling
- Add proper monitoring
- Document hybrid nature

## Quick Troubleshooting

### Charts Not Loading?
1. Check browser console for CSV fetch errors
2. Verify `public/btc-price-history.csv` exists
3. Check network tab for failed requests

### Wrong Price Data?
1. CSV file may be outdated
2. External API may be failing
3. Check console for API error messages

### Performance Issues?
1. Clear localStorage cache
2. Check for memory leaks in data caching
3. Reduce chart data sampling rate

---

**Last Updated**: 2025-07-29  
**Status**: System functional with CSV data source  
**Next Review**: When database migration decision is made
