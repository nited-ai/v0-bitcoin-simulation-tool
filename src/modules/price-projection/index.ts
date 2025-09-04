/**
 * Price Projection Module Barrel Export
 * 
 * Central export point for all price projection functionality.
 * Provides clean imports for other modules and components.
 */

// Services
export * from './services/PriceModelRegistry'
export * from './services/PriceProjectionService'

// Models
export * from './models/ManualGrowthModel'
export * from './models/PowerLawModel'

// Types
export * from './types'

// Re-export commonly used types for convenience
export type {
  // Core projection types
  PriceProjectionModel,
  PriceProjectionResult,
  ProjectionPoint,
  PriceModelParams,
  PriceLineType,

  // Registry types
  PriceModelRegistryEntry,
  IPriceModelRegistry,
  ModelValidationResult,
  RegistryStats,
  ModelComparisonResult,

  // Service types
  ProjectionRequest,
  ProjectionResponse,
  BatchProjectionRequest,
  BatchProjectionResponse,
  IPriceProjectionService,
  PriceProjectionServiceConfig,

  // Model-specific parameter types
  ManualGrowthParams,
  PowerLawParams,
  CycleRepeatParams,
  EnhancedCycleRepeatParams,
  LogarithmicCurveRepeatParams,

  // Performance and caching types
  ModelPerformanceMetrics,
  ProjectionCacheEntry
} from './types'

// Re-export service instances for convenience
export {
  priceModelRegistry,
  PriceModelRegistry
} from './services/PriceModelRegistry'

export {
  priceProjectionService,
  PriceProjectionService
} from './services/PriceProjectionService'

// Re-export model instances for convenience
export {
  manualGrowthModel,
  ManualGrowthModel
} from './models/ManualGrowthModel'

export {
  powerLawModel,
  PowerLawModel
} from './models/PowerLawModel'
