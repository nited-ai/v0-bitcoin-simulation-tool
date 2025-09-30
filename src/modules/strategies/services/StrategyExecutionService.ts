/**
 * Strategy Execution Service
 * 
 * Core service for executing investment strategies and running simulations.
 * Handles the main simulation loop and strategy decision integration.
 */

import type {
  InvestmentStrategyInterface,
  StrategyExecutionParams,
  StrategyExecutionResult,
  StrategyContext,
  MonthlyResult,
  Loan,
  MonthlyEvent
} from "../types"
import type { PriceProjectionResult } from "../../../../app/simulation/price-models/types"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

/**
 * Strategy Execution Service Implementation
 */
export class StrategyExecutionService {
  private static readonly PLATFORM_LTV_NEW_LOANS = 50

  /**
   * Execute a strategy with given parameters and price projection
   */
  async executeStrategy(
    strategy: InvestmentStrategyInterface,
    params: StrategyExecutionParams,
    priceProjection: PriceProjectionResult
  ): Promise<StrategyExecutionResult> {
    console.log(`🚀 Executing strategy: ${strategy.getName()}`)
    
    const startTime = Date.now()
    const monthlyResults: MonthlyResult[] = []
    
    // Initialize simulation state
    let totalBtcAmount = params.btcAmount
    let activeLoans: Loan[] = []
    let loanIdCounter = 1

    // Convert price projection to chart data format
    const priceChartData = priceProjection.projectionPoints.map((point: any) => ({
      timestamp: point.timestamp,
      price: point.price,
      date: new Date(point.timestamp).toISOString().split('T')[0]
    }))

    // Main simulation loop
    for (let month = 0; month < params.simulationMonths; month++) {
      const currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() + month)
      
      // Get BTC price for this month
      const pricePoint = priceChartData[month] || priceChartData[priceChartData.length - 1]
      const btcPrice = pricePoint.price

      // Initialize monthly tracking
      const monthlyEvents: MonthlyEvent[] = []
      const collateralValue = totalBtcAmount * btcPrice
      let debtCapacity = collateralValue * (params.riskManagement.targetLtv / 100)

      // Create strategy context
      const strategyContext: StrategyContext = {
        month,
        currentDate,
        btcPrice,
        totalBtcAmount,
        activeLoans: [...activeLoans], // Copy to prevent mutation
        collateralValue,
        debtCapacity,
        historicalPriceData: [], // Would be populated with actual historical data
        priceProjectionData: priceProjection,
        params
      }

      // Get strategy decision
      const decision = strategy.makeDecision(strategyContext)

      // Apply strategy's debt capacity override if provided
      if (decision.maxDebtOverride !== undefined) {
        debtCapacity = decision.maxDebtOverride
      }

      // Handle loan maturities and repayments
      const maturingLoans = activeLoans.filter(l => l.maturityMonth === month)
      const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
      
      // Remove matured loans
      activeLoans = activeLoans.filter(l => l.maturityMonth !== month)

      // Calculate debt from ongoing loans
      const debtFromOngoingLoans = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)

      // Calculate principal needed for basic needs
      let principalForNeeds = 0
      let principalForReinvestment = 0

      // Handle monthly withdrawal (if strategy allows)
      let monthlyWithdrawal = 0
      if (decision.allowWithdrawal) {
        monthlyWithdrawal = decision.withdrawalAmount || params.monthlyWithdrawalAmount
        
        if (monthlyWithdrawal > 0) {
          principalForNeeds += monthlyWithdrawal / (1 - params.loanOriginationFeePercent / 100)
        }
      }

      // Add repayment needs
      if (repaymentDue > 0) {
        principalForNeeds += repaymentDue / (1 - params.loanOriginationFeePercent / 100)
      }

      // Calculate projected debt after covering needs
      const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

      // Apply strategy decision for investment
      if (decision.allowInvestment && projectedDebtAfterNeeds <= debtCapacity) {
        const remainingDebtCapacity = debtCapacity - projectedDebtAfterNeeds
        principalForReinvestment = remainingDebtCapacity * decision.investmentMultiplier
      } else if (projectedDebtAfterNeeds > debtCapacity) {
        // Handle debt capacity overflow
        principalForReinvestment = 0
        
        // Check if we can at least cover repayments
        principalForNeeds = repaymentDue / (1 - params.loanOriginationFeePercent / 100)
        const projectedDebtForRepaymentOnly = debtFromOngoingLoans + principalForNeeds
        
        if (projectedDebtForRepaymentOnly > debtCapacity) {
          // Emergency: Skip withdrawal to prioritize loan repayments
          monthlyWithdrawal = 0
          principalForNeeds = repaymentDue / (1 - params.loanOriginationFeePercent / 100)
          monthlyEvents.push({ type: "withdrawal_skipped" })
        }
      }

      // Create new loans if needed
      const totalPrincipal = principalForNeeds + principalForReinvestment
      if (totalPrincipal > 0) {
        const newLoan: Loan = {
          id: loanIdCounter++,
          month,
          principal: totalPrincipal,
          maturityMonth: month + params.loanTermMonths,
          repaymentAmount: this.calculateRepaymentAmount(totalPrincipal, params),
          lockedBtc: totalPrincipal / btcPrice
        }
        activeLoans.push(newLoan)
      }

      // Handle BTC accumulation
      if (params.btcAccumulation && monthlyWithdrawal < 0) {
        // Negative withdrawal means we're adding BTC
        totalBtcAmount += Math.abs(monthlyWithdrawal) / btcPrice
      }

      // Calculate current metrics
      const totalDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
      const currentLtv = collateralValue > 0 ? (totalDebt / collateralValue) * 100 : 0
      const highestLtv = Math.max(currentLtv, 0)

      // Store monthly result
      monthlyResults.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        btcPrice,
        totalBtcAmount,
        totalDebt,
        collateralValue,
        ltv: currentLtv,
        monthlyWithdrawal,
        principalForNeeds,
        principalForReinvestment,
        totalPrincipal,
        activeLoans: [...activeLoans],
        repaymentDue,
        highestLtv: Math.round(highestLtv),
        maxSafeDebt: decision.maxDebtOverride !== undefined ? Math.round(decision.maxDebtOverride) : undefined,
        events: monthlyEvents
      })
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ Strategy execution completed in ${executionTime}ms`)

    // Create execution result
    const result: StrategyExecutionResult = {
      monthlyResults,
      metadata: {
        strategyUsed: strategy.getName(),
        totalMonths: params.simulationMonths,
        finalBtcAmount: totalBtcAmount,
        finalDebt: monthlyResults[monthlyResults.length - 1]?.totalDebt || 0,
        finalLtv: monthlyResults[monthlyResults.length - 1]?.ltv || 0,
        totalWithdrawals: monthlyResults.reduce((sum, r) => sum + r.monthlyWithdrawal, 0),
        executedAt: new Date().toISOString()
      }
    }

    return result
  }

  /**
   * Calculate loan repayment amount including interest and fees
   */
  private calculateRepaymentAmount(principal: number, params: StrategyExecutionParams): number {
    const monthlyInterestRate = params.annualInterestRate / 100 / 12
    const termMonths = params.loanTermMonths
    
    if (termMonths === Infinity || termMonths <= 0) {
      // Interest-only loan
      return principal * (1 + monthlyInterestRate)
    }
    
    // Standard amortizing loan
    const monthlyPayment = principal * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths)) /
      (Math.pow(1 + monthlyInterestRate, termMonths) - 1)
    
    return monthlyPayment * termMonths
  }

  /**
   * Validate strategy execution parameters
   */
  validateParams(params: StrategyExecutionParams): boolean {
    if (params.btcAmount <= 0) return false
    if (params.initialBtcPrice <= 0) return false
    if (params.simulationMonths <= 0) return false
    if (params.annualInterestRate < 0) return false
    if (params.riskManagement.targetLtv <= 0 || params.riskManagement.targetLtv > 100) return false
    
    return true
  }

  /**
   * Get execution service statistics
   */
  getStats(): { executionsCount: number; averageExecutionTime: number } {
    // This would be implemented with actual tracking in a real system
    return {
      executionsCount: 0,
      averageExecutionTime: 0
    }
  }
}
