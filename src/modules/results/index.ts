/**
 * Results Module
 * 
 * Comprehensive results analysis and visualization system with modular architecture.
 * Provides result processing, analysis, and export capabilities.
 */

// Types
export type * from './types'

// Services
export { ResultsAnalysisService, resultsAnalysisService } from './services/ResultsAnalysisService'
export { ResultsProcessor, resultsProcessor } from './services/ResultsProcessor'

// Hooks
export { useResultsAnalysis } from './hooks/useResultsAnalysis'
export { useResultsExport } from './hooks/useResultsExport'

// Initialize results module
console.log('🔧 Initializing results module...')
console.log('✅ Results module initialized with analysis and processing services')
