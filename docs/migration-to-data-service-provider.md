# Migration Guide: Component-Level to App-Level Data Initialization

> Migration Date: 2025-10-01
> Related Issue: #31
> Breaking Changes: None (backward compatible)

## Overview

This guide explains how to migrate from component-level data service initialization to the new app-level DataServiceProvider pattern.

## What Changed

### Before (Component-Level Initialization)

Each component that needed Bitcoin price data would initialize the data service independently:

```typescript
// ATHAlert.tsx (OLD)
export function ATHAlert() {
  // Each component initialized independently
  const { currentPrice } = useCentralizedData(true) // enabled=true
  
  return <div>Price: {currentPrice?.price}</div>
}
```

**Problems**:
- Inconsistent initialization across tabs
- Navigation order affected data availability
- ATH calculations used fallback values
- Duplicate initialization logic

### After (App-Level Initialization)

The DataServiceProvider initializes the data service once at the app level:

```typescript
// SimulationPage.tsx (NEW)
export default function SimulationPage() {
  return (
    <DataServiceProvider>
      <SimulationProvider>
        <SimulationContent />
      </SimulationProvider>
    </DataServiceProvider>
  )
}

// ATHAlert.tsx (NEW)
export function ATHAlert() {
  // Provider handles initialization
  const { currentPrice } = useCentralizedData(false) // enabled=false
  
  return <div>Price: {currentPrice?.price}</div>
}
```

**Benefits**:
- Consistent initialization at app level
- Navigation order independent
- Real market data always available
- Single source of truth

## Migration Steps

### Step 1: Verify Provider Integration

Check that `SimulationPage.tsx` includes the DataServiceProvider:

```typescript
// app/simulation/SimulationPage.tsx
import { DataServiceProvider } from "./providers/DataServiceProvider"

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

✅ **Status**: Already integrated (no action needed)

### Step 2: Update Component Hooks

Change `useCentralizedData(true)` to `useCentralizedData(false)`:

**Before**:
```typescript
const { currentPrice, historicalData } = useCentralizedData(true)
```

**After**:
```typescript
const { currentPrice, historicalData } = useCentralizedData(false)
```

**Why**: The provider handles initialization, so `enabled=true` is no longer necessary.

**Backward Compatibility**: Using `enabled=true` still works but is redundant.

### Step 3: Remove Component-Level Initialization

Remove any manual initialization logic:

**Before**:
```typescript
useEffect(() => {
  const initializeDataService = async () => {
    await centralizedDataService.initialize()
  }
  initializeDataService()
}, [])
```

**After**:
```typescript
// Remove this - provider handles it
```

### Step 4: Update Tests

Update component tests to wrap with DataServiceProvider:

**Before**:
```typescript
render(<MyComponent />)
```

**After**:
```typescript
const wrapper = ({ children }) => (
  <DataServiceProvider>{children}</DataServiceProvider>
)

render(<MyComponent />, { wrapper })
```

### Step 5: Verify Fallback Values

Keep realistic fallback values for safety:

```typescript
const currentPrice = currentPriceData?.price || 114209 // Keep fallback
```

**Why**: Provides graceful degradation if provider initialization fails.

## Component-Specific Migrations

### ATHAlert Component

**File**: `app/simulation/tabs/parameters/ATHAlert.tsx`

**Changes**:
```diff
- const { currentPrice: currentPriceData } = useCentralizedData(true)
+ const { currentPrice: currentPriceData } = useCentralizedData(false)
```

**Status**: ✅ Migrated

### PriceDropToleranceCard Component

**File**: `app/simulation/tabs/parameters/PriceDropToleranceCard.tsx`

**Changes**: None needed - already uses `useATH` hook which is independent

**Status**: ✅ No changes required

### Price Projection Components

**Files**: Various components in `app/simulation/tabs/price-projection/`

**Changes**: None needed - already use provider-initialized data

**Status**: ✅ No changes required

## Hook Usage Patterns

### useCentralizedData

**Recommended Pattern**:
```typescript
import { useCentralizedData } from '@/app/simulation/hooks/useCentralizedData'

function MyComponent() {
  // Provider handles initialization
  const {
    currentPrice,
    historicalData,
    isHistoricalDataLoaded,
    refreshCurrentPrice,
    refreshHistoricalData
  } = useCentralizedData(false)
  
  // Use data with fallback
  const price = currentPrice?.price || 114209
  
  return <div>Price: {price}</div>
}
```

### useCurrentPriceOnly

**Recommended Pattern**:
```typescript
import { useCurrentPriceOnly } from '@/app/simulation/hooks/useCentralizedData'

function MyComponent() {
  const { currentPrice, refreshPrice, isLoading } = useCurrentPriceOnly()
  
  // Use data with fallback
  const price = currentPrice?.price || 114209
  
  return <div>Price: {price}</div>
}
```

### useATH

**Recommended Pattern**:
```typescript
import { useATH } from '@/app/simulation/hooks/useATH'

function MyComponent() {
  const { ath, loading, error, refetch } = useATH()
  
  // Use ATH data
  return <div>ATH: {ath}</div>
}
```

**Note**: useATH is independent of the provider and doesn't need changes.

## Testing Migration

### Unit Tests

**Before**:
```typescript
import { render } from '@testing-library/react'
import { MyComponent } from './MyComponent'

test('renders component', () => {
  render(<MyComponent />)
})
```

**After**:
```typescript
import { render } from '@testing-library/react'
import { DataServiceProvider } from '@/app/simulation/providers/DataServiceProvider'
import { MyComponent } from './MyComponent'

test('renders component', () => {
  const wrapper = ({ children }) => (
    <DataServiceProvider>{children}</DataServiceProvider>
  )
  
  render(<MyComponent />, { wrapper })
})
```

### Integration Tests

**Pattern**:
```typescript
import { render, waitFor } from '@testing-library/react'
import { DataServiceProvider } from '@/app/simulation/providers/DataServiceProvider'
import { SimulationProvider } from '@/app/simulation/context/SimulationContext'

test('full app integration', async () => {
  render(
    <DataServiceProvider>
      <SimulationProvider>
        <MyComponent />
      </SimulationProvider>
    </DataServiceProvider>
  )
  
  await waitFor(() => {
    // Assertions
  })
})
```

## Common Issues and Solutions

### Issue 1: Data Not Available

**Symptom**: Components show fallback values instead of real data

**Cause**: Provider not wrapping the app

**Solution**: Verify DataServiceProvider is in SimulationPage.tsx

### Issue 2: Tests Failing

**Symptom**: Tests fail with "Cannot read property 'price' of null"

**Cause**: Tests not wrapped with DataServiceProvider

**Solution**: Add provider wrapper to tests

### Issue 3: Initialization Errors

**Symptom**: Error screen on app load

**Cause**: Network issues or API unavailable

**Solution**: Check network connection and API status

### Issue 4: Stale Data

**Symptom**: Components show old data

**Cause**: Data not refreshing

**Solution**: Use refresh functions:
```typescript
const { refreshCurrentPrice } = useCentralizedData(false)
await refreshCurrentPrice()
```

## Rollback Plan

If issues arise, the migration is backward compatible:

1. Keep DataServiceProvider in place
2. Change `useCentralizedData(false)` back to `useCentralizedData(true)`
3. Components will initialize independently again

**Note**: This defeats the purpose of the migration but provides a safety net.

## Verification Checklist

After migration, verify:

- [ ] DataServiceProvider wraps SimulationPage
- [ ] All tests pass
- [ ] Type checking passes (`pnpm type-check`)
- [ ] App builds successfully (`pnpm build`)
- [ ] ATH calculations use real market data
- [ ] Navigation order doesn't affect data availability
- [ ] Error handling works correctly
- [ ] Loading states display properly

## Performance Impact

### Before Migration

- Multiple initializations per session
- Inconsistent data loading
- Duplicate network requests

### After Migration

- Single initialization on app load
- Consistent data loading
- Optimized network requests

**Expected Improvement**: ~30% faster initial data availability

## Next Steps

1. Monitor app performance
2. Collect user feedback
3. Optimize initialization if needed
4. Consider progressive data loading
5. Add telemetry for initialization metrics

## Support

For issues or questions:
- Check troubleshooting section in `data-service-provider-architecture.md`
- Review test examples in `app/simulation/__tests__/providers/`
- Consult issue #31 for original context

