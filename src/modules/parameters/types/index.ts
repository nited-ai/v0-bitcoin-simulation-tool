/**
 * Parameters Module Types
 * 
 * Type definitions specific to the parameters module including
 * simulation parameters, platform configurations, and calculation results.
 */

/**
 * Simulation parameters for loan calculations
 */
export interface SimulationParams {
  // Core BTC parameters
  initialBtcAmount: number
  initialBtcPrice: number
  
  // Loan parameters
  loanAmountPercent: number
  platform: string
  maxLoanAmount: number
  annualInterestRate: number
  loanTermMonths: number | typeof Infinity
  liquidationFeePercent: number
  
  // Platform-specific parameters
  originationFeePercent: number
  originationFeeType: 'one-time' | 'annual'
  maxInitialLtv: number
  availableLoanTerms: (number | 'infinity')[]
  
  // Risk management
  riskManagement: {
    targetLtv: number
    liquidationLtv: number
    annualInterestRate: number
    loanTermMonths: number | typeof Infinity
    maxLoanAmount: number
    liquidationFeePercent: number
  }
}

/**
 * Platform configuration
 */
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

/**
 * Risk level types
 */
export type RiskLevel = 'conservative' | 'moderate' | 'optimistic' | 'moonshots'

/**
 * Risk level preset configuration
 */
export interface RiskLevelPreset {
  id: RiskLevel
  name: string
  description: string
  loanAmountPercent: number
  targetLtv: number
  annualInterestRate: number
  loanTermMonths: {
    firefish: number | 'infinity'
    strike: number | 'infinity'
    custom: number | 'infinity'
    default: number | 'infinity'
  }
}

/**
 * Parameter preset for quick-start templates
 */
export interface ParameterPreset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  badge: string
  params: Partial<SimulationParams>
}

/**
 * Loan metrics calculation results
 */
export interface LoanMetrics {
  initialCurrentLoanAmount: number
  initialOriginationFee: number
  initialTotalLoanCost: number
  initialMaxLoanCapacity: number
  initialLoanUtilizationPercent: number
  initialAvailableBorrowingCapacity: number
  initialAvailableCapacityPercent: number
  initialMonthlyInterestPayment: number
  initialTotalInterestPayment: number
}

/**
 * Collateral metrics calculation results
 */
export interface CollateralMetrics {
  initialTotalStackValue: number
  initialLockedCollateralBtc: number
  initialFreeCollateralBtc: number
  initialCollateralUtilizationPercent: number
  initialLockedCollateralValue: number
  initialFreeCollateralValue: number
  isSufficient: boolean
}

/**
 * Liquidation metrics calculation results
 */
export interface LiquidationMetrics {
  initialImmediateLiquidationPrice: number
  initialTrueLiquidationPrice: number
  initialImmediatePriceDropPercentage: number
  initialTruePriceDropPercentage: number
  initialLiquidationRiskLevel: 'low' | 'medium' | 'high'
  initialATHLiquidationPrice?: number
  initialATHPriceDropPercentage?: number
}

/**
 * Platform application results
 */
export interface PlatformApplicationResult {
  appliedPlatform: string
  updatedParams: Partial<SimulationParams>
  configSource: 'platform' | 'custom'
  warnings: string[]
}

/**
 * Complete calculation results
 */
export interface CalculationResults {
  liquidation: LiquidationMetrics
  collateral: CollateralMetrics
  loan: LoanMetrics
  platform: PlatformApplicationResult
  validation: ValidationResult
  calculatedAt: Date
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * ATH distance metrics
 */
export interface ATHDistanceMetrics {
  distancePercent: number
  distanceUSD: number
  riskLevel: 'low' | 'medium' | 'high'
  riskColor: string
  riskDescription: string
}

/**
 * Collateral sufficiency check result
 */
export interface CollateralSufficiencyResult {
  isSufficient: boolean
  requiredCollateralBtc: number
  availableCollateralBtc: number
  shortfallBtc: number
  shortfallUsd: number
  utilizationPercent: number
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
}

/**
 * Basic loan calculation values
 */
export interface BasicLoanValues {
  totalStackValue: number
  currentLoanAmount: number
  originationFee: number
  totalInterestPayment: number
  totalLoanCost: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number
  keys: string[]
}

/**
 * Parameter validation field mapping
 */
export type ComponentName = 
  | 'BasicParametersCard'
  | 'LoanParametersCard' 
  | 'RiskLevelSelector'
  | 'PlatformSelector'
  | 'ValidationSummary'

/**
 * Validation error with field context
 */
export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
  component?: ComponentName
}

/**
 * Parameter update context
 */
export interface ParameterUpdateContext {
  field: string
  oldValue: any
  newValue: any
  source: 'user' | 'preset' | 'platform' | 'calculation'
  timestamp: Date
}

/**
 * Parameter change event
 */
export interface ParameterChangeEvent {
  type: 'update' | 'reset' | 'preset_applied' | 'platform_changed'
  context: ParameterUpdateContext
  affectedFields: string[]
  validationResult?: ValidationResult
}
