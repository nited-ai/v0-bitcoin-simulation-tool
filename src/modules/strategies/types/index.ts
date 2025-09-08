/**
 * Strategy Module Types
 * 
 * Comprehensive type definitions for the strategy microservices system.
 * Provides standardized interfaces for all strategy implementations.
 */

import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"
import type { PriceProjectionResult } from "../../price-projection/types"

/**
 * Available investment strategy types
 */
export type InvestmentStrategy = "default" | "athBased" | "movingAverage" | "athCollateral"

/**
 * Strategy execution parameters
 */
export interface StrategyExecutionParams {
  // Basic simulation parameters
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  loanOriginationFeePercent: number
  loanTermMonths: number
  simulationMonths: number
  maxLoanAmount: number
  expectedAnnualInflation: number

  // BTC accumulation setting
  btcAccumulation: boolean

  // Risk management
  riskManagement: {
    targetLtv: number
    liquidationLtv: number
    maxLoanAmount: number
    liquidationFeePercent: number
    annualInterestRate: number
  }

  // Strategy selection and parameters
  investmentStrategy: InvestmentStrategy
  athBasedParams?: AthBasedStrategyParams
  movingAverageParams?: MovingAverageStrategyParams
  athCollateralParams?: AthCollateralStrategyParams
}

/**
 * ATH-based strategy parameters
 */
export interface AthBasedStrategyParams {
  athThresholdPercent: number // e.g., 80 means only invest when price is below 80% of ATH
  investmentMultiplier: number // 0.0 to 1.0, how much to invest when conditions are met
}

/**
 * Moving average strategy parameters
 */
export interface MovingAverageStrategyParams {
  shortPeriod: number // e.g., 20 days
  longPeriod: number // e.g., 50 days
  investmentMultiplier: number
}

/**
 * ATH collateral strategy parameters
 */
export interface AthCollateralStrategyParams {
  athDrawdownTolerance: number // Maximum acceptable drawdown from ATH
  collateralBuffer: number // Additional collateral buffer percentage
  emergencyReserve: number // Emergency reserve percentage
}

/**
 * Loan structure used in simulations
 */
export interface Loan {
  id: number
  month: number
  principal: number
  maturityMonth: number
  repaymentAmount: number
  lockedBtc: number
}

/**
 * Monthly events that can occur during simulation
 */
export type MonthlyEvent =
  | { type: "withdrawal_skipped" }
  | { type: "deleveraged"; amount: number }
  | { type: "liquidated"; id: number }
  | { type: "collateral_topped_up"; loanId: number; amount: number }

/**
 * Monthly simulation result
 */
export interface MonthlyResult {
  month: number
  date: string
  btcPrice: number
  totalBtcAmount: number
  totalDebt: number
  collateralValue: number
  ltv: number
  monthlyWithdrawal: number
  principalForNeeds: number
  principalForReinvestment: number
  totalPrincipal: number
  activeLoans: Loan[]
  repaymentDue: number
  highestLtv: number
  maxSafeDebt?: number
  events: MonthlyEvent[]
}

/**
 * Strategy context provided to strategy implementations
 */
export interface StrategyContext {
  month: number
  currentDate: Date
  btcPrice: number
  totalBtcAmount: number
  activeLoans: Loan[]
  collateralValue: number
  debtCapacity: number
  historicalPriceData: HistoricalDataPoint[]
  priceProjectionData?: PriceProjectionResult
  params: StrategyExecutionParams
}

/**
 * Decision made by a strategy for a given month
 */
export interface StrategyDecision {
  // Investment decision
  allowInvestment: boolean
  investmentMultiplier: number // 0.0 to 1.0+ (can be > 1 for aggressive strategies)
  
  // Withdrawal decision
  allowWithdrawal: boolean
  withdrawalAmount: number
  
  // Risk management overrides
  targetLtvOverride?: number
  maxDebtOverride?: number // Absolute maximum debt amount (overrides LTV calculation)

  // Additional context for logging/debugging
  reasoning?: string
}

/**
 * Strategy metadata for UI display
 */
export interface StrategyMetadata {
  securityRating: number // 1-5 scale
  complexityRating: number // 1-5 scale
  suitableFor: string[] // e.g., ["beginners", "conservative", "moderate"]
  criteria: string[] // e.g., ["target_ltv", "ath_distance", "market_timing"]
}

/**
 * Core interface that all investment strategies must implement
 */
export interface InvestmentStrategyInterface {
  /**
   * Make investment and withdrawal decisions for a given month
   */
  makeDecision(context: StrategyContext): StrategyDecision

  /**
   * Get the display name of this strategy
   */
  getName(): string

  /**
   * Get a description of this strategy
   */
  getDescription(): string

  /**
   * Get detailed metadata about this strategy
   */
  getMetadata(): StrategyMetadata

  /**
   * Get detailed description of how this strategy works
   */
  getDetailedDescription(): string

  /**
   * Get information about strategy functionality
   */
  getFunctionality(): string

  /**
   * Get information about strategy suitability
   */
  getSuitability(): string
}

/**
 * Strategy execution result
 */
export interface StrategyExecutionResult {
  monthlyResults: MonthlyResult[]
  metadata: {
    strategyUsed: string
    totalMonths: number
    finalBtcAmount: number
    finalDebt: number
    finalLtv: number
    totalWithdrawals: number
    executedAt: string
  }
}

/**
 * Strategy registry entry
 */
export interface StrategyRegistryEntry {
  id: string
  strategy: InvestmentStrategyInterface
  enabled: boolean
  priority: number
}

/**
 * Strategy comparison result
 */
export interface StrategyComparisonResult {
  strategyId: string
  strategyName: string
  result: StrategyExecutionResult | null
  error?: string
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  total: number
  enabled: number
  disabled: number
  strategies: Array<{
    id: string
    name: string
    enabled: boolean
    priority: number
  }>
}

/**
 * Strategy validation result
 */
export interface StrategyValidationResult {
  valid: string[]
  invalid: string[]
}

/**
 * Strategy events
 */
export type StrategyEvent = 
  | { type: 'STRATEGY_REGISTERED'; strategyId: string; strategyName: string }
  | { type: 'STRATEGY_UNREGISTERED'; strategyId: string }
  | { type: 'STRATEGY_ENABLED'; strategyId: string }
  | { type: 'STRATEGY_DISABLED'; strategyId: string }
  | { type: 'EXECUTION_STARTED'; strategyId: string; params: StrategyExecutionParams }
  | { type: 'EXECUTION_COMPLETED'; strategyId: string; result: StrategyExecutionResult }
  | { type: 'EXECUTION_FAILED'; strategyId: string; error: string }

/**
 * Strategy registry interface
 */
export interface IStrategyRegistry {
  registerStrategy(id: string, strategy: InvestmentStrategyInterface, enabled?: boolean, priority?: number): void
  unregisterStrategy(id: string): boolean
  getStrategy(id: string): InvestmentStrategyInterface | null
  getAllStrategies(): StrategyRegistryEntry[]
  getStrategyNames(): Array<{ id: string; name: string; description: string }>
  setStrategyEnabled(id: string, enabled: boolean): boolean
  executeStrategy(strategyId: string, params: StrategyExecutionParams, priceProjection: PriceProjectionResult): Promise<StrategyExecutionResult | null>
  getStrategyMetadata(strategyId: string): StrategyMetadata | null
  validateAllStrategies(): StrategyValidationResult
  getStats(): RegistryStats
}

/**
 * Type guard for checking if an object is a valid strategy execution result
 */
export function isStrategyExecutionResult(obj: any): obj is StrategyExecutionResult {
  return (
    obj &&
    Array.isArray(obj.monthlyResults) &&
    obj.metadata &&
    typeof obj.metadata.strategyUsed === 'string' &&
    typeof obj.metadata.totalMonths === 'number'
  )
}
