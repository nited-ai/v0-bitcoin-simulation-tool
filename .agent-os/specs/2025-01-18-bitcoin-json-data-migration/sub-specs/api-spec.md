# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-01-18-bitcoin-json-data-migration/spec.md

> Created: 2025-01-18
> Version: 1.0.0

## Static File Endpoints

### GET /data/bitcoin/daily.json

**Purpose:** Provides complete daily Bitcoin price data from 2013 to present
**Format:** Optimized JSON with compact array format
**Size:** ~400KB
**Caching:** Browser + CDN cacheable, long-term cache headers

**Response Format:**
```json
{
  "meta": {
    "startDate": "2013-10-01",
    "endDate": "2024-12-31",
    "interval": "daily",
    "count": 4000,
    "lastUpdated": "2025-01-18T00:00:00Z"
  },
  "data": [
    [1380585600000, 123.65],
    [1380672000000, 125.46]
  ]
}
```

### GET /data/bitcoin/weekly.json

**Purpose:** Provides weekly aggregated Bitcoin price data for faster initial loading
**Format:** Same as daily.json but with weekly intervals
**Size:** ~60KB
**Usage:** Progressive loading for medium-detail charts

### GET /data/bitcoin/monthly.json

**Purpose:** Provides monthly aggregated Bitcoin price data for instant chart display
**Format:** Same as daily.json but with monthly intervals  
**Size:** ~14KB
**Usage:** Initial loading for immediate user feedback

## Service Interface Changes

### BitcoinJsonDataService

**Purpose:** New service class that replaces database API calls with JSON file loading
**Interface:** Implements identical interface to existing `centralizedDataService.loadHistoricalData()`

**Key Methods:**
- `loadHistoricalData(interval?: 'daily' | 'weekly' | 'monthly')` - Loads appropriate JSON file
- `getProgressiveData()` - Implements smart loading strategy
- `validateDataIntegrity()` - Ensures JSON data completeness

### Centralized Data Service Integration

**Modified Methods:**
- `loadHistoricalData()` - Updated to use JSON service instead of database API
- Error handling maintains existing fallback to database API if JSON loading fails

**Unchanged Methods:**
- `getCurrentPrice()` - Continues using live API calls (no changes)
- All subscription and state management methods remain identical

## Fallback Strategy

### Primary: JSON File Loading
1. Attempt to load appropriate JSON file based on requested interval
2. Validate data integrity using metadata
3. Process and cache data in existing format

### Fallback: Database API
1. If JSON loading fails, fall back to existing `/api/bitcoin-prices/historical`
2. Log fallback usage for monitoring
3. Maintain identical error handling and user experience

### Error Handling
- Network errors loading JSON files trigger database API fallback
- Malformed JSON data triggers database API fallback
- All errors logged with performance monitoring integration

## Performance Characteristics

### Expected Improvements
- **Initial Load**: 500-2000ms → 50-200ms (5-10x improvement)
- **Progressive Enhancement**: Monthly (14KB) → Weekly (60KB) → Daily (400KB)
- **Cache Efficiency**: Browser + CDN caching for static files vs. dynamic database queries

### Monitoring Integration
- Existing `PerformanceMonitor` tracks JSON loading times
- Fallback usage metrics for reliability monitoring
- Cache hit/miss ratios for optimization insights
