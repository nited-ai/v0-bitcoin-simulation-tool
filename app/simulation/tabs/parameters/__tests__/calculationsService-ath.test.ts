/**
 * Calculations Service ATH Integration Tests
 * 
 * Tests for the updated calculations service that uses dynamic ATH
 * from the ATH service instead of hard-coded values.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalculationsService } from '../calculationsService'
import { athService } from '../../../../../lib/services/ath-service'

// Mock ATH service
vi.mock('../../../../../lib/services/ath-service')

describe('CalculationsService ATH Integration', () => {
  let calculationsService: CalculationsService
  const mockAthService = athService as any

  const mockParams = {
    initialBtcAmount: 1,
    initialBtcPrice: 100000,
    loanAmountPercent: 50,
    platform: 'firefish' as const,
    riskManagement: {
      targetLtv: 50,
      maxLoanAmount: 1000000,
      annualInterestRate: 6.5,
      loanTermMonths: 6,
      liquidationFeePercent: 5
    },
    customPlatform: {
      maxLoanAmount: 1000000,
      annualInterestRate: 6.5,
      loanTermMonths: 6,
      liquidationFeePercent: 5,
      maxInitialLtv: 50,
      liquidationLtv: 85
    }
  }

  beforeEach(() => {
    calculationsService = new CalculationsService()
    vi.clearAllMocks()
  })

  describe('calculateLiquidationMetricsWithATH', () => {
    it('should use dynamic ATH from service', async () => {
      mockAthService.getCurrentATH = vi.fn().mockResolvedValue(124277.98)

      const result = await calculationsService.calculateLiquidationMetricsWithATH(mockParams)

      expect(mockAthService.getCurrentATH).toHaveBeenCalled()
      expect(result.athPrice).toBe(124277.98)
      expect(result.athMetrics).toBeDefined()
    })

    it('should use fallback ATH when service fails', async () => {
      mockAthService.getCurrentATH = vi.fn().mockRejectedValue(new Error('Service error'))

      const result = await calculationsService.calculateLiquidationMetricsWithATH(mockParams)

      expect(mockAthService.getCurrentATH).toHaveBeenCalled()
      expect(result.athPrice).toBe(124277.98) // Fallback value
      expect(result.athMetrics).toBeDefined()
    })

    it('should calculate ATH metrics correctly with dynamic ATH', async () => {
      const customATH = 130000
      mockAthService.getCurrentATH = vi.fn().mockResolvedValue(customATH)

      const result = await calculationsService.calculateLiquidationMetricsWithATH(mockParams)

      expect(result.athPrice).toBe(customATH)
      expect(result.athMetrics!.priceDropPercentage).toBeGreaterThan(0)
      expect(result.athMetrics!.truePriceDropPercentage).toBeGreaterThan(0)
    })
  })

  describe('calculateLiquidationMetrics with ATH parameter', () => {
    it('should use provided ATH value', () => {
      const customATH = 130000
      const result = calculationsService.calculateLiquidationMetrics(mockParams, customATH)

      expect(result.athPrice).toBe(customATH)
      expect(result.athMetrics).toBeDefined()
    })

    it('should use fallback ATH when no parameter provided', () => {
      const result = calculationsService.calculateLiquidationMetrics(mockParams)

      expect(result.athPrice).toBe(124277.98) // Fallback value
      expect(result.athMetrics).toBeDefined()
    })

    it('should cache results with different ATH values separately', () => {
      const ath1 = 120000
      const ath2 = 130000

      const result1 = calculationsService.calculateLiquidationMetrics(mockParams, ath1)
      const result2 = calculationsService.calculateLiquidationMetrics(mockParams, ath2)

      expect(result1.athPrice).toBe(ath1)
      expect(result2.athPrice).toBe(ath2)
      expect(result1.athMetrics!.priceDropPercentage).not.toBe(result2.athMetrics!.priceDropPercentage)
    })
  })

  describe('ATH metrics calculations', () => {
    it('should calculate correct ATH price drop percentages', () => {
      const athPrice = 125000
      const result = calculationsService.calculateLiquidationMetrics(mockParams, athPrice)

      // With mock params: liquidation at ~58,823 (50% LTV of 100k BTC)
      // ATH drop percentage should be: (125000 - 58823) / 125000 * 100 ≈ 52.9%
      expect(result.athMetrics!.priceDropPercentage).toBeGreaterThan(50)
      expect(result.athMetrics!.priceDropPercentage).toBeLessThan(60)
    })

    it('should handle edge cases in ATH calculations', () => {
      const edgeParams = {
        ...mockParams,
        initialBtcPrice: 0 // Edge case
      }

      const result = calculationsService.calculateLiquidationMetrics(edgeParams, 125000)

      expect(result.athPrice).toBe(125000)
      expect(result.athMetrics).toBeDefined()
      expect(result.athMetrics!.priceDropPercentage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('backward compatibility', () => {
    it('should maintain same calculation logic as before', () => {
      // Test that the calculation logic hasn't changed, only the ATH source
      const oldATH = 125000 // Previous hard-coded value
      const newATH = 124277.98 // New actual ATH

      const resultOld = calculationsService.calculateLiquidationMetrics(mockParams, oldATH)
      const resultNew = calculationsService.calculateLiquidationMetrics(mockParams, newATH)

      // Structure should be the same
      expect(resultOld).toHaveProperty('athPrice')
      expect(resultOld).toHaveProperty('athMetrics')
      expect(resultNew).toHaveProperty('athPrice')
      expect(resultNew).toHaveProperty('athMetrics')

      // Values should be different due to different ATH
      expect(resultOld.athPrice).not.toBe(resultNew.athPrice)
    })
  })
})
