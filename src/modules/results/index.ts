/**
 * Results Module
 * 
 * Barrel export for all results-related functionality including analysis services,
 * adapters, components, and types.
 */

// Types
export type {
  EnhancedMonthlyResult,
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

// Components - removed broken duplicates, working components are in app/simulation/components/
// export { ResultsPage } from './components/ResultsPage'
// export { ResultsSummary } from './components/ResultsSummary'
// export { ResultsTable } from './components/ResultsTable'
// export { RiskAssessment } from './components/RiskAssessment'
// export { default as UnifiedPriceChart } from './components/UnifiedPriceChart'
// export { PortfolioValueChart } from './components/PortfolioValueChart'
// export { DebtCollateralChart } from './components/DebtCollateralChart'
// export { LTVProgressionChart } from './components/LTVProgressionChart'
// export { CashFlowChart } from './components/CashFlowChart'

// Re-export commonly used functions for backward compatibility
export { resultsAnalysisService as analyzeResults } from './services/ResultsAnalysisService'
