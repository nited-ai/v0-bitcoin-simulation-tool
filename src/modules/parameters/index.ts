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

// Components
export * from './components/ATHAlert'

// Hooks
export * from './hooks/useParameterValidation'
export * from './hooks/useCalculationsIntegration'

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

// Re-export constants for convenience
export {
  PLATFORM_CONFIGS,
  RISK_LEVEL_PRESETS,
  PLATFORM_VALIDATION_RULES
} from './constants/platformPresets'

// Re-export utility functions for convenience
export {
  getPlatformConfig,
  getAvailablePlatforms,
  validatePlatformConfig,
  saveCustomPlatformConfig,
  createCustomPlatformConfig,
  deleteCustomPlatformConfig,
  getRiskLevelPreset,
  getAvailableRiskLevels,
  validateRiskLevelPreset,
  applyRiskLevelToParams,
  getRiskLevelFromParams,
  getRecommendedRiskLevel,
  calculateRiskScore
} from './constants/platformPresets'
