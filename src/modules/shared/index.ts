/**
 * Shared Module Exports
 * 
 * Barrel export file for shared utilities, adapters, and services
 * used across multiple modules in the Bitcoin Simulation Tool.
 */

// Adapters
export {
  PriceProjectionAdapter,
  isNewPriceProjectionResult,
  isOldPriceProjectionResult,
  type StrategyPriceData,
  type ResultsPriceData
} from './adapters/PriceProjectionAdapter'

// Services
export {
  UnifiedPriceProjectionService,
  unifiedPriceProjectionService
} from './services/UnifiedPriceProjectionService'

// Migration Utilities
export {
  MigrationHelpers,
  MigrationPhase,
  validateNewFormat,
  detectFormat,
  compareProjections,
  createMigrationReport,
  isMigrated,
  generateMigrationChecklist,
  logMigrationProgress,
  type MigrationStatus
} from './utils/migration-helpers'

// Re-export standard types for convenience
export type {
  PriceProjectionResult,
  ProjectionPoint,
  PriceModelParams,
  PriceProjectionModel
} from '../../../app/simulation/price-models/types'

