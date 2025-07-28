# Bitcoin Price Database API Reference

## Quick Start

### Client-side Usage

```typescript
import { 
  loadHistoricalPriceDataWithFallbacks, 
  getCurrentBitcoinPrice,
  updateDatabaseWithLatestData 
} from '@/lib/price-engine/client-historical-data-loader'

// Load historical data (with caching and fallbacks)
const historicalData = await loadHistoricalPriceDataWithFallbacks()

// Get current Bitcoin price
const currentPrice = await getCurrentBitcoinPrice()

// Update database with latest data
await updateDatabaseWithLatestData()
```

### Server-side Usage

```typescript
import { sqlDatabaseManager } from '@/app/simulation/data/database/SqlDatabaseManager'
import { ensureDatabaseInitialized } from '@/app/simulation/data/database/DatabaseInitializer'

// Ensure database is ready
await ensureDatabaseInitialized()

// Get historical data
const data = await sqlDatabaseManager.getHistoricalData()

// Update current price
const result = await sqlDatabaseManager.updateCurrentPrice()
```

## API Endpoints

### GET `/api/bitcoin-prices`

#### Get Historical Data
```
GET /api/bitcoin-prices?action=historical
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "time": 1381449600,
      "close": 123.45,
      "date": "2013-10-01",
      "source": "csv"
    }
  ],
  "count": 2613,
  "dateRange": {
    "start": "2013-10-01",
    "end": "2025-07-28"
  }
}
```

#### Get Current Price
```
GET /api/bitcoin-prices?action=current
```

**Response:**
```json
{
  "success": true,
  "price": 118739.99,
  "date": "2025-07-28",
  "timestamp": 1722124800000,
  "source": "api"
}
```

#### Get Database Statistics
```
GET /api/bitcoin-prices?action=stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRecords": 2613,
    "dateRange": {
      "start": "2013-10-01",
      "end": "2025-07-28"
    },
    "lastUpdate": "2025-07-28T10:30:00.000Z",
    "sources": ["csv", "api"]
  }
}
```

#### Check Database Health
```
GET /api/bitcoin-prices?action=health
```

**Response:**
```json
{
  "success": true,
  "health": {
    "isHealthy": true,
    "issues": [],
    "stats": { /* database stats */ }
  }
}
```

### POST `/api/bitcoin-prices`

#### Update Database
```
POST /api/bitcoin-prices?action=update
```

**Response:**
```json
{
  "success": true,
  "message": "Database updated successfully",
  "currentPriceUpdate": {
    "success": true,
    "recordsAdded": 1,
    "recordsUpdated": 0,
    "lastDate": "2025-07-28",
    "source": "api"
  },
  "dataUpdate": {
    "success": true,
    "recordsAdded": 0,
    "recordsUpdated": 0,
    "lastDate": "2025-07-28",
    "source": "none"
  }
}
```

#### Initialize Database
```
POST /api/bitcoin-prices?action=initialize
```

**Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully with 2613 records",
  "recordsLoaded": 2613
}
```

#### Repair Database
```
POST /api/bitcoin-prices?action=repair
```

**Response:**
```json
{
  "success": true,
  "message": "Database repair completed successfully",
  "recordsLoaded": 2613
}
```

## Data Types

### HistoricalDataPoint
```typescript
interface HistoricalDataPoint {
  time: number      // Unix timestamp in seconds
  close: number     // Closing price in USD
  date?: string     // YYYY-MM-DD format
  source?: string   // Data source identifier
}
```

### DatabasePricePoint
```typescript
interface DatabasePricePoint {
  id?: number
  date: string          // YYYY-MM-DD format
  timestamp: number     // Unix timestamp in milliseconds
  open: number
  high: number
  low: number
  close: number
  volume?: number
  source: string
  created_at?: string
  updated_at?: string
}
```

### UpdateResult
```typescript
interface UpdateResult {
  success: boolean
  recordsAdded: number
  recordsUpdated: number
  lastDate: string
  source: string
  error?: string
}
```

## Error Handling

### Client-side Fallbacks
1. **Primary**: Server API call
2. **Secondary**: Original CSV loader
3. **Tertiary**: Cached data
4. **Final**: Error thrown

### Server-side Error Responses
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Caching Strategy

### Cache Levels
1. **Memory Cache**: Current session data
2. **localStorage**: Persistent browser cache
3. **Database**: Server-side persistent storage

### Cache Invalidation
- **Time-based**: Configurable expiration
- **Manual**: `cache.clearCache()`
- **Automatic**: On data updates

## Performance Tips

### For Developers
- Use `loadHistoricalPriceDataWithFallbacks()` for robust data loading
- Cache results when possible to avoid repeated API calls
- Monitor performance with `PerformanceMonitor.recordLoadTime()`
- Use batch operations for multiple database updates

### For Operations
- Monitor database health with `/api/bitcoin-prices?action=health`
- Update data regularly with `/api/bitcoin-prices?action=update`
- Check statistics with `/api/bitcoin-prices?action=stats`
- Use repair function if data integrity issues occur

## Database Maintenance

### Regular Tasks
```bash
# Check database health
curl "http://localhost:3000/api/bitcoin-prices?action=health"

# Update with latest data
curl -X POST "http://localhost:3000/api/bitcoin-prices?action=update"

# Get database statistics
curl "http://localhost:3000/api/bitcoin-prices?action=stats"
```

### Troubleshooting

#### Database Connection Issues
1. Check Prisma configuration
2. Verify database file permissions
3. Run database repair: `POST /api/bitcoin-prices?action=repair`

#### Missing Data
1. Check CSV file availability
2. Run initialization: `POST /api/bitcoin-prices?action=initialize`
3. Verify date parsing in logs

#### Performance Issues
1. Check cache hit rates
2. Monitor database query times
3. Consider data cleanup for old records

## Configuration

### Environment Variables
```env
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://..." # PostgreSQL for production
```

### Prisma Configuration
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma"
}
```

---

**Last Updated**: 2025-07-28  
**Version**: 1.0.0  
**Support**: Check logs in browser console and server terminal
