/**
 * Results Module Types
 * 
 * Type definitions for results analysis, visualization, and data processing.
 * Provides standardized interfaces for all results functionality.
 */

import type { ValidationResult } from '@/modules/shared/types'
import type { MonthlyResult } from '@/modules/strategies/types'
import type { PriceProjectionResult } from '@/modules/price-projection/types'

/**
 * Enhanced monthly result with additional analysis data
 */
export interface EnhancedMonthlyResult extends MonthlyResult {
  // Performance metrics
  portfolioValue: number
  realPortfolioValue: number
  totalReturn: number
  realTotalReturn: number
  monthlyReturn: number
  
  // Risk metrics
  currentLtv: number
  liquidationDistance: number
  liquidationPrice: number
  collateralRatio: number
  
  // Cash flow analysis
  netCashFlow: number
  cumulativeCashFlow: number
  realCumulativeCashFlow: number
  
  // Projection context (if available)
  projectionContext?: {
    modelName: string
    confidence: number
    supportPrice?: number
    resistancePrice?: number
    priceDeviation: number
  }
}

/**
 * Results summary statistics
 */
export interface ResultsSummary {
  // Basic metrics
  totalMonths: number
  finalBtcAmount: number
  finalPortfolioValue: number
  totalReturn: number
  realTotalReturn: number
  annualizedReturn: number
  
  // Risk metrics
  maxLtv: number
  averageLtv: number
  liquidationEvents: number
  maxDrawdown: number
  volatility: number
  
  // Cash flow metrics
  totalWithdrawals: number
  totalRepayments: number
  totalInterestPaid: number
  netCashFlow: number
  
  // Loan metrics
  totalLoansCreated: number
  averageLoanSize: number
  maxActiveLoans: number
  
  // Performance periods
  bestMonth: {
    month: number
    return: number
    btcPrice: number
  }
  worstMonth: {
    month: number
    return: number
    btcPrice: number
  }
}

/**
 * Risk assessment data
 */
export interface RiskAssessment {
  // Overall risk score (1-10)
  overallRiskScore: number
  
  // Risk categories
  liquidationRisk: {
    score: number
    probability: number
    nearMissEvents: number
    description: string
  }
  
  concentrationRisk: {
    score: number
    btcConcentration: number
    description: string
  }
  
  leverageRisk: {
    score: number
    averageLeverage: number
    maxLeverage: number
    description: string
  }
  
  marketRisk: {
    score: number
    volatilityExposure: number
    correlationRisk: number
    description: string
  }
  
  // Recommendations
  recommendations: string[]
  warnings: string[]
}

/**
 * Chart data point for visualizations
 */
export interface ChartDataPoint {
  timestamp: number
  date: string
  month: number
  
  // Price data
  btcPrice: number
  supportPrice?: number
  resistancePrice?: number
  
  // Portfolio data
  portfolioValue: number
  collateralValue: number
  totalDebt: number
  freeBtc: number
  lockedBtc: number
  
  // Performance data
  totalReturn: number
  monthlyReturn: number
  
  // Risk data
  ltv: number
  liquidationPrice: number
  liquidationDistance: number
  
  // Cash flow data
  netCashFlow: number
  cumulativeCashFlow: number
  withdrawalAmount: number
  newLoanPrincipal: number
  
  // Events
  hasEvents: boolean
  eventTypes: string[]
}

/**
 * Chart configuration for different visualization types
 */
export interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'combo'
  title: string
  description?: string
  
  // Axes configuration
  xAxis: {
    label: string
    type: 'time' | 'category' | 'number'
    format?: string
  }
  
  yAxis: {
    label: string
    type: 'number' | 'percentage'
    format?: string
    domain?: [number, number]
  }
  
  // Series configuration
  series: ChartSeries[]
  
  // Display options
  showLegend: boolean
  showGrid: boolean
  showTooltip: boolean
  responsive: boolean
}

/**
 * Chart series configuration
 */
export interface ChartSeries {
  key: string
  name: string
  color: string
  type?: 'line' | 'area' | 'bar'
  strokeWidth?: number
  strokeDasharray?: string
  fill?: boolean
  yAxisId?: string
}

/**
 * Export configuration for results data
 */
export interface ExportConfig {
  format: 'csv' | 'json' | 'xlsx' | 'pdf'
  filename?: string
  includeCharts: boolean
  includeRawData: boolean
  includeSummary: boolean
  includeRiskAssessment: boolean
  dateRange?: {
    start: number
    end: number
  }
}

/**
 * Results analysis request
 */
export interface ResultsAnalysisRequest {
  results: MonthlyResult[]
  projectionContext?: PriceProjectionResult
  analysisOptions: {
    includeRiskAssessment: boolean
    includePerformanceMetrics: boolean
    includeCashFlowAnalysis: boolean
    includeProjectionComparison: boolean
  }
}

/**
 * Results analysis response
 */
export interface ResultsAnalysisResponse {
  success: boolean
  enhancedResults?: EnhancedMonthlyResult[]
  summary?: ResultsSummary
  riskAssessment?: RiskAssessment
  chartData?: ChartDataPoint[]
  error?: string
  analysisTime: number
  generatedAt: string
}

/**
 * Results processor interface
 */
export interface IResultsProcessor {
  processResults(request: ResultsAnalysisRequest): Promise<ResultsAnalysisResponse>
  generateSummary(results: EnhancedMonthlyResult[]): ResultsSummary
  assessRisk(results: EnhancedMonthlyResult[]): RiskAssessment
  generateChartData(results: EnhancedMonthlyResult[]): ChartDataPoint[]
  validateResults(results: MonthlyResult[]): ValidationResult
}

/**
 * Results analysis service interface
 */
export interface IResultsAnalysisService {
  analyzeResults(request: ResultsAnalysisRequest): Promise<ResultsAnalysisResponse>
  compareWithProjection(results: MonthlyResult[], projection: PriceProjectionResult): ProjectionComparisonResult
  generateInsights(results: EnhancedMonthlyResult[]): ResultsInsights
  exportResults(results: EnhancedMonthlyResult[], config: ExportConfig): Promise<ExportResult>
}

/**
 * Projection comparison result
 */
export interface ProjectionComparisonResult {
  accuracy: number
  averageDeviation: number
  maxDeviation: number
  correlationCoefficient: number
  deviationsByMonth: Array<{
    month: number
    actualPrice: number
    projectedPrice: number
    deviation: number
    deviationPercent: number
  }>
  summary: string
}

/**
 * Results insights
 */
export interface ResultsInsights {
  keyFindings: string[]
  performanceHighlights: string[]
  riskWarnings: string[]
  optimizationSuggestions: string[]
  marketObservations: string[]
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  filename?: string
  data?: string | Buffer
  error?: string
  size: number
  format: string
}

/**
 * Price projection results adapter interface
 */
export interface IPriceProjectionResultsAdapter {
  enhanceWithProjectionContext(
    results: MonthlyResult[], 
    projection: PriceProjectionResult
  ): EnhancedMonthlyResult[]
  
  calculateProjectionAccuracy(
    results: MonthlyResult[], 
    projection: PriceProjectionResult
  ): ProjectionComparisonResult
  
  validateProjectionAlignment(
    results: MonthlyResult[], 
    projection: PriceProjectionResult
  ): ValidationResult
}

/**
 * Chart data generator interface
 */
export interface IChartDataGenerator {
  generatePortfolioChart(results: EnhancedMonthlyResult[]): ChartDataPoint[]
  generateDebtCollateralChart(results: EnhancedMonthlyResult[]): ChartDataPoint[]
  generateLTVChart(results: EnhancedMonthlyResult[]): ChartDataPoint[]
  generateCashFlowChart(results: EnhancedMonthlyResult[]): ChartDataPoint[]
  generateUnifiedPriceChart(results: EnhancedMonthlyResult[]): ChartDataPoint[]
  generateCustomChart(results: EnhancedMonthlyResult[], config: ChartConfig): ChartDataPoint[]
}
