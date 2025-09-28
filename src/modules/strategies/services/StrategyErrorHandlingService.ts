/**
 * Strategy Error Handling Service
 * 
 * Provides comprehensive error handling for rolling loan strategy operations
 * including calculation failures, price data issues, and liquidation events.
 */

export interface StrategyError {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'calculation' | 'data' | 'validation' | 'liquidation' | 'platform'
  timestamp: Date
  context?: Record<string, any>
  recoverable: boolean
  userMessage: string
  technicalDetails?: string
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'fallback' | 'skip' | 'abort'
  description: string
  action: () => Promise<any> | any
}

export interface LiquidationEvent {
  timestamp: Date
  btcPrice: number
  loanAmount: number
  collateralValue: number
  ltv: number
  liquidationThreshold: number
  liquidationFee: number
  remainingCollateral: number
  severity: 'warning' | 'imminent' | 'triggered'
}

export class StrategyErrorHandlingService {
  private static instance: StrategyErrorHandlingService
  private errorLog: StrategyError[] = []
  private liquidationEvents: LiquidationEvent[] = []
  private errorHandlers: Map<string, (error: StrategyError) => void> = new Map()

  static getInstance(): StrategyErrorHandlingService {
    if (!StrategyErrorHandlingService.instance) {
      StrategyErrorHandlingService.instance = new StrategyErrorHandlingService()
    }
    return StrategyErrorHandlingService.instance
  }

  /**
   * Handle calculation failures
   */
  handleCalculationError(
    operation: string,
    error: Error,
    context: Record<string, any> = {}
  ): StrategyError {
    const strategyError: StrategyError = {
      code: 'CALCULATION_FAILURE',
      message: `Failed to perform ${operation}: ${error.message}`,
      severity: 'high',
      category: 'calculation',
      timestamp: new Date(),
      context: { operation, originalError: error.message, ...context },
      recoverable: true,
      userMessage: `Unable to calculate ${operation}. Please check your parameters and try again.`,
      technicalDetails: error.stack
    }

    this.logError(strategyError)
    return strategyError
  }

  /**
   * Handle price data unavailability
   */
  handlePriceDataError(
    source: string,
    error: Error,
    context: Record<string, any> = {}
  ): StrategyError {
    const strategyError: StrategyError = {
      code: 'PRICE_DATA_UNAVAILABLE',
      message: `Price data unavailable from ${source}: ${error.message}`,
      severity: 'medium',
      category: 'data',
      timestamp: new Date(),
      context: { source, originalError: error.message, ...context },
      recoverable: true,
      userMessage: `Bitcoin price data is temporarily unavailable. Using last known price or default values.`,
      technicalDetails: error.stack
    }

    this.logError(strategyError)
    return strategyError
  }

  /**
   * Handle liquidation events
   */
  handleLiquidationEvent(
    btcPrice: number,
    loanAmount: number,
    collateralValue: number,
    ltv: number,
    liquidationThreshold: number,
    liquidationFee: number = 0.05
  ): LiquidationEvent {
    const remainingCollateral = Math.max(0, collateralValue - loanAmount - (loanAmount * liquidationFee))
    
    let severity: 'warning' | 'imminent' | 'triggered'
    if (ltv >= liquidationThreshold) {
      severity = 'triggered'
    } else if (ltv >= liquidationThreshold * 0.95) {
      severity = 'imminent'
    } else {
      severity = 'warning'
    }

    const liquidationEvent: LiquidationEvent = {
      timestamp: new Date(),
      btcPrice,
      loanAmount,
      collateralValue,
      ltv,
      liquidationThreshold,
      liquidationFee,
      remainingCollateral,
      severity
    }

    this.liquidationEvents.push(liquidationEvent)

    // Create corresponding error
    const strategyError: StrategyError = {
      code: 'LIQUIDATION_EVENT',
      message: `Liquidation ${severity}: LTV ${ltv.toFixed(1)}% ${severity === 'triggered' ? 'exceeded' : 'approaching'} threshold ${liquidationThreshold}%`,
      severity: severity === 'triggered' ? 'critical' : severity === 'imminent' ? 'high' : 'medium',
      category: 'liquidation',
      timestamp: new Date(),
      context: { liquidationEvent },
      recoverable: severity !== 'triggered',
      userMessage: this.getLiquidationUserMessage(liquidationEvent),
      technicalDetails: `BTC Price: $${btcPrice.toLocaleString()}, Loan: $${loanAmount.toLocaleString()}, Collateral: $${collateralValue.toLocaleString()}`
    }

    this.logError(strategyError)
    return liquidationEvent
  }

  /**
   * Handle target percentage exceedances
   */
  handleTargetExceedance(
    targetPercentage: number,
    actualPercentage: number,
    context: Record<string, any> = {}
  ): StrategyError {
    const exceedanceAmount = actualPercentage - targetPercentage
    
    const strategyError: StrategyError = {
      code: 'TARGET_PERCENTAGE_EXCEEDED',
      message: `Target percentage exceeded: ${actualPercentage.toFixed(1)}% vs target ${targetPercentage.toFixed(1)}%`,
      severity: exceedanceAmount > 20 ? 'high' : exceedanceAmount > 10 ? 'medium' : 'low',
      category: 'validation',
      timestamp: new Date(),
      context: { targetPercentage, actualPercentage, exceedanceAmount, ...context },
      recoverable: true,
      userMessage: `Your loan amount exceeds the target by ${exceedanceAmount.toFixed(1)}%. Consider reducing the loan amount or adjusting your target.`,
      technicalDetails: `Target: ${targetPercentage}%, Actual: ${actualPercentage}%, Exceedance: ${exceedanceAmount.toFixed(2)}%`
    }

    this.logError(strategyError)
    return strategyError
  }

  /**
   * Handle platform-specific errors
   */
  handlePlatformError(
    platform: string,
    operation: string,
    error: Error,
    context: Record<string, any> = {}
  ): StrategyError {
    const strategyError: StrategyError = {
      code: 'PLATFORM_ERROR',
      message: `Platform error on ${platform} during ${operation}: ${error.message}`,
      severity: 'medium',
      category: 'platform',
      timestamp: new Date(),
      context: { platform, operation, originalError: error.message, ...context },
      recoverable: true,
      userMessage: `There was an issue with the ${platform} platform configuration. Please check your settings.`,
      technicalDetails: error.stack
    }

    this.logError(strategyError)
    return strategyError
  }

  /**
   * Get recovery actions for an error
   */
  getRecoveryActions(error: StrategyError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = []

    switch (error.code) {
      case 'CALCULATION_FAILURE':
        actions.push({
          type: 'retry',
          description: 'Retry calculation with current parameters',
          action: () => this.retryCalculation(error.context)
        })
        actions.push({
          type: 'fallback',
          description: 'Use simplified calculation method',
          action: () => this.useFallbackCalculation(error.context)
        })
        break

      case 'PRICE_DATA_UNAVAILABLE':
        actions.push({
          type: 'retry',
          description: 'Retry fetching price data',
          action: () => this.retryPriceDataFetch(error.context)
        })
        actions.push({
          type: 'fallback',
          description: 'Use cached price data',
          action: () => this.useCachedPriceData(error.context)
        })
        break

      case 'LIQUIDATION_EVENT':
        if (error.severity !== 'critical') {
          actions.push({
            type: 'retry',
            description: 'Add collateral to reduce LTV',
            action: () => this.suggestCollateralAddition(error.context)
          })
          actions.push({
            type: 'fallback',
            description: 'Reduce loan amount',
            action: () => this.suggestLoanReduction(error.context)
          })
        }
        break

      case 'TARGET_PERCENTAGE_EXCEEDED':
        actions.push({
          type: 'retry',
          description: 'Adjust loan amount to meet target',
          action: () => this.adjustLoanToTarget(error.context)
        })
        actions.push({
          type: 'fallback',
          description: 'Update target percentage',
          action: () => this.updateTargetPercentage(error.context)
        })
        break

      default:
        actions.push({
          type: 'retry',
          description: 'Retry operation',
          action: () => Promise.resolve()
        })
    }

    return actions
  }

  /**
   * Register error handler
   */
  registerErrorHandler(errorCode: string, handler: (error: StrategyError) => void): void {
    this.errorHandlers.set(errorCode, handler)
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByCategory: Record<string, number>
    errorsBySeverity: Record<string, number>
    recentErrors: StrategyError[]
    liquidationEvents: LiquidationEvent[]
  } {
    const errorsByCategory: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}

    this.errorLog.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
    })

    const recentErrors = this.errorLog
      .filter(error => Date.now() - error.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .slice(-10) // Last 10 errors

    return {
      totalErrors: this.errorLog.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
      liquidationEvents: this.liquidationEvents
    }
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = []
    this.liquidationEvents = []
  }

  /**
   * Private helper methods
   */
  private logError(error: StrategyError): void {
    this.errorLog.push(error)
    
    // Trigger registered handler if exists
    const handler = this.errorHandlers.get(error.code)
    if (handler) {
      handler(error)
    }

    // Log to console based on severity
    const logMethod = error.severity === 'critical' ? 'error' : 
                     error.severity === 'high' ? 'warn' : 'info'
    console[logMethod](`[StrategyError] ${error.code}: ${error.message}`, error.context)
  }

  private getLiquidationUserMessage(event: LiquidationEvent): string {
    switch (event.severity) {
      case 'triggered':
        return `⚠️ LIQUIDATION TRIGGERED: Your loan has been liquidated. Remaining collateral: $${event.remainingCollateral.toLocaleString()}`
      case 'imminent':
        return `🚨 LIQUIDATION IMMINENT: Your LTV is ${event.ltv.toFixed(1)}%, very close to liquidation at ${event.liquidationThreshold}%. Add collateral immediately!`
      case 'warning':
        return `⚠️ LIQUIDATION WARNING: Your LTV is ${event.ltv.toFixed(1)}%, approaching liquidation threshold of ${event.liquidationThreshold}%. Consider adding collateral.`
      default:
        return 'Liquidation event detected'
    }
  }

  private async retryCalculation(context: any): Promise<any> {
    // Implementation would retry the failed calculation
    return Promise.resolve()
  }

  private async useFallbackCalculation(context: any): Promise<any> {
    // Implementation would use a simpler calculation method
    return Promise.resolve()
  }

  private async retryPriceDataFetch(context: any): Promise<any> {
    // Implementation would retry fetching price data
    return Promise.resolve()
  }

  private async useCachedPriceData(context: any): Promise<any> {
    // Implementation would use cached price data
    return Promise.resolve()
  }

  private async suggestCollateralAddition(context: any): Promise<any> {
    // Implementation would suggest adding collateral
    return Promise.resolve()
  }

  private async suggestLoanReduction(context: any): Promise<any> {
    // Implementation would suggest reducing loan amount
    return Promise.resolve()
  }

  private async adjustLoanToTarget(context: any): Promise<any> {
    // Implementation would adjust loan amount to meet target
    return Promise.resolve()
  }

  private async updateTargetPercentage(context: any): Promise<any> {
    // Implementation would update target percentage
    return Promise.resolve()
  }
}

export const strategyErrorHandlingService = StrategyErrorHandlingService.getInstance()
