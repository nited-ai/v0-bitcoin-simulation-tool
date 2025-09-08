/**
 * Strategies Module
 * 
 * Comprehensive investment strategy system with modular architecture.
 * Provides strategy registration, execution, and management capabilities.
 */

// Types
export type * from './types'

// Services
export { StrategyRegistry, strategyRegistry, initializeDefaultStrategies } from './services/StrategyRegistry'
export { StrategyExecutionService } from './services/StrategyExecutionService'

// Implementations
export * from './implementations'

// Components
export { StrategySelector } from './components/StrategySelector'

// Hooks
export { useStrategyExecution, useStrategyRegistry } from './hooks/useStrategyExecution'

// Adapters
export { LegacyStrategyAdapter } from './adapters/LegacyStrategyAdapter'

// Initialize strategies when module is imported
import { strategyRegistry } from './services/StrategyRegistry'
import { 
  DefaultStrategy, 
  AthBasedStrategy, 
  MovingAverageStrategy, 
  AthCollateralStrategy 
} from './implementations'

/**
 * Initialize all default strategies
 */
function initializeStrategies() {
  console.log('🔧 Initializing strategy module...')
  
  // Register all default strategies
  strategyRegistry.registerStrategy('default', new DefaultStrategy(), true, 100)
  strategyRegistry.registerStrategy('athBased', new AthBasedStrategy(), true, 90)
  strategyRegistry.registerStrategy('movingAverage', new MovingAverageStrategy(), true, 80)
  strategyRegistry.registerStrategy('athCollateral', new AthCollateralStrategy(), true, 70)
  
  const stats = strategyRegistry.getStats()
  console.log(`✅ Strategy module initialized with ${stats.total} strategies (${stats.enabled} enabled)`)
}

// Auto-initialize when module is imported
initializeStrategies()
