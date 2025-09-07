/**
 * Shared Module Barrel Export
 * 
 * Central export point for all shared module functionality.
 * Provides clean imports for other modules.
 */

// Interfaces
export * from './interfaces/PriceProjectionInterface'
export * from './interfaces/StrategyInterface'
export * from './interfaces/ResultsInterface'

// Adapters
export * from './adapters/PriceProjectionAdapter'

// Types
export * from './types'

// Utilities
export * from './utils'

// Re-export commonly used types for convenience
export type {
  // Core Types (no duplicates)
  HistoricalDataPoint,
  ProjectionPoint,
  PriceProjectionResult,
  PriceModelParams,
  MonthlyResult,
  EventType,
  SimulationEvent,
  LoanConfig,
  PlatformConfig,
  RiskManagement,
  UserPreferences,
  ChartDataPoint,
  ChartConfig,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CacheEntry,
  PerformanceMetrics,
  ModuleMetadata,
  FeatureFlag
} from './types'

// Re-export utility classes for convenience
export {
  DataValidator,
  DataTransformer,
  ArrayUtils,
  MathUtils,
  DateUtils,
  PerformanceUtils
} from './utils'

// Re-export adapter classes for convenience
export {
  PriceProjectionAdapter
} from './adapters/PriceProjectionAdapter'

// UI Components
export { NumberInput } from './ui/forms/NumberInput'
