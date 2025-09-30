# Platform Configuration Guide

## Overview

The Bitcoin Simulation Tool supports multiple lending platforms, each with unique configurations for fees, LTV ratios, and loan terms. This guide covers all supported platforms and how to integrate new ones.

**Last Updated**: 2025-09-30  
**Related PR**: #28 (Coinbase Platform Integration)

## Supported Platforms

### 1. Firefish 🐟
**Type**: Conservative Lending Platform  
**Badge**: Non Custodial

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Origination Fee** | 1.5% | Annual fee (charged yearly) |
| **Interest Rate** | 6.5% (default) | Variable |
| **Max Initial LTV** | 50% | Conservative limit |
| **Liquidation LTV** | 95% | High safety margin |
| **Liquidation Fee** | 5.0% | Applied to liquidated collateral |
| **Available Loan Terms** | 3, 6, 12, 18, 24 months | Fixed terms only |
| **Default Loan Term** | 24 months | Recommended |
| **Max Loan Amount** | Unlimited | Based on collateral |

**Key Features**:
- ✅ Non-custodial solution
- ✅ Annual origination fee structure
- ✅ Conservative LTV ratios for safety
- ✅ Multiple fixed-term options
- ✅ High liquidation threshold (95%)

**Website**: [https://firefish.io/](https://firefish.io/)

---

### 2. Strike ⚡
**Type**: Flexible Lending Platform  
**Badge**: High LTV

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Origination Fee** | 0% | No fees |
| **Interest Rate** | 6.5% (default) | Variable |
| **Max Initial LTV** | 50% | Standard limit |
| **Liquidation LTV** | 85% | Lower than Firefish |
| **Liquidation Fee** | 1.0% | Minimal fee |
| **Available Loan Terms** | 6, 12, 18, 24, infinity months | Includes infinite term |
| **Default Loan Term** | Infinity | Open-term loans |
| **Max Loan Amount** | Unlimited | Based on collateral |

**Key Features**:
- ✅ Zero origination fees
- ✅ Infinite loan term option
- ✅ Competitive liquidation fee (1%)
- ✅ Flexible loan duration
- ✅ Lower liquidation threshold (85%)

**Website**: [https://strike.me/lending/](https://strike.me/lending/)

---

### 3. Coinbase 🏦
**Type**: Institutional Lending Platform  
**Badge**: Infinite Loan Term

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Origination Fee** | 0% | No fees |
| **Interest Rate** | 5% (default) | Determined by Morpho Protocol |
| **Max Initial LTV** | 75% | **Highest among all platforms** |
| **Liquidation LTV** | 86% | Moderate threshold |
| **Liquidation Fee** | 4.38% | Applied to liquidated collateral |
| **Available Loan Terms** | Infinity only | Open-term credit line |
| **Default Loan Term** | Infinity | No expiration |
| **Max Loan Amount** | $1,000,000 USDC | High capacity |

**Key Features**:
- ✅ **Flexible Credit Line** - No fixed loan terms
- ✅ **Highest LTV** - 75% initial, 86% liquidation
- ✅ **Morpho Protocol Integration** - Institutional-grade security
- ✅ **Zero Origination Fees** - Cost-effective
- ✅ **Infinite Loan Duration** - No rollover requirements
- ✅ **Regulated Exchange** - Coinbase backing

**Special Behavior**:
- Loans never mature (no rollover logic)
- Interest accumulates annually but never requires repayment
- Auto-selects "infinity" loan term when platform is selected
- No "very long loan terms" warnings

**Website**: [https://www.coinbase.com/](https://www.coinbase.com/) (via Morpho Protocol)

**Added**: PR #28 (2025-09-30)

---

### 4. Custom ⚙️
**Type**: User-Defined Configuration  
**Badge**: Custom

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Origination Fee** | 1.0% (default) | User-configurable |
| **Interest Rate** | 6.5% (default) | User-configurable |
| **Max Initial LTV** | 75% | User-configurable |
| **Liquidation LTV** | 97% | User-configurable |
| **Liquidation Fee** | 3.0% | User-configurable |
| **Available Loan Terms** | 3, 6, 12, 18, 24, infinity | All options |
| **Default Loan Term** | 12 months | User-configurable |
| **Max Loan Amount** | Unlimited | User-configurable |

**Key Features**:
- ✅ Fully customizable parameters
- ✅ localStorage persistence
- ✅ Multiple saved configurations
- ✅ All loan term options available
- ✅ Highest flexibility

---

## Platform Comparison Table

| Feature | Firefish | Strike | Coinbase | Custom |
|---------|----------|--------|----------|--------|
| **Origination Fee** | 1.5% (annual) | 0% | 0% | 1.0% |
| **Max Initial LTV** | 50% | 50% | **75%** ⭐ | 75% |
| **Liquidation LTV** | **95%** ⭐ | 85% | 86% | 97% |
| **Liquidation Fee** | 5.0% | **1.0%** ⭐ | 4.38% | 3.0% |
| **Infinite Loans** | ❌ | ✅ | ✅ | ✅ |
| **Fixed Terms** | ✅ | ✅ | ❌ | ✅ |
| **Custodial** | ❌ | ❌ | ✅ | Varies |
| **Max Loan** | Unlimited | Unlimited | $1M USDC | Unlimited |

**Legend**:
- ⭐ = Best in category
- ✅ = Supported
- ❌ = Not supported

---

## Technical Implementation

### Platform Configuration Interface

```typescript
export interface PlatformConfig {
  id: string
  name: string
  description: string
  originationFeePercent: number
  originationFeeType: 'one-time' | 'annual'
  liquidationLtv: number
  liquidationFeePercent: number
  availableLoanTerms: (number | 'infinity')[]
  defaultLoanTerm: number | 'infinity'
  maxInitialLtv: number
}
```

### Platform Registry

**File**: `app/simulation/constants/platformPresets.ts`

```typescript
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  firefish: { /* config */ },
  strike: { /* config */ },
  coinbase: { /* config */ },  // Added in PR #28
  custom: { /* config */ }
}
```

### Getting Platform Configuration

```typescript
import { getPlatformConfig } from '@/app/simulation/constants/platformPresets'

// Get built-in platform
const firefishConfig = getPlatformConfig('firefish')

// Get custom platform (from localStorage)
const customConfig = getPlatformConfig('custom-my-platform')
```

### Saving Custom Platform

```typescript
import { saveCustomPlatformConfig } from '@/app/simulation/constants/platformPresets'

const myPlatform: PlatformConfig = {
  id: 'custom-my-platform',
  name: 'My Custom Platform',
  // ... other config
}

saveCustomPlatformConfig('custom-my-platform', myPlatform)
```

---

## Validation Services Integration

### 1. CalculationsService

**File**: `app/simulation/tabs/parameters/calculationsService.ts`

All platforms must be registered in the valid platforms list:

```typescript
const validPlatforms = ['firefish', 'strike', 'coinbase', 'custom']
```

### 2. StrategyValidationService

**File**: `src/modules/strategies/services/StrategyValidationService.ts`

Platform-specific LTV limits:

```typescript
const platformLtvLimits = {
  firefish: 95,
  strike: 85,
  coinbase: 86,  // Added in PR #28
  custom: 97
}
```

### 3. PlatformFeeIntegrationService

**File**: `src/modules/strategies/services/PlatformFeeIntegrationService.ts`

Platform-specific fee validation:

```typescript
// Coinbase: 0% origination fee, 4.38% liquidation fee
if (platform === 'coinbase') {
  return {
    originationFeePercent: 0,
    liquidationFeePercent: 4.38
  }
}
```

---

## UI Integration

### Platform Selector Component

**File**: `app/simulation/tabs/parameters/PlatformSelector.tsx`

Features:
- Card-based selection UI
- Platform badges (Non Custodial, High LTV, Infinite Loan Term, Custom)
- External platform links ("Visit Platform" buttons)
- Custom SVG icons for each platform
- Theme-aware styling (light/dark mode)

### Auto-Selection Logic

When a platform is selected, the loan term dropdown automatically adjusts:

```typescript
// Coinbase only supports infinity
if (platformId === 'coinbase') {
  setParams(prev => ({
    ...prev,
    loanTermMonths: 'infinity'
  }))
}
```

---

## Infinite Loan Term Handling

### How It Works

Loans with `loanTermMonths: 'infinity'` have special behavior:

1. **No Maturity**: Never appear in `maturingLoans` array
2. **No Rollover**: Never trigger rollover logic
3. **Interest-Only**: Simple interest calculation without amortization
4. **Annual Accumulation**: Interest accumulates yearly but never requires repayment

### Supported Platforms

- ✅ Strike (optional)
- ✅ Coinbase (required)
- ✅ Custom (optional)
- ❌ Firefish (not supported)

---

## Adding a New Platform

### Step 1: Add Platform Configuration

Edit `app/simulation/constants/platformPresets.ts`:

```typescript
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  // ... existing platforms
  newplatform: {
    id: 'newplatform',
    name: 'New Platform',
    description: 'Platform description',
    originationFeePercent: 0,
    originationFeeType: 'one-time',
    liquidationLtv: 90,
    liquidationFeePercent: 2.0,
    availableLoanTerms: [6, 12, 24],
    defaultLoanTerm: 12,
    maxInitialLtv: 60
  }
}
```

### Step 2: Update Validation Services

1. **CalculationsService**: Add to `validPlatforms` array
2. **StrategyValidationService**: Add LTV limit
3. **PlatformFeeIntegrationService**: Add fee validation

### Step 3: Update UI Components

1. **PlatformSelector**: Add platform card with icon and badge
2. **Translations**: Add platform name and description to i18n files
3. **Icons**: Create custom SVG icon (optional)

### Step 4: Update Tests

Add test coverage for the new platform in:
- `app/simulation/tabs/parameters/__tests__/`
- `test/platform-integration.test.tsx`

---

## Troubleshooting

### Issue: "Invalid platform selection" Error

**Cause**: Platform not registered in CalculationsService  
**Solution**: Add platform to `validPlatforms` array

### Issue: Loan Term Auto-Selection Not Working

**Cause**: Missing auto-selection logic in SimulationContext  
**Solution**: Add platform-specific logic in `applyPlatformConfig`

### Issue: Validation Warnings for Infinite Loans

**Cause**: Platform not excluded from loan term warnings  
**Solution**: Update `useParameterValidation` hook to exclude platform

---

## Best Practices

1. **Always validate platform parameters** before saving
2. **Use platform-specific badges** for clear identification
3. **Provide external links** to platform websites
4. **Document special behaviors** (like infinite loans)
5. **Test across all validation services** when adding platforms
6. **Maintain backward compatibility** with existing configurations

---

## Related Documentation

- [Parameters Module Documentation](parameters/README.md)
- [Validation Documentation](parameters/validation.md)
- [Price Models Documentation](parameters/price-models.md)

---

**Maintained By**: AI Assistant (Augment Agent)  
**Last Updated**: 2025-09-30  
**Version**: 2.0 (Added Coinbase platform)

