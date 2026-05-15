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
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"
import { centralizedLoanCalculationService } from "./CentralizedLoanCalculationService"

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
    const isInfiniteTerm = params.loanTermMonths === Infinity
    const monthlyInterestRate = (params.annualInterestRate || 0) / 100 / 12

    for (let month = 0; month < params.simulationMonths; month++) {
      const currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() + month)

      // Get BTC price for this month
      const pricePoint = priceChartData[month] || priceChartData[priceChartData.length - 1]

      // CRITICAL FIX: Use initialBtcPrice for Month 0, projected price for subsequent months
      const btcPrice = month === 0 ? params.initialBtcPrice : pricePoint.price

      // Accrue monthly interest on infinite-term loans. For finite terms the
      // entire term-interest is baked into repaymentAmount at origination
      // (see CentralizedLoanCalculationService); accruing here would double-
      // count. Simple interest on the original principal.
      if (isInfiniteTerm && monthlyInterestRate > 0 && month > 0 && activeLoans.length > 0) {
        for (const loan of activeLoans) {
          loan.repaymentAmount += loan.principal * monthlyInterestRate
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // APPLY MONTHLY SAVINGS/WITHDRAWALS (BEFORE STRATEGY DECISION)
      // ═══════════════════════════════════════════════════════════════════════
      let monthlySavingsApplied: number | undefined = undefined

      if (month > 0 && params.monthlyWithdrawalAmount !== 0) {
        // Calculate years passed for annual compound increase
        const yearsPassed = Math.floor(month / 12)
        const annualIncrease = (params.annualSavingsIncrease || 0) / 100

        // Apply compound increase: initial * (1 + increase)^years
        const currentMonthlyFlow = params.monthlyWithdrawalAmount *
          Math.pow(1 + annualIncrease, yearsPassed)

        // Convert to BTC and apply to holdings
        // Positive = savings (add BTC), Negative = withdrawals (reduce BTC)
        const btcChange = currentMonthlyFlow / btcPrice
        totalBtcAmount += btcChange

        // Track for monthly result
        monthlySavingsApplied = currentMonthlyFlow
      }

      // Initialize monthly tracking
      const monthlyEvents: MonthlyEvent[] = []
      const collateralValue = totalBtcAmount * btcPrice

      // Debt capacity = `loanAmountPercent × pre-purchase collateral`. The
      // loan size scales with BTC price (collateral grows → bigger loan).
      // The post-purchase observable LTV will be lower than the configured
      // percent (excess proceeds buy BTC and grow the denominator); that
      // matches what `loanAmountPercent` means on the Parameters tab.
      let debtCapacity: number
      if (params.loanAmountPercent !== undefined && params.loanAmountPercent > 0) {
        debtCapacity = collateralValue * (params.loanAmountPercent / 100)
      } else {
        // Fall back to fixed dollar amount (legacy behavior)
        debtCapacity = params.maxLoanAmount
      }

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

      // Track BTC purchased from loan proceeds
      let btcPurchased: number | undefined = undefined

      // Apply strategy decision for investment
      if (decision.allowInvestment && projectedDebtAfterNeeds <= debtCapacity) {
        const remainingDebtCapacity = debtCapacity - projectedDebtAfterNeeds
        principalForReinvestment = remainingDebtCapacity * decision.investmentMultiplier

        // Track BTC purchased if reinvesting
        if (principalForReinvestment > 0) {
          btcPurchased = principalForReinvestment / btcPrice

          if (month === 0) {
            console.log('💰 Month 0 BTC Purchase:', {
              debtCapacity,
              projectedDebtAfterNeeds,
              remainingDebtCapacity,
              investmentMultiplier: decision.investmentMultiplier,
              principalForReinvestment,
              btcPrice,
              btcPurchased,
              calculation: `${principalForReinvestment} / ${btcPrice} = ${btcPurchased.toFixed(5)} BTC`
            })
          }
        }
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
        // CRITICAL: Use centralized calculation service for accurate loan details
        const principal = Math.round(totalPrincipal)
        const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
          principal,
          collateralValue,
          params
        )

        const newLoan: Loan = {
          id: loanIdCounter++,
          month,
          principal: loanDetails.principal,
          maturityMonth: month + params.loanTermMonths,
          repaymentAmount: loanDetails.totalRepayment,  // Now includes fees + interest
          lockedBtc: loanDetails.principal / btcPrice
        }
        activeLoans.push(newLoan)
      }

      // CRITICAL FIX: Add purchased BTC to total holdings
      if (btcPurchased !== undefined && btcPurchased > 0) {
        totalBtcAmount += btcPurchased

        if (month === 0) {
          console.log('✅ Updated totalBtcAmount after BTC purchase:', {
            previousAmount: totalBtcAmount - btcPurchased,
            btcPurchased,
            newAmount: totalBtcAmount
          })
        }
      }

      // Handle BTC accumulation from monthly savings
      if (params.btcAccumulation && monthlyWithdrawal < 0) {
        // Negative withdrawal means we're adding BTC from savings
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
        monthlySavingsApplied, // Track monthly savings/withdrawals
        btcPurchased, // Track BTC purchased from loan proceeds
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
