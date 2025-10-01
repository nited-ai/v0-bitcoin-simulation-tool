/**
 * Results Module Types
 * 
 * Comprehensive type definitions for the results analysis and visualization system.
 * Provides standardized interfaces for all results processing and display.
 */

import type { StrategyExecutionResult } from "../../strategies/types"
import type { PriceProjectionResult } from "../../../../app/simulation/price-models/types"

/**
 * Monthly result data structure from strategy execution
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
  activeLoans: Array<{
    id: number
    month: number
    principal: number
    maturityMonth: number
    repaymentAmount: number
    lockedBtc: number
  }>
  repaymentDue: number
  highestLtv: number
  maxSafeDebt?: number
  events: Array<{
    type: string
    [key: string]: any
  }>
}

/**
 * Comprehensive results analysis interface
 */
export interface ResultsAnalysis {
  // Basic metrics
  totalMonths: number
  finalPortfolioValue: number
  finalNetWorth: number
  totalDebtPeak: number
  
  // Performance metrics
  totalReturn: number
  totalReturnPercent: number
  annualizedReturn: number
  
  // Risk metrics
  maxDrawdown: number
  maxDrawdownPercent: number
  liquidationCount: number
  firstLiquidationMonth: number | null
  
  // Debt metrics
  averageDebt: number
  maxDebt: number
  averageLTV: number
  maxLTV: number
  
  // Cash flow metrics
  totalWithdrawals: number
  totalReinvestments: number
  totalLoanPrincipal: number
  totalRepayments: number
  
  // BTC metrics
  initialBtcAmount: number
  finalBtcAmount: number
  btcGrowth: number
  btcGrowthPercent: number
  
  // Monthly averages
  averageMonthlyWithdrawal: number
  averageMonthlyReinvestment: number
  averagePortfolioValue: number
  
  // Risk assessment
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Extreme'
  riskScore: number
  
  // Performance rating
  performanceRating: 'Poor' | 'Below Average' | 'Average' | 'Good' | 'Excellent'
  performanceScore: number
}

/**
 * Enhanced results analysis with price projection context
 */
export interface EnhancedResultsAnalysis extends ResultsAnalysis {
  // Price projection context (updated to new format)
  priceProjectionMetadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    confidence: number
    generatedAt: string
    [key: string]: any // Allow additional metadata fields
  }
  
  // Advanced metrics with projection context
  projectionAccuracy: number
  projectionDeviation: number
  modelPerformance: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  
  // Scenario analysis
  bestCaseScenario: ScenarioAnalysis
  worstCaseScenario: ScenarioAnalysis
  mostLikelyScenario: ScenarioAnalysis
  
  // Risk-adjusted metrics
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdownDuration: number
  recoveryTime: number
  
  // Strategy effectiveness
  strategyEffectiveness: number
  strategyConsistency: number
  adaptabilityScore: number
}

/**
 * Scenario analysis for different market conditions
 */
export interface ScenarioAnalysis {
  scenarioName: string
  probability: number
  finalPortfolioValue: number
  finalNetWorth: number
  maxDrawdown: number
  liquidationRisk: number
  expectedReturn: number
  timeToRecovery: number
}

/**
 * Chart data point for visualizations
 */
export interface ChartDataPoint {
  month: number
  date: string
  [key: string]: number | string | boolean
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json' | 'txt' | 'pdf'

/**
 * Export data structure
 */
export interface ExportData {
  metadata: {
    exportDate: string
    simulationParams: Record<string, any>
    totalMonths: number
    btcAmount: number
    initialBtcPrice: number
    strategyUsed: string
  }
  summary: {
    finalPortfolioValue: number
    finalNetWorth: number
    totalReturn: number
    totalReturnPercent: number
    annualizedReturn: number
    maxDrawdown: number
    maxDrawdownPercent: number
    liquidationCount: number
    riskLevel: string
    performanceRating: string
  }
  monthlyResults: MonthlyResult[]
  analysis: ResultsAnalysis
}

/**
 * Results processing options
 */
export interface ResultsProcessingOptions {
  includeProjectionContext: boolean
  calculateAdvancedMetrics: boolean
  performScenarioAnalysis: boolean
  generateInsights: boolean
  smoothingWindow?: number
  confidenceInterval?: number
}

/**
 * Results insight
 */
export interface ResultsInsight {
  type: 'warning' | 'info' | 'success' | 'error'
  category: 'performance' | 'risk' | 'strategy' | 'market'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  recommendation?: string
}

/**
 * Results comparison for multiple strategies or scenarios
 */
export interface ResultsComparison {
  baselineResults: ResultsAnalysis
  comparisonResults: ResultsAnalysis[]
  comparisonMetrics: {
    performanceDifference: number
    riskDifference: number
    returnDifference: number
    efficiencyRatio: number
  }
  winner: {
    strategy: string
    reason: string
    confidence: number
  }
}

/**
 * Results visualization configuration
 */
export interface VisualizationConfig {
  chartType: 'line' | 'area' | 'bar' | 'scatter'
  timeframe: 'all' | 'recent' | 'custom'
  metrics: string[]
  showProjections: boolean
  showBenchmarks: boolean
  colorScheme: 'default' | 'dark' | 'colorblind'
  annotations: boolean
}

/**
 * Results service interface
 */
export interface IResultsAnalysisService {
  analyzeResults(
    strategyResults: StrategyExecutionResult,
    options?: ResultsProcessingOptions
  ): Promise<ResultsAnalysis>
  
  analyzeWithPriceProjection(
    strategyResults: StrategyExecutionResult,
    originalProjection: PriceProjectionResult,
    options?: ResultsProcessingOptions
  ): Promise<EnhancedResultsAnalysis>
  
  compareResults(
    results: StrategyExecutionResult[],
    options?: ResultsProcessingOptions
  ): Promise<ResultsComparison>
  
  generateInsights(
    analysis: ResultsAnalysis,
    options?: ResultsProcessingOptions
  ): Promise<ResultsInsight[]>
  
  exportResults(
    analysis: ResultsAnalysis,
    format: ExportFormat,
    options?: Record<string, any>
  ): Promise<boolean>
}

/**
 * Results processor interface
 */
export interface IResultsProcessor {
  processMonthlyResults(
    monthlyResults: MonthlyResult[]
  ): Promise<ChartDataPoint[]>
  
  calculateMetrics(
    monthlyResults: MonthlyResult[]
  ): Promise<Partial<ResultsAnalysis>>
  
  smoothData(
    data: ChartDataPoint[],
    window: number
  ): ChartDataPoint[]
  
  aggregateData(
    data: ChartDataPoint[],
    period: 'weekly' | 'monthly' | 'quarterly'
  ): ChartDataPoint[]
}

/**
 * Type guards
 */
export function isResultsAnalysis(obj: any): obj is ResultsAnalysis {
  return (
    obj &&
    typeof obj.totalMonths === 'number' &&
    typeof obj.finalPortfolioValue === 'number' &&
    typeof obj.finalNetWorth === 'number' &&
    typeof obj.riskLevel === 'string' &&
    typeof obj.performanceRating === 'string'
  )
}

export function isEnhancedResultsAnalysis(obj: any): obj is EnhancedResultsAnalysis {
  return (
    isResultsAnalysis(obj) &&
    'priceProjectionMetadata' in obj &&
    'projectionAccuracy' in obj &&
    'modelPerformance' in obj &&
    typeof obj.projectionAccuracy === 'number' &&
    typeof obj.modelPerformance === 'string'
  )
}

/**
 * Results events
 */
export type ResultsEvent = 
  | { type: 'ANALYSIS_STARTED'; timestamp: string }
  | { type: 'ANALYSIS_COMPLETED'; analysis: ResultsAnalysis; timestamp: string }
  | { type: 'ANALYSIS_FAILED'; error: string; timestamp: string }
  | { type: 'EXPORT_STARTED'; format: ExportFormat; timestamp: string }
  | { type: 'EXPORT_COMPLETED'; format: ExportFormat; timestamp: string }
  | { type: 'EXPORT_FAILED'; format: ExportFormat; error: string; timestamp: string }
  | { type: 'INSIGHTS_GENERATED'; insights: ResultsInsight[]; timestamp: string }
