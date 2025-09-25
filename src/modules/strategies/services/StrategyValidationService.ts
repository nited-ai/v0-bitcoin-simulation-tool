/**
 * Strategy Validation Service
 * 
 * Provides comprehensive validation for rolling loan strategy parameters
 * including loan amounts, terms, interest rates, and risk management settings.
 */

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
  code?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  infos: ValidationError[]
}

export interface StrategyValidationParams {
  // Basic loan parameters
  loanAmount: number
  btcStackValue: number
  loanTermMonths: number
  annualInterestRate: number
  
  // Platform-specific parameters
  platform: string
  originationFeePercent: number
  liquidationFeePercent: number
  
  // Risk management
  targetLtv: number
  liquidationLtv: number
  maxLoanAmount: number
  
  // Strategy-specific
  btcAccumulationEnabled: boolean
  rolloverEnabled: boolean
}

export class StrategyValidationService {
  private static instance: StrategyValidationService

  static getInstance(): StrategyValidationService {
    if (!StrategyValidationService.instance) {
      StrategyValidationService.instance = new StrategyValidationService()
    }
    return StrategyValidationService.instance
  }

  /**
   * Validate all rolling loan strategy parameters
   */
  validateRollingLoanStrategy(params: StrategyValidationParams): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const infos: ValidationError[] = []

    // Validate loan amount
    this.validateLoanAmount(params, errors, warnings, infos)
    
    // Validate loan term
    this.validateLoanTerm(params, errors, warnings, infos)
    
    // Validate interest rate
    this.validateInterestRate(params, errors, warnings, infos)
    
    // Validate LTV ratios
    this.validateLtvRatios(params, errors, warnings, infos)
    
    // Validate platform-specific constraints
    this.validatePlatformConstraints(params, errors, warnings, infos)
    
    // Validate collateral sufficiency
    this.validateCollateralSufficiency(params, errors, warnings, infos)
    
    // Validate strategy-specific parameters
    this.validateStrategyParameters(params, errors, warnings, infos)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos
    }
  }

  /**
   * Validate loan amount constraints
   */
  private validateLoanAmount(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { loanAmount, btcStackValue } = params

    // Minimum loan amount ($100)
    if (loanAmount < 100) {
      errors.push({
        field: 'loanAmount',
        message: 'Loan amount must be at least $100',
        severity: 'error',
        code: 'LOAN_AMOUNT_TOO_LOW'
      })
    }

    // Maximum loan amount (90% of BTC stack)
    const maxAllowedLoan = btcStackValue * 0.9
    if (loanAmount > maxAllowedLoan) {
      errors.push({
        field: 'loanAmount',
        message: `Loan amount cannot exceed 90% of BTC stack value ($${maxAllowedLoan.toLocaleString()})`,
        severity: 'error',
        code: 'LOAN_AMOUNT_TOO_HIGH'
      })
    }

    // Warning for high loan amounts (>50% of stack)
    const highLoanThreshold = btcStackValue * 0.5
    if (loanAmount > highLoanThreshold && loanAmount <= maxAllowedLoan) {
      warnings.push({
        field: 'loanAmount',
        message: 'High loan amount increases liquidation risk',
        severity: 'warning',
        code: 'HIGH_LOAN_AMOUNT'
      })
    }

    // Info for very small loans
    if (loanAmount >= 100 && loanAmount < 1000) {
      infos.push({
        field: 'loanAmount',
        message: 'Small loan amounts may have limited rollover benefits',
        severity: 'info',
        code: 'SMALL_LOAN_AMOUNT'
      })
    }
  }

  /**
   * Validate loan term constraints
   */
  private validateLoanTerm(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { loanTermMonths } = params

    // Term must be between 1-36 months
    if (loanTermMonths < 1) {
      errors.push({
        field: 'loanTermMonths',
        message: 'Loan term must be at least 1 month',
        severity: 'error',
        code: 'LOAN_TERM_TOO_SHORT'
      })
    }

    if (loanTermMonths > 36) {
      errors.push({
        field: 'loanTermMonths',
        message: 'Loan term cannot exceed 36 months',
        severity: 'error',
        code: 'LOAN_TERM_TOO_LONG'
      })
    }

    // Warning for very short terms
    if (loanTermMonths >= 1 && loanTermMonths < 3) {
      warnings.push({
        field: 'loanTermMonths',
        message: 'Very short loan terms may result in frequent rollovers',
        severity: 'warning',
        code: 'SHORT_LOAN_TERM'
      })
    }

    // Warning for very long terms
    if (loanTermMonths > 24 && loanTermMonths <= 36) {
      warnings.push({
        field: 'loanTermMonths',
        message: 'Long loan terms reduce flexibility for market changes',
        severity: 'warning',
        code: 'LONG_LOAN_TERM'
      })
    }

    // Info for optimal terms
    if (loanTermMonths >= 6 && loanTermMonths <= 12) {
      infos.push({
        field: 'loanTermMonths',
        message: 'Optimal loan term for rolling strategy balance',
        severity: 'info',
        code: 'OPTIMAL_LOAN_TERM'
      })
    }
  }

  /**
   * Validate interest rate constraints
   */
  private validateInterestRate(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { annualInterestRate } = params

    // Interest rate must be between 0.1%-50%
    if (annualInterestRate < 0.1) {
      errors.push({
        field: 'annualInterestRate',
        message: 'Interest rate must be at least 0.1%',
        severity: 'error',
        code: 'INTEREST_RATE_TOO_LOW'
      })
    }

    if (annualInterestRate > 50) {
      errors.push({
        field: 'annualInterestRate',
        message: 'Interest rate cannot exceed 50%',
        severity: 'error',
        code: 'INTEREST_RATE_TOO_HIGH'
      })
    }

    // Warning for very low rates
    if (annualInterestRate >= 0.1 && annualInterestRate < 2) {
      warnings.push({
        field: 'annualInterestRate',
        message: 'Very low interest rates may not be available in practice',
        severity: 'warning',
        code: 'UNREALISTIC_LOW_RATE'
      })
    }

    // Warning for high rates
    if (annualInterestRate > 15 && annualInterestRate <= 50) {
      warnings.push({
        field: 'annualInterestRate',
        message: 'High interest rates significantly increase loan costs',
        severity: 'warning',
        code: 'HIGH_INTEREST_RATE'
      })
    }

    // Info for typical rates
    if (annualInterestRate >= 5 && annualInterestRate <= 10) {
      infos.push({
        field: 'annualInterestRate',
        message: 'Interest rate within typical market range',
        severity: 'info',
        code: 'TYPICAL_INTEREST_RATE'
      })
    }
  }

  /**
   * Validate LTV ratio constraints
   */
  private validateLtvRatios(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { targetLtv, liquidationLtv } = params

    // Target LTV validation
    if (targetLtv <= 0 || targetLtv >= 100) {
      errors.push({
        field: 'targetLtv',
        message: 'Target LTV must be between 0% and 100%',
        severity: 'error',
        code: 'INVALID_TARGET_LTV'
      })
    }

    // Liquidation LTV validation
    if (liquidationLtv <= 0 || liquidationLtv > 100) {
      errors.push({
        field: 'liquidationLtv',
        message: 'Liquidation LTV must be between 0% and 100%',
        severity: 'error',
        code: 'INVALID_LIQUIDATION_LTV'
      })
    }

    // Target must be lower than liquidation
    if (targetLtv >= liquidationLtv) {
      errors.push({
        field: 'ltvRatios',
        message: 'Target LTV must be lower than liquidation LTV',
        severity: 'error',
        code: 'INVALID_LTV_RELATIONSHIP'
      })
    }

    // Warning for high target LTV
    if (targetLtv > 70 && targetLtv < liquidationLtv) {
      warnings.push({
        field: 'targetLtv',
        message: 'High target LTV increases liquidation risk',
        severity: 'warning',
        code: 'HIGH_TARGET_LTV'
      })
    }

    // Warning for small LTV buffer
    const ltvBuffer = liquidationLtv - targetLtv
    if (ltvBuffer < 10 && ltvBuffer > 0) {
      warnings.push({
        field: 'ltvRatios',
        message: 'Small LTV buffer may not provide adequate safety margin',
        severity: 'warning',
        code: 'SMALL_LTV_BUFFER'
      })
    }
  }

  /**
   * Validate platform-specific constraints
   */
  private validatePlatformConstraints(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { platform, targetLtv, loanTermMonths } = params

    // Platform-specific LTV limits
    const platformLtvLimits: Record<string, number> = {
      'firefish': 75,
      'strike': 90,
      'custom': 95
    }

    const maxLtv = platformLtvLimits[platform] || 95
    if (targetLtv > maxLtv) {
      errors.push({
        field: 'targetLtv',
        message: `Target LTV cannot exceed ${maxLtv}% for ${platform} platform`,
        severity: 'error',
        code: 'PLATFORM_LTV_EXCEEDED'
      })
    }

    // Platform-specific term limits
    if (platform === 'firefish' && loanTermMonths > 12) {
      warnings.push({
        field: 'loanTermMonths',
        message: 'Firefish platform typically offers terms up to 12 months',
        severity: 'warning',
        code: 'PLATFORM_TERM_WARNING'
      })
    }
  }

  /**
   * Validate collateral sufficiency
   */
  private validateCollateralSufficiency(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { loanAmount, btcStackValue, targetLtv } = params

    const requiredCollateral = loanAmount / (targetLtv / 100)
    if (requiredCollateral > btcStackValue) {
      const shortfall = requiredCollateral - btcStackValue
      errors.push({
        field: 'collateralSufficiency',
        message: `Insufficient collateral: Need $${requiredCollateral.toLocaleString()} but only have $${btcStackValue.toLocaleString()} (shortfall: $${shortfall.toLocaleString()})`,
        severity: 'error',
        code: 'INSUFFICIENT_COLLATERAL'
      })
    }
  }

  /**
   * Validate strategy-specific parameters
   */
  private validateStrategyParameters(
    params: StrategyValidationParams,
    errors: ValidationError[],
    warnings: ValidationError[],
    infos: ValidationError[]
  ): void {
    const { btcAccumulationEnabled, rolloverEnabled, loanAmount } = params

    // Rolling loan strategy requires rollover to be enabled
    if (!rolloverEnabled) {
      errors.push({
        field: 'rolloverEnabled',
        message: 'Rolling loan strategy requires automatic rollover to be enabled',
        severity: 'error',
        code: 'ROLLOVER_REQUIRED'
      })
    }

    // Info about accumulation mode
    if (btcAccumulationEnabled) {
      infos.push({
        field: 'btcAccumulationEnabled',
        message: 'BTC accumulation mode: Loan proceeds will be reinvested in Bitcoin',
        severity: 'info',
        code: 'ACCUMULATION_MODE'
      })
    } else {
      infos.push({
        field: 'btcAccumulationEnabled',
        message: 'Cash generation mode: Loan proceeds will be taken as cash',
        severity: 'info',
        code: 'CASH_GENERATION_MODE'
      })
    }

    // Warning for small loans in accumulation mode
    if (btcAccumulationEnabled && loanAmount < 5000) {
      warnings.push({
        field: 'strategyOptimization',
        message: 'Small loan amounts may have limited accumulation benefits due to fees',
        severity: 'warning',
        code: 'SMALL_ACCUMULATION_LOAN'
      })
    }
  }

  /**
   * Get validation summary message
   */
  getValidationSummary(result: ValidationResult): string {
    const errorCount = result.errors.length
    const warningCount = result.warnings.length

    if (errorCount > 0) {
      return `${errorCount} error${errorCount > 1 ? 's' : ''} must be fixed before proceeding`
    }

    if (warningCount > 0) {
      return `${warningCount} warning${warningCount > 1 ? 's' : ''} - review recommended`
    }

    return 'All parameters are valid for rolling loan strategy'
  }
}

export const strategyValidationService = StrategyValidationService.getInstance()
