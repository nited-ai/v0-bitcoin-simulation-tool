/**
 * Parameters Module Barrel Export
 * 
 * Central export point for all parameters module functionality.
 * Provides clean imports for other modules and components.
 */

// Services
export * from './services/calculationsService'

// Constants
export * from './constants/platformPresets'
export * from './constants/riskLevelPresets'

// Components - removed broken duplicates, working components are in app/simulation/components/
// export * from './components/ATHAlert'
// export { LoanParametersCard } from './components/LoanParametersCard'
// export { PlatformSelector } from './components/PlatformSelector'
// export { CollateralVisualizationCard } from './components/CollateralVisualizationCard'
// export { PriceDropToleranceCard } from './components/PriceDropToleranceCard'
// export { LoanUsageVisualizationCard } from './components/LoanUsageVisualizationCard'

// Hooks - removed broken duplicates, working hooks are in app/simulation/hooks/
// export * from './hooks/useParameterValidation'
// export * from './hooks/useCalculationsIntegration'

// Types
export * from './types'

// Re-export commonly used types for convenience
export type {
  // Core parameter types
  SimulationParams,
  PlatformConfig,
  RiskLevel,
  RiskLevelPreset,
  ParameterPreset,

  // Calculation result types
  LoanMetrics,
  CollateralMetrics,
  LiquidationMetrics,
  CalculationResults,
  ATHDistanceMetrics,
  CollateralSufficiencyResult,

  // Validation types
  ValidationResult,
  ValidationError,
  ComponentName,
  ParameterUpdateContext,
  ParameterChangeEvent,

  // Utility types
  BasicLoanValues,
  CacheStats,
  PlatformApplicationResult
} from './types'

// Re-export service classes for convenience
export {
  CalculationsService
} from './services/calculationsService'

// Re-export platform constants for convenience
export {
  PLATFORM_CONFIGS,
  PLATFORM_VALIDATION_RULES,
  getPlatformConfig,
  getAvailablePlatforms,
  validatePlatformConfig,
  saveCustomPlatformConfig,
  createCustomPlatformConfig,
  deleteCustomPlatformConfig
} from './constants/platformPresets'

// Re-export risk level constants and functions for convenience
export {
  RISK_LEVEL_PRESETS,
  getRiskLevelPreset,
  getAvailableRiskLevels,
  validateRiskLevelPreset,
  applyRiskLevelToParams,
  getRiskLevelFromParams,
  getRecommendedRiskLevel,
  calculateRiskScore
} from './constants/riskLevelPresets'


