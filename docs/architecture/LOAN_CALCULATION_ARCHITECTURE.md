# Loan Calculation Architecture

## Overview

This document describes the architecture and design patterns for loan calculations in the Bitcoin Simulation Tool. It explains the centralized calculation pattern, data flow, and integration points.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Parameters   │  │ Price        │  │ Strategy     │              │
│  │ Tab          │  │ Projection   │  │ Tab          │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                       │
│         └──────────────────┼──────────────────┘                       │
│                            │                                          │
│                            ▼                                          │
│                  ┌─────────────────────┐                             │
│                  │ useSimulation Hook  │                             │
│                  └──────────┬──────────┘                             │
│                             │                                         │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────────────┐
│                    STRATEGY LAYER                                     │
├─────────────────────────────┼─────────────────────────────────────────┤
│                             │                                          │
│                             ▼                                          │
│                  ┌─────────────────────┐                              │
│                  │ StrategyExecution   │                              │
│                  │ Service             │                              │
│                  └──────────┬──────────┘                              │
│                             │                                          │
│                             ▼                                          │
│                  ┌─────────────────────┐                              │
│                  │ RollingLoanStrategy │                              │
│                  │ (or other strategy) │                              │
│                  └──────────┬──────────┘                              │
│                             │                                          │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │
                              │ ⚠️ ALL LOAN CALCULATIONS
                              │    MUST GO THROUGH HERE
                              │
┌─────────────────────────────┼─────────────────────────────────────────┐
│                    CALCULATION LAYER                                  │
├─────────────────────────────┼─────────────────────────────────────────┤
│                             │                                          │
│                             ▼                                          │
│              ┌──────────────────────────────────┐                     │
│              │ CentralizedLoanCalculationService│                     │
│              │  (SINGLE SOURCE OF TRUTH)        │                     │
│              └──────────────┬───────────────────┘                     │
│                             │                                          │
│         ┌───────────────────┼───────────────────┐                     │
│         │                   │                   │                     │
│         ▼                   ▼                   ▼                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                │
│  │ Calculate   │   │ Calculate   │   │ Calculate   │                │
│  │ Loan        │   │ Investment  │   │ Minimum     │                │
│  │ Details     │   │ Multiplier  │   │ Rollover    │                │
│  └─────────────┘   └─────────────┘   └─────────────┘                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Loan         │  │ Monthly      │  │ Strategy     │              │
│  │ Objects      │  │ Results      │  │ Decisions    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Single Source of Truth Pattern

**Problem**: Loan calculations were scattered across multiple files, leading to inconsistencies.

**Solution**: Centralize all loan calculations in `CentralizedLoanCalculationService`.

**Benefits**:
- Consistency across the application
- Easy to maintain and update
- Single place to fix bugs
- Clear ownership of calculation logic

**Implementation**:
```typescript
// ✅ CORRECT: Use centralized service
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

// ❌ WRONG: Calculate manually
const repayment = principal * (1 + interestRate)
```

### 2. Immutable Calculation Results

**Problem**: Mutable loan objects could be modified after creation, leading to inconsistent state.

**Solution**: Return immutable calculation results from the service.

**Implementation**:
```typescript
export interface LoanCalculationResult {
  readonly principal: number
  readonly originationFee: number
  readonly totalInterest: number
  readonly totalRepayment: number
  // ... other readonly fields
}
```

### 3. Semantic Naming Pattern

**Problem**: Ambiguous names like "loanAmount" don't clarify if it's principal or repayment.

**Solution**: Use clear, semantic names that indicate what the value represents.

**Implementation**:
```typescript
// ✅ CORRECT: Clear semantic names
interface Loan {
  principal: number        // Amount received
  repaymentAmount: number  // Amount owed
}

// ❌ WRONG: Ambiguous names
interface Loan {
  amount: number
  total: number
}
```

### 4. Standardized Precision Pattern

**Problem**: Inconsistent decimal precision ($11,724 vs $11,724.2) caused confusion.

**Solution**: Round all monetary values to eliminate decimals.

**Implementation**:
```typescript
// Always round monetary values
const principal = Math.round(collateralValue * 0.10)
const originationFee = Math.round(principal * (feePercent / 100))
const totalInterest = Math.round(monthlyInterest * termMonths)
```

## Data Flow

### Initial Loan Creation

```
User Input (Parameters Tab)
    │
    ├─ Initial BTC Amount: 1.0 BTC
    ├─ Initial BTC Price: $117,242
    ├─ Loan Amount Percent: 10%
    ├─ Origination Fee: 1.5%
    ├─ Interest Rate: 10%
    └─ Loan Term: 18 months
    │
    ▼
Calculate Principal
    │
    └─ principal = Math.round(117242 * 0.10) = $11,724
    │
    ▼
CentralizedLoanCalculationService.calculateLoanDetails()
    │
    ├─ principal: $11,724
    ├─ originationFee: Math.round(11724 * 0.015) = $176
    ├─ monthlyInterest: 11724 * (0.10 / 12) = $97.70
    ├─ totalInterest: Math.round(97.70 * 18) = $1,759
    └─ totalRepayment: Math.round(11724 + 176 + 1759) = $13,659
    │
    ▼
Create Loan Object
    │
    └─ Loan {
         id: 1,
         month: 0,
         principal: $11,724,        // Amount received
         maturityMonth: 18,
         repaymentAmount: $13,659,  // Amount owed
         lockedBtc: 0.1 BTC
       }
    │
    ▼
Store in Active Loans Array
    │
    ▼
Display to User
    │
    ├─ Principal (received): $11,724
    ├─ Origination Fee: $176
    ├─ Total Interest: $1,759
    └─ Total Repayment (owed): $13,659
```

### Rolling Loan Scenario

```
Month 18: Loan Matures
    │
    ├─ Maturing Loan: repaymentAmount = $13,659
    └─ Current BTC Price: $150,000
    │
    ▼
Calculate Minimum Loan for Rollover
    │
    └─ minimumLoan = centralizedLoanCalculationService
                     .calculateMinimumLoanForRollover($13,659, 1.5%)
       = $13,659 / (1 - 0.015) = $13,867
    │
    ▼
Calculate Target Loan Amount
    │
    └─ targetLoan = Math.round(150000 * 0.10) = $15,000
    │
    ▼
Take Larger of Minimum or Target
    │
    └─ newPrincipal = Math.max($13,867, $15,000) = $15,000
    │
    ▼
CentralizedLoanCalculationService.calculateLoanDetails()
    │
    ├─ principal: $15,000
    ├─ originationFee: $225
    ├─ totalInterest: $2,250
    └─ totalRepayment: $17,475
    │
    ▼
Calculate Excess Proceeds
    │
    └─ excessProceeds = $15,000 - $13,659 = $1,341
    │
    ▼
Handle Excess Based on Mode
    │
    ├─ BTC Accumulation: Buy $1,341 / $150,000 = 0.00894 BTC
    └─ Cash Generation: Withdraw $1,341 * 0.8 = $1,073
    │
    ▼
Create New Loan
    │
    └─ Loan {
         id: 2,
         month: 18,
         principal: $15,000,
         maturityMonth: 36,
         repaymentAmount: $17,475,
         lockedBtc: 0.1 BTC
       }
```

## Integration Points

### 1. Strategy Execution Service

**File**: `src/modules/strategies/services/StrategyExecutionService.ts`

**Integration**:
```typescript
// When creating new loans
const principal = Math.round(totalPrincipal)
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  principal,
  collateralValue,
  params
)

const newLoan: Loan = {
  id: loanIdCounter++,
  month,
  principal: loanDetails.principal,
  maturityMonth: month + params.loanTermMonths,
  repaymentAmount: loanDetails.totalRepayment,
  lockedBtc: loanDetails.principal / btcPrice
}
```

### 2. Rolling Loan Strategy

**File**: `src/modules/strategies/implementations/RollingLoanStrategy.ts`

**Integration**:
```typescript
// Initial loan
private handleInitialLoan(context, collateralValue, maxLoanAmount) {
  const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
    maxLoanAmount,
    collateralValue,
    context.params
  )
  
  const investmentMultiplier = centralizedLoanCalculationService
    .calculateInvestmentMultiplier(loanDetails, collateralValue)
  
  return {
    allowInvestment: true,
    investmentMultiplier,
    reasoning: `Taking initial loan: ${formatted.principalFormatted} principal + 
                ${formatted.originationFeeFormatted} fee + 
                ${formatted.totalInterestFormatted} interest = 
                ${formatted.totalRepaymentFormatted} total`
  }
}
```

### 3. Debug Page

**File**: `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`

**Integration**:
```typescript
// Calculate loan details for display
const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
  finalLoanAmount,
  btcStackValue,
  strategyParams
)

// Display breakdown
<div>
  <div>Principal: ${loanDetails.principal.toLocaleString()}</div>
  <div>Origination Fee: ${loanDetails.originationFee.toLocaleString()}</div>
  <div>Total Interest: ${loanDetails.totalInterest.toLocaleString()}</div>
  <div>Total Repayment: ${loanDetails.totalRepayment.toLocaleString()}</div>
</div>
```

## Type Safety

### Loan Interface

```typescript
export interface Loan {
  id: number
  month: number
  principal: number        // Amount received (e.g., $11,724)
  maturityMonth: number
  repaymentAmount: number  // Amount owed (e.g., $13,659)
  lockedBtc: number
}
```

### Calculation Result Interface

```typescript
export interface LoanCalculationResult {
  principal: number              // Rounded, no decimals
  originationFee: number         // Rounded, no decimals
  originationFeePercent: number  // Percentage (e.g., 1.5)
  originationFeeType: 'one-time' | 'annual' | 'none'
  totalInterest: number          // Rounded, no decimals
  monthlyInterest: number        // Precise for calculations
  annualInterestRate: number     // Percentage (e.g., 10)
  totalRepayment: number         // Rounded, no decimals
  effectiveCost: number          // Rounded, no decimals
  effectiveCostPercent: number   // Percentage
  loanTermMonths: number
  collateralValue: number
  ltv: number                    // Percentage
}
```

## Testing Strategy

### Unit Tests

Test the centralized service in isolation:

```typescript
describe('CentralizedLoanCalculationService', () => {
  it('should calculate loan details correctly', () => {
    const result = service.calculateLoanDetails(11724, 117242, params)
    expect(result.principal).toBe(11724)
    expect(result.originationFee).toBe(176)
    expect(result.totalInterest).toBe(1759)
    expect(result.totalRepayment).toBe(13659)
  })
})
```

### Integration Tests

Test the service integration with strategies:

```typescript
describe('Strategy Integration', () => {
  it('should create loans with correct repayment amounts', async () => {
    const result = await strategyExecutionService.executeStrategy(...)
    const loan = result.monthlyResults[0].activeLoans[0]
    
    expect(loan.repaymentAmount).toBeGreaterThan(loan.principal)
    expect(loan.repaymentAmount).toBe(
      loan.principal + expectedFee + expectedInterest
    )
  })
})
```

## Performance Considerations

### Calculation Caching

The service does NOT cache calculations because:
1. Loan parameters change frequently
2. Calculations are fast (< 1ms)
3. Caching adds complexity
4. Fresh calculations ensure accuracy

### Optimization Opportunities

If performance becomes an issue:
1. Memoize calculation results within a single simulation run
2. Pre-calculate common loan scenarios
3. Use Web Workers for large simulations

## Future Enhancements

### 1. Platform-Specific Fee Types

Currently, all fees are treated as one-time. Future enhancement:

```typescript
// Detect fee type from platform configuration
const platformConfig = getPlatformConfig(params.platform)
const originationFeeType = platformConfig.feeType  // 'one-time' | 'annual'

if (originationFeeType === 'annual') {
  originationFee = principal * (feePercent / 100) * (termMonths / 12)
}
```

### 2. Branded Types

Add type safety to distinguish principal from repayment:

```typescript
type LoanPrincipal = number & { __brand: 'LoanPrincipal' }
type LoanRepayment = number & { __brand: 'LoanRepayment' }

interface Loan {
  principal: LoanPrincipal
  repaymentAmount: LoanRepayment
}
```

### 3. Validation Layer

Add parameter validation:

```typescript
validateLoanParameters(principal, collateralValue, params) {
  if (principal <= 0) throw new Error('Principal must be positive')
  if (collateralValue <= 0) throw new Error('Collateral must be positive')
  if (principal > collateralValue) throw new Error('Principal exceeds collateral')
  // ... more validations
}
```

## Conclusion

The centralized loan calculation architecture provides:

✅ **Consistency**: Same calculations everywhere
✅ **Accuracy**: Includes all cost components
✅ **Maintainability**: Single place to update
✅ **Clarity**: Clear distinction between principal and repayment
✅ **Testability**: Easy to test in isolation

By following this architecture, we ensure that all loan calculations are accurate, consistent, and maintainable across the entire application.

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0

