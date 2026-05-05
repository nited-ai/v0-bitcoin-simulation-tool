/**
 * CalculationsService ATH Distance Tests
 * 
 * Tests for the ATH distance calculation functionality
 * used by the enhanced CollateralSummaryCard component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalculationsService } from '../calculationsService'

describe('CalculationsService ATH Distance Calculations', () => {
  let calculationsService: CalculationsService

  beforeEach(() => {
    calculationsService = new CalculationsService()
    vi.clearAllMocks()
  })

  describe('calculateATHDistance', () => {
    it('should calculate correct distance when price is below ATH', () => {
      const currentPrice = 100000
      const athPrice = 125000
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      expect(result.athPrice).toBe(125000)
      expect(result.currentPrice).toBe(100000)
      expect(result.distancePercent).toBe(20) // (125000 - 100000) / 125000 * 100
      expect(result.distanceUSD).toBe(25000) // 125000 - 100000
      expect(result.riskLevel).toBe('medium') // 20% is between 15-40%
      expect(result.riskColor).toBe('#f59e0b') // Orange
      expect(result.riskDescription).toBe('Moderate loan amounts and LTV percentages recommended')
    })

    it('should classify as low risk when far from ATH', () => {
      const currentPrice = 70000
      const athPrice = 125000

      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)

      expect(result.distancePercent).toBe(44) // (125000 - 70000) / 125000 * 100
      expect(result.riskLevel).toBe('low')
      expect(result.riskColor).toBe('#22c55e') // Green
      expect(result.riskDescription).toBe('Favorable conditions for larger loan amounts and higher LTV percentages')
    })

    it('should classify as high risk when near ATH', () => {
      const currentPrice = 120000
      const athPrice = 125000
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      expect(result.distancePercent).toBe(4) // (125000 - 120000) / 125000 * 100
      expect(result.riskLevel).toBe('high')
      expect(result.riskColor).toBe('#ef4444') // Red
      expect(result.riskDescription).toBe('Smaller loan amounts and lower LTV percentages recommended')
    })

    it('should handle edge case when price equals ATH', () => {
      const currentPrice = 125000
      const athPrice = 125000
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      expect(result.distancePercent).toBe(0)
      expect(result.distanceUSD).toBe(0)
      expect(result.riskLevel).toBe('high')
    })

    it('should handle edge case when price is above ATH', () => {
      const currentPrice = 130000
      const athPrice = 125000
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      // Should return 0 for negative distances (price above ATH)
      expect(result.distancePercent).toBe(0)
      expect(result.distanceUSD).toBe(0)
      expect(result.riskLevel).toBe('high')
    })

    it('should handle zero ATH price gracefully', () => {
      const currentPrice = 100000
      const athPrice = 0
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      expect(result.distancePercent).toBe(0)
      expect(result.distanceUSD).toBe(0)
      expect(result.riskLevel).toBe('high') // Default to high risk when ATH is invalid
    })

    it('should handle negative prices gracefully', () => {
      const currentPrice = -1000
      const athPrice = 125000
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      // Should handle negative current price
      expect(result.distanceUSD).toBeGreaterThanOrEqual(0)
      expect(result.distancePercent).toBeGreaterThanOrEqual(0)
    })
  })

  describe('risk level boundaries', () => {
    const athPrice = 100000

    it('should classify 41% distance as low risk', () => {
      const currentPrice = 59000 // 41% below ATH
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      expect(result.riskLevel).toBe('low')
    })

    it('should classify 40% distance as medium risk', () => {
      const currentPrice = 60000 // 40% below ATH
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      expect(result.riskLevel).toBe('medium')
    })

    it('should classify 16% distance as medium risk', () => {
      const currentPrice = 84000 // 16% below ATH
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      expect(result.riskLevel).toBe('medium')
    })

    it('should classify 15% distance as high risk', () => {
      const currentPrice = 85000 // 15% below ATH
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      expect(result.riskLevel).toBe('high')
    })
  })

  describe('formatting and precision', () => {
    it('should handle decimal precision correctly', () => {
      const currentPrice = 99999.99
      const athPrice = 124277.98
      
      const result = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      expect(result.distancePercent).toBeCloseTo(19.5, 1)
      expect(result.distanceUSD).toBeCloseTo(24277.99, 2)
    })

    it('should return consistent results for same inputs', () => {
      const currentPrice = 100000
      const athPrice = 125000
      
      const result1 = calculationsService.calculateATHDistance(currentPrice, athPrice)
      const result2 = calculationsService.calculateATHDistance(currentPrice, athPrice)
      
      expect(result1).toEqual(result2)
    })
  })
})
