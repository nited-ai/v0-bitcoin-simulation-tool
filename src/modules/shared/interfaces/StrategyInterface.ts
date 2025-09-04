/**
 * Strategy Interface
 * 
 * Defines the contract for strategy execution services and data structures
 * used for cross-module communication between strategy and results modules.
 */

import type { StrategyPriceData } from './PriceProjectionInterface'
import type { HistoricalDataPoint, MonthlyResult } from '../types'

/**
 * Strategy types available in the system
 */
export type StrategyType = 'default' | 'athBased' | 'movingAverage' | 'athCollateral'

/**
 * Risk levels for strategies
 */
export type RiskLevel = 'conservative' | 'moderate' | 'optimistic' | 'moonshots'

/**
 * Strategy complexity levels
 */
export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced'

/**
 * Strategy parameters for execution
 */
export interface StrategyParams {
  type: StrategyType
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  loanTermMonths: number
  simulationMonths: number
  maxLoanAmount: number
  riskManagement: {
    targetLtv: number
    liquidationLtv: number
  }
  // Strategy-specific parameters
  athBasedParams?: {
    maxDrawdownPercent: number
    athLookbackMonths: number
  }
  movingAverageParams?: {
    windowSize: number
    threshold: number
  }
  athCollateralParams?: {
    maxDrawdownPercent: number
    collateralMultiplier: number
    athLookbackMonths: number
    emergencyCollateralBuffer: number
  }
}

/**
 * Strategy metadata for documentation and UI
 */
export interface StrategyMetadata {
  name: string
  version: string
  description: string
  riskLevel: RiskLevel
  complexity: ComplexityLevel
  author?: string
  tags?: string[]
  timeHorizon?: 'short-term' | 'medium-term' | 'long-term'
  suitability?: string[]
}

/**
 * Execution summary with key performance metrics
 */
export interface ExecutionSummary {
  totalMonths: number
  finalPortfolioValue: number
  totalReturn: number
  maxDrawdown: number
  liquidationCount: number
  averageLtv: number
  successRate: number // 0-100
}

/**
 * Complete strategy execution result
 */
export interface StrategyExecutionResult {
  monthlyResults: MonthlyResult[]
  priceProjectionUsed: StrategyPriceData
  strategyMetadata: StrategyMetadata
  executionSummary: ExecutionSummary
}

/**
 * Main interface for strategy execution services
 * 
 * This interface defines how other modules can execute strategies
 * and receive comprehensive results including context and metadata.
 */
export interface StrategyExecutionService {
  /**
   * Execute a strategy with given parameters and price projection
   * 
   * @param strategyParams - Strategy configuration and parameters
   * @param priceProjection - Price projection data from price projection module
   * @param historicalData - Historical Bitcoin price data for context
   * @returns Promise resolving to complete strategy execution result
   */
  executeStrategy(
    strategyParams: StrategyParams,
    priceProjection: StrategyPriceData,
    historicalData: HistoricalDataPoint[]
  ): Promise<StrategyExecutionResult>
}

/**
 * Strategy execution request structure
 */
export interface StrategyExecutionRequest {
  strategyParams: StrategyParams
  priceProjection: StrategyPriceData
  historicalData: HistoricalDataPoint[]
  executionId?: string
}

/**
 * Strategy execution response structure
 */
export interface StrategyExecutionResponse {
  success: boolean
  result?: StrategyExecutionResult
  error?: string
  executionId: string
  executedAt: string
  duration: number // milliseconds
}
