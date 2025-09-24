/**
 * Results Processor Service
 * 
 * Service for processing and transforming simulation results data.
 * Handles data aggregation, smoothing, and chart data preparation.
 */

import type {
  IResultsProcessor,
  MonthlyResult,
  ChartDataPoint,
  ResultsAnalysis
} from "../types"

/**
 * Results Processor Implementation
 */
export class ResultsProcessor implements IResultsProcessor {
  
  /**
   * Process monthly results into chart-ready data points
   */
  async processMonthlyResults(monthlyResults: MonthlyResult[]): Promise<ChartDataPoint[]> {
    console.log(`📊 Processing ${monthlyResults.length} monthly results...`)
    
    const chartData: ChartDataPoint[] = monthlyResults.map(result => ({
      month: result.month,
      date: result.date,
      
      // Portfolio metrics
      portfolioValue: result.collateralValue,
      netWorth: result.collateralValue - result.totalDebt,
      totalDebt: result.totalDebt,
      btcAmount: result.totalBtcAmount,
      btcPrice: result.btcPrice,
      
      // LTV and risk metrics
      ltv: result.ltv,
      highestLtv: result.highestLtv,
      maxSafeDebt: result.maxSafeDebt || 0,
      
      // Cash flow metrics
      monthlyWithdrawal: result.monthlyWithdrawal,
      principalForNeeds: result.principalForNeeds,
      principalForReinvestment: result.principalForReinvestment,
      totalPrincipal: result.totalPrincipal,
      repaymentDue: result.repaymentDue,
      
      // Loan metrics
      activeLoanCount: result.activeLoans.length,
      totalLoanPrincipal: result.activeLoans.reduce((sum, loan) => sum + loan.principal, 0),
      
      // Event indicators
      hasLiquidation: result.events.some(e => e.type === 'liquidated'),
      hasDeleveraging: result.events.some(e => e.type === 'deleveraged'),
      hasWithdrawalSkipped: result.events.some(e => e.type === 'withdrawal_skipped'),
      
      // Derived metrics
      debtToIncomeRatio: result.totalDebt / Math.max(Math.abs(result.monthlyWithdrawal), 1),
      portfolioGrowthRate: result.month > 0 ? 
        ((result.collateralValue / monthlyResults[0].collateralValue) - 1) * 100 : 0,
      
      // Risk indicators
      liquidationDistance: result.maxSafeDebt ? 
        Math.max(0, result.maxSafeDebt - result.totalDebt) : 0,
      
      // Performance indicators
      cumulativeReturn: result.month > 0 ? 
        ((result.collateralValue - monthlyResults[0].collateralValue) / monthlyResults[0].collateralValue) * 100 : 0
    }))

    console.log(`✅ Processed ${chartData.length} chart data points`)
    return chartData
  }

  /**
   * Calculate comprehensive metrics from monthly results
   */
  async calculateMetrics(monthlyResults: MonthlyResult[]): Promise<Partial<ResultsAnalysis>> {
    console.log('📊 Calculating comprehensive metrics...')
    
    if (monthlyResults.length === 0) {
      return {}
    }

    const firstResult = monthlyResults[0]
    const lastResult = monthlyResults[monthlyResults.length - 1]
    
    // Portfolio value progression
    const portfolioValues = monthlyResults.map(r => r.collateralValue)
    const initialValue = portfolioValues[0]
    const finalValue = portfolioValues[portfolioValues.length - 1]
    
    // Calculate drawdown metrics
    const drawdownMetrics = this.calculateDrawdownMetrics(portfolioValues)
    
    // Calculate volatility metrics
    const volatilityMetrics = this.calculateVolatilityMetrics(portfolioValues)
    
    // Calculate cash flow metrics
    const cashFlowMetrics = this.calculateCashFlowMetrics(monthlyResults)
    
    // Calculate debt metrics
    const debtMetrics = this.calculateDebtMetrics(monthlyResults)
    
    // Calculate BTC metrics
    const btcMetrics = this.calculateBtcMetrics(monthlyResults)

    const metrics: Partial<ResultsAnalysis> = {
      totalMonths: monthlyResults.length,
      finalPortfolioValue: finalValue,
      finalNetWorth: finalValue - lastResult.totalDebt,
      
      // Performance metrics
      totalReturn: finalValue - initialValue,
      totalReturnPercent: ((finalValue - initialValue) / initialValue) * 100,
      annualizedReturn: Math.pow(finalValue / initialValue, 12 / monthlyResults.length) - 1,
      
      // Risk metrics
      ...drawdownMetrics,
      ...volatilityMetrics,
      
      // Cash flow metrics
      ...cashFlowMetrics,
      
      // Debt metrics
      ...debtMetrics,
      
      // BTC metrics
      ...btcMetrics,
      
      // Monthly averages
      averagePortfolioValue: portfolioValues.reduce((sum, val) => sum + val, 0) / portfolioValues.length,
    }

    console.log('✅ Metrics calculation completed')
    return metrics
  }

  /**
   * Smooth data using moving average
   */
  smoothData(data: ChartDataPoint[], window: number): ChartDataPoint[] {
    if (window <= 1 || data.length < window) {
      return data
    }

    console.log(`📊 Smoothing data with window size ${window}...`)
    
    const smoothedData: ChartDataPoint[] = []
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2))
      const end = Math.min(data.length, start + window)
      const windowData = data.slice(start, end)
      
      const smoothedPoint: ChartDataPoint = {
        month: data[i].month,
        date: data[i].date
      }
      
      // Smooth numeric values
      Object.keys(data[i]).forEach(key => {
        if (key !== 'month' && key !== 'date' && typeof data[i][key] === 'number') {
          const values = windowData.map(d => d[key] as number).filter(v => !isNaN(v))
          smoothedPoint[key] = values.reduce((sum, val) => sum + val, 0) / values.length
        } else if (typeof data[i][key] !== 'number') {
          smoothedPoint[key] = data[i][key] // Keep non-numeric values as-is
        }
      })
      
      smoothedData.push(smoothedPoint)
    }

    console.log(`✅ Data smoothing completed`)
    return smoothedData
  }

  /**
   * Aggregate data by time period
   */
  aggregateData(
    data: ChartDataPoint[], 
    period: 'weekly' | 'monthly' | 'quarterly'
  ): ChartDataPoint[] {
    console.log(`📊 Aggregating data by ${period}...`)
    
    const periodSize = period === 'weekly' ? 1 : period === 'monthly' ? 4 : 12
    const aggregatedData: ChartDataPoint[] = []
    
    for (let i = 0; i < data.length; i += periodSize) {
      const periodData = data.slice(i, Math.min(i + periodSize, data.length))
      
      if (periodData.length === 0) continue
      
      const aggregatedPoint: ChartDataPoint = {
        month: periodData[periodData.length - 1].month, // Use last month of period
        date: periodData[periodData.length - 1].date,
      }
      
      // Aggregate numeric values
      Object.keys(periodData[0]).forEach(key => {
        if (key !== 'month' && key !== 'date' && typeof periodData[0][key] === 'number') {
          const values = periodData.map(d => d[key] as number).filter(v => !isNaN(v))
          
          // Use appropriate aggregation method based on metric type
          if (key.includes('Count') || key.includes('liquidation') || key.includes('event')) {
            // Sum for counts and events
            aggregatedPoint[key] = values.reduce((sum, val) => sum + val, 0)
          } else if (key.includes('Rate') || key.includes('Percent') || key.includes('ltv')) {
            // Average for rates and percentages
            aggregatedPoint[key] = values.reduce((sum, val) => sum + val, 0) / values.length
          } else {
            // Use last value for most metrics (end-of-period)
            aggregatedPoint[key] = values[values.length - 1]
          }
        } else if (typeof periodData[0][key] !== 'number') {
          // Keep non-numeric values from last data point
          aggregatedPoint[key] = periodData[periodData.length - 1][key]
        }
      })
      
      aggregatedData.push(aggregatedPoint)
    }

    console.log(`✅ Data aggregation completed: ${aggregatedData.length} periods`)
    return aggregatedData
  }

  // Private helper methods
  private calculateDrawdownMetrics(portfolioValues: number[]) {
    let maxDrawdown = 0
    let maxDrawdownPercent = 0
    let peak = portfolioValues[0]
    
    for (const value of portfolioValues) {
      if (value > peak) {
        peak = value
      } else {
        const drawdown = peak - value
        const drawdownPercent = (drawdown / peak) * 100
        
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
          maxDrawdownPercent = drawdownPercent
        }
      }
    }
    
    return { maxDrawdown, maxDrawdownPercent }
  }

  private calculateVolatilityMetrics(portfolioValues: number[]) {
    if (portfolioValues.length < 2) {
      return { volatility: 0, sharpeRatio: 0 }
    }
    
    // Calculate returns
    const returns = []
    for (let i = 1; i < portfolioValues.length; i++) {
      returns.push((portfolioValues[i] - portfolioValues[i - 1]) / portfolioValues[i - 1])
    }
    
    // Calculate volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)
    
    // Simple Sharpe ratio approximation (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02 / 12 // Monthly risk-free rate
    const sharpeRatio = volatility > 0 ? (meanReturn - riskFreeRate) / volatility : 0
    
    return { volatility, sharpeRatio }
  }

  private calculateCashFlowMetrics(monthlyResults: MonthlyResult[]) {
    const totalWithdrawals = monthlyResults.reduce((sum, r) => sum + Math.max(0, r.monthlyWithdrawal), 0)
    const totalReinvestments = monthlyResults.reduce((sum, r) => sum + r.principalForReinvestment, 0)
    const totalLoanPrincipal = monthlyResults.reduce((sum, r) => sum + r.totalPrincipal, 0)
    const totalRepayments = monthlyResults.reduce((sum, r) => sum + r.repaymentDue, 0)
    
    return {
      totalWithdrawals,
      totalReinvestments,
      totalLoanPrincipal,
      totalRepayments,
      averageMonthlyWithdrawal: totalWithdrawals / monthlyResults.length,
      averageMonthlyReinvestment: totalReinvestments / monthlyResults.length,
    }
  }

  private calculateDebtMetrics(monthlyResults: MonthlyResult[]) {
    const debtValues = monthlyResults.map(r => r.totalDebt)
    const ltvValues = monthlyResults.map(r => r.ltv)
    
    const averageDebt = debtValues.reduce((sum, debt) => sum + debt, 0) / debtValues.length
    const maxDebt = Math.max(...debtValues)
    const totalDebtPeak = maxDebt
    
    const averageLTV = ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length
    const maxLTV = Math.max(...ltvValues)
    
    // Count liquidations
    const liquidationCount = monthlyResults.reduce((count, result) => {
      return count + result.events.filter(event => event.type === 'liquidated').length
    }, 0)
    
    const firstLiquidationMonth = monthlyResults.findIndex(result => 
      result.events.some(event => event.type === 'liquidated')
    )
    
    return {
      averageDebt,
      maxDebt,
      totalDebtPeak,
      averageLTV,
      maxLTV,
      liquidationCount,
      firstLiquidationMonth: firstLiquidationMonth >= 0 ? firstLiquidationMonth : null,
    }
  }

  private calculateBtcMetrics(monthlyResults: MonthlyResult[]) {
    const initialBtcAmount = monthlyResults[0].totalBtcAmount
    const finalBtcAmount = monthlyResults[monthlyResults.length - 1].totalBtcAmount
    const btcGrowth = finalBtcAmount - initialBtcAmount
    const btcGrowthPercent = (btcGrowth / initialBtcAmount) * 100
    
    return {
      initialBtcAmount,
      finalBtcAmount,
      btcGrowth,
      btcGrowthPercent,
    }
  }
}

/**
 * Global results processor instance
 */
export const resultsProcessor = new ResultsProcessor()
