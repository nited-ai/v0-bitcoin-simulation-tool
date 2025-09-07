/**
 * Results Analysis Service
 * 
 * Central service for analyzing simulation results, generating insights,
 * and providing comprehensive performance metrics.
 */

import type {
  IResultsAnalysisService,
  ResultsAnalysisRequest,
  ResultsAnalysisResponse,
  EnhancedMonthlyResult,
  ResultsSummary,
  RiskAssessment,
  ProjectionComparisonResult,
  ResultsInsights,
  ExportConfig,
  ExportResult,
  ChartDataPoint
} from '../types'
import type { MonthlyResult } from '@/modules/strategies/types'
import type { PriceProjectionResult } from '@/modules/price-projection/types'
import { priceProjectionResultsAdapter } from '../adapters/PriceProjectionResultsAdapter'

/**
 * Results Analysis Service Implementation
 */
export class ResultsAnalysisService implements IResultsAnalysisService {
  
  /**
   * Analyze simulation results with comprehensive metrics
   */
  async analyzeResults(request: ResultsAnalysisRequest): Promise<ResultsAnalysisResponse> {
    const startTime = performance.now()
    
    try {
      // Validate input
      if (!request.results || request.results.length === 0) {
        return this.createErrorResponse('Results cannot be empty', performance.now() - startTime)
      }

      // Enhance results with projection context if available
      let enhancedResults: EnhancedMonthlyResult[]
      if (request.projectionContext) {
        enhancedResults = priceProjectionResultsAdapter.enhanceWithProjectionContext(
          request.results,
          request.projectionContext
        )
      } else {
        enhancedResults = this.enhanceResultsBasic(request.results)
      }

      // Add additional analysis metrics
      enhancedResults = this.addAnalysisMetrics(enhancedResults)

      // Generate summary if requested
      let summary: ResultsSummary | undefined
      if (request.analysisOptions.includePerformanceMetrics) {
        summary = this.generateSummary(enhancedResults)
      }

      // Generate risk assessment if requested
      let riskAssessment: RiskAssessment | undefined
      if (request.analysisOptions.includeRiskAssessment) {
        riskAssessment = this.assessRisk(enhancedResults)
      }

      // Generate chart data
      const chartData = this.generateChartData(enhancedResults)

      return {
        success: true,
        enhancedResults,
        summary,
        riskAssessment,
        chartData,
        analysisTime: performance.now() - startTime,
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createErrorResponse(errorMessage, performance.now() - startTime)
    }
  }

  /**
   * Compare results with price projection
   */
  compareWithProjection(
    results: MonthlyResult[],
    projection: PriceProjectionResult
  ): ProjectionComparisonResult {
    return priceProjectionResultsAdapter.calculateProjectionAccuracy(results, projection)
  }

  /**
   * Generate insights from enhanced results
   */
  generateInsights(results: EnhancedMonthlyResult[]): ResultsInsights {
    const insights: ResultsInsights = {
      keyFindings: [],
      performanceHighlights: [],
      riskWarnings: [],
      optimizationSuggestions: [],
      marketObservations: []
    }

    if (results.length === 0) return insights

    // Analyze performance patterns
    const finalResult = results[results.length - 1]
    const initialValue = results[0].portfolioValue
    const finalValue = finalResult.portfolioValue
    const totalReturn = ((finalValue - initialValue) / initialValue) * 100

    // Key findings
    if (totalReturn > 0) {
      insights.keyFindings.push(`Portfolio achieved positive return of ${totalReturn.toFixed(2)}%`)
    } else {
      insights.keyFindings.push(`Portfolio experienced negative return of ${totalReturn.toFixed(2)}%`)
    }

    // Performance highlights
    const maxLtv = Math.max(...results.map(r => r.currentLtv))
    const avgLtv = results.reduce((sum, r) => sum + r.currentLtv, 0) / results.length
    
    insights.performanceHighlights.push(`Maximum LTV reached: ${maxLtv.toFixed(1)}%`)
    insights.performanceHighlights.push(`Average LTV maintained: ${avgLtv.toFixed(1)}%`)

    // Risk warnings
    if (maxLtv > 80) {
      insights.riskWarnings.push('High liquidation risk detected - LTV exceeded 80%')
    }

    const liquidationEvents = results.filter(r => 
      r.events.some(e => e.type === 'liquidated')
    ).length
    
    if (liquidationEvents > 0) {
      insights.riskWarnings.push(`${liquidationEvents} liquidation events occurred`)
    }

    // Market observations
    const priceVolatility = this.calculatePriceVolatility(results)
    if (priceVolatility > 0.3) {
      insights.marketObservations.push('High price volatility observed during simulation period')
    } else if (priceVolatility > 0.1) {
      insights.marketObservations.push('Moderate price volatility observed during simulation period')
    } else {
      insights.marketObservations.push('Low price volatility observed during simulation period')
    }

    // Optimization suggestions
    if (avgLtv < 30) {
      insights.optimizationSuggestions.push('Consider higher leverage to improve capital efficiency')
    }
    
    if (maxLtv > 70) {
      insights.optimizationSuggestions.push('Consider implementing dynamic LTV management')
    }

    return insights
  }

  /**
   * Export results in various formats
   */
  async exportResults(results: EnhancedMonthlyResult[], config: ExportConfig): Promise<ExportResult> {
    try {
      let data: string | Buffer
      let size: number

      switch (config.format) {
        case 'csv':
          data = this.exportToCsv(results, config)
          size = Buffer.byteLength(data, 'utf8')
          break
          
        case 'json':
          data = this.exportToJson(results, config)
          size = Buffer.byteLength(data, 'utf8')
          break
          
        case 'xlsx':
          // Would implement Excel export here
          throw new Error('XLSX export not yet implemented')
          
        case 'pdf':
          // Would implement PDF export here
          throw new Error('PDF export not yet implemented')
          
        default:
          throw new Error(`Unsupported export format: ${config.format}`)
      }

      return {
        success: true,
        filename: config.filename || `results-${Date.now()}.${config.format}`,
        data,
        size,
        format: config.format
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: errorMessage,
        size: 0,
        format: config.format
      }
    }
  }

  /**
   * Generate comprehensive summary statistics
   */
  generateSummary(results: EnhancedMonthlyResult[]): ResultsSummary {
    if (results.length === 0) {
      throw new Error('Cannot generate summary for empty results')
    }

    const finalResult = results[results.length - 1]
    const initialValue = results[0].portfolioValue
    const finalValue = finalResult.portfolioValue

    // Calculate returns
    const totalReturn = ((finalValue - initialValue) / initialValue) * 100
    const realTotalReturn = ((finalResult.realPortfolioValue - results[0].realPortfolioValue) / results[0].realPortfolioValue) * 100
    const annualizedReturn = Math.pow(finalValue / initialValue, 12 / results.length) - 1

    // Risk metrics
    const ltvValues = results.map(r => r.currentLtv)
    const maxLtv = Math.max(...ltvValues)
    const averageLtv = ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length

    // Cash flow metrics
    const totalWithdrawals = results.reduce((sum, r) => sum + r.withdrawalAmount, 0)
    const totalRepayments = results.reduce((sum, r) => sum + r.repaymentsDue, 0)
    const totalNewLoans = results.reduce((sum, r) => sum + r.newLoanPrincipal, 0)
    const netCashFlow = totalNewLoans - totalWithdrawals - totalRepayments

    // Find best and worst months
    const monthlyReturns = results.map((r, i) => ({
      month: r.month,
      return: i > 0 ? r.monthlyReturn : 0,
      btcPrice: r.btcPrice
    }))

    const bestMonth = monthlyReturns.reduce((best, current) => 
      current.return > best.return ? current : best
    )
    
    const worstMonth = monthlyReturns.reduce((worst, current) => 
      current.return < worst.return ? current : worst
    )

    return {
      totalMonths: results.length,
      finalBtcAmount: finalResult.currentBtcAmount,
      finalPortfolioValue: finalValue,
      totalReturn,
      realTotalReturn,
      annualizedReturn: annualizedReturn * 100,
      maxLtv,
      averageLtv,
      liquidationEvents: results.filter(r => r.events.some(e => e.type === 'liquidated')).length,
      maxDrawdown: this.calculateMaxDrawdown(results),
      volatility: this.calculatePriceVolatility(results),
      totalWithdrawals,
      totalRepayments,
      totalInterestPaid: totalRepayments - results.reduce((sum, r) => sum + r.newLoanPrincipal, 0),
      netCashFlow,
      totalLoansCreated: results.reduce((sum, r) => sum + (r.newLoanPrincipal > 0 ? 1 : 0), 0),
      averageLoanSize: results.reduce((sum, r) => sum + r.newLoanPrincipal, 0) / results.length,
      maxActiveLoans: Math.max(...results.map(r => r.loanCount)),
      bestMonth,
      worstMonth
    }
  }

  /**
   * Assess risk levels across multiple dimensions
   */
  assessRisk(results: EnhancedMonthlyResult[]): RiskAssessment {
    const ltvValues = results.map(r => r.currentLtv)
    const maxLtv = Math.max(...ltvValues)
    const avgLtv = ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length

    // Liquidation risk
    const liquidationEvents = results.filter(r => r.events.some(e => e.type === 'liquidated')).length
    const nearMissEvents = results.filter(r => r.currentLtv > 80).length
    const liquidationRisk = {
      score: Math.min(10, Math.max(1, Math.floor(maxLtv / 10) + liquidationEvents * 2)),
      probability: Math.min(1, (maxLtv - 50) / 50),
      nearMissEvents,
      description: maxLtv > 80 ? 'High liquidation risk' : maxLtv > 60 ? 'Moderate liquidation risk' : 'Low liquidation risk'
    }

    // Concentration risk (100% BTC)
    const concentrationRisk = {
      score: 8, // High concentration in single asset
      btcConcentration: 100,
      description: 'High concentration risk - 100% exposure to Bitcoin'
    }

    // Leverage risk
    const leverageValues = results.map(r => r.collateralValue / (r.collateralValue - r.totalDebt))
    const avgLeverage = leverageValues.reduce((sum, lev) => sum + lev, 0) / leverageValues.length
    const maxLeverage = Math.max(...leverageValues)
    
    const leverageRisk = {
      score: Math.min(10, Math.max(1, Math.floor(avgLeverage))),
      averageLeverage: avgLeverage,
      maxLeverage: maxLeverage,
      description: avgLeverage > 3 ? 'High leverage risk' : avgLeverage > 2 ? 'Moderate leverage risk' : 'Low leverage risk'
    }

    // Market risk
    const volatility = this.calculatePriceVolatility(results)
    const marketRisk = {
      score: Math.min(10, Math.max(1, Math.floor(volatility * 10))),
      volatilityExposure: volatility,
      correlationRisk: 1.0, // Perfect correlation with BTC
      description: volatility > 0.5 ? 'High market risk' : volatility > 0.3 ? 'Moderate market risk' : 'Low market risk'
    }

    // Overall risk score (weighted average)
    const overallRiskScore = Math.round(
      (liquidationRisk.score * 0.3 + 
       concentrationRisk.score * 0.25 + 
       leverageRisk.score * 0.25 + 
       marketRisk.score * 0.2)
    )

    // Generate recommendations
    const recommendations: string[] = []
    const warnings: string[] = []

    if (maxLtv > 70) {
      warnings.push('High LTV levels detected - consider reducing leverage')
      recommendations.push('Implement automatic deleveraging at 75% LTV')
    }

    if (liquidationEvents > 0) {
      warnings.push('Liquidation events occurred during simulation')
      recommendations.push('Consider more conservative LTV targets')
    }

    recommendations.push('Consider diversifying beyond Bitcoin for reduced concentration risk')
    recommendations.push('Implement dynamic risk management based on market volatility')

    return {
      overallRiskScore,
      liquidationRisk,
      concentrationRisk,
      leverageRisk,
      marketRisk,
      recommendations,
      warnings
    }
  }

  /**
   * Generate chart data points for visualizations
   */
  generateChartData(results: EnhancedMonthlyResult[]): ChartDataPoint[] {
    return results.map((result, index) => ({
      timestamp: new Date(2024, result.month - 1).getTime(),
      date: result.dateString,
      month: result.month,
      btcPrice: result.btcPrice,
      supportPrice: result.projectionContext?.supportPrice,
      resistancePrice: result.projectionContext?.resistancePrice,
      portfolioValue: result.portfolioValue,
      collateralValue: result.collateralValue,
      totalDebt: result.totalDebt,
      freeBtc: result.freeBtc,
      lockedBtc: result.lockedBtc,
      totalReturn: result.totalReturn,
      monthlyReturn: result.monthlyReturn,
      ltv: result.currentLtv,
      liquidationPrice: result.liquidationPrice,
      liquidationDistance: result.liquidationDistance,
      netCashFlow: result.netCashFlow,
      cumulativeCashFlow: result.cumulativeCashFlow,
      withdrawalAmount: result.withdrawalAmount,
      newLoanPrincipal: result.newLoanPrincipal,
      hasEvents: result.events.length > 0,
      eventTypes: result.events.map(e => e.type)
    }))
  }

  /**
   * Enhance basic results with analysis metrics
   */
  private enhanceResultsBasic(results: MonthlyResult[]): EnhancedMonthlyResult[] {
    return results.map((result, index) => {
      const portfolioValue = result.currentBtcAmount * result.btcPrice
      const realPortfolioValue = result.realCollateralValue
      
      // Calculate returns
      const initialValue = results[0].currentBtcAmount * results[0].btcPrice
      const totalReturn = ((portfolioValue - initialValue) / initialValue) * 100
      const realTotalReturn = ((realPortfolioValue - results[0].realCollateralValue) / results[0].realCollateralValue) * 100
      
      const monthlyReturn = index > 0 
        ? ((portfolioValue - (results[index - 1].currentBtcAmount * results[index - 1].btcPrice)) / (results[index - 1].currentBtcAmount * results[index - 1].btcPrice)) * 100
        : 0

      // Calculate risk metrics
      const currentLtv = result.collateralValue > 0 ? (result.totalDebt / result.collateralValue) * 100 : 0
      const liquidationPrice = result.totalDebt > 0 ? (result.totalDebt / result.currentBtcAmount) * 1.05 : 0 // Assuming 95% liquidation LTV
      const liquidationDistance = liquidationPrice > 0 ? ((result.btcPrice - liquidationPrice) / result.btcPrice) * 100 : 100
      const collateralRatio = result.totalDebt > 0 ? result.collateralValue / result.totalDebt : 0

      // Calculate cash flow
      const netCashFlow = -result.withdrawalAmount + result.newLoanPrincipal - result.repaymentsDue
      const cumulativeCashFlow = results.slice(0, index + 1).reduce((sum, r) => 
        sum + (-r.withdrawalAmount + r.newLoanPrincipal - r.repaymentsDue), 0
      )
      const realCumulativeCashFlow = cumulativeCashFlow / (1 + (0.03 * (index + 1) / 12)) // Inflation adjusted

      return {
        ...result,
        portfolioValue,
        realPortfolioValue,
        totalReturn,
        realTotalReturn,
        monthlyReturn,
        currentLtv,
        liquidationDistance,
        liquidationPrice,
        collateralRatio,
        netCashFlow,
        cumulativeCashFlow,
        realCumulativeCashFlow
      }
    })
  }

  /**
   * Add additional analysis metrics to enhanced results
   */
  private addAnalysisMetrics(results: EnhancedMonthlyResult[]): EnhancedMonthlyResult[] {
    // Additional metrics could be added here
    return results
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(results: EnhancedMonthlyResult[]): number {
    let maxDrawdown = 0
    let peak = results[0].portfolioValue

    for (const result of results) {
      if (result.portfolioValue > peak) {
        peak = result.portfolioValue
      }
      
      const drawdown = (peak - result.portfolioValue) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    return maxDrawdown * 100
  }

  /**
   * Calculate price volatility
   */
  private calculatePriceVolatility(results: EnhancedMonthlyResult[]): number {
    if (results.length < 2) return 0

    const returns = results.slice(1).map((result, index) => 
      Math.log(result.btcPrice / results[index].btcPrice)
    )

    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
    
    return Math.sqrt(variance * 12) // Annualized volatility
  }

  /**
   * Export results to CSV format
   */
  private exportToCsv(results: EnhancedMonthlyResult[], config: ExportConfig): string {
    const headers = [
      'Month', 'Date', 'BTC Price', 'Portfolio Value', 'Total Debt', 'LTV', 
      'Total Return', 'Monthly Return', 'Net Cash Flow', 'Events'
    ]

    const rows = results.map(result => [
      result.month,
      result.dateString,
      result.btcPrice,
      result.portfolioValue,
      result.totalDebt,
      result.currentLtv.toFixed(2),
      result.totalReturn.toFixed(2),
      result.monthlyReturn.toFixed(2),
      result.netCashFlow,
      result.events.map(e => e.type).join(';')
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * Export results to JSON format
   */
  private exportToJson(results: EnhancedMonthlyResult[], config: ExportConfig): string {
    const exportData = {
      results: config.includeRawData ? results : results.map(r => ({
        month: r.month,
        btcPrice: r.btcPrice,
        portfolioValue: r.portfolioValue,
        totalReturn: r.totalReturn,
        currentLtv: r.currentLtv
      })),
      summary: config.includeSummary ? this.generateSummary(results) : undefined,
      riskAssessment: config.includeRiskAssessment ? this.assessRisk(results) : undefined,
      exportedAt: new Date().toISOString()
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: string, executionTime: number): ResultsAnalysisResponse {
    return {
      success: false,
      error,
      analysisTime: executionTime,
      generatedAt: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const resultsAnalysisService = new ResultsAnalysisService()
