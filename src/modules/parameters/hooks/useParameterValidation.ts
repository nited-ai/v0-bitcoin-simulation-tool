/**
 * Parameter Validation Hook
 * 
 * Provides reactive parameter validation with real-time feedback
 * and comprehensive error handling for all simulation parameters.
 */

import { useMemo, useCallback } from 'react'
import { CalculationsService } from '../services/calculationsService'
import { validatePlatformConfig, getPlatformConfig } from '../constants/platformPresets'
import { validateRiskLevelPreset, getRiskLevelPreset } from '../constants/riskLevelPresets'
import type { 
  SimulationParams, 
  ValidationResult, 
  ValidationError,
  ComponentName,
  ParameterUpdateContext,
  ParameterChangeEvent
} from '../types'

/**
 * Parameter validation hook with reactive updates
 */
export function useParameterValidation(params: SimulationParams) {
  const calculationsService = useMemo(() => new CalculationsService(), [])

  /**
   * Validate all parameters comprehensively
   */
  const validateAll = useCallback((): ValidationResult => {
    const errors: ValidationError[] = []

    // Basic parameter validation
    if (!params.initialBtcAmount || params.initialBtcAmount <= 0) {
      errors.push({
        field: 'initialBtcAmount',
        message: 'BTC amount must be greater than 0',
        code: 'INVALID_BTC_AMOUNT',
        value: params.initialBtcAmount,
        component: 'BasicParametersCard'
      })
    }

    if (!params.initialBtcPrice || params.initialBtcPrice <= 0) {
      errors.push({
        field: 'initialBtcPrice',
        message: 'BTC price must be greater than 0',
        code: 'INVALID_BTC_PRICE',
        value: params.initialBtcPrice,
        component: 'BasicParametersCard'
      })
    }

    // Loan parameter validation
    if (params.loanAmountPercent < 0 || params.loanAmountPercent > 100) {
      errors.push({
        field: 'loanAmountPercent',
        message: 'Loan amount percentage must be between 0 and 100',
        code: 'INVALID_LOAN_PERCENTAGE',
        value: params.loanAmountPercent,
        component: 'LoanParametersCard'
      })
    }

    if (params.annualInterestRate < 0 || params.annualInterestRate > 50) {
      errors.push({
        field: 'annualInterestRate',
        message: 'Interest rate must be between 0 and 50%',
        code: 'INVALID_INTEREST_RATE',
        value: params.annualInterestRate,
        component: 'LoanParametersCard'
      })
    }

    if (params.maxLoanAmount <= 0) {
      errors.push({
        field: 'maxLoanAmount',
        message: 'Maximum loan amount must be greater than 0',
        code: 'INVALID_MAX_LOAN_AMOUNT',
        value: params.maxLoanAmount,
        component: 'LoanParametersCard'
      })
    }

    // Risk management validation
    if (params.riskManagement.targetLtv < 0 || params.riskManagement.targetLtv > 100) {
      errors.push({
        field: 'riskManagement.targetLtv',
        message: 'Target LTV must be between 0 and 100%',
        code: 'INVALID_TARGET_LTV',
        value: params.riskManagement.targetLtv,
        component: 'RiskLevelSelector'
      })
    }

    if (params.riskManagement.liquidationLtv < 0 || params.riskManagement.liquidationLtv > 100) {
      errors.push({
        field: 'riskManagement.liquidationLtv',
        message: 'Liquidation LTV must be between 0 and 100%',
        code: 'INVALID_LIQUIDATION_LTV',
        value: params.riskManagement.liquidationLtv,
        component: 'RiskLevelSelector'
      })
    }

    // Platform validation
    const platformConfig = getPlatformConfig(params.platform)
    const platformValidation = validatePlatformConfig(platformConfig)
    if (!platformValidation.isValid) {
      platformValidation.errors.forEach(error => {
        errors.push({
          field: `platform.${error}`,
          message: `Platform configuration error: ${error}`,
          code: 'INVALID_PLATFORM_CONFIG',
          value: params.platform,
          component: 'PlatformSelector'
        })
      })
    }

    // Loan term validation
    if (params.loanTermMonths !== Infinity && params.loanTermMonths <= 0) {
      errors.push({
        field: 'loanTermMonths',
        message: 'Loan term must be greater than 0 months or infinity',
        code: 'INVALID_LOAN_TERM',
        value: params.loanTermMonths,
        component: 'LoanParametersCard'
      })
    }

    // Cross-parameter validation
    const totalStackValue = params.initialBtcAmount * params.initialBtcPrice
    const currentLoanAmount = totalStackValue * (params.loanAmountPercent / 100)
    
    if (currentLoanAmount > params.maxLoanAmount) {
      errors.push({
        field: 'loanAmountPercent',
        message: `Loan amount (${currentLoanAmount.toFixed(0)}) exceeds maximum loan amount (${params.maxLoanAmount})`,
        code: 'LOAN_EXCEEDS_MAXIMUM',
        value: params.loanAmountPercent,
        component: 'LoanParametersCard'
      })
    }

    // LTV consistency validation
    if (params.riskManagement.targetLtv >= params.riskManagement.liquidationLtv) {
      errors.push({
        field: 'riskManagement.targetLtv',
        message: 'Target LTV must be less than liquidation LTV',
        code: 'TARGET_LTV_TOO_HIGH',
        value: params.riskManagement.targetLtv,
        component: 'RiskLevelSelector'
      })
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    }
  }, [params, calculationsService])

  /**
   * Validate specific field
   */
  const validateField = useCallback((fieldName: string, value: any): ValidationError[] => {
    const errors: ValidationError[] = []

    switch (fieldName) {
      case 'initialBtcAmount':
        if (!value || value <= 0) {
          errors.push({
            field: fieldName,
            message: 'BTC amount must be greater than 0',
            code: 'INVALID_BTC_AMOUNT',
            value,
            component: 'BasicParametersCard'
          })
        }
        break

      case 'initialBtcPrice':
        if (!value || value <= 0) {
          errors.push({
            field: fieldName,
            message: 'BTC price must be greater than 0',
            code: 'INVALID_BTC_PRICE',
            value,
            component: 'BasicParametersCard'
          })
        }
        break

      case 'loanAmountPercent':
        if (value < 0 || value > 100) {
          errors.push({
            field: fieldName,
            message: 'Loan amount percentage must be between 0 and 100',
            code: 'INVALID_LOAN_PERCENTAGE',
            value,
            component: 'LoanParametersCard'
          })
        }
        break

      case 'annualInterestRate':
        if (value < 0 || value > 50) {
          errors.push({
            field: fieldName,
            message: 'Interest rate must be between 0 and 50%',
            code: 'INVALID_INTEREST_RATE',
            value,
            component: 'LoanParametersCard'
          })
        }
        break

      case 'riskManagement.targetLtv':
        if (value < 0 || value > 100) {
          errors.push({
            field: fieldName,
            message: 'Target LTV must be between 0 and 100%',
            code: 'INVALID_TARGET_LTV',
            value,
            component: 'RiskLevelSelector'
          })
        }
        break

      case 'riskManagement.liquidationLtv':
        if (value < 0 || value > 100) {
          errors.push({
            field: fieldName,
            message: 'Liquidation LTV must be between 0 and 100%',
            code: 'INVALID_LIQUIDATION_LTV',
            value,
            component: 'RiskLevelSelector'
          })
        }
        break
    }

    return errors
  }, [])

  /**
   * Get validation errors grouped by component
   */
  const getErrorsByComponent = useCallback((): Record<ComponentName, ValidationError[]> => {
    const validation = validateAll()
    const errorsByComponent: Record<ComponentName, ValidationError[]> = {
      BasicParametersCard: [],
      LoanParametersCard: [],
      RiskLevelSelector: [],
      PlatformSelector: [],
      ValidationSummary: []
    }

    // This would need to be implemented based on the actual validation structure
    // For now, return empty structure
    return errorsByComponent
  }, [validateAll])

  /**
   * Check if specific component has errors
   */
  const hasComponentErrors = useCallback((component: ComponentName): boolean => {
    const errorsByComponent = getErrorsByComponent()
    return errorsByComponent[component].length > 0
  }, [getErrorsByComponent])

  /**
   * Get warning messages for current parameters
   */
  const getWarnings = useCallback((): string[] => {
    const warnings: string[] = []

    // High loan percentage warning
    if (params.loanAmountPercent > 25) {
      warnings.push('High loan percentage may increase liquidation risk')
    }

    // High target LTV warning
    if (params.riskManagement.targetLtv > 40) {
      warnings.push('High target LTV increases liquidation risk')
    }

    // Short loan term with high amount warning
    if (params.loanTermMonths !== Infinity && params.loanTermMonths < 12 && params.loanAmountPercent > 15) {
      warnings.push('Short loan term with high loan amount may require frequent refinancing')
    }

    // Low interest rate warning (might be too good to be true)
    if (params.annualInterestRate < 5) {
      warnings.push('Very low interest rates may indicate higher platform risk')
    }

    return warnings
  }, [params])

  /**
   * Create parameter change event
   */
  const createChangeEvent = useCallback((
    field: string,
    oldValue: any,
    newValue: any,
    source: 'user' | 'preset' | 'platform' | 'calculation' = 'user'
  ): ParameterChangeEvent => {
    const context: ParameterUpdateContext = {
      field,
      oldValue,
      newValue,
      source,
      timestamp: new Date()
    }

    // Determine affected fields based on the changed field
    let affectedFields: string[] = [field]
    
    if (field === 'platform') {
      affectedFields = [
        'platform',
        'originationFeePercent',
        'originationFeeType',
        'liquidationFeePercent',
        'maxInitialLtv',
        'availableLoanTerms'
      ]
    } else if (field.startsWith('riskManagement')) {
      affectedFields = [
        field,
        'loanAmountPercent',
        'annualInterestRate',
        'loanTermMonths'
      ]
    }

    return {
      type: source === 'preset' ? 'preset_applied' : 
            source === 'platform' ? 'platform_changed' : 'update',
      context,
      affectedFields,
      validationResult: validateAll()
    }
  }, [validateAll])

  // Memoized validation result
  const validation = useMemo(() => validateAll(), [validateAll])
  const warnings = useMemo(() => getWarnings(), [getWarnings])

  return {
    validation,
    warnings,
    validateField,
    validateAll,
    getErrorsByComponent,
    hasComponentErrors,
    createChangeEvent,
    isValid: validation.isValid,
    errors: validation.errors,
    hasErrors: validation.errors.length > 0,
    hasWarnings: warnings.length > 0
  }
}
