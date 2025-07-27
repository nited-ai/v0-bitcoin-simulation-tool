// app/strategies/registry/StrategyRegistry.ts

import { lazy } from "react"
import type { StrategyModule, StrategyMetadata } from "./types"

/**
 * Strategy Registry
 * 
 * This registry allows dynamic loading of strategies without breaking
 * existing functionality. New strategies can be added by simply
 * registering them here.
 */
class StrategyRegistry {
  private strategies = new Map<string, StrategyModule>()

  /**
   * Register a strategy with lazy loading
   */
  register(id: string, metadata: StrategyMetadata, loader: () => Promise<any>) {
    this.strategies.set(id, {
      id,
      metadata,
      component: lazy(loader),
      settingsComponent: lazy(() => loader().then(m => ({ default: m.SettingsComponent }))),
      resultsComponent: lazy(() => loader().then(m => ({ default: m.ResultsComponent }))),
      documentationComponent: lazy(() => loader().then(m => ({ default: m.DocumentationComponent }))),
    })
  }

  /**
   * Get all available strategies
   */
  getAll(): StrategyModule[] {
    return Array.from(this.strategies.values())
  }

  /**
   * Get a specific strategy
   */
  get(id: string): StrategyModule | undefined {
    return this.strategies.get(id)
  }

  /**
   * Check if strategy exists
   */
  has(id: string): boolean {
    return this.strategies.has(id)
  }

  /**
   * Get strategy metadata only (without loading components)
   */
  getMetadata(id: string): StrategyMetadata | undefined {
    return this.strategies.get(id)?.metadata
  }
}

// Create singleton instance
export const strategyRegistry = new StrategyRegistry()

// Register all available strategies
strategyRegistry.register(
  "athBased",
  {
    name: "ATH-Based Strategy",
    description: "Investment strategy based on All-Time High analysis",
    version: "1.0.0",
    author: "Bitcoin Simulation Team",
    tags: ["ath", "momentum", "growth"],
    riskLevel: "medium",
    complexity: "intermediate",
  },
  () => import("../ath-based")
)

strategyRegistry.register(
  "movingAverage",
  {
    name: "Moving Average Strategy",
    description: "Strategy based on moving average crossovers",
    version: "1.0.0",
    author: "Bitcoin Simulation Team",
    tags: ["ma", "technical", "trend"],
    riskLevel: "low",
    complexity: "beginner",
  },
  () => import("../moving-average")
)

strategyRegistry.register(
  "athCollateral",
  {
    name: "ATH Collateral Strategy",
    description: "Advanced collateral management based on ATH analysis",
    version: "1.0.0",
    author: "Bitcoin Simulation Team",
    tags: ["ath", "collateral", "advanced"],
    riskLevel: "high",
    complexity: "advanced",
  },
  () => import("../ath-collateral")
)

/**
 * Hook to use strategies
 */
export function useStrategies() {
  return {
    getAll: () => strategyRegistry.getAll(),
    get: (id: string) => strategyRegistry.get(id),
    has: (id: string) => strategyRegistry.has(id),
    getMetadata: (id: string) => strategyRegistry.getMetadata(id),
  }
}

/**
 * Add new strategy at runtime (for plugins)
 */
export function addStrategy(
  id: string, 
  metadata: StrategyMetadata, 
  loader: () => Promise<any>
) {
  strategyRegistry.register(id, metadata, loader)
}

// Total: ~120 lines - powerful and extensible! 🚀
