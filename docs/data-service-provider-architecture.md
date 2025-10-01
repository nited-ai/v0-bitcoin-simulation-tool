# Data Service Provider Architecture

> Last Updated: 2025-10-01
> Version: 1.0.0
> Related Issue: #31

## Overview

The DataServiceProvider is an app-level React provider that ensures the centralized data service is initialized before any tab components render. This eliminates inconsistent behavior where different tabs would initialize the data service differently, causing ATH calculations and other price-dependent features to use fallback values instead of actual market prices.

## Architecture

### Provider Pattern

```
App Root (page.tsx)
  └── DataServiceProvider
      └── SimulationProvider
          └── SimulationContent
              └── Tab Components (Parameters, Price Projection, Results, Strategy)
```

### Key Components

#### DataServiceProvider

**Location**: `app/simulation/providers/DataServiceProvider.tsx`

**Responsibilities**:
- Initialize centralized data service on mount
- Show loading state during initialization
- Handle initialization errors gracefully
- Provide initialization status through React Context
- Subscribe to data service state changes
- Clean up subscriptions on unmount

**Context Value**:
```typescript
interface DataServiceContextValue {
  isInitialized: boolean
  isInitializing: boolean
  error: string | null
  dataServiceState: DataServiceState
}
```

#### Integration Point

**Location**: `app/simulation/SimulationPage.tsx`

The provider wraps the entire simulation app:

```typescript
export default function SimulationPage() {
  return (
    <DataServiceProvider>
      <SimulationProvider>
        <SimulationContent />
      </SimulationProvider>
    </DataServiceProvider>
  )
}
```

## Data Flow

### Initialization Sequence

1. **App Loads**: DataServiceProvider mounts
2. **Provider Initializes**: Calls `centralizedDataService.initialize()`
3. **Loading State**: Shows loading UI while initializing
4. **Data Loaded**: Historical data and current price fetched
5. **Children Render**: Tab components receive initialized data
6. **Subscriptions Active**: Components subscribe to data updates

### State Updates

```
centralizedDataService (singleton)
  ↓ (state changes)
DataServiceProvider (subscribes)
  ↓ (context updates)
Child Components (consume context/hooks)
  ↓ (re-render with new data)
UI Updates
```

## Hook Integration

### useCentralizedData

**Before Provider**:
```typescript
// Components had to manually initialize
const { currentPrice } = useCentralizedData(true) // enabled=true
```

**With Provider**:
```typescript
// Provider handles initialization
const { currentPrice } = useCentralizedData(false) // enabled=false
```

The hook still works with `enabled=true` for backward compatibility, but it's no longer necessary since the provider handles initialization.

### useCurrentPriceOnly

**Usage**:
```typescript
const { currentPrice, refreshPrice, isLoading } = useCurrentPriceOnly()
```

This hook automatically receives data from the provider-initialized service. No changes needed in components using this hook.

### useATH

**Usage**:
```typescript
const { ath, loading, error, refetch } = useATH()
```

This hook continues to work independently, fetching ATH data from the ATH service. It's not affected by the provider.

## Component Updates

### ATHAlert Component

**Before**:
```typescript
// Manually triggered initialization
const { currentPrice } = useCentralizedData(true)
```

**After**:
```typescript
// Relies on provider initialization
const { currentPrice } = useCentralizedData(false)
```

### Other Components

All components that use `useCentralizedData` or `useCurrentPriceOnly` automatically benefit from the provider without code changes, as these hooks subscribe to the centralized data service.

## Error Handling

### Initialization Errors

If the data service fails to initialize, the provider shows an error screen with:
- Error message
- Reload button
- User-friendly explanation

```typescript
if (error) {
  return (
    <div className="error-screen">
      <h2>Initialization Error</h2>
      <p>Failed to initialize the data service...</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  )
}
```

### Graceful Degradation

Components using the data service hooks have fallback values:
```typescript
const currentPrice = currentPriceData?.price || 114209 // Realistic fallback
```

## Testing

### Unit Tests

**Location**: `app/simulation/__tests__/providers/DataServiceProvider.test.tsx`

Tests cover:
- Provider initialization
- Loading states
- Error handling
- Subscription management
- Cleanup on unmount

### Integration Tests

**Location**: `app/simulation/__tests__/providers/DataServiceProvider.integration.test.tsx`

Tests cover:
- App-level initialization
- Data availability across components
- Navigation order independence
- State updates propagation

### Component Tests

**Location**: `app/simulation/tabs/parameters/__tests__/ATHAlert.test.tsx`

Tests cover:
- Component rendering with provider
- ATH distance calculations
- Fallback behavior
- Price updates

## Benefits

### Before Provider

❌ Inconsistent initialization across tabs
❌ ATH calculations used fallback values
❌ Navigation order affected data availability
❌ Duplicate initialization logic in components
❌ Difficult to debug data availability issues

### After Provider

✅ Consistent initialization at app level
✅ ATH calculations use real market data
✅ Navigation order independent
✅ Single source of truth for initialization
✅ Clear initialization lifecycle

## Migration Guide

### For New Components

Simply use the hooks as normal:

```typescript
import { useCentralizedData } from '@/app/simulation/hooks/useCentralizedData'

function MyComponent() {
  const { currentPrice, historicalData } = useCentralizedData(false)
  
  // Data is already available from provider
  return <div>Price: {currentPrice?.price}</div>
}
```

### For Existing Components

1. Remove `useCentralizedData(true)` calls
2. Change to `useCentralizedData(false)`
3. Remove component-level initialization logic
4. Keep fallback values for safety

## Performance

### Initialization Time

- **Before**: Multiple initializations per session
- **After**: Single initialization on app load

### Memory Usage

- **Before**: Multiple subscriptions per component
- **After**: Centralized subscription management

### Re-renders

- **Before**: Uncoordinated updates
- **After**: Coordinated updates through provider

## Troubleshooting

### Data Not Available

**Symptom**: Components show fallback values

**Solution**: Check if DataServiceProvider is wrapping the app in SimulationPage.tsx

### Initialization Errors

**Symptom**: Error screen on app load

**Solution**: Check network connection and API availability

### Stale Data

**Symptom**: Components show old data

**Solution**: Use refresh functions from hooks:
```typescript
const { refreshCurrentPrice } = useCentralizedData(false)
await refreshCurrentPrice()
```

## Future Enhancements

- [ ] Add retry logic for failed initializations
- [ ] Implement progressive data loading
- [ ] Add data prefetching for better UX
- [ ] Optimize subscription management
- [ ] Add telemetry for initialization performance

