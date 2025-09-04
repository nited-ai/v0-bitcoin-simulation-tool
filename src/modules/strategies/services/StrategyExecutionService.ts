/**
 * Strategy Execution Service
 * 
 * Central service for executing investment strategies with performance monitoring,
 * validation, and comprehensive error handling.
 */

import type {
  IStrategyExecutionService,
  StrategyExecutionRequest,
  StrategyExecutionResponse,
  StrategyEngineParams,
  StrategyValidationResult,
  StrategyPerformanceMetrics,
  StrategyRegistryEntry,
  InvestmentStrategyInterface,
  InvestmentStrategy,
  StrategyMetadata,
  MonthlyResult,
  Loan,
  MonthlyEvent,
  StrategyContext,
  StrategyPriceData
} from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

// Import available strategies
import { defaultStrategy } from '../implementations/DefaultStrategy'

/**
 * Strategy Execution Service Implementation
 */
export class StrategyExecutionService implements IStrategyExecutionService {
  private strategies: Map<InvestmentStrategy, StrategyRegistryEntry> = new Map()
  private performanceMetrics: Map<InvestmentStrategy, StrategyPerformanceMetrics> = new Map()

  constructor() {
    this.registerDefaultStrategies()
  }

  /**
   * Execute a strategy with given parameters
   */
  async executeStrategy(request: StrategyExecutionRequest): Promise<StrategyExecutionResponse> {
    const startTime = performance.now()
    
    try {
      // Validate strategy exists
      const strategyEntry = this.strategies.get(request.strategyId)
      if (!strategyEntry || !strategyEntry.enabled) {
        return this.createErrorResponse(
          request.strategyId,
          `Strategy not found or disabled: ${request.strategyId}`,
          performance.now() - startTime
        )
      }

      // Validate parameters
      const validation = this.validateStrategyParams(request.strategyId, request.params)
      if (!validation.isValid) {
        const errorMessage = `Invalid parameters: ${validation.errors.join(', ')}`

        // Update performance metrics for validation failure
        this.updatePerformanceMetrics(
          request.strategyId,
          performance.now() - startTime,
          false,
          errorMessage
        )

        return this.createErrorResponse(
          request.strategyId,
          errorMessage,
          performance.now() - startTime
        )
      }

      // Execute the strategy simulation
      const results = await this.runStrategySimulation(
        request.params,
        request.priceData,
        request.historicalData,
        strategyEntry.strategy
      )

      // Update performance metrics
      this.updatePerformanceMetrics(request.strategyId, performance.now() - startTime, true)

      return {
        success: true,
        results,
        strategyId: request.strategyId,
        executionTime: performance.now() - startTime,
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Update performance metrics for failed execution
      this.updatePerformanceMetrics(
        request.strategyId, 
        performance.now() - startTime, 
        false,
        errorMessage
      )

      return this.createErrorResponse(
        request.strategyId,
        errorMessage,
        performance.now() - startTime
      )
    }
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): StrategyRegistryEntry[] {
    return Array.from(this.strategies.values())
      .filter(entry => entry.enabled)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Validate strategy parameters
   */
  validateStrategyParams(strategyId: InvestmentStrategy, params: StrategyEngineParams): StrategyValidationResult {
    const errors: string[] = []
    const parameterErrors: string[] = []
    const contextErrors: string[] = []

    // Basic parameter validation
    if (!params.btcAmount || params.btcAmount <= 0) {
      parameterErrors.push('BTC amount must be greater than 0')
    }

    if (!params.initialBtcPrice || params.initialBtcPrice <= 0) {
      parameterErrors.push('Initial BTC price must be greater than 0')
    }

    if (params.annualInterestRate < 0 || params.annualInterestRate > 50) {
      parameterErrors.push('Annual interest rate must be between 0 and 50%')
    }

    if (params.loanOriginationFeePercent < 0 || params.loanOriginationFeePercent > 20) {
      parameterErrors.push('Loan origination fee must be between 0 and 20%')
    }

    if (params.loanTermMonths <= 0) {
      parameterErrors.push('Loan term must be greater than 0 months')
    }

    if (params.simulationMonths <= 0) {
      parameterErrors.push('Simulation months must be greater than 0')
    }

    if (params.maxLoanAmount <= 0) {
      parameterErrors.push('Maximum loan amount must be greater than 0')
    }

    // Risk management validation
    if (params.riskManagement.targetLtv < 0 || params.riskManagement.targetLtv > 100) {
      parameterErrors.push('Target LTV must be between 0 and 100%')
    }

    if (params.riskManagement.liquidationLtv < 0 || params.riskManagement.liquidationLtv > 100) {
      parameterErrors.push('Liquidation LTV must be between 0 and 100%')
    }

    if (params.riskManagement.targetLtv >= params.riskManagement.liquidationLtv) {
      parameterErrors.push('Target LTV must be less than liquidation LTV')
    }

    // Strategy-specific parameter validation
    this.validateStrategySpecificParams(strategyId, params, parameterErrors)

    // Combine all errors
    errors.push(...parameterErrors, ...contextErrors)

    return {
      isValid: errors.length === 0,
      errors,
      strategyId,
      parameterErrors,
      contextErrors
    }
  }

  /**
   * Get strategy metadata
   */
  getStrategyMetadata(strategyId: InvestmentStrategy): StrategyMetadata | null {
    const strategyEntry = this.strategies.get(strategyId)
    if (!strategyEntry) {
      return null
    }

    return strategyEntry.strategy.getMetadata()
  }

  /**
   * Get performance metrics for all strategies
   */
  getPerformanceMetrics(): StrategyPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
  }

  /**
   * Register default strategies
   */
  private registerDefaultStrategies(): void {
    console.log('🔧 Registering default investment strategies...')
    
    // Register Default Strategy (highest priority)
    this.strategies.set('default', {
      id: 'default',
      strategy: defaultStrategy,
      enabled: true,
      priority: 100
    })
    
    console.log(`✅ Registered ${this.strategies.size} default strategies`)
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    strategyId: InvestmentStrategy,
    error: string,
    executionTime: number
  ): StrategyExecutionResponse {
    return {
      success: false,
      error,
      strategyId,
      executionTime,
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    strategyId: InvestmentStrategy,
    executionTime: number,
    success: boolean,
    error?: string
  ): void {
    let metrics = this.performanceMetrics.get(strategyId)
    
    if (!metrics) {
      metrics = {
        strategyId,
        averageExecutionTime: 0,
        successRate: 0,
        totalExecutions: 0,
        lastExecution: new Date(),
        errors: []
      }
      this.performanceMetrics.set(strategyId, metrics)
    }

    // Update metrics
    metrics.totalExecutions++
    metrics.lastExecution = new Date()
    
    // Update average execution time
    metrics.averageExecutionTime = (
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1)) + executionTime
    ) / metrics.totalExecutions

    // Update success rate
    const successfulExecutions = success 
      ? (metrics.successRate * (metrics.totalExecutions - 1)) + 1
      : (metrics.successRate * (metrics.totalExecutions - 1))
    
    metrics.successRate = successfulExecutions / metrics.totalExecutions

    // Track errors
    if (!success && error) {
      metrics.errors.push(error)
      // Keep only last 10 errors
      if (metrics.errors.length > 10) {
        metrics.errors = metrics.errors.slice(-10)
      }
    }
  }

  /**
   * Run strategy simulation
   */
  private async runStrategySimulation(
    params: StrategyEngineParams,
    priceData: StrategyPriceData[],
    historicalData: HistoricalDataPoint[],
    strategy: InvestmentStrategyInterface
  ): Promise<MonthlyResult[]> {

    // Create price lookup map
    const priceLookup = new Map<string, number>()
    priceData.forEach((p) => {
      const date = new Date(p.timestamp).toISOString().split("T")[0]
      priceLookup.set(date, p.price)
    })

    console.log(`📊 Price lookup map created with ${priceLookup.size} entries`)

    const results: MonthlyResult[] = []
    let activeLoans: Loan[] = []
    let totalBtcAmount = params.btcAmount
    let nextLoanId = 1
    const simulationStartDate = new Date()
    const monthlyInflationRate = Math.pow(1 + params.expectedAnnualInflation / 100, 1 / 12) - 1
    let cumulativeInflationFactor = 1

    // Platform constants
    const PLATFORM_LTV_NEW_LOANS = 50

    for (let month = 1; month <= params.simulationMonths; month++) {
      cumulativeInflationFactor *= 1 + monthlyInflationRate
      const currentDate = new Date(simulationStartDate)
      currentDate.setMonth(currentDate.getMonth() + month - 1)
      const dateStringForTable = `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`
      const dateStringForLookup = currentDate.toISOString().split("T")[0]

      // Get BTC price from lookup map
      let btcPrice = priceLookup.get(dateStringForLookup) || params.initialBtcPrice

      const monthlyEvents: MonthlyEvent[] = []
      const collateralValue = totalBtcAmount * btcPrice
      let debtCapacity = collateralValue * (params.riskManagement.targetLtv / 100)

      // Create strategy context
      const strategyContext: StrategyContext = {
        month,
        currentDate,
        btcPrice,
        totalBtcAmount,
        activeLoans: [...activeLoans],
        collateralValue,
        debtCapacity,
        historicalPriceData: historicalData,
        strategyPriceData: priceData,
        params
      }

      // Get strategy decision
      const decision = strategy.makeDecision(strategyContext)

      // Apply strategy's debt capacity override if provided
      if (decision.maxDebtOverride !== undefined) {
        debtCapacity = decision.maxDebtOverride
      }

      // Process loan maturities
      const maturingLoans = activeLoans.filter((l) => l.maturityMonth === month)
      const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
      const debtFromOngoingLoans = activeLoans
        .filter((l) => l.maturityMonth !== month)
        .reduce((sum, l) => sum + l.repaymentAmount, 0)

      // Apply strategy decision for withdrawal
      let withdrawalThisMonth = decision.allowWithdrawal ? decision.withdrawalAmount : 0
      if (!decision.allowWithdrawal && params.monthlyWithdrawalAmount < 0) {
        monthlyEvents.push({ type: "withdrawal_skipped" })
      }

      // Handle monthly savings (positive monthlyWithdrawalAmount)
      let monthlySavings = 0
      if (params.monthlyWithdrawalAmount > 0) {
        monthlySavings = params.monthlyWithdrawalAmount
        const btcFromSavings = monthlySavings / btcPrice
        totalBtcAmount += btcFromSavings
      }

      // Calculate principal needed
      let principalForNeeds = (repaymentDue + withdrawalThisMonth) / (1 - params.loanOriginationFeePercent / 100)
      let principalForReinvestment = 0

      const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

      // Apply strategy decision for investment
      if (decision.allowInvestment && projectedDebtAfterNeeds <= debtCapacity) {
        const remainingDebtCapacity = debtCapacity - projectedDebtAfterNeeds
        principalForReinvestment = remainingDebtCapacity * decision.investmentMultiplier
      } else if (projectedDebtAfterNeeds > debtCapacity) {
        principalForReinvestment = 0
        principalForNeeds = repaymentDue / (1 - params.loanOriginationFeePercent / 100)
        const projectedDebtForRepaymentOnly = debtFromOngoingLoans + principalForNeeds

        if (projectedDebtForRepaymentOnly > debtCapacity) {
          const shortfall = projectedDebtForRepaymentOnly - debtCapacity
          const btcToSell = shortfall / btcPrice

          if (totalBtcAmount > btcToSell) {
            totalBtcAmount -= btcToSell
            monthlyEvents.push({ type: "deleveraged", amount: btcToSell })
            principalForNeeds = debtCapacity - debtFromOngoingLoans
          } else {
            totalBtcAmount = 0
            activeLoans.forEach((l) => monthlyEvents.push({ type: "liquidated", id: l.id }))
            principalForNeeds = 0
          }
        }
      }

      // Remove matured loans
      activeLoans = activeLoans.filter((l) => l.maturityMonth !== month)

      // Create new loans
      const totalNewPrincipal = principalForNeeds + principalForReinvestment
      const interestFactor = 1 + (params.annualInterestRate / 100) * (params.loanTermMonths / 12)

      let principalLeftToCreate = totalNewPrincipal
      while (principalLeftToCreate > 1) {
        const loanPrincipal = Math.min(principalLeftToCreate, params.maxLoanAmount)
        const newRepaymentAmount = loanPrincipal * interestFactor
        const btcToLock = newRepaymentAmount / (btcPrice * (PLATFORM_LTV_NEW_LOANS / 100))

        if (totalBtcAmount < btcToLock) break

        activeLoans.push({
          id: nextLoanId++,
          month: month,
          principal: loanPrincipal,
          maturityMonth: month + params.loanTermMonths,
          repaymentAmount: newRepaymentAmount,
          lockedBtc: btcToLock,
        })
        principalLeftToCreate -= loanPrincipal
      }

      // Calculate metrics for this month
      const totalDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
      const realTotalDebt = totalDebt / cumulativeInflationFactor
      const lockedBtc = activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
      const freeBtc = totalBtcAmount - lockedBtc
      const highestLtv = collateralValue > 0 ? (totalDebt / collateralValue) * 100 : 0

      results.push({
        month,
        dateString: dateStringForTable,
        btcPrice,
        collateralValue,
        realCollateralValue: collateralValue / cumulativeInflationFactor,
        totalDebt,
        realTotalDebt,
        withdrawalAmount: withdrawalThisMonth,
        newLoanPrincipal: totalNewPrincipal,
        repaymentsDue: repaymentDue,
        reinvestment: principalForReinvestment,
        currentBtcAmount: totalBtcAmount,
        freeBtc,
        lockedBtc,
        loanCount: activeLoans.length,
        highestLtv,
        events: monthlyEvents
      })
    }

    return results
  }

  /**
   * Validate strategy-specific parameters
   */
  private validateStrategySpecificParams(
    strategyId: InvestmentStrategy,
    params: StrategyEngineParams,
    errors: string[]
  ): void {
    switch (strategyId) {
      case 'athBased':
        if (params.athBasedParams) {
          if (params.athBasedParams.athThresholdPercent < 0 || params.athBasedParams.athThresholdPercent > 100) {
            errors.push('ATH threshold percent must be between 0 and 100%')
          }
        }
        break

      case 'movingAverage':
        if (params.movingAverageParams) {
          if (params.movingAverageParams.movingAveragePeriod <= 0) {
            errors.push('Moving average period must be greater than 0')
          }
          if (params.movingAverageParams.investmentMultiplier < 0) {
            errors.push('Investment multiplier must be non-negative')
          }
        }
        break

      case 'athCollateral':
        if (params.athCollateralParams) {
          if (params.athCollateralParams.maxDrawdownPercent < 0 || params.athCollateralParams.maxDrawdownPercent > 100) {
            errors.push('Max drawdown percent must be between 0 and 100%')
          }
          if (params.athCollateralParams.collateralMultiplier <= 0) {
            errors.push('Collateral multiplier must be greater than 0')
          }
          if (params.athCollateralParams.athLookbackMonths <= 0) {
            errors.push('ATH lookback months must be greater than 0')
          }
          if (params.athCollateralParams.emergencyCollateralBuffer <= 0) {
            errors.push('Emergency collateral buffer must be greater than 0')
          }
        }
        break
    }
  }
}

// Export singleton instance
export const strategyExecutionService = new StrategyExecutionService()
