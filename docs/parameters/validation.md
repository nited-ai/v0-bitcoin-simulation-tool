# Parameter Validation Rules

This document defines all validation rules, constraints, and limits for parameters in the Bitcoin Simulation Tool.

## Basic Parameters Validation

### BTC Amount
- **Type:** `number`
- **Min:** `0.001` BTC
- **Max:** `1000` BTC
- **Step:** `0.001`
- **Decimals:** `3`
- **Validation:** Must be positive, reasonable for individual holdings

### Initial BTC Price
- **Type:** `number`
- **Min:** `1000` EUR
- **Max:** `10000000` EUR (10M EUR)
- **Step:** `1000`
- **Decimals:** `0`
- **Validation:** Must reflect realistic Bitcoin price ranges

### Monthly Withdrawal Amount
- **Type:** `number`
- **Min:** `0` EUR
- **Max:** `50000` EUR
- **Step:** `100`
- **Decimals:** `0`
- **Validation:** Cannot exceed reasonable monthly expenses

### Simulation Length
- **Type:** `number`
- **Min:** `1` month
- **Max:** `300` months (25 years)
- **Step:** `1`
- **Default:** `144` months (12 years)
- **Validation:** Must allow meaningful simulation periods

## Loan Parameters Validation

### Max Loan Amount Percentage
- **Type:** `number`
- **Min:** `1` %
- **Max:** `100` %
- **Step:** `1`
- **Default:** `15` %
- **Validation:** Cannot exceed total BTC stack value

### Annual Interest Rate
- **Type:** `number`
- **Min:** `0` %
- **Max:** `50` %
- **Step:** `0.1`
- **Default:** `6.5` %
- **Validation:** Must reflect realistic lending rates

### Origination Fee
- **Type:** `number`
- **Min:** `0` %
- **Max:** `10` %
- **Step:** `0.1`
- **Default:** `1.5` %
- **Validation:** Reasonable one-time fee range

### Liquidation Fee
- **Type:** `number`
- **Min:** `0` %
- **Max:** `20` %
- **Step:** `0.1`
- **Default:** `5.0` %
- **Validation:** Must not exceed collateral value

### Loan Term
- **Type:** `number | Infinity`
- **Options:** `[6, 12, 24, 36, Infinity]` months
- **Default:** `6` months
- **Validation:** Must not exceed simulation length (except Infinity)

## Risk Management Validation

### Target LTV (Initial LTV)
- **Type:** `number`
- **Min:** `1` %
- **Max:** `95` %
- **Step:** `1`
- **Default:** `50` %
- **Validation:** Must be less than liquidation LTV

### Liquidation LTV
- **Type:** `number`
- **Min:** `50` %
- **Max:** `100` %
- **Step:** `1`
- **Default:** `95` %
- **Validation:** Must be greater than target LTV

### LTV Relationship Validation
```typescript
targetLtv < liquidationLtv
liquidationLtv - targetLtv >= 5 // Minimum 5% buffer
```

## Price Model Validation

### Manual Growth Model
- **Annual Growth Rates:**
  - **Type:** `number[]`
  - **Min per rate:** `-95` % (cannot lose more than 95%)
  - **Max per rate:** `1000` % (10x growth maximum)
  - **Length:** Must cover simulation period
  - **Validation:** Rates must be realistic for Bitcoin volatility

### Power Law Model
- **Prognosis Line:**
  - **Type:** `"fit" | "support" | "resistance"`
  - **Default:** `"fit"`
  - **Validation:** Must be valid PowerLawLine type

### Cycle Repeat Models
- **Historical Data:**
  - **Type:** `number[] | null`
  - **Validation:** Must have sufficient historical data for pattern matching

## Strategy Parameters Validation

### ATH-Based Strategy
- **ATH Threshold Percent:**
  - **Min:** `50` %
  - **Max:** `100` %
  - **Default:** `80` %
- **Investment Multiplier:**
  - **Min:** `0.1`
  - **Max:** `5.0`
  - **Default:** `2.0`

### Moving Average Strategy
- **MA Period Days:**
  - **Min:** `50` days
  - **Max:** `500` days
  - **Default:** `200` days
- **Investment Multiplier:**
  - **Min:** `0.1`
  - **Max:** `3.0`
  - **Default:** `1.5`

### ATH Collateral Strategy
- **Max Drawdown Percent:**
  - **Min:** `50` %
  - **Max:** `95` %
  - **Default:** `80` %
- **Collateral Multiplier:**
  - **Min:** `1.1`
  - **Max:** `5.0`
  - **Default:** `2.0`
- **ATH Lookback Months:**
  - **Min:** `12` months
  - **Max:** `60` months
  - **Default:** `36` months
- **Emergency Collateral Buffer:**
  - **Min:** `1.0`
  - **Max:** `2.0`
  - **Default:** `1.2`

## Cross-Parameter Validation

### Loan Amount vs BTC Stack
```typescript
maxLoanAmountEuros = (maxLoanAmountPercent / 100) * (btcAmount * initialBtcPrice)
// Must not exceed reasonable lending limits
```

### Collateral Requirements
```typescript
requiredCollateral = maxLoanAmountEuros / (initialBtcPrice * (targetLtv / 100))
// Must not exceed available BTC
requiredCollateral <= btcAmount
```

### Liquidation Price Validation
```typescript
liquidationPrice = maxLoanAmountEuros / (requiredCollateral * (liquidationLtv / 100))
percentageDrop = ((initialBtcPrice - liquidationPrice) / initialBtcPrice) * 100
// Must be realistic (not require >99% drop)
percentageDrop <= 95
```

## Platform-Specific Validation

### Firefish Platform
- Standard validation rules apply
- No additional constraints

### Strike Platform
- Standard validation rules apply
- May have faster processing requirements

### Custom Platform (Coming Soon)
- Will have configurable validation rules
- User-defined parameter limits

## Real-Time Validation

### Input Validation
- Immediate feedback on invalid values
- Visual indicators for validation state
- Helper text shows calculated values

### Dependency Validation
- Cross-parameter checks on change
- Automatic adjustment of dependent values
- Warning messages for risky combinations

### Simulation Validation
- Pre-simulation parameter checks
- Error prevention before calculation
- Graceful handling of edge cases

## Error Messages

### Standard Error Types
- **Required:** "This field is required"
- **Min/Max:** "Value must be between {min} and {max}"
- **Step:** "Value must be in increments of {step}"
- **Dependency:** "Value must be {condition} than {otherField}"

### Custom Error Messages
- **LTV Relationship:** "Target LTV must be lower than Liquidation LTV"
- **Collateral Insufficient:** "Required collateral exceeds available BTC"
- **Unrealistic Liquidation:** "Liquidation price requires unrealistic price drop"

## Validation Implementation

### Client-Side Validation
- Immediate feedback during input
- Prevents invalid form submission
- Visual validation states

### Server-Side Validation
- Final validation before simulation
- Prevents invalid calculations
- Error logging for debugging

### Type Safety
- TypeScript interfaces enforce types
- Runtime type checking where needed
- Compile-time validation of constants
