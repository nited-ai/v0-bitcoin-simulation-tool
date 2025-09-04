/**
 * Results Interface
 * 
 * Defines the contract for results analysis services and data structures
 * used for cross-module communication between results and other modules.
 */

import type { StrategyExecutionResult } from './StrategyInterface'
import type { PriceProjectionResult, MonthlyResult } from '../types'

/**
 * Risk level categories
 */
export type RiskCategory = 'low' | 'medium' | 'high' | 'critical'

/**
 * Comparison data point for projection accuracy
 */
export interface ComparisonData {
  timestamp: number
  projected: number
  actual: number
  deviation: number
  deviationPercent: number
}

/**
 * Statistical deviation metrics
 */
export interface DeviationMetrics {
  meanAbsoluteError: number
  rootMeanSquareError: number
  meanAbsolutePercentageError: number
  maxDeviation: number
  minDeviation: number
}

/**
 * Price projection accuracy analysis
 */
export interface ProjectionAccuracyMetrics {
  modelUsed: string
  projectionConfidence: number // 0.0 to 1.0
  actualVsProjected: ComparisonData[]
  accuracyScore: number // 0-100
  deviationAnalysis: DeviationMetrics
}

/**
 * Strategy performance metrics
 */
export interface StrategyPerformanceMetrics {
  totalReturn: number
  totalReturnPercent: number
  annualizedReturn: number
  sharpeRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  winRate: number // 0-100
  profitFactor: number
  averageMonthlyReturn: number
}

/**
 * Risk assessment data
 */
export interface RiskAssessmentData {
  overallRiskScore: number // 0-10
  liquidationRisk: RiskCategory
  volatilityRisk: RiskCategory
  concentrationRisk: RiskCategory
  riskFactors: string[]
  recommendations: string[]
}

/**
 * Enhanced results analysis with projection context
 */
export interface EnhancedResultsAnalysis {
  monthlyResults: MonthlyResult[]
  priceProjectionAccuracy: ProjectionAccuracyMetrics
  strategyPerformance: StrategyPerformanceMetrics
  riskAssessment: RiskAssessmentData
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx'

/**
 * Export configuration
 */
export interface ExportConfig {
  format: ExportFormat
  includeCharts: boolean
  includeMetadata: boolean
  includeRiskAssessment: boolean
  dateRange?: {
    start: string
    end: string
  }
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  data?: Blob | string
  filename: string
  error?: string
  generatedAt: string
}

/**
 * Main interface for results analysis services
 * 
 * This interface defines how other modules can analyze results
 * with full context from price projections and strategy execution.
 */
export interface ResultsAnalysisService {
  /**
   * Analyze strategy results with original price projection context
   * 
   * @param strategyResults - Complete strategy execution results
   * @param originalProjection - Original price projection used
   * @returns Promise resolving to enhanced analysis with accuracy metrics
   */
  analyzeWithPriceProjection(
    strategyResults: StrategyExecutionResult,
    originalProjection: PriceProjectionResult
  ): Promise<EnhancedResultsAnalysis>

  /**
   * Export results in specified format
   * 
   * @param analysis - Enhanced results analysis
   * @param config - Export configuration
   * @returns Promise resolving to export result
   */
  exportResults?(
    analysis: EnhancedResultsAnalysis,
    config: ExportConfig
  ): Promise<ExportResult>
}

/**
 * Results analysis request structure
 */
export interface ResultsAnalysisRequest {
  strategyResults: StrategyExecutionResult
  originalProjection: PriceProjectionResult
  analysisId?: string
}

/**
 * Results analysis response structure
 */
export interface ResultsAnalysisResponse {
  success: boolean
  analysis?: EnhancedResultsAnalysis
  error?: string
  analysisId: string
  analyzedAt: string
  duration: number // milliseconds
}
