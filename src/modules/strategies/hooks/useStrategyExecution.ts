/**
 * Strategy Execution Hook
 * 
 * React hook for executing investment strategies and managing execution state.
 */

import { useState, useCallback, useRef } from "react"
import { strategyRegistry } from "../services/StrategyRegistry"
import type { 
  StrategyExecutionParams, 
  StrategyExecutionResult, 
  InvestmentStrategy 
} from "../types"
import type { PriceProjectionResult } from "../../price-projection/types"

interface UseStrategyExecutionState {
  isExecuting: boolean
  result: StrategyExecutionResult | null
  error: string | null
  executionTime: number
}

interface UseStrategyExecutionReturn extends UseStrategyExecutionState {
  executeStrategy: (
    strategyId: InvestmentStrategy,
    params: StrategyExecutionParams,
    priceProjection: PriceProjectionResult
  ) => Promise<StrategyExecutionResult | null>
  clearResult: () => void
  clearError: () => void
}

/**
 * Hook for executing investment strategies
 */
export function useStrategyExecution(): UseStrategyExecutionReturn {
  const [state, setState] = useState<UseStrategyExecutionState>({
    isExecuting: false,
    result: null,
    error: null,
    executionTime: 0
  })

  const executionStartTime = useRef<number>(0)

  /**
   * Execute a strategy with given parameters
   */
  const executeStrategy = useCallback(async (
    strategyId: InvestmentStrategy,
    params: StrategyExecutionParams,
    priceProjection: PriceProjectionResult
  ): Promise<StrategyExecutionResult | null> => {
    // Clear previous state
    setState(prev => ({
      ...prev,
      isExecuting: true,
      error: null,
      result: null,
      executionTime: 0
    }))

    executionStartTime.current = Date.now()

    try {
      console.log(`🚀 Executing strategy: ${strategyId}`)
      
      // Execute the strategy
      const result = await strategyRegistry.executeStrategy(strategyId, params, priceProjection)
      
      const executionTime = Date.now() - executionStartTime.current
      
      if (result) {
        setState(prev => ({
          ...prev,
          isExecuting: false,
          result,
          executionTime
        }))
        
        console.log(`✅ Strategy execution completed in ${executionTime}ms`)
        return result
      } else {
        const errorMessage = `Strategy '${strategyId}' execution failed or returned null`
        setState(prev => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
          executionTime
        }))
        
        console.error(errorMessage)
        return null
      }
    } catch (error) {
      const executionTime = Date.now() - executionStartTime.current
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error'
      
      setState(prev => ({
        ...prev,
        isExecuting: false,
        error: errorMessage,
        executionTime
      }))
      
      console.error(`❌ Strategy execution failed:`, error)
      return null
    }
  }, [])

  /**
   * Clear the execution result
   */
  const clearResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      executionTime: 0
    }))
  }, [])

  /**
   * Clear the execution error
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  return {
    ...state,
    executeStrategy,
    clearResult,
    clearError
  }
}

/**
 * Hook for strategy registry information
 */
export function useStrategyRegistry() {
  const [registryStats, setRegistryStats] = useState(strategyRegistry.getStats())

  const refreshStats = useCallback(() => {
    setRegistryStats(strategyRegistry.getStats())
  }, [])

  const getAvailableStrategies = useCallback(() => {
    return strategyRegistry.getStrategyNames()
  }, [])

  const getStrategyMetadata = useCallback((strategyId: string) => {
    return strategyRegistry.getStrategyMetadata(strategyId)
  }, [])

  const validateStrategies = useCallback(() => {
    return strategyRegistry.validateAllStrategies()
  }, [])

  return {
    registryStats,
    refreshStats,
    getAvailableStrategies,
    getStrategyMetadata,
    validateStrategies
  }
}
