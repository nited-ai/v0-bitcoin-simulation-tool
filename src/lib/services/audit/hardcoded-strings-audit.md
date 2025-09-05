# Hardcoded Strings Audit Report

> Generated: 2025-08-21
> Task: 1.2 - Audit all components for hardcoded strings

## Summary

This audit identifies all hardcoded user-facing strings in the simulation components that need localization. Components are categorized by their current localization status.

## Localization Status by Component

### ✅ Fully Localized Components

**SimulationHeader.tsx**
- Status: ✅ Complete
- Uses: `useTranslation` hook with `safeT` fallback
- Issues: One hardcoded string found: "Back to Landing" (line 35)

**HowItWorksContent.tsx**
- Status: ✅ Complete
- Uses: `useTranslation` hook properly
- Issues: None - all strings use `t()` function

### 🔶 Partially Localized Components

**EconomicAssumptionsCard.tsx**
- Status: 🔶 Partial
- Uses: Custom fallback function (not useTranslation)
- Issues: Uses local translations object instead of i18n system

**InvestmentStrategyCard.tsx**
- Status: 🔶 Partial
- Uses: Custom fallback function (not useTranslation)
- Issues: Uses local translations object instead of i18n system

### ❌ Not Localized Components

**TabNavigation.tsx**
- Status: ❌ No localization
- Critical hardcoded strings:
  - Tab labels: "Parameters", "Price Projection", "Strategy", "Results"
  - Short labels: "Params", "Price", "Strategy", "Results"
  - Badge text: "Coming Soon"

**BasicParametersCard.tsx**
- Status: ❌ No localization
- Critical hardcoded strings:
  - Card title: "Basic Parameters"
  - Field labels: "Initial BTC Price", "BTC Amount", "Monthly Savings/Withdrawal"
  - Tooltips: "Starting Bitcoin price in USD for the simulation"
  - Button text: Various action buttons
  - Placeholder text: "100,000", etc.

**LoanParametersCard.tsx**
- Status: ❌ No localization
- Critical hardcoded strings:
  - Card title: "Loan Parameters"
  - Field labels: Multiple loan-related labels
  - Tooltips: Extensive help text
  - Validation messages: Error states

## Detailed String Inventory

### TabNavigation.tsx Hardcoded Strings

```typescript
// Tab configuration object (lines 53-80)
const tabConfig: Record<TabValue, TabConfig> = {
  parameters: {
    label: 'Parameters',           // → Navigation.parameters.label
    shortLabel: 'Params',          // → Navigation.parameters.shortLabel
    icon: Settings,
    enabled: true
  },
  'price-projection': {
    label: 'Price Projection',     // → Navigation.priceProjection.label
    shortLabel: 'Price',           // → Navigation.priceProjection.shortLabel
    icon: BarChart3,
    enabled: true
  },
  strategy: {
    label: 'Strategy',             // → Navigation.strategy.label
    shortLabel: 'Strategy',        // → Navigation.strategy.shortLabel
    icon: Target,
    enabled: false,
    badge: 'Coming Soon'           // → Navigation.comingSoon.badge
  },
  results: {
    label: 'Results',              // → Navigation.results.label
    shortLabel: 'Results',         // → Navigation.results.shortLabel
    icon: TrendingDown,
    enabled: false,
    badge: 'Coming Soon'           // → Navigation.comingSoon.badge
  }
}
```

### BasicParametersCard.tsx Hardcoded Strings

```typescript
// Card title (line 72)
"Basic Parameters"                 // → BasicParameters.title

// Field labels and tooltips (lines 86-93)
"Initial BTC Price"               // → BasicParameters.initialBtcPrice.label
"Starting Bitcoin price in USD for the simulation"  // → BasicParameters.initialBtcPrice.tooltip

// More field labels throughout the component
"BTC Amount"                      // → BasicParameters.btcAmount.label
"Monthly Savings/Withdrawal"      // → BasicParameters.monthlyAmount.label

// Placeholder text
"100,000"                         // → BasicParameters.initialBtcPrice.placeholder
```

### LoanParametersCard.tsx Hardcoded Strings

```typescript
// Card title (line 114)
"Loan Parameters"                 // → LoanParameters.title

// Multiple field labels, tooltips, and validation messages
// (Extensive list - needs detailed analysis)
```

### SimulationHeader.tsx Remaining Issues

```typescript
// Line 35 - hardcoded button text
"Back to Landing"                 // → Navigation.backToLanding.button
```

## Translation Key Mapping Strategy

### Proposed Key Structure

```typescript
// Navigation keys
Navigation: {
  parameters: { label: "Parameters", shortLabel: "Params" },
  priceProjection: { label: "Price Projection", shortLabel: "Price" },
  strategy: { label: "Strategy", shortLabel: "Strategy" },
  results: { label: "Results", shortLabel: "Results" },
  comingSoon: { badge: "Coming Soon" },
  backToLanding: { button: "Back to Landing" }
}

// Basic Parameters keys
BasicParameters: {
  title: "Basic Parameters",
  initialBtcPrice: {
    label: "Initial BTC Price",
    tooltip: "Starting Bitcoin price in USD for the simulation",
    placeholder: "100,000"
  },
  btcAmount: {
    label: "BTC Amount",
    tooltip: "Amount of Bitcoin to simulate with"
  },
  monthlyAmount: {
    label: "Monthly Savings/Withdrawal",
    tooltip: "Monthly amount to save or withdraw"
  }
}

// Loan Parameters keys
LoanParameters: {
  title: "Loan Parameters",
  // ... extensive list of loan-related keys
}
```

## Priority for Localization Updates

### High Priority (Immediate)
1. **TabNavigation.tsx** - Core navigation affects entire app
2. **BasicParametersCard.tsx** - Primary user interface
3. **SimulationHeader.tsx** - Fix remaining hardcoded string

### Medium Priority
4. **LoanParametersCard.tsx** - Complex but important
5. **EconomicAssumptionsCard.tsx** - Convert to proper i18n
6. **InvestmentStrategyCard.tsx** - Convert to proper i18n

### Low Priority
7. Chart components (need separate analysis)
8. Error boundary components
9. Admin components

## Implementation Notes

- Components using custom translation objects should be converted to use `useTranslation` hook
- All hardcoded strings should be replaced with `t()` function calls
- Implement `safeT` fallback pattern consistently
- Maintain backward compatibility during transition
