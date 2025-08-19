import { useMemo } from "react"
import type { MonthlyResult, SimulationParams } from "../types/simulation"

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
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  riskScore: number // 0-100
  
  // Performance rating
  performanceRating: 'poor' | 'fair' | 'good' | 'excellent'
  performanceScore: number // 0-100
}

/**
 * Hook to analyze simulation results and calculate comprehensive metrics
 * 
 * This hook processes MonthlyResult data to provide detailed analytics,
 * performance metrics, risk assessment, and other derived insights.
 */
export function useResultsAnalysis(
  results: MonthlyResult[],
  params: SimulationParams
): ResultsAnalysis | null {
  return useMemo(() => {
    if (results.length === 0) return null
    
    const firstResult = results[0]
    const lastResult = results[results.length - 1]
    
    // Basic metrics
    const totalMonths = results.length
    const finalPortfolioValue = lastResult.collateralValue
    const finalNetWorth = lastResult.collateralValue - lastResult.totalDebt
    const totalDebtPeak = Math.max(...results.map(r => r.totalDebt))
    
    // Performance metrics
    const initialValue = params.initialBtcAmount * params.initialBtcPrice
    const totalReturn = finalNetWorth - initialValue
    const totalReturnPercent = (totalReturn / initialValue) * 100
    const yearsElapsed = totalMonths / 12
    const annualizedReturn = yearsElapsed > 0 
      ? (Math.pow(finalNetWorth / initialValue, 1 / yearsElapsed) - 1) * 100 
      : 0
    
    // Risk metrics - find maximum drawdown
    let maxDrawdown = 0
    let maxDrawdownPercent = 0
    let peak = initialValue
    
    for (const result of results) {
      const currentValue = result.collateralValue - result.totalDebt
      if (currentValue > peak) {
        peak = currentValue
      }
      const drawdown = peak - currentValue
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownPercent = drawdownPercent
      }
    }
    
    // Liquidation analysis
    const liquidationEvents = results.filter(r => 
      r.events.some(e => e.type === "liquidated")
    )
    const liquidationCount = liquidationEvents.length
    const firstLiquidationMonth = liquidationEvents.length > 0 
      ? liquidationEvents[0].month 
      : null
    
    // Debt metrics
    const averageDebt = results.reduce((sum, r) => sum + r.totalDebt, 0) / totalMonths
    const maxDebt = Math.max(...results.map(r => r.totalDebt))
    const averageLTV = results.reduce((sum, r) => sum + r.highestLtv, 0) / totalMonths
    const maxLTV = Math.max(...results.map(r => r.highestLtv))
    
    // Cash flow metrics
    const totalWithdrawals = results.reduce((sum, r) => 
      sum + Math.max(0, -r.withdrawalAmount), 0
    )
    const totalReinvestments = results.reduce((sum, r) => sum + r.reinvestment, 0)
    const totalLoanPrincipal = results.reduce((sum, r) => sum + r.newLoanPrincipal, 0)
    const totalRepayments = results.reduce((sum, r) => sum + r.repaymentsDue, 0)
    
    // BTC metrics
    const initialBtcAmount = params.initialBtcAmount
    const finalBtcAmount = lastResult.currentBtcAmount
    const btcGrowth = finalBtcAmount - initialBtcAmount
    const btcGrowthPercent = (btcGrowth / initialBtcAmount) * 100
    
    // Monthly averages
    const averageMonthlyWithdrawal = totalWithdrawals / totalMonths
    const averageMonthlyReinvestment = totalReinvestments / totalMonths
    const averagePortfolioValue = results.reduce((sum, r) => sum + r.collateralValue, 0) / totalMonths
    
    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low'
    let riskScore = 0
    
    // Calculate risk score based on multiple factors
    const liquidationRisk = liquidationCount > 0 ? 40 : 0
    const ltvRisk = maxLTV > 80 ? 30 : maxLTV > 60 ? 20 : maxLTV > 40 ? 10 : 0
    const drawdownRisk = maxDrawdownPercent > 50 ? 30 : maxDrawdownPercent > 30 ? 20 : maxDrawdownPercent > 15 ? 10 : 0
    
    riskScore = liquidationRisk + ltvRisk + drawdownRisk
    
    if (riskScore >= 70) riskLevel = 'extreme'
    else if (riskScore >= 50) riskLevel = 'high'
    else if (riskScore >= 25) riskLevel = 'medium'
    else riskLevel = 'low'
    
    // Performance rating
    let performanceRating: 'poor' | 'fair' | 'good' | 'excellent' = 'poor'
    let performanceScore = 0
    
    // Calculate performance score
    const returnScore = Math.min(50, Math.max(0, annualizedReturn * 2)) // Max 50 points for 25%+ annual return
    const stabilityScore = Math.max(0, 30 - maxDrawdownPercent) // Max 30 points for low drawdown
    const efficiencyScore = liquidationCount === 0 ? 20 : Math.max(0, 20 - liquidationCount * 5) // Max 20 points for no liquidations
    
    performanceScore = returnScore + stabilityScore + efficiencyScore
    
    if (performanceScore >= 80) performanceRating = 'excellent'
    else if (performanceScore >= 60) performanceRating = 'good'
    else if (performanceScore >= 40) performanceRating = 'fair'
    else performanceRating = 'poor'
    
    return {
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
      firstLiquidationMonth,
      
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
  }, [results, params])
}
