import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalculationsService } from '../services/calculationsService'
import type { SimulationParams, LoanMetrics, CollateralMetrics, LiquidationMetrics } from '../types'

describe('CalculationsService', () => {
  let service: CalculationsService
  let mockParams: SimulationParams

  beforeEach(() => {
    service = new CalculationsService()
    mockParams = {
      initialBtcAmount: 1,
      initialBtcPrice: 70000,
      loanAmountPercent: 10,
      platform: 'firefish',
      maxLoanAmount: 50000,
      annualInterestRate: 6.5,
      loanTermMonths: 6,
      liquidationFeePercent: 5,
      originationFeePercent: 1.5,
      originationFeeType: 'annual',
      maxInitialLtv: 50,
      availableLoanTerms: [3, 6, 12, 18, 24],
      riskManagement: {
        targetLtv: 30,
        liquidationLtv: 95,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        maxLoanAmount: 50000,
        liquidationFeePercent: 5
      }
    }
  })

  describe('calculateLoanMetrics', () => {
    it('should calculate basic loan metrics correctly', () => {
      const result: LoanMetrics = service.calculateLoanMetrics(mockParams)

      expect(result).toHaveProperty('initialCurrentLoanAmount')
      expect(result).toHaveProperty('initialOriginationFee')
      expect(result).toHaveProperty('initialTotalLoanCost')
      expect(result).toHaveProperty('initialMaxLoanCapacity')
      expect(result).toHaveProperty('initialLoanUtilizationPercent')
      expect(result).toHaveProperty('initialAvailableBorrowingCapacity')
      expect(result).toHaveProperty('initialMonthlyInterestPayment')

      // Verify calculations
      const expectedLoanAmount = 70000 * 0.1 // 10% of BTC value
      expect(result.initialCurrentLoanAmount).toBe(expectedLoanAmount)

      const expectedMaxCapacity = 70000 * 0.5 // 50% max LTV
      expect(result.initialMaxLoanCapacity).toBe(expectedMaxCapacity)

      expect(result.initialLoanUtilizationPercent).toBeGreaterThan(0)
      expect(result.initialLoanUtilizationPercent).toBeLessThanOrEqual(100)
    })

    it('should handle different origination fee types', () => {
      // Test one-time fee
      const oneTimeParams = { ...mockParams, originationFeeType: 'one-time' as const }
      const oneTimeResult = service.calculateLoanMetrics(oneTimeParams)

      // Test annual fee
      const annualParams = { ...mockParams, originationFeeType: 'annual' as const }
      const annualResult = service.calculateLoanMetrics(annualParams)

      expect(oneTimeResult.initialOriginationFee).toBeGreaterThan(0)
      expect(annualResult.initialOriginationFee).toBeGreaterThan(0)
      // Annual fee should be higher for longer terms, but for 6 months it might be lower
      expect(typeof annualResult.initialOriginationFee).toBe('number')
      expect(typeof oneTimeResult.initialOriginationFee).toBe('number')
    })

    it('should handle infinite loan terms', () => {
      const infiniteParams = {
        ...mockParams,
        loanTermMonths: Infinity,
        riskManagement: {
          ...mockParams.riskManagement,
          loanTermMonths: Infinity
        }
      }

      const result = service.calculateLoanMetrics(infiniteParams)
      expect(result.initialTotalLoanCost).toBeGreaterThan(0)
      expect(result.initialMonthlyInterestPayment).toBeGreaterThan(0)
    })
  })

  describe('calculateCollateralMetrics', () => {
    it('should calculate collateral metrics correctly', () => {
      const result: CollateralMetrics = service.calculateCollateralMetrics(mockParams)

      expect(result).toHaveProperty('initialTotalStackValue')
      expect(result).toHaveProperty('initialLockedCollateralBtc')
      expect(result).toHaveProperty('initialFreeCollateralBtc')
      expect(result).toHaveProperty('initialCollateralUtilizationPercent')
      expect(result).toHaveProperty('initialLockedCollateralValue')
      expect(result).toHaveProperty('initialFreeCollateralValue')
      expect(result).toHaveProperty('isSufficient')

      // Verify calculations
      expect(result.initialTotalStackValue).toBe(70000)
      expect(result.initialLockedCollateralBtc).toBeGreaterThan(0)
      expect(result.initialFreeCollateralBtc).toBeGreaterThanOrEqual(0)
      expect(result.initialCollateralUtilizationPercent).toBeGreaterThanOrEqual(0)
      expect(result.initialCollateralUtilizationPercent).toBeLessThanOrEqual(100)
    })

    it('should validate collateral sufficiency', () => {
      // Test with sufficient collateral
      const sufficientResult = service.calculateCollateralMetrics(mockParams)
      expect(sufficientResult.isSufficient).toBe(true)

      // Test with insufficient collateral (very high loan percentage)
      const insufficientParams = { ...mockParams, loanAmountPercent: 90 }
      const insufficientResult = service.calculateCollateralMetrics(insufficientParams)
      expect(insufficientResult.isSufficient).toBe(false)
    })
  })

  describe('calculateLiquidationMetrics', () => {
    it('should calculate liquidation metrics correctly', () => {
      const result: LiquidationMetrics = service.calculateLiquidationMetrics(mockParams)

      expect(result).toHaveProperty('initialImmediateLiquidationPrice')
      expect(result).toHaveProperty('initialTrueLiquidationPrice')
      expect(result).toHaveProperty('initialImmediatePriceDropPercentage')
      expect(result).toHaveProperty('initialTruePriceDropPercentage')
      expect(result).toHaveProperty('initialLiquidationRiskLevel')

      // Verify calculations
      expect(result.initialImmediateLiquidationPrice).toBeGreaterThan(0)
      expect(result.initialTrueLiquidationPrice).toBeGreaterThan(0)
      expect(result.initialImmediatePriceDropPercentage).toBeGreaterThan(0)
      expect(result.initialTruePriceDropPercentage).toBeGreaterThan(0)
      expect(['low', 'medium', 'high']).toContain(result.initialLiquidationRiskLevel)
    })

    it('should handle ATH-based calculations', async () => {
      const athPrice = 100000
      const result = service.calculateLiquidationMetrics(mockParams, athPrice)

      expect(result).toHaveProperty('initialATHLiquidationPrice')
      expect(result).toHaveProperty('initialATHPriceDropPercentage')
      expect(result.initialATHLiquidationPrice).toBeGreaterThan(0)
      expect(result.initialATHPriceDropPercentage).toBeGreaterThan(0)
    })
  })

  describe('validateParameters', () => {
    it('should validate correct parameters', () => {
      const result = service.validateParameters(mockParams)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid BTC amount', () => {
      const invalidParams = { ...mockParams, initialBtcAmount: -1 }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('BTC amount'))).toBe(true)
    })

    it('should detect invalid BTC price', () => {
      const invalidParams = { ...mockParams, initialBtcPrice: 0 }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('BTC price'))).toBe(true)
    })

    it('should detect invalid loan percentage', () => {
      const invalidParams = { ...mockParams, loanAmountPercent: 150 }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('loan amount'))).toBe(true)
    })

    it('should detect invalid interest rate', () => {
      const invalidParams = {
        ...mockParams,
        riskManagement: {
          ...mockParams.riskManagement,
          annualInterestRate: -5
        }
      }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('interest rate'))).toBe(true)
    })
  })

  describe('calculateAll', () => {
    it('should calculate all metrics in single call', () => {
      const result = service.calculateAll(mockParams)

      expect(result).toHaveProperty('liquidation')
      expect(result).toHaveProperty('collateral')
      expect(result).toHaveProperty('loan')
      expect(result).toHaveProperty('platform')
      expect(result).toHaveProperty('validation')
      expect(result).toHaveProperty('calculatedAt')

      expect(result.validation.isValid).toBe(true)
      expect(result.calculatedAt).toBeInstanceOf(Date)
    })

    it('should throw error for invalid parameters', () => {
      const invalidParams = { ...mockParams, initialBtcAmount: -1 }
      expect(() => service.calculateAll(invalidParams)).toThrow()
    })
  })

  describe('Performance Requirements', () => {
    it('should complete calculations within 16ms', () => {
      const startTime = performance.now()
      
      service.calculateLiquidationMetrics(mockParams)
      service.calculateCollateralMetrics(mockParams)
      service.calculateLoanMetrics(mockParams)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(16)
    })

    it('should handle cache operations efficiently', () => {
      // Test cache functionality
      const result1 = service.calculateLoanMetrics(mockParams)
      const result2 = service.calculateLoanMetrics(mockParams)
      
      expect(result1).toEqual(result2)
      
      // Test cache clearing
      service.clearCache()
      const cacheStats = service.getCacheStats()
      expect(cacheStats.size).toBe(0)
    })
  })

  describe('ATH Distance Calculations', () => {
    it('should calculate ATH distance metrics correctly', () => {
      const currentPrice = 70000
      const athPrice = 100000
      
      const result = service.calculateATHDistance(currentPrice, athPrice)
      
      expect(result).toHaveProperty('distancePercent')
      expect(result).toHaveProperty('distanceUSD')
      expect(result).toHaveProperty('riskLevel')
      expect(result).toHaveProperty('riskColor')
      expect(result).toHaveProperty('riskDescription')
      
      expect(result.distancePercent).toBe(30) // 30% below ATH
      expect(result.distanceUSD).toBe(30000) // $30k below ATH
      expect(['low', 'medium', 'high']).toContain(result.riskLevel)
    })

    it('should handle price above ATH', () => {
      const currentPrice = 110000
      const athPrice = 100000
      
      const result = service.calculateATHDistance(currentPrice, athPrice)
      
      expect(result.distancePercent).toBeLessThan(0) // Negative distance (above ATH)
      expect(result.distanceUSD).toBeLessThan(0) // Negative USD distance
    })
  })
})
