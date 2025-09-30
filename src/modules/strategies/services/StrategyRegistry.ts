/**
 * Strategy Registry Service
 * 
 * Central registry for managing all investment strategy implementations.
 * Provides registration, discovery, and execution capabilities for strategies.
 */

import type {
  IStrategyRegistry,
  InvestmentStrategyInterface,
  StrategyRegistryEntry,
  StrategyExecutionParams,
  StrategyExecutionResult,
  StrategyMetadata,
  RegistryStats,
  StrategyValidationResult,
  StrategyEvent
} from "../types"
import type { PriceProjectionResult } from "../../../../app/simulation/price-models/types"
import { StrategyExecutionService } from "./StrategyExecutionService"

/**
 * Strategy Registry Implementation
 */
export class StrategyRegistry implements IStrategyRegistry {
  private strategies: Map<string, StrategyRegistryEntry> = new Map()
  private executionService: StrategyExecutionService
  private eventListeners: Array<(event: StrategyEvent) => void> = []

  constructor() {
    this.executionService = new StrategyExecutionService()
  }

  /**
   * Register a new strategy
   */
  registerStrategy(
    id: string, 
    strategy: InvestmentStrategyInterface, 
    enabled: boolean = true, 
    priority: number = 0
  ): void {
    if (this.strategies.has(id)) {
      console.warn(`Strategy with id '${id}' is already registered. Overwriting.`)
    }

    const entry: StrategyRegistryEntry = {
      id,
      strategy,
      enabled,
      priority
    }

    this.strategies.set(id, entry)
    this.emitEvent({ type: 'STRATEGY_REGISTERED', strategyId: id, strategyName: strategy.getName() })
    
    console.log(`📝 Registered strategy: ${id} (${strategy.getName()})`)
  }

  /**
   * Unregister a strategy
   */
  unregisterStrategy(id: string): boolean {
    const existed = this.strategies.delete(id)
    if (existed) {
      this.emitEvent({ type: 'STRATEGY_UNREGISTERED', strategyId: id })
      console.log(`🗑️ Unregistered strategy: ${id}`)
    }
    return existed
  }

  /**
   * Get a specific strategy by ID
   */
  getStrategy(id: string): InvestmentStrategyInterface | null {
    const entry = this.strategies.get(id)
    return entry?.strategy || null
  }

  /**
   * Get all registered strategies
   */
  getAllStrategies(): StrategyRegistryEntry[] {
    return Array.from(this.strategies.values()).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get strategy names for UI display
   */
  getStrategyNames(): Array<{ id: string; name: string; description: string }> {
    return this.getAllStrategies()
      .filter(entry => entry.enabled)
      .map(entry => ({
        id: entry.id,
        name: entry.strategy.getName(),
        description: entry.strategy.getDescription()
      }))
  }

  /**
   * Enable or disable a strategy
   */
  setStrategyEnabled(id: string, enabled: boolean): boolean {
    const entry = this.strategies.get(id)
    if (!entry) {
      return false
    }

    entry.enabled = enabled
    this.emitEvent({ 
      type: enabled ? 'STRATEGY_ENABLED' : 'STRATEGY_DISABLED', 
      strategyId: id 
    })
    
    console.log(`${enabled ? '✅' : '❌'} Strategy ${id} ${enabled ? 'enabled' : 'disabled'}`)
    return true
  }

  /**
   * Execute a strategy with given parameters
   */
  async executeStrategy(
    strategyId: string, 
    params: StrategyExecutionParams, 
    priceProjection: PriceProjectionResult
  ): Promise<StrategyExecutionResult | null> {
    const entry = this.strategies.get(strategyId)
    
    if (!entry) {
      console.error(`Strategy '${strategyId}' not found`)
      return null
    }

    if (!entry.enabled) {
      console.error(`Strategy '${strategyId}' is disabled`)
      return null
    }

    try {
      this.emitEvent({ type: 'EXECUTION_STARTED', strategyId, params })
      
      const result = await this.executionService.executeStrategy(
        entry.strategy,
        params,
        priceProjection
      )

      this.emitEvent({ type: 'EXECUTION_COMPLETED', strategyId, result })
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emitEvent({ type: 'EXECUTION_FAILED', strategyId, error: errorMessage })
      console.error(`Strategy execution failed for '${strategyId}':`, error)
      return null
    }
  }

  /**
   * Get strategy metadata
   */
  getStrategyMetadata(strategyId: string): StrategyMetadata | null {
    const entry = this.strategies.get(strategyId)
    return entry?.strategy.getMetadata() || null
  }

  /**
   * Validate all registered strategies
   */
  validateAllStrategies(): StrategyValidationResult {
    const valid: string[] = []
    const invalid: string[] = []

    for (const [id, entry] of this.strategies) {
      try {
        // Basic validation - check if strategy implements required methods
        const strategy = entry.strategy
        if (
          typeof strategy.getName === 'function' &&
          typeof strategy.getDescription === 'function' &&
          typeof strategy.makeDecision === 'function' &&
          typeof strategy.getMetadata === 'function'
        ) {
          valid.push(id)
        } else {
          invalid.push(id)
        }
      } catch (error) {
        invalid.push(id)
      }
    }

    return { valid, invalid }
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const entries = Array.from(this.strategies.values())
    
    return {
      total: entries.length,
      enabled: entries.filter(e => e.enabled).length,
      disabled: entries.filter(e => !e.enabled).length,
      strategies: entries.map(e => ({
        id: e.id,
        name: e.strategy.getName(),
        enabled: e.enabled,
        priority: e.priority
      }))
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: StrategyEvent) => void): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: StrategyEvent) => void): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: StrategyEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in strategy event listener:', error)
      }
    })
  }

  /**
   * Clear all strategies (useful for testing)
   */
  clear(): void {
    this.strategies.clear()
    console.log('🧹 Cleared all strategies from registry')
  }

  /**
   * Get enabled strategies count
   */
  getEnabledCount(): number {
    return Array.from(this.strategies.values()).filter(e => e.enabled).length
  }

  /**
   * Check if a strategy exists
   */
  hasStrategy(id: string): boolean {
    return this.strategies.has(id)
  }

  /**
   * Get strategy by priority (highest first)
   */
  getStrategiesByPriority(): StrategyRegistryEntry[] {
    return this.getAllStrategies() // Already sorted by priority
  }
}

/**
 * Global strategy registry instance
 */
export const strategyRegistry = new StrategyRegistry()

/**
 * Initialize default strategies
 */
export function initializeDefaultStrategies(): void {
  console.log('🔧 Initializing default investment strategies...')
  
  // Strategies will be registered by their individual modules
  // This function serves as a hook for initialization
  
  const stats = strategyRegistry.getStats()
  console.log(`✅ Strategy registry initialized with ${stats.total} strategies (${stats.enabled} enabled)`)
}
