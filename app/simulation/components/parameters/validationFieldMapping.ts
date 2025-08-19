/**
 * Validation Field Mapping
 * 
 * Defines which validation fields belong to which parameter components.
 * This enables distributed validation alerts that appear directly in
 * the relevant component instead of a centralized summary.
 */

export type ComponentName = 
  | 'BasicParametersCard'
  | 'LoanParametersCard' 
  | 'RiskLevelSelector'
  | 'PlatformSelector'
  | 'ValidationSummary' // For unmapped/global errors

/**
 * Maps validation field names to their corresponding components
 */
export const VALIDATION_FIELD_MAP: Record<string, ComponentName> = {
  // BasicParametersCard - Core simulation parameters
  'btcAmount': 'BasicParametersCard',
  'initialBtcAmount': 'BasicParametersCard', // Alternative naming
  'initialBtcPrice': 'BasicParametersCard',
  
  // LoanParametersCard - Loan-specific parameters
  'loanAmountPercent': 'LoanParametersCard',
  'collateralSufficiency': 'LoanParametersCard', // Priority 1 - Main error from screenshot
  'annualInterestRate': 'LoanParametersCard',
  'loanTermMonths': 'LoanParametersCard',
  'riskManagement': 'LoanParametersCard',
  'riskManagement.targetLtv': 'LoanParametersCard',
  'riskManagement.liquidationLtv': 'LoanParametersCard',
  
  // RiskLevelSelector - Risk level presets
  'riskLevel': 'RiskLevelSelector',
  'selectedRiskLevel': 'RiskLevelSelector',
  
  // PlatformSelector - Platform-specific parameters
  'platform': 'PlatformSelector',
  'originationFeePercent': 'PlatformSelector',
  'liquidationFeePercent': 'PlatformSelector',
  
  // Global/Unmapped - Keep in ValidationSummary
  'simulationMonths': 'ValidationSummary',
  'maxLoanAmount': 'ValidationSummary',
  'priceModel': 'ValidationSummary',
  'powerLawSettings': 'ValidationSummary',
}

/**
 * Get component name for a validation field
 */
export function getComponentForField(fieldName: string): ComponentName {
  return VALIDATION_FIELD_MAP[fieldName] || 'ValidationSummary'
}

/**
 * Get all fields that belong to a specific component
 */
export function getFieldsForComponent(componentName: ComponentName): string[] {
  return Object.entries(VALIDATION_FIELD_MAP)
    .filter(([_, component]) => component === componentName)
    .map(([field, _]) => field)
}

/**
 * Check if a field should be handled by a specific component
 */
export function isFieldForComponent(fieldName: string, componentName: ComponentName): boolean {
  return getComponentForField(fieldName) === componentName
}

/**
 * Get fields that should remain in ValidationSummary (unmapped/global)
 */
export function getGlobalValidationFields(): string[] {
  return getFieldsForComponent('ValidationSummary')
}

/**
 * Component-specific field groups for easy reference
 */
export const COMPONENT_FIELDS = {
  BasicParametersCard: getFieldsForComponent('BasicParametersCard'),
  LoanParametersCard: getFieldsForComponent('LoanParametersCard'),
  RiskLevelSelector: getFieldsForComponent('RiskLevelSelector'),
  PlatformSelector: getFieldsForComponent('PlatformSelector'),
  ValidationSummary: getFieldsForComponent('ValidationSummary'),
} as const
