/**
 * Results Module
 * 
 * Barrel export for all results-related functionality including analysis services,
 * adapters, components, and types.
 */

// Types
export type {
  EnhancedMonthlyResult,
  ResultsSummary,
  RiskAssessment,
  ChartDataPoint,
  ChartConfig,
  ChartSeries,
  ExportConfig,
  ResultsAnalysisRequest,
  ResultsAnalysisResponse,
  IResultsProcessor,
  IResultsAnalysisService,
  ProjectionComparisonResult,
  ResultsInsights,
  ExportResult,
  IPriceProjectionResultsAdapter,
  IChartDataGenerator
} from './types'

// Services
export { ResultsAnalysisService, resultsAnalysisService } from './services/ResultsAnalysisService'

// Adapters
export { PriceProjectionResultsAdapter, priceProjectionResultsAdapter } from './adapters/PriceProjectionResultsAdapter'

// Re-export commonly used functions for backward compatibility
export { resultsAnalysisService as analyzeResults } from './services/ResultsAnalysisService'
