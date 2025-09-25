import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StrategyErrorHandlingService, StrategyError, LiquidationEvent } from '../StrategyErrorHandlingService'

describe('StrategyErrorHandlingService', () => {
  let errorHandlingService: StrategyErrorHandlingService

  beforeEach(() => {
    errorHandlingService = StrategyErrorHandlingService.getInstance()
    errorHandlingService.clearErrorLog()
  })

  describe('Calculation Error Handling', () => {
    it('should handle calculation failures', () => {
      const error = new Error('Division by zero')
      const strategyError = errorHandlingService.handleCalculationError('loan rollover', error, { loanAmount: 10000 })

      expect(strategyError.code).toBe('CALCULATION_FAILURE')
      expect(strategyError.severity).toBe('high')
      expect(strategyError.category).toBe('calculation')
      expect(strategyError.recoverable).toBe(true)
      expect(strategyError.userMessage).toContain('Unable to calculate loan rollover')
      expect(strategyError.context?.operation).toBe('loan rollover')
    })

    it('should provide recovery actions for calculation failures', () => {
      const error = new Error('Invalid parameters')
      const strategyError = errorHandlingService.handleCalculationError('interest calculation', error)
      const actions = errorHandlingService.getRecoveryActions(strategyError)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe('retry')
      expect(actions[1].type).toBe('fallback')
      expect(actions[0].description).toContain('Retry calculation')
      expect(actions[1].description).toContain('simplified calculation')
    })
  })

  describe('Price Data Error Handling', () => {
    it('should handle price data unavailability', () => {
      const error = new Error('Network timeout')
      const strategyError = errorHandlingService.handlePriceDataError('CoinGecko API', error, { timestamp: Date.now() })

      expect(strategyError.code).toBe('PRICE_DATA_UNAVAILABLE')
      expect(strategyError.severity).toBe('medium')
      expect(strategyError.category).toBe('data')
      expect(strategyError.recoverable).toBe(true)
      expect(strategyError.userMessage).toContain('temporarily unavailable')
      expect(strategyError.context?.source).toBe('CoinGecko API')
    })

    it('should provide recovery actions for price data errors', () => {
      const error = new Error('API rate limit')
      const strategyError = errorHandlingService.handlePriceDataError('API', error)
      const actions = errorHandlingService.getRecoveryActions(strategyError)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe('retry')
      expect(actions[1].type).toBe('fallback')
      expect(actions[0].description).toContain('Retry fetching')
      expect(actions[1].description).toContain('cached price data')
    })
  })

  describe('Liquidation Event Handling', () => {
    it('should handle liquidation warning events', () => {
      const liquidationEvent = errorHandlingService.handleLiquidationEvent(
        50000, // BTC price
        40000, // loan amount
        60000, // collateral value
        66.7,  // LTV
        80     // liquidation threshold
      )

      expect(liquidationEvent.severity).toBe('warning')
      expect(liquidationEvent.ltv).toBe(66.7)
      expect(liquidationEvent.liquidationThreshold).toBe(80)
      expect(liquidationEvent.remainingCollateral).toBeGreaterThan(0)
    })

    it('should handle imminent liquidation events', () => {
      const liquidationEvent = errorHandlingService.handleLiquidationEvent(
        45000, // BTC price
        40000, // loan amount
        42000, // collateral value
        76,    // LTV (95% of 80% threshold = 76%)
        80     // liquidation threshold
      )

      expect(liquidationEvent.severity).toBe('imminent')
      expect(liquidationEvent.ltv).toBe(76)
    })

    it('should handle triggered liquidation events', () => {
      const liquidationEvent = errorHandlingService.handleLiquidationEvent(
        40000, // BTC price
        40000, // loan amount
        39000, // collateral value
        102.6, // LTV (exceeds threshold)
        80     // liquidation threshold
      )

      expect(liquidationEvent.severity).toBe('triggered')
      expect(liquidationEvent.ltv).toBe(102.6)
      expect(liquidationEvent.remainingCollateral).toBe(0) // No remaining collateral after liquidation
    })

    it('should calculate liquidation fees correctly', () => {
      const liquidationEvent = errorHandlingService.handleLiquidationEvent(
        50000, // BTC price
        10000, // loan amount
        15000, // collateral value
        66.7,  // LTV
        80,    // liquidation threshold
        0.1    // 10% liquidation fee
      )

      const expectedRemainingCollateral = 15000 - 10000 - (10000 * 0.1) // 15000 - 10000 - 1000 = 4000
      expect(liquidationEvent.remainingCollateral).toBe(expectedRemainingCollateral)
      expect(liquidationEvent.liquidationFee).toBe(0.1)
    })
  })

  describe('Target Percentage Exceedance Handling', () => {
    it('should handle minor target exceedances', () => {
      const strategyError = errorHandlingService.handleTargetExceedance(50, 55, { loanAmount: 25000 })

      expect(strategyError.code).toBe('TARGET_PERCENTAGE_EXCEEDED')
      expect(strategyError.severity).toBe('low')
      expect(strategyError.context?.exceedanceAmount).toBe(5)
      expect(strategyError.userMessage).toContain('exceeds the target by 5.0%')
    })

    it('should handle moderate target exceedances', () => {
      const strategyError = errorHandlingService.handleTargetExceedance(50, 65, { loanAmount: 30000 })

      expect(strategyError.severity).toBe('medium')
      expect(strategyError.context?.exceedanceAmount).toBe(15)
    })

    it('should handle major target exceedances', () => {
      const strategyError = errorHandlingService.handleTargetExceedance(50, 75, { loanAmount: 40000 })

      expect(strategyError.severity).toBe('high')
      expect(strategyError.context?.exceedanceAmount).toBe(25)
    })
  })

  describe('Platform Error Handling', () => {
    it('should handle platform-specific errors', () => {
      const error = new Error('Invalid API key')
      const strategyError = errorHandlingService.handlePlatformError('firefish', 'loan creation', error, { apiKey: 'xxx' })

      expect(strategyError.code).toBe('PLATFORM_ERROR')
      expect(strategyError.severity).toBe('medium')
      expect(strategyError.category).toBe('platform')
      expect(strategyError.context?.platform).toBe('firefish')
      expect(strategyError.context?.operation).toBe('loan creation')
      expect(strategyError.userMessage).toContain('firefish platform configuration')
    })
  })

  describe('Error Handler Registration', () => {
    it('should register and trigger custom error handlers', () => {
      const mockHandler = vi.fn()
      errorHandlingService.registerErrorHandler('CALCULATION_FAILURE', mockHandler)

      const error = new Error('Test error')
      const strategyError = errorHandlingService.handleCalculationError('test operation', error)

      expect(mockHandler).toHaveBeenCalledWith(strategyError)
    })
  })

  describe('Error Statistics', () => {
    it('should provide comprehensive error statistics', () => {
      // Generate some test errors
      const calcError = new Error('Calc error')
      errorHandlingService.handleCalculationError('test calc', calcError)
      
      const priceError = new Error('Price error')
      errorHandlingService.handlePriceDataError('test API', priceError)
      
      errorHandlingService.handleTargetExceedance(50, 60)
      errorHandlingService.handleLiquidationEvent(50000, 40000, 45000, 88.9, 90)

      const stats = errorHandlingService.getErrorStatistics()

      expect(stats.totalErrors).toBe(4)
      expect(stats.errorsByCategory.calculation).toBe(1)
      expect(stats.errorsByCategory.data).toBe(1)
      expect(stats.errorsByCategory.validation).toBe(1)
      expect(stats.errorsByCategory.liquidation).toBe(1)
      expect(stats.liquidationEvents).toHaveLength(1)
      expect(stats.recentErrors).toHaveLength(4)
    })
  })

  describe('Error Log Management', () => {
    it('should clear error log and liquidation events', () => {
      // Add some errors
      const error = new Error('Test')
      errorHandlingService.handleCalculationError('test', error)
      errorHandlingService.handleLiquidationEvent(50000, 40000, 45000, 88.9, 90)

      let stats = errorHandlingService.getErrorStatistics()
      expect(stats.totalErrors).toBeGreaterThan(0)
      expect(stats.liquidationEvents.length).toBeGreaterThan(0)

      // Clear log
      errorHandlingService.clearErrorLog()

      stats = errorHandlingService.getErrorStatistics()
      expect(stats.totalErrors).toBe(0)
      expect(stats.liquidationEvents).toHaveLength(0)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StrategyErrorHandlingService.getInstance()
      const instance2 = StrategyErrorHandlingService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})
