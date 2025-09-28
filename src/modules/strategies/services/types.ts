/**
 * Types for Strategy Services
 * 
 * Defines interfaces and types used by strategy calculation services
 * including loan rollover calculations and platform fee configurations.
 */

/**
 * Platform fee configuration for loan calculations
 */
export interface PlatformFeeConfig {
  type: 'none' | 'one-time' | 'annual'
  percent: number
}

/**
 * Parameters for loan rollover calculations
 */
export interface LoanRolloverParams {
  // Previous loan details
  previousLoanPrincipal: number
  accruedInterest: number
  
  // Platform and fee configuration
  platformFeeConfig: PlatformFeeConfig
  loanOriginationFeePercent: number
  loanTermMonths?: number // Required for annual fees
  
  // Collateral and target configuration (optional for minimum calculation only)
  btcStackValue?: number
  targetLtvPercent?: number
  liquidationLtvPercent?: number
}

/**
 * Result of insufficient collateral detection
 */
export interface InsufficientCollateralResult {
  hasInsufficientCollateral: boolean
  maxPossibleLoan: number
  shortfall?: number // Amount by which minimum exceeds max possible
}

/**
 * Complete loan rollover calculation result
 */
export interface LoanRolloverResult {
  success: boolean
  
  // Calculated amounts
  minimumLoanNeeded: number
  maximumLoanAmount: number
  actualLoanAmount: number
  excessProceeds: number
  
  // Conflict resolution
  conflictResolution: 'none' | 'forced_exceedance' | 'liquidation'
  
  // Additional details
  totalRepaymentDue: number
  platformFees: number
  insufficientCollateral?: InsufficientCollateralResult
  
  // Reasoning for decision
  reasoning: string
}

/**
 * Platform fee calculation result
 */
export interface PlatformFeeResult {
  amount: number
  type: 'none' | 'one-time' | 'annual'
  description: string
}
