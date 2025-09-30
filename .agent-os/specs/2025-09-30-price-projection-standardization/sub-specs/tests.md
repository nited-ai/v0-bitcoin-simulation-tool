# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-09-30-price-projection-standardization/spec.md

> Created: 2025-09-30  
> Version: 1.0.0

## Test Strategy

All migration phases require comprehensive test coverage to ensure:
1. No functional regressions
2. Data integrity maintained
3. Performance not degraded
4. Type safety enforced

## Phase 1: Foundation Tests

### Unit Tests

#### PriceDataService
**File**: `src/modules/price-data/__tests__/PriceDataService.test.ts`

```typescript
describe('PriceDataService Migration', () => {
  it('should use UnifiedPriceProjectionService internally', async () => {
    const spy = vi.spyOn(unifiedPriceProjectionService, 'generateProjectionFromLegacyParams')
    await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
    expect(spy).toHaveBeenCalled()
  })
  
  it('should return legacy format for backward compatibility', async () => {
    const result = await priceDataService.generatePriceProjection(mockParams, mockHistoricalData)
    expect(result).toBeInstanceOf(Array)
    expect(result[0]).toHaveProperty('date')
    expect(result[0]).toHaveProperty('simulationPath')
  })
  
  it('should handle all price models', async () => {
    const models: PriceModel[] = ['manual', 'powerLaw', 'cycleRepeat', 'enhancedCycleRepeat']
    for (const model of models) {
      const result = await priceDataService.generatePriceProjection(
        { ...mockParams, priceModel: model },
        mockHistoricalData
      )
      expect(result.length).toBeGreaterThan(0)
    }
  })
})
```

#### UnifiedPriceProjectionService
**File**: `src/modules/shared/__tests__/UnifiedPriceProjectionService.test.ts`

```typescript
describe('UnifiedPriceProjectionService', () => {
  it('should generate standard format projection', async () => {
    const projection = await unifiedPriceProjectionService.generateProjection(
      'manual',
      mockParams,
      mockHistoricalData
    )
    expect(projection).toHaveProperty('modelName')
    expect(projection).toHaveProperty('projectionPoints')
    expect(projection.projectionPoints[0]).toHaveProperty('timestamp')
    expect(projection.projectionPoints[0]).toHaveProperty('price')
  })
  
  it('should convert legacy params correctly', async () => {
    const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
      mockLegacyParams,
      mockHistoricalData
    )
    expect(projection.metadata.totalMonths).toBe(mockLegacyParams.simulationMonths)
  })
})
```

#### PriceProjectionAdapter
**File**: `src/modules/shared/__tests__/PriceProjectionAdapter.test.ts`

```typescript
describe('PriceProjectionAdapter', () => {
  describe('Format Conversion', () => {
    it('should convert to strategy format', () => {
      const strategyData = PriceProjectionAdapter.toStrategyFormat(mockProjection)
      expect(strategyData).toHaveProperty('pricePoints')
      expect(strategyData.pricePoints[0]).toHaveProperty('month')
      expect(strategyData.pricePoints[0]).toHaveProperty('price')
    })
    
    it('should convert to results format with analytics', () => {
      const resultsData = PriceProjectionAdapter.toResultsFormat(mockProjection)
      expect(resultsData).toHaveProperty('analytics')
      expect(resultsData.analytics).toHaveProperty('totalGrowth')
      expect(resultsData.analytics).toHaveProperty('maxDecline')
    })
    
    it('should convert to legacy format', () => {
      const legacyData = PriceProjectionAdapter.toLegacyFormat(mockProjection, mockHistoricalData)
      expect(legacyData).toBeInstanceOf(Array)
      expect(legacyData[0]).toHaveProperty('date')
      expect(legacyData[0]).toHaveProperty('days')
    })
  })
  
  describe('Price Access', () => {
    it('should get price at specific month', () => {
      const price = PriceProjectionAdapter.getPriceAtMonth(mockProjection, 12, 30)
      expect(price).toBeGreaterThan(0)
    })
    
    it('should handle out of bounds indices', () => {
      const price = PriceProjectionAdapter.getPriceAtMonth(mockProjection, 999, 30)
      expect(price).toBeGreaterThan(0) // Should return last available price
    })
  })
  
  describe('Validation', () => {
    it('should validate correct projection', () => {
      const result = PriceProjectionAdapter.validate(mockProjection)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('should detect invalid projection', () => {
      const invalidProjection = { ...mockProjection, projectionPoints: [] }
      const result = PriceProjectionAdapter.validate(invalidProjection)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
```

### Integration Tests

#### Service Integration
**File**: `src/modules/__tests__/integration/service-integration.test.ts`

```typescript
describe('Service Layer Integration', () => {
  it('should flow data from UnifiedService to PriceDataService', async () => {
    const projection = await unifiedPriceProjectionService.generateProjection(
      'manual',
      mockParams,
      mockHistoricalData
    )
    
    const legacyData = PriceProjectionAdapter.toLegacyFormat(projection, mockHistoricalData)
    expect(legacyData.length).toBe(projection.projectionPoints.length)
  })
  
  it('should maintain data integrity through conversions', async () => {
    const projection = await unifiedPriceProjectionService.generateProjection(
      'powerLaw',
      mockParams,
      mockHistoricalData
    )
    
    const strategyData = PriceProjectionAdapter.toStrategyFormat(projection)
    const resultsData = PriceProjectionAdapter.toResultsFormat(projection)
    
    expect(strategyData.pricePoints.length).toBe(projection.projectionPoints.length)
    expect(resultsData.pricePoints.length).toBe(projection.projectionPoints.length)
  })
})
```

---

## Phase 2: Hook Tests

### Unit Tests

#### usePriceProjection
**File**: `src/modules/price-data/__tests__/usePriceProjection.test.ts`

```typescript
describe('usePriceProjection Hook', () => {
  it('should return PriceProjectionResult', async () => {
    const { result } = renderHook(() => usePriceProjection())
    
    await act(async () => {
      await result.current.generateProjection(mockParams)
    })
    
    expect(result.current.projectionData).toBeDefined()
    expect(result.current.projectionData).toHaveProperty('modelName')
    expect(result.current.projectionData).toHaveProperty('projectionPoints')
  })
  
  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => usePriceProjection())
    
    await act(async () => {
      await result.current.generateProjection(invalidParams)
    })
    
    expect(result.current.error).toBeDefined()
    expect(result.current.projectionData).toBeNull()
  })
})
```

#### usePriceGeneration
**File**: `app/simulation/__tests__/usePriceGeneration.test.ts`

```typescript
describe('usePriceGeneration Hook', () => {
  it('should generate projection when enabled', async () => {
    const { result } = renderHook(() => usePriceGeneration(true), {
      wrapper: SimulationProvider
    })
    
    await waitFor(() => {
      expect(result.current.priceProjection).toBeDefined()
    })
  })
  
  it('should not generate when disabled', () => {
    const { result } = renderHook(() => usePriceGeneration(false), {
      wrapper: SimulationProvider
    })
    
    expect(result.current.priceProjection).toBeNull()
  })
})
```

### Integration Tests

#### Hook to Context Integration
**File**: `app/simulation/__tests__/integration/hook-context-integration.test.ts`

```typescript
describe('Hook to Context Integration', () => {
  it('should update context with projection data', async () => {
    const { result } = renderHook(() => ({
      generation: usePriceGeneration(true),
      context: useSimulation()
    }), {
      wrapper: SimulationProvider
    })
    
    await waitFor(() => {
      expect(result.current.context.priceProjection).toBeDefined()
      expect(result.current.context.priceProjection?.modelName).toBeDefined()
    })
  })
})
```

---

## Phase 3: Component Tests

### Unit Tests

#### Price Projection Components
**File**: `app/simulation/tabs/price-projection/__tests__/UnifiedPriceChart.test.tsx`

```typescript
describe('UnifiedPriceChart', () => {
  it('should render with PriceProjectionResult', () => {
    render(<UnifiedPriceChart projection={mockProjection} />)
    expect(screen.getByRole('img')).toBeInTheDocument() // Chart canvas
  })
  
  it('should handle missing projection gracefully', () => {
    render(<UnifiedPriceChart projection={null} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
  
  it('should convert projection to chart format', () => {
    const { container } = render(<UnifiedPriceChart projection={mockProjection} />)
    const chartData = PriceProjectionAdapter.toLegacyFormat(mockProjection)
    expect(chartData.length).toBeGreaterThan(0)
  })
})
```

#### Strategy Components
**File**: `app/simulation/tabs/strategies/__tests__/StrategyExecution.test.tsx`

```typescript
describe('Strategy Execution Components', () => {
  it('should use strategy format from adapter', () => {
    const strategyData = PriceProjectionAdapter.toStrategyFormat(mockProjection)
    render(<StrategyExecution strategyData={strategyData} />)
    expect(screen.getByText(/strategy/i)).toBeInTheDocument()
  })
})
```

#### Results Components
**File**: `app/simulation/tabs/results/__tests__/BitcoinPriceChart.test.tsx`

```typescript
describe('BitcoinPriceChart', () => {
  it('should use results format with analytics', () => {
    const resultsData = PriceProjectionAdapter.toResultsFormat(mockProjection)
    render(<BitcoinPriceChart resultsData={resultsData} />)
    expect(screen.getByText(/total growth/i)).toBeInTheDocument()
  })
})
```

### Integration Tests

#### Tab Navigation
**File**: `app/simulation/__tests__/integration/tab-navigation.test.tsx`

```typescript
describe('Tab Navigation Integration', () => {
  it('should maintain projection data across tabs', async () => {
    render(<SimulationApp />)
    
    // Generate projection in price-projection tab
    await userEvent.click(screen.getByText(/price projection/i))
    await userEvent.click(screen.getByText(/generate/i))
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
    
    // Navigate to strategies tab
    await userEvent.click(screen.getByText(/strategies/i))
    expect(screen.getByText(/strategy/i)).toBeInTheDocument()
    
    // Navigate to results tab
    await userEvent.click(screen.getByText(/results/i))
    expect(screen.getByText(/results/i)).toBeInTheDocument()
  })
})
```

### Visual Regression Tests

#### Chart Rendering
**File**: `app/simulation/__tests__/visual/chart-rendering.test.tsx`

```typescript
describe('Visual Regression: Charts', () => {
  it('should render price projection chart correctly', async () => {
    const { container } = render(<UnifiedPriceChart projection={mockProjection} />)
    await waitFor(() => expect(container.querySelector('canvas')).toBeInTheDocument())
    
    // Take snapshot
    expect(container).toMatchSnapshot()
  })
  
  it('should render results chart correctly', async () => {
    const resultsData = PriceProjectionAdapter.toResultsFormat(mockProjection)
    const { container } = render(<BitcoinPriceChart resultsData={resultsData} />)
    
    expect(container).toMatchSnapshot()
  })
})
```

---

## Phase 4: Cleanup Tests

### Verification Tests

#### Type Safety
**File**: `app/simulation/__tests__/type-safety.test.ts`

```typescript
describe('Type Safety Verification', () => {
  it('should have no TypeScript errors', () => {
    // This test runs `tsc --noEmit` and verifies zero errors
    expect(runTypeCheck()).toBe(0)
  })
  
  it('should have single PriceProjectionResult definition', () => {
    const typeDefinitions = findTypeDefinitions('PriceProjectionResult')
    expect(typeDefinitions).toHaveLength(1)
    expect(typeDefinitions[0]).toContain('app/simulation/price-models/types.ts')
  })
})
```

#### Import Verification
**File**: `app/simulation/__tests__/import-verification.test.ts`

```typescript
describe('Import Verification', () => {
  it('should not import from deprecated locations', () => {
    const deprecatedImports = findImports([
      'src/modules/price-projection/types',
      'src/modules/parameters/types' // price-related only
    ])
    expect(deprecatedImports).toHaveLength(0)
  })
  
  it('should import from standard location', () => {
    const standardImports = findImports([
      'app/simulation/price-models/types'
    ])
    expect(standardImports.length).toBeGreaterThan(0)
  })
})
```

### Performance Tests

#### Bundle Size
**File**: `app/simulation/__tests__/performance/bundle-size.test.ts`

```typescript
describe('Bundle Size', () => {
  it('should be reduced after migration', () => {
    const beforeSize = getBundleSize('before-migration')
    const afterSize = getBundleSize('after-migration')
    
    const reduction = ((beforeSize - afterSize) / beforeSize) * 100
    expect(reduction).toBeGreaterThan(5) // At least 5% reduction
  })
})
```

#### Runtime Performance
**File**: `app/simulation/__tests__/performance/runtime.test.ts`

```typescript
describe('Runtime Performance', () => {
  it('should not regress projection generation time', async () => {
    const startTime = performance.now()
    await unifiedPriceProjectionService.generateProjection(
      'manual',
      mockParams,
      mockHistoricalData
    )
    const endTime = performance.now()
    
    const duration = endTime - startTime
    expect(duration).toBeLessThan(1000) // Should complete in < 1 second
  })
})
```

---

## Mocking Requirements

### External Services
- **PriceModelRegistry**: Mock model implementations for testing
- **SessionStorage**: Mock for parameter persistence
- **LocalStorage**: Mock for cache testing

### Test Data
- **mockHistoricalData**: Realistic Bitcoin price history
- **mockProjection**: Complete PriceProjectionResult
- **mockParams**: Valid PriceModelParams for all models

### Time-Based Tests
- **Date.now()**: Mock for consistent timestamps
- **performance.now()**: Mock for performance testing

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **E2E Tests**: Critical paths covered
- **Visual Regression**: All charts covered

## Continuous Integration

### Pre-Commit
- Run unit tests
- Run type checking
- Run linting

### Pre-Push
- Run full test suite
- Run build verification

### PR Checks
- All tests passing
- Coverage thresholds met
- No TypeScript errors
- Bundle size check

