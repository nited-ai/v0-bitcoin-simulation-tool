/**
 * Results Analysis Hook
 * 
 * React hook for analyzing simulation results and calculating comprehensive metrics.
 * Provides detailed analytics, performance metrics, and risk assessment.
 */

import { useMemo, useCallback } from "react"
import { resultsAnalysisService } from "../services/ResultsAnalysisService"
import type { 
  ResultsAnalysis, 
  EnhancedResultsAnalysis,
  ResultsProcessingOptions,
  MonthlyResult
} from "../types"
import type { StrategyExecutionResult } from "../../strategies/types"
import type { PriceProjectionResult } from "../../price-projection/types"

/**
 * Hook parameters
 */
interface UseResultsAnalysisParams {
  results?: MonthlyResult[]
  strategyResults?: StrategyExecutionResult
  priceProjection?: PriceProjectionResult
  options?: ResultsProcessingOptions
}

/**
 * Hook return type
 */
interface UseResultsAnalysisReturn {
  analysis: ResultsAnalysis | null
  enhancedAnalysis: EnhancedResultsAnalysis | null
  isAnalyzing: boolean
  error: string | null
  analyzeResults: () => Promise<ResultsAnalysis | undefined>
  analyzeWithProjection: () => Promise<EnhancedResultsAnalysis | undefined>
}

/**
 * Hook for analyzing simulation results
 */
export function useResultsAnalysis({
  results,
  strategyResults,
  priceProjection,
  options = { includeProjectionContext: false, calculateAdvancedMetrics: true, performScenarioAnalysis: false, generateInsights: false }
}: UseResultsAnalysisParams = {}): UseResultsAnalysisReturn {
  
  // Basic analysis using monthly results (legacy compatibility)
  const basicAnalysis = useMemo(() => {
    if (!results || results.length === 0) return null
    
    const firstResult = results[0]
    const lastResult = results[results.length - 1]
    
    // Basic metrics
    const totalMonths = results.length
    const finalPortfolioValue = lastResult.collateralValue
    const finalNetWorth = lastResult.collateralValue - lastResult.totalDebt
    const totalDebtPeak = Math.max(...results.map(r => r.totalDebt))
    
    // Performance metrics
    const initialValue = firstResult.collateralValue
    const totalReturn = finalPortfolioValue - initialValue
    const totalReturnPercent = (totalReturn / initialValue) * 100
    const annualizedReturn = Math.pow(finalPortfolioValue / initialValue, 12 / totalMonths) - 1
    
    // Risk metrics
    const portfolioValues = results.map(r => r.collateralValue)
    const peak = Math.max(...portfolioValues)
    const trough = Math.min(...portfolioValues.slice(portfolioValues.indexOf(peak)))
    const maxDrawdown = peak - trough
    const maxDrawdownPercent = (maxDrawdown / peak) * 100
    
    // Count liquidations
    const liquidationCount = results.reduce((count, result) => {
      return count + result.events.filter(event => event.type === 'liquidated').length
    }, 0)
    
    const firstLiquidationMonth = results.findIndex(result => 
      result.events.some(event => event.type === 'liquidated')
    )
    
    // Debt metrics
    const debtValues = results.map(r => r.totalDebt)
    const averageDebt = debtValues.reduce((sum, debt) => sum + debt, 0) / debtValues.length
    const maxDebt = Math.max(...debtValues)
    
    const ltvValues = results.map(r => r.ltv)
    const averageLTV = ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length
    const maxLTV = Math.max(...ltvValues)
    
    // Cash flow metrics
    const totalWithdrawals = results.reduce((sum, r) => sum + Math.max(0, r.monthlyWithdrawal), 0)
    const totalReinvestments = results.reduce((sum, r) => sum + r.principalForReinvestment, 0)
    const totalLoanPrincipal = results.reduce((sum, r) => sum + r.totalPrincipal, 0)
    const totalRepayments = results.reduce((sum, r) => sum + r.repaymentDue, 0)
    
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
    const riskScore = calculateRiskScore(maxDrawdownPercent, maxLTV, liquidationCount)
    const riskLevel = getRiskLevel(riskScore)
    
    // Performance rating
    const performanceScore = calculatePerformanceScore(annualizedReturn, maxDrawdownPercent, totalReturnPercent)
    const performanceRating = getPerformanceRating(performanceScore)

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

    return analysis
  }, [results])

  // Advanced analysis using strategy results
  const analyzeResults = useCallback(async () => {
    if (!strategyResults) return
    
    try {
      const analysis = await resultsAnalysisService.analyzeResults(strategyResults, options)
      return analysis
    } catch (error) {
      console.error('Results analysis failed:', error)
      throw error
    }
  }, [strategyResults, options])

  // Enhanced analysis with price projection
  const analyzeWithProjection = useCallback(async () => {
    if (!strategyResults || !priceProjection) return
    
    try {
      const enhancedAnalysis = await resultsAnalysisService.analyzeWithPriceProjection(
        strategyResults, 
        priceProjection, 
        { ...options, includeProjectionContext: true }
      )
      return enhancedAnalysis
    } catch (error) {
      console.error('Enhanced results analysis failed:', error)
      throw error
    }
  }, [strategyResults, priceProjection, options])

  return {
    analysis: basicAnalysis,
    enhancedAnalysis: null, // Would be populated by async analysis
    isAnalyzing: false, // Would be managed by async state
    error: null, // Would be managed by async state
    analyzeResults,
    analyzeWithProjection
  }
}

// Helper functions (moved from original implementation)
function calculateRiskScore(maxDrawdown: number, maxLTV: number, liquidations: number): number {
  let score = 100
  score -= Math.min(maxDrawdown, 50) // Max 50 points for drawdown
  score -= Math.min(maxLTV - 50, 30) // Max 30 points for LTV above 50%
  score -= liquidations * 20 // 20 points per liquidation
  return Math.max(0, score)
}

function getRiskLevel(score: number): 'Low' | 'Moderate' | 'High' | 'Extreme' {
  if (score >= 80) return 'Low'
  if (score >= 60) return 'Moderate'
  if (score >= 40) return 'High'
  return 'Extreme'
}

function calculatePerformanceScore(annualizedReturn: number, maxDrawdown: number, totalReturn: number): number {
  const returnScore = Math.min(annualizedReturn * 100, 50) // Max 50 points for return
  const riskAdjustment = Math.max(0, 50 - maxDrawdown) // Penalty for drawdown
  return Math.max(0, Math.min(100, returnScore + riskAdjustment))
}

function getPerformanceRating(score: number): 'Poor' | 'Below Average' | 'Average' | 'Good' | 'Excellent' {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Average'
  if (score >= 35) return 'Below Average'
  return 'Poor'
}
