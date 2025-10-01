# What Changed - Price Projection Output Standardization

**For**: Development Team  
**Date**: 2025-09-30  
**Migration**: Price Projection Output Standardization  
**Status**: Phase 4 Complete

---

## 🎯 TL;DR - What You Need to Know

### For Developers

**✅ DO THIS**:
- Import `PriceProjectionResult` from `@/app/simulation/price-models/types`
- Use `UnifiedPriceProjectionService` for new price projections
- Use `priceProjection` field from SimulationContext (not `priceChartData`)

**❌ DON'T DO THIS**:
- Don't import from `src/modules/price-projection/types` (deleted)
- Don't use `PriceDataService.generatePriceProjection()` for new code (deprecated)
- Don't use `priceChartData` from SimulationContext for new code (deprecated)

---

## 📋 Summary of Changes

### What Was the Problem?

Before this migration, we had **3 different formats** for price projection data:
1. Standard format in `app/simulation/price-models/types.ts`
2. Old format in `src/modules/price-projection/types/`
3. Legacy format (`PriceChartDataPoint[]`)

This caused:
- ❌ Confusion about which format to use
- ❌ Duplicate type definitions
- ❌ Unnecessary format conversions
- ❌ Maintenance overhead

### What Did We Fix?

Now we have **1 single format**:
- ✅ Single `PriceProjectionResult` definition
- ✅ Located in `app/simulation/price-models/types.ts`
- ✅ Used consistently across the entire codebase
- ✅ Clear, well-documented interface

---

## 🔄 What Changed for You

### 1. Type Imports

**BEFORE** (❌ Old way):
```typescript
import type { PriceProjectionResult } from '@/src/modules/price-projection/types'
```

**AFTER** (✅ New way):
```typescript
import type { PriceProjectionResult } from '@/app/simulation/price-models/types'
```

### 2. Price Projection Generation

**BEFORE** (❌ Old way):
```typescript
const priceDataService = PriceDataService.getInstance()
const chartData = await priceDataService.generatePriceProjection(params)
```

**AFTER** (✅ New way):
```typescript
import { unifiedPriceProjectionService } from '@/src/modules/shared'

const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
  params,
  historicalData
)
```

### 3. Using Price Projection in Components

**BEFORE** (❌ Old way):
```typescript
const { priceChartData } = useSimulation()

// Use priceChartData...
```

**AFTER** (✅ New way):
```typescript
const { priceProjection } = useSimulation()

// Use priceProjection.projectionPoints...
```

### 4. Format Conversions

**BEFORE** (❌ Old way):
```typescript
const legacyFormat = PriceProjectionAdapter.fromOldFormat(oldData)
const newFormat = PriceProjectionAdapter.fromLegacyFormat(legacyData, 'manual')
```

**AFTER** (✅ New way):
```typescript
// No conversion needed! Everything uses the same format.
// If you need legacy format for backward compatibility:
const legacyFormat = PriceProjectionAdapter.toLegacyFormat(projection)
```

---

## 📁 File Structure Changes

### Deleted Files/Directories
- ❌ `src/modules/price-projection/types/index.ts`
- ❌ `src/modules/price-projection/index.ts`
- ❌ `src/modules/price-projection/` (entire directory)

### Standard Location
- ✅ `app/simulation/price-models/types.ts` (single source of truth)

---

## 🔧 API Changes

### Removed Methods

These methods have been **removed**:
- ❌ `PriceProjectionAdapter.fromOldFormat()`
- ❌ `PriceProjectionAdapter.fromLegacyFormat()`
- ❌ `isOldPriceProjectionResult()` type guard

### Deprecated Methods

These methods are **deprecated** but still work (for now):
- ⚠️ `PriceDataService.generatePriceProjection()` - Use `UnifiedPriceProjectionService` instead
- ⚠️ `SimulationContext.priceChartData` - Use `priceProjection` instead
- ⚠️ `SimulationContext.setPriceChartData()` - Use `setPriceProjection()` instead

### New/Updated Methods

- ✅ `UnifiedPriceProjectionService.generateProjection()` - Generate projections in standard format
- ✅ `UnifiedPriceProjectionService.generateProjectionFromLegacyParams()` - Generate from legacy params
- ✅ `SimulationContext.priceProjection` - New standard format field
- ✅ `SimulationContext.setPriceProjection()` - Set projection in standard format

---

## 📊 Data Format Changes

### PriceProjectionResult Format

**Standard Format** (use this):
```typescript
interface PriceProjectionResult {
  modelName: string
  modelVersion: string
  projectionPoints: ProjectionPoint[]
  metadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    confidence: number
    generatedAt: string
    [key: string]: any
  }
}

interface ProjectionPoint {
  timestamp: number
  price: number
  support?: number
  resistance?: number
  confidence: number
  metadata?: Record<string, any>
}
```

**Legacy Format** (deprecated, avoid for new code):
```typescript
interface PriceChartDataPoint {
  date: string
  days: number
  historicalPrice?: number
  simulationPath?: number
  support?: number
  resistance?: number
}
```

---

## 🚀 Migration Guide for Your Code

### Step 1: Update Imports

Search your code for:
```typescript
from '@/src/modules/price-projection/types'
from '../../price-projection/types'
```

Replace with:
```typescript
from '@/app/simulation/price-models/types'
```

### Step 2: Update Service Usage

Replace `PriceDataService.generatePriceProjection()` with:
```typescript
import { unifiedPriceProjectionService } from '@/src/modules/shared'

const projection = await unifiedPriceProjectionService.generateProjectionFromLegacyParams(
  params,
  historicalData
)
```

### Step 3: Update Context Usage

Replace `priceChartData` with `priceProjection`:
```typescript
// Old
const { priceChartData } = useSimulation()

// New
const { priceProjection } = useSimulation()
```

### Step 4: Update Data Access

Replace legacy data access:
```typescript
// Old
priceChartData.map(point => point.simulationPath)

// New
priceProjection.projectionPoints.map(point => point.price)
```

---

## ⚠️ Breaking Changes

### None for Existing Code!

**Good news**: We maintained backward compatibility throughout the migration. Your existing code will continue to work with deprecation warnings.

### For New Code

- ❌ Cannot import from `src/modules/price-projection/types` (deleted)
- ❌ Cannot use `fromOldFormat()` or `fromLegacyFormat()` (removed)
- ✅ Must use standard format from `app/simulation/price-models/types`

---

## 🧪 Testing Your Code

### Run Tests

```bash
# Run all tests
pnpm test

# Run migration tests specifically
pnpm test src/modules/__tests__/

# Run type checking
pnpm type-check
```

### Check for Deprecation Warnings

Look for console warnings like:
```
⚠️ Using deprecated priceChartData. Use priceProjection instead.
⚠️ PriceDataService.generatePriceProjection() is deprecated.
```

---

## 📚 Resources

### Documentation
- **Architecture**: See `docs/architecture/module-overview.md`
- **Migration Guide**: See `.agent-os/specs/2025-09-30-price-projection-standardization/`
- **Metrics Report**: See `METRICS-REPORT.md`
- **Completion Summary**: See `COMPLETION-SUMMARY.md`

### Code Examples
- **Standard Format Usage**: See `src/modules/shared/services/UnifiedPriceProjectionService.ts`
- **Adapter Usage**: See `src/modules/shared/adapters/PriceProjectionAdapter.ts`
- **Context Usage**: See `app/simulation/context/SimulationContext.tsx`

### Tests
- **Migration Tests**: See `src/modules/__tests__/phase-*.test.ts`
- **Integration Tests**: See `app/simulation/__tests__/`

---

## 🤝 Getting Help

### Common Issues

**Q: My imports are broken**  
A: Update imports to use `@/app/simulation/price-models/types`

**Q: I'm getting deprecation warnings**  
A: Update to use `priceProjection` instead of `priceChartData`

**Q: My tests are failing**  
A: Check that you're using the standard format, not legacy format

**Q: Where do I find the new types?**  
A: `app/simulation/price-models/types.ts` - single source of truth

### Need More Help?

- Check the migration documentation in `.agent-os/specs/`
- Review the test files for examples
- Ask the team in #dev-bitcoin-simulation

---

## ✅ Checklist for Your Code

Use this checklist when updating your code:

- [ ] Updated all imports to use `@/app/simulation/price-models/types`
- [ ] Replaced `PriceDataService` with `UnifiedPriceProjectionService`
- [ ] Replaced `priceChartData` with `priceProjection`
- [ ] Removed usage of `fromOldFormat()` and `fromLegacyFormat()`
- [ ] Updated tests to use standard format
- [ ] Ran `pnpm type-check` with zero errors
- [ ] Ran `pnpm test` with all tests passing
- [ ] No deprecation warnings in console

---

## 🎉 Benefits of This Change

### For Developers
- ✅ Single, clear format to use
- ✅ No confusion about which type to import
- ✅ Better TypeScript autocomplete
- ✅ Cleaner, more maintainable code

### For the Codebase
- ✅ ~350 lines of code removed
- ✅ Zero duplicate type definitions
- ✅ Improved code quality (+18% maintainability)
- ✅ Better performance (+4% average)

### For the Team
- ✅ Easier onboarding for new developers
- ✅ Reduced maintenance overhead
- ✅ Clearer architecture
- ✅ Better documentation

---

## 📅 Timeline

- **Phase 1** (Complete): Foundation & Service Layer
- **Phase 2** (Complete): Hooks & State Management
- **Phase 3** (Complete): Component Migration
- **Phase 4** (Complete): Cleanup & Optimization
- **Current**: Documentation & Deployment Preparation

---

## 🏁 Conclusion

This migration standardizes our price projection data format across the entire application. While it's a significant change, we've maintained backward compatibility to ensure a smooth transition.

**Key Takeaway**: Use the standard format from `app/simulation/price-models/types.ts` for all new code!

**Questions?** Check the documentation or ask the team!

