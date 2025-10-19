# Centralized Loan Calculations

## Overview

This document describes the centralized loan calculation system that ensures consistency across all loan-related calculations in the Bitcoin Simulation Tool.

## Problem Statement

Previously, the Rolling Loan Strategy was using only the principal loan amount for calculations, without accounting for:
1. **Origination fees** (platform-specific fees charged when taking out a loan)
2. **Interest costs** over the loan term

This led to inaccurate simulations where the actual cost of borrowing was underestimated.

## Solution

We created a **Centralized Loan Calculation Service** that serves as the single source of truth for all loan-related calculations across the application.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         CentralizedLoanCalculationService                    │
│         (Single Source of Truth)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Used by
                            ▼
        ┌───────────────────────────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Rolling Loan     │                  │ Debug Page       │
│ Strategy         │                  │ Display          │
└──────────────────┘                  └──────────────────┘
        │                                       │
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Results Tab      │                  │ Strategy Preview │
│ Display          │                  │ Card             │
└──────────────────┘                  └──────────────────┘
```

## Key Components

### 1. CentralizedLoanCalculationService

**Location**: `src/modules/strategies/services/CentralizedLoanCalculationService.ts`

**Purpose**: Provides comprehensive loan calculation methods that include:
- Principal loan amount
- Origination fees (one-time or annual)
- Interest costs over loan term
- Total repayment amount
- Effective cost calculations
- Investment multiplier calculations
- Loan-to-Value (LTV) ratios

**Key Methods**:

#### `calculateLoanDetails(principal, collateralValue, params)`
Calculates complete loan details including all costs.

**Returns**:
```typescript
{
  principal: number              // Principal loan amount
  originationFee: number         // Origination fee amount
  originationFeePercent: number  // Origination fee percentage
  originationFeeType: string     // 'one-time' | 'annual' | 'none'
  totalInterest: number          // Total interest over loan term
  monthlyInterest: number        // Monthly interest payment
  annualInterestRate: number     // Annual interest rate percentage
  totalRepayment: number         // Total amount to repay
  effectiveCost: number          // Total fees + interest
  effectiveCostPercent: number   // Effective cost as % of principal
  loanTermMonths: number         // Loan term in months
  collateralValue: number        // Collateral value
  ltv: number                    // Loan-to-Value ratio
}
```

#### `calculateInvestmentMultiplier(loanDetails, collateralValue)`
Calculates how much BTC can be purchased with loan proceeds.

#### `calculateMinimumLoanForRollover(repaymentDue, originationFeePercent)`
Calculates minimum loan needed to cover repayment when rolling over.

#### `calculateRepaymentAmount(principal, params)`
Calculates total repayment amount for a given principal.

#### `formatLoanCalculation(loanDetails)`
Formats loan calculation for display with currency formatting.

#### `validateParameters(principal, collateralValue, params)`
Validates loan calculation parameters.

### 2. Rolling Loan Strategy Integration

**Location**: `src/modules/strategies/implementations/RollingLoanStrategy.ts`

**Changes**:
- Imports `centralizedLoanCalculationService`
- Uses `calculateLoanDetails()` in `handleInitialLoan()` method
- Uses `calculateInvestmentMultiplier()` for accurate BTC purchase calculations
- Displays comprehensive loan information in strategy reasoning

**Example**:
```typescript
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

const investmentMultiplier = centralizedLoanCalculationService.calculateInvestmentMultiplier(
  loanDetails,
  collateralValue
)
```

### 3. Debug Page Enhancement

**Location**: `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`

**New Feature**: **Loan Cost Breakdown Card**

Displays comprehensive loan calculation details for Month 0:

1. **Principal Loan Amount**
   - The actual loan proceeds received
   - Formatted as currency

2. **Origination Fee**
   - Fee percentage and type (one-time/annual)
   - Calculation formula shown
   - Amount in currency

3. **Total Interest**
   - Annual interest rate and loan term
   - Calculation formula shown
   - Amount in currency

4. **Total Repayment Amount**
   - Sum of principal + fees + interest
   - Calculation formula shown
   - Highlighted in green

5. **Effective Cost**
   - Total fees and interest (excluding principal)
   - Shown as amount and percentage of principal
   - Highlighted in amber

6. **Loan-to-Value Ratio**
   - Principal as percentage of collateral
   - Formatted as percentage

## Calculation Formulas

### Origination Fee

**One-time fee**:
```
originationFee = principal × (originationFeePercent / 100)
```

**Annual fee**:
```
annualFee = principal × (originationFeePercent / 100)
loanTermYears = loanTermMonths / 12
originationFee = annualFee × loanTermYears
```

### Interest

**Monthly interest rate**:
```
monthlyInterestRate = annualInterestRate / 100 / 12
```

**Monthly interest payment**:
```
monthlyInterest = principal × monthlyInterestRate
```

**Total interest over loan term**:
```
totalInterest = monthlyInterest × loanTermMonths
```

**For infinite term loans**:
```
totalInterest = monthlyInterest × 12  // Calculate 1 year as reference
```

### Total Repayment

```
totalRepayment = principal + originationFee + totalInterest
```

### Effective Cost

```
effectiveCost = originationFee + totalInterest
effectiveCostPercent = (effectiveCost / principal) × 100
```

### Loan-to-Value Ratio

```
ltv = (principal / collateralValue) × 100
```

### Investment Multiplier

```
investmentMultiplier = principal / collateralValue
```

## Testing

### Test Coverage

**File**: `src/modules/strategies/services/__tests__/CentralizedLoanCalculationService.test.ts`

**17 comprehensive tests** covering:
- ✅ Basic loan detail calculations
- ✅ Zero origination fee handling
- ✅ Infinite loan term handling
- ✅ LTV calculations
- ✅ Investment multiplier calculations
- ✅ Minimum loan for rollover calculations
- ✅ Repayment amount calculations
- ✅ Formatting functions
- ✅ Parameter validation
- ✅ Integration with Rolling Loan Strategy

**All tests passing**: ✅ 17/17

## Usage Examples

### Example 1: Calculate Loan Details

```typescript
import { centralizedLoanCalculationService } from '@/src/modules/strategies/services/CentralizedLoanCalculationService'

const principal = 10000
const collateralValue = 50000
const params = {
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  loanTermMonths: 6,
  // ... other params
}

const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

console.log(loanDetails)
// {
//   principal: 10000,
//   originationFee: 150,
//   totalInterest: 325,
//   totalRepayment: 10475,
//   effectiveCost: 475,
//   effectiveCostPercent: 4.75,
//   ltv: 20,
//   ...
// }
```

### Example 2: Format for Display

```typescript
const formatted = centralizedLoanCalculationService.formatLoanCalculation(loanDetails)

console.log(formatted)
// {
//   principalFormatted: "$10,000",
//   originationFeeFormatted: "$150",
//   totalInterestFormatted: "$325",
//   totalRepaymentFormatted: "$10,475",
//   effectiveCostFormatted: "$475",
//   effectiveCostPercentFormatted: "4.75%",
//   ltvFormatted: "20.0%"
// }
```

## Benefits

1. **Consistency**: All loan calculations use the same formulas across the application
2. **Accuracy**: Includes all costs (principal, fees, interest) in calculations
3. **Transparency**: Debug page shows detailed breakdown of calculations
4. **Maintainability**: Single source of truth makes updates easier
5. **Testability**: Comprehensive test coverage ensures reliability
6. **Extensibility**: Easy to add new calculation methods or fee types

## Future Enhancements

1. **Platform-Specific Fee Types**: Detect and handle annual vs one-time fees based on platform
2. **Compound Interest**: Add support for compound interest calculations
3. **Variable Interest Rates**: Support for interest rates that change over time
4. **Fee Schedules**: Support for complex fee structures
5. **Tax Calculations**: Add tax implications to loan calculations

## Related Documentation

- [Month 0 Price Fix Verification](./MONTH_0_PRICE_FIX_VERIFICATION.md)
- [Rolling Loan Strategy](../src/modules/strategies/implementations/RollingLoanStrategy.ts)
- [Platform Configuration Guide](./platform-configuration-guide.md)

## Commit Information

**Commit**: 3cc711b
**Branch**: price-projection-output-standardization
**Date**: 2025-10-01

## Support

If you encounter issues with loan calculations:

1. Check the Debug page's "Loan Cost Breakdown" card for detailed calculation transparency
2. Verify parameters are correct in the Parameters tab
3. Run tests: `pnpm test src/modules/strategies/services/__tests__/CentralizedLoanCalculationService.test.ts`
4. Check browser console for calculation logs
5. Refer to this documentation for formula verification

