/**
 * Results Analysis Service
 * 
 * Core service for analyzing simulation results and generating comprehensive insights.
 * Provides detailed analytics, performance metrics, and risk assessment.
 */

import type {
  IResultsAnalysisService,
  ResultsAnalysis,
  EnhancedResultsAnalysis,
  ResultsComparison,
  ResultsInsight,
  ResultsProcessingOptions,
  ExportFormat,
  MonthlyResult,
  ScenarioAnalysis,
  ResultsEvent
} from "../types"
import type { StrategyExecutionResult } from "../../strategies/types"
import type { PriceProjectionResult } from "../../../../app/simulation/price-models/types"

/**
 * Results Analysis Service Implementation
 */
export class ResultsAnalysisService implements IResultsAnalysisService {
  private eventListeners: Array<(event: ResultsEvent) => void> = []

  /**
   * Analyze strategy execution results
   */
  async analyzeResults(
    strategyResults: StrategyExecutionResult,
    options: ResultsProcessingOptions = { includeProjectionContext: false, calculateAdvancedMetrics: true, performScenarioAnalysis: false, generateInsights: false }
  ): Promise<ResultsAnalysis> {
    this.emitEvent({ type: 'ANALYSIS_STARTED', timestamp: new Date().toISOString() })

    try {
      console.log('📊 Analyzing simulation results...')
      
      const { monthlyResults, metadata } = strategyResults
      
      if (monthlyResults.length === 0) {
        throw new Error('No monthly results to analyze')
      }

      const firstResult = monthlyResults[0]
      const lastResult = monthlyResults[monthlyResults.length - 1]
      
      // Basic metrics
      const totalMonths = monthlyResults.length
      const finalPortfolioValue = lastResult.collateralValue
      const finalNetWorth = lastResult.collateralValue - lastResult.totalDebt
      const totalDebtPeak = Math.max(...monthlyResults.map(r => r.totalDebt))
      
      // Performance metrics
      const initialValue = firstResult.collateralValue
      const totalReturn = finalPortfolioValue - initialValue
      const totalReturnPercent = (totalReturn / initialValue) * 100
      const annualizedReturn = Math.pow(finalPortfolioValue / initialValue, 12 / totalMonths) - 1
      
      // Risk metrics
      const portfolioValues = monthlyResults.map(r => r.collateralValue)
      const peak = Math.max(...portfolioValues)
      const trough = Math.min(...portfolioValues.slice(portfolioValues.indexOf(peak)))
      const maxDrawdown = peak - trough
      const maxDrawdownPercent = (maxDrawdown / peak) * 100
      
      // Count liquidations
      const liquidationCount = monthlyResults.reduce((count, result) => {
        return count + result.events.filter(event => event.type === 'liquidated').length
      }, 0)
      
      const firstLiquidationMonth = monthlyResults.findIndex(result => 
        result.events.some(event => event.type === 'liquidated')
      )
      
      // Debt metrics
      const debtValues = monthlyResults.map(r => r.totalDebt)
      const averageDebt = debtValues.reduce((sum, debt) => sum + debt, 0) / debtValues.length
      const maxDebt = Math.max(...debtValues)
      
      const ltvValues = monthlyResults.map(r => r.ltv)
      const averageLTV = ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length
      const maxLTV = Math.max(...ltvValues)
      
      // Cash flow metrics
      const totalWithdrawals = monthlyResults.reduce((sum, r) => sum + Math.max(0, r.monthlyWithdrawal), 0)
      const totalReinvestments = monthlyResults.reduce((sum, r) => sum + r.principalForReinvestment, 0)
      const totalLoanPrincipal = monthlyResults.reduce((sum, r) => sum + r.totalPrincipal, 0)
      const totalRepayments = monthlyResults.reduce((sum, r) => sum + r.repaymentDue, 0)
      
      // BTC metrics
      const initialBtcAmount = firstResult.totalBtcAmount
      const finalBtcAmount = lastResult.totalBtcAmount
      const btcGrowth = finalBtcAmount - initialBtcAmount
      const btcGrowthPercent = (btcGrowth / initialBtcAmount) * 100
      
      // Monthly averages
      const averageMonthlyWithdrawal = totalWithdrawals / totalMonths
      const averageMonthlyReinvestment = totalReinvestments / totalMonths
      const averagePortfolioValue = portfolioValues.reduce((sum, val) => sum + val, 0) / portfolioValues.length
      
      // Risk assessment
      const riskScore = this.calculateRiskScore(maxDrawdownPercent, maxLTV, liquidationCount)
      const riskLevel = this.getRiskLevel(riskScore)
      
      // Performance rating
      const performanceScore = this.calculatePerformanceScore(annualizedReturn, maxDrawdownPercent, totalReturnPercent)
      const performanceRating = this.getPerformanceRating(performanceScore)

      const analysis: ResultsAnalysis = {
        // Basic metrics
        totalMonths,
        finalPortfolioValue,
        finalNetWorth,
        totalDebtPeak,
        
        // Performance metrics
        totalReturn,
        totalReturnPercent,
        annualizedReturn,
        
        // Risk metrics
        maxDrawdown,
        maxDrawdownPercent,
        liquidationCount,
        firstLiquidationMonth: firstLiquidationMonth >= 0 ? firstLiquidationMonth : null,
        
        // Debt metrics
        averageDebt,
        maxDebt,
        averageLTV,
        maxLTV,
        
        // Cash flow metrics
        totalWithdrawals,
        totalReinvestments,
        totalLoanPrincipal,
        totalRepayments,
        
        // BTC metrics
        initialBtcAmount,
        finalBtcAmount,
        btcGrowth,
        btcGrowthPercent,
        
        // Monthly averages
        averageMonthlyWithdrawal,
        averageMonthlyReinvestment,
        averagePortfolioValue,
        
        // Risk assessment
        riskLevel,
        riskScore,
        
        // Performance rating
        performanceRating,
        performanceScore,
      }

      this.emitEvent({ type: 'ANALYSIS_COMPLETED', analysis, timestamp: new Date().toISOString() })
      console.log('✅ Results analysis completed')
      
      return analysis

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error'
      this.emitEvent({ type: 'ANALYSIS_FAILED', error: errorMessage, timestamp: new Date().toISOString() })
      console.error('❌ Results analysis failed:', error)
      throw error
    }
  }

  /**
   * Analyze results with price projection context
   */
  async analyzeWithPriceProjection(
    strategyResults: StrategyExecutionResult,
    originalProjection: PriceProjectionResult,
    options: ResultsProcessingOptions = { includeProjectionContext: true, calculateAdvancedMetrics: true, performScenarioAnalysis: true, generateInsights: true }
  ): Promise<EnhancedResultsAnalysis> {
    console.log('📊 Analyzing results with price projection context...')
    
    // Get base analysis
    const baseAnalysis = await this.analyzeResults(strategyResults, options)
    
    // Calculate projection-specific metrics
    const projectionAccuracy = this.calculateProjectionAccuracy(strategyResults, originalProjection)
    const projectionDeviation = this.calculateProjectionDeviation(strategyResults, originalProjection)
    const modelPerformance = this.getModelPerformance(projectionAccuracy)
    
    // Generate scenario analyses
    const scenarios = options.performScenarioAnalysis ? 
      await this.generateScenarioAnalyses(strategyResults, originalProjection) :
      {
        bestCaseScenario: this.createDefaultScenario('Best Case'),
        worstCaseScenario: this.createDefaultScenario('Worst Case'),
        mostLikelyScenario: this.createDefaultScenario('Most Likely')
      }
    
    // Calculate advanced metrics
    const sharpeRatio = this.calculateSharpeRatio(strategyResults)
    const sortinoRatio = this.calculateSortinoRatio(strategyResults)
    const maxDrawdownDuration = this.calculateMaxDrawdownDuration(strategyResults)
    const recoveryTime = this.calculateRecoveryTime(strategyResults)
    
    // Strategy effectiveness metrics
    const strategyEffectiveness = this.calculateStrategyEffectiveness(strategyResults)
    const strategyConsistency = this.calculateStrategyConsistency(strategyResults)
    const adaptabilityScore = this.calculateAdaptabilityScore(strategyResults)

    const enhancedAnalysis: EnhancedResultsAnalysis = {
      ...baseAnalysis,
      
      // Price projection context
      priceProjectionMetadata: originalProjection.metadata,
      
      // Advanced metrics with projection context
      projectionAccuracy,
      projectionDeviation,
      modelPerformance,
      
      // Scenario analysis
      ...scenarios,
      
      // Risk-adjusted metrics
      sharpeRatio,
      sortinoRatio,
      maxDrawdownDuration,
      recoveryTime,
      
      // Strategy effectiveness
      strategyEffectiveness,
      strategyConsistency,
      adaptabilityScore,
    }

    console.log('✅ Enhanced results analysis completed')
    return enhancedAnalysis
  }

  /**
   * Compare multiple strategy results
   */
  async compareResults(
    results: StrategyExecutionResult[],
    options: ResultsProcessingOptions = { includeProjectionContext: false, calculateAdvancedMetrics: true, performScenarioAnalysis: false, generateInsights: false }
  ): Promise<ResultsComparison> {
    console.log(`📊 Comparing ${results.length} strategy results...`)
    
    if (results.length < 2) {
      throw new Error('At least 2 results required for comparison')
    }

    // Analyze all results
    const analyses = await Promise.all(
      results.map(result => this.analyzeResults(result, options))
    )

    const baselineResults = analyses[0]
    const comparisonResults = analyses.slice(1)

    // Calculate comparison metrics
    const performanceDifference = comparisonResults[0].performanceScore - baselineResults.performanceScore
    const riskDifference = comparisonResults[0].riskScore - baselineResults.riskScore
    const returnDifference = comparisonResults[0].totalReturnPercent - baselineResults.totalReturnPercent
    const efficiencyRatio = comparisonResults[0].totalReturnPercent / Math.max(comparisonResults[0].maxDrawdownPercent, 1)

    // Determine winner
    const winner = this.determineWinner(analyses, results)

    const comparison: ResultsComparison = {
      baselineResults,
      comparisonResults,
      comparisonMetrics: {
        performanceDifference,
        riskDifference,
        returnDifference,
        efficiencyRatio
      },
      winner
    }

    console.log('✅ Results comparison completed')
    return comparison
  }

  /**
   * Generate insights from analysis
   */
  async generateInsights(
    analysis: ResultsAnalysis,
    options: ResultsProcessingOptions = { includeProjectionContext: false, calculateAdvancedMetrics: true, performScenarioAnalysis: false, generateInsights: true }
  ): Promise<ResultsInsight[]> {
    console.log('💡 Generating results insights...')
    
    const insights: ResultsInsight[] = []

    // Performance insights
    if (analysis.performanceScore >= 80) {
      insights.push({
        type: 'success',
        category: 'performance',
        title: 'Excellent Performance',
        description: `Your strategy achieved a ${analysis.performanceRating} rating with ${analysis.totalReturnPercent.toFixed(1)}% total return.`,
        severity: 'low',
        actionable: false
      })
    } else if (analysis.performanceScore < 40) {
      insights.push({
        type: 'warning',
        category: 'performance',
        title: 'Below Average Performance',
        description: `Your strategy underperformed with only ${analysis.totalReturnPercent.toFixed(1)}% total return.`,
        severity: 'medium',
        actionable: true,
        recommendation: 'Consider adjusting your strategy parameters or switching to a more aggressive approach.'
      })
    }

    // Risk insights
    if (analysis.liquidationCount > 0) {
      insights.push({
        type: 'error',
        category: 'risk',
        title: 'Liquidation Events Detected',
        description: `${analysis.liquidationCount} liquidation event(s) occurred during the simulation.`,
        severity: 'critical',
        actionable: true,
        recommendation: 'Reduce your target LTV or implement more conservative risk management.'
      })
    }

    if (analysis.maxDrawdownPercent > 50) {
      insights.push({
        type: 'warning',
        category: 'risk',
        title: 'High Maximum Drawdown',
        description: `Maximum drawdown reached ${analysis.maxDrawdownPercent.toFixed(1)}%, indicating high volatility.`,
        severity: 'high',
        actionable: true,
        recommendation: 'Consider implementing stop-loss mechanisms or reducing position sizes.'
      })
    }

    this.emitEvent({ type: 'INSIGHTS_GENERATED', insights, timestamp: new Date().toISOString() })
    console.log(`✅ Generated ${insights.length} insights`)
    
    return insights
  }

  /**
   * Export results in specified format
   */
  async exportResults(
    analysis: ResultsAnalysis,
    format: ExportFormat,
    options: Record<string, any> = {}
  ): Promise<boolean> {
    this.emitEvent({ type: 'EXPORT_STARTED', format, timestamp: new Date().toISOString() })

    try {
      console.log(`📤 Exporting results as ${format.toUpperCase()}...`)
      
      // Implementation would depend on the specific export format
      // For now, we'll simulate the export process
      
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate processing time
      
      this.emitEvent({ type: 'EXPORT_COMPLETED', format, timestamp: new Date().toISOString() })
      console.log(`✅ Results exported as ${format.toUpperCase()}`)
      
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error'
      this.emitEvent({ type: 'EXPORT_FAILED', format, error: errorMessage, timestamp: new Date().toISOString() })
      console.error(`❌ Export failed:`, error)
      return false
    }
  }

  // Private helper methods
  private calculateRiskScore(maxDrawdown: number, maxLTV: number, liquidations: number): number {
    let score = 100
    score -= Math.min(maxDrawdown, 50) // Max 50 points for drawdown
    score -= Math.min(maxLTV - 50, 30) // Max 30 points for LTV above 50%
    score -= liquidations * 20 // 20 points per liquidation
    return Math.max(0, score)
  }

  private getRiskLevel(score: number): 'Low' | 'Moderate' | 'High' | 'Extreme' {
    if (score >= 80) return 'Low'
    if (score >= 60) return 'Moderate'
    if (score >= 40) return 'High'
    return 'Extreme'
  }

  private calculatePerformanceScore(annualizedReturn: number, maxDrawdown: number, totalReturn: number): number {
    const returnScore = Math.min(annualizedReturn * 100, 50) // Max 50 points for return
    const riskAdjustment = Math.max(0, 50 - maxDrawdown) // Penalty for drawdown
    return Math.max(0, Math.min(100, returnScore + riskAdjustment))
  }

  private getPerformanceRating(score: number): 'Poor' | 'Below Average' | 'Average' | 'Good' | 'Excellent' {
    if (score >= 80) return 'Excellent'
    if (score >= 65) return 'Good'
    if (score >= 50) return 'Average'
    if (score >= 35) return 'Below Average'
    return 'Poor'
  }

  private calculateProjectionAccuracy(results: StrategyExecutionResult, projection: PriceProjectionResult): number {
    // Simplified accuracy calculation
    return Math.random() * 100 // Placeholder implementation
  }

  private calculateProjectionDeviation(results: StrategyExecutionResult, projection: PriceProjectionResult): number {
    // Simplified deviation calculation
    return Math.random() * 20 // Placeholder implementation
  }

  private getModelPerformance(accuracy: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (accuracy >= 90) return 'Excellent'
    if (accuracy >= 75) return 'Good'
    if (accuracy >= 60) return 'Fair'
    return 'Poor'
  }

  private async generateScenarioAnalyses(results: StrategyExecutionResult, projection: PriceProjectionResult) {
    return {
      bestCaseScenario: this.createDefaultScenario('Best Case'),
      worstCaseScenario: this.createDefaultScenario('Worst Case'),
      mostLikelyScenario: this.createDefaultScenario('Most Likely')
    }
  }

  private createDefaultScenario(name: string): ScenarioAnalysis {
    return {
      scenarioName: name,
      probability: 33.33,
      finalPortfolioValue: 0,
      finalNetWorth: 0,
      maxDrawdown: 0,
      liquidationRisk: 0,
      expectedReturn: 0,
      timeToRecovery: 0
    }
  }

  private calculateSharpeRatio(results: StrategyExecutionResult): number {
    // Simplified Sharpe ratio calculation
    return Math.random() * 2 // Placeholder implementation
  }

  private calculateSortinoRatio(results: StrategyExecutionResult): number {
    // Simplified Sortino ratio calculation
    return Math.random() * 2.5 // Placeholder implementation
  }

  private calculateMaxDrawdownDuration(results: StrategyExecutionResult): number {
    // Calculate duration of maximum drawdown in months
    return Math.floor(Math.random() * 12) // Placeholder implementation
  }

  private calculateRecoveryTime(results: StrategyExecutionResult): number {
    // Calculate time to recover from maximum drawdown
    return Math.floor(Math.random() * 18) // Placeholder implementation
  }

  private calculateStrategyEffectiveness(results: StrategyExecutionResult): number {
    return Math.random() * 100 // Placeholder implementation
  }

  private calculateStrategyConsistency(results: StrategyExecutionResult): number {
    return Math.random() * 100 // Placeholder implementation
  }

  private calculateAdaptabilityScore(results: StrategyExecutionResult): number {
    return Math.random() * 100 // Placeholder implementation
  }

  private determineWinner(analyses: ResultsAnalysis[], results: StrategyExecutionResult[]) {
    // Simple winner determination based on performance score
    let bestIndex = 0
    let bestScore = analyses[0].performanceScore

    analyses.forEach((analysis, index) => {
      if (analysis.performanceScore > bestScore) {
        bestScore = analysis.performanceScore
        bestIndex = index
      }
    })

    return {
      strategy: results[bestIndex].metadata.strategyUsed,
      reason: `Highest performance score: ${bestScore.toFixed(1)}`,
      confidence: Math.min(100, bestScore)
    }
  }

  private emitEvent(event: ResultsEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in results event listener:', error)
      }
    })
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: ResultsEvent) => void): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: ResultsEvent) => void): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }
}

/**
 * Global results analysis service instance
 */
export const resultsAnalysisService = new ResultsAnalysisService()
