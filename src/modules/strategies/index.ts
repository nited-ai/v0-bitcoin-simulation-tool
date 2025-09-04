/**
 * Strategies Module
 * 
 * Barrel export for all strategy-related functionality including implementations,
 * services, adapters, and types.
 */

// Types
export type {
  InvestmentStrategy,
  Loan,
  MonthlyEvent,
  MonthlyResult,
  StrategyPriceData,
  RiskManagement,
  AthBasedStrategyParams,
  MovingAverageStrategyParams,
  AthCollateralStrategyParams,
  StrategyEngineParams,
  StrategyContext,
  StrategyDecision,
  StrategyMetadata,
  InvestmentStrategyInterface,
  StrategyRegistryEntry,
  StrategyExecutionRequest,
  StrategyExecutionResponse,
  StrategyValidationResult,
  StrategyPerformanceMetrics,
  IStrategyExecutionService,
  IPriceProjectionAdapter
} from './types'

// Strategy Implementations
export { DefaultStrategy, defaultStrategy } from './implementations/DefaultStrategy'

// Services
export { StrategyExecutionService, strategyExecutionService } from './services/StrategyExecutionService'

// Adapters
export { PriceProjectionAdapter, priceProjectionAdapter } from './adapters/PriceProjectionAdapter'

// Re-export commonly used functions for backward compatibility
export { strategyExecutionService as runStrategySimulation } from './services/StrategyExecutionService'
