# Data Service Quick Start Guide

> Quick reference for using the centralized data service with DataServiceProvider

## TL;DR

The DataServiceProvider initializes Bitcoin price data at the app level. Just use the hooks in your components - data is already available!

```typescript
import { useCentralizedData } from '@/app/simulation/hooks/useCentralizedData'

function MyComponent() {
  const { currentPrice, historicalData } = useCentralizedData(false)
  return <div>Price: ${currentPrice?.price}</div>
}
```

## Available Hooks

### useCentralizedData

Get both current price and historical data:

```typescript
const {
  currentPrice,           // Current Bitcoin price
  historicalData,         // Historical price data
  isHistoricalDataLoaded, // Loading state
  errors,                 // Error messages
  refreshCurrentPrice,    // Refresh current price
  refreshHistoricalData   // Refresh historical data
} = useCentralizedData(false)
```

### useCurrentPriceOnly

Get only current price (lighter):

```typescript
const {
  currentPrice,  // Current Bitcoin price
  refreshPrice,  // Refresh function
  isLoading      // Loading state
} = useCurrentPriceOnly()
```

### useATH

Get All-Time High data:

```typescript
const {
  ath,      // ATH value
  loading,  // Loading state
  error,    // Error message
  refetch   // Refresh function
} = useATH()
```

## Common Patterns

### Display Current Price

```typescript
function PriceDisplay() {
  const { currentPrice } = useCurrentPriceOnly()
  const price = currentPrice?.price || 0
  
  return <div>${price.toLocaleString()}</div>
}
```

### Calculate ATH Distance

```typescript
function ATHDistance() {
  const { currentPrice } = useCurrentPriceOnly()
  const { ath } = useATH()
  
  const price = currentPrice?.price || 0
  const distance = ((ath - price) / ath) * 100
  
  return <div>{distance.toFixed(1)}% from ATH</div>
}
```

### Use Historical Data

```typescript
function PriceChart() {
  const { historicalData, isHistoricalDataLoaded } = useCentralizedData(false)
  
  if (!isHistoricalDataLoaded) {
    return <div>Loading...</div>
  }
  
  return <Chart data={historicalData} />
}
```

### Refresh Data

```typescript
function RefreshButton() {
  const { refreshCurrentPrice } = useCentralizedData(false)
  
  const handleRefresh = async () => {
    await refreshCurrentPrice()
  }
  
  return <button onClick={handleRefresh}>Refresh</button>
}
```

## Error Handling

### Handle Missing Data

```typescript
function SafeComponent() {
  const { currentPrice, errors } = useCentralizedData(false)
  
  if (errors.length > 0) {
    return <div>Error: {errors[0]}</div>
  }
  
  const price = currentPrice?.price || 114209 // Fallback
  return <div>${price}</div>
}
```

### Handle Loading State

```typescript
function LoadingComponent() {
  const { currentPrice, isHistoricalDataLoaded } = useCentralizedData(false)
  
  if (!isHistoricalDataLoaded) {
    return <div>Loading data...</div>
  }
  
  return <div>Price: ${currentPrice?.price}</div>
}
```

## Testing

### Basic Test

```typescript
import { render } from '@testing-library/react'
import { DataServiceProvider } from '@/app/simulation/providers/DataServiceProvider'

test('renders component', () => {
  const wrapper = ({ children }) => (
    <DataServiceProvider>{children}</DataServiceProvider>
  )
  
  render(<MyComponent />, { wrapper })
})
```

### Mock Data Service

```typescript
import { vi } from 'vitest'
import { centralizedDataService } from '@/lib/services/centralized-data-service'

vi.mock('@/lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    initialize: vi.fn(),
    getState: vi.fn().mockReturnValue({
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      historicalData: [],
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  }
}))
```

## Best Practices

### ✅ Do

- Use `useCentralizedData(false)` - provider handles initialization
- Keep fallback values for safety
- Handle loading and error states
- Use `useCurrentPriceOnly` when you don't need historical data
- Wrap tests with DataServiceProvider

### ❌ Don't

- Don't use `useCentralizedData(true)` - redundant with provider
- Don't manually initialize the data service
- Don't assume data is always available - check for null
- Don't forget error handling
- Don't test without provider wrapper

## Troubleshooting

### Data is null

**Check**: Is DataServiceProvider wrapping your app?

```typescript
// app/simulation/SimulationPage.tsx
<DataServiceProvider>
  <YourApp />
</DataServiceProvider>
```

### Tests failing

**Check**: Are tests wrapped with provider?

```typescript
const wrapper = ({ children }) => (
  <DataServiceProvider>{children}</DataServiceProvider>
)
render(<Component />, { wrapper })
```

### Stale data

**Solution**: Use refresh functions

```typescript
const { refreshCurrentPrice } = useCentralizedData(false)
await refreshCurrentPrice()
```

## Examples

### Complete Component Example

```typescript
import React from 'react'
import { useCentralizedData } from '@/app/simulation/hooks/useCentralizedData'
import { useATH } from '@/app/simulation/hooks/useATH'

export function BitcoinStats() {
  const { currentPrice, refreshCurrentPrice } = useCentralizedData(false)
  const { ath, loading: athLoading } = useATH()
  
  const price = currentPrice?.price || 0
  const athDistance = ath ? ((ath - price) / ath) * 100 : 0
  
  const handleRefresh = async () => {
    await refreshCurrentPrice()
  }
  
  return (
    <div className="stats-card">
      <h2>Bitcoin Statistics</h2>
      
      <div className="stat">
        <label>Current Price</label>
        <value>${price.toLocaleString()}</value>
      </div>
      
      <div className="stat">
        <label>All-Time High</label>
        <value>
          {athLoading ? 'Loading...' : `$${ath?.toLocaleString()}`}
        </value>
      </div>
      
      <div className="stat">
        <label>Distance from ATH</label>
        <value>{athDistance.toFixed(1)}%</value>
      </div>
      
      <button onClick={handleRefresh}>
        Refresh Price
      </button>
    </div>
  )
}
```

### Complete Test Example

```typescript
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BitcoinStats } from './BitcoinStats'
import { DataServiceProvider } from '@/app/simulation/providers/DataServiceProvider'
import { centralizedDataService } from '@/lib/services/centralized-data-service'

vi.mock('@/lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    initialize: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  }
}))

describe('BitcoinStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(centralizedDataService.getState as any).mockReturnValue({
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      historicalData: [],
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })
    ;(centralizedDataService.subscribe as any).mockReturnValue(() => {})
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
  })

  it('renders bitcoin statistics', async () => {
    const wrapper = ({ children }) => (
      <DataServiceProvider>{children}</DataServiceProvider>
    )

    render(<BitcoinStats />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(/current price/i)).toBeInTheDocument()
      expect(screen.getByText(/50,000/)).toBeInTheDocument()
    })
  })
})
```

## Further Reading

- [Data Service Provider Architecture](./data-service-provider-architecture.md) - Detailed architecture documentation
- [Migration Guide](./migration-to-data-service-provider.md) - Migrating from component-level initialization
- [Issue #31](https://github.com/nited-ai/v0-bitcoin-simulation-tool/issues/31) - Original issue and discussion

