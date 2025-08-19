import { CalculationsService, useCalculations } from '../components/parameters/calculationsService'
import { SimulationParams, LiquidationMetrics, CollateralMetrics, LoanMetrics, PlatformMetrics, ValidationResult } from '../components/parameters/calculationsService'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'

describe('CalculationsService', () => {
  let service: CalculationsService

  beforeEach(() => {
    service = new CalculationsService()
  })

  describe('Core Service Structure', () => {
    it('should create an instance of CalculationsService', () => {
      expect(service).toBeInstanceOf(CalculationsService)
    })

    it('should have calculateLiquidationMetrics method', () => {
      expect(typeof service.calculateLiquidationMetrics).toBe('function')
    })

    it('should have calculateCollateralMetrics method', () => {
      expect(typeof service.calculateCollateralMetrics).toBe('function')
    })

    it('should have calculateLoanMetrics method', () => {
      expect(typeof service.calculateLoanMetrics).toBe('function')
    })

    it('should have validateParameters method', () => {
      expect(typeof service.validateParameters).toBe('function')
    })
  })

  describe('Parameter Validation', () => {
    const validParams: SimulationParams = {
      initialBtcAmount: 1,
      initialBtcPrice: 100000,
      loanAmountPercent: 10,
      platform: 'firefish',
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5
      }
    }

    it('should validate valid parameters successfully', () => {
      const result = service.validateParameters(validParams)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative BTC amount', () => {
      const invalidParams = { ...validParams, initialBtcAmount: -1 }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('BTC amount must be positive')
    })

    it('should reject zero BTC price', () => {
      const invalidParams = { ...validParams, initialBtcPrice: 0 }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('BTC price must be positive')
    })

    it('should reject invalid loan percentage', () => {
      const invalidParams = { ...validParams, loanAmountPercent: -5 }
      const result = service.validateParameters(invalidParams)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Loan amount percentage must be between 0 and 100')
    })
  })

  describe('Liquidation Calculations', () => {
    const testParams: SimulationParams = {
      initialBtcAmount: 1,
      initialBtcPrice: 100000,
      loanAmountPercent: 10,
      platform: 'firefish',
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5
      }
    }

    it('should calculate liquidation metrics correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      expect(result).toBeDefined()
      expect(typeof result.initialImmediateLiquidationPrice).toBe('number')
      expect(typeof result.initialImmediatePriceDropPercentage).toBe('number')
      expect(typeof result.initialTrueLiquidationPrice).toBe('number')
      expect(typeof result.initialTruePriceDropPercentage).toBe('number')
      expect(typeof result.initialFreeBtcAmount).toBe('number')
      expect(typeof result.initialHasFreeCollateral).toBe('boolean')
    })

    it('should calculate immediate liquidation price correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      // Manual calculation for verification:
      // Total loan cost = $10,000 + ($10,000 * 1.5%) = $10,150
      // BTC locked as collateral = $10,150 / (50% / 100) / $100,000 = 0.203 BTC
      // Immediate liquidation price = $10,150 / (95% / 100) / 0.203 BTC = $52,631.58
      expect(result.liquidationPrice).toBeCloseTo(52631.58, 2)
    })

    it('should calculate true liquidation price with free collateral', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      // Manual calculation for verification:
      // True liquidation price = $10,150 / (95% / 100) / 1 BTC = $10,684.21
      expect(result.trueLiquidationPrice).toBeCloseTo(10684.21, 2)
      expect(result.hasFreeCollateral).toBe(true)
      expect(result.freeBtcAmount).toBeCloseTo(0.797, 3) // 1 - 0.203 = 0.797 BTC
    })

    it('should calculate price drop percentages correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      // Immediate price drop: (100,000 - 52,631.58) / 100,000 * 100 = 47.37%
      expect(result.priceDropPercentage).toBeCloseTo(47.37, 2)

      // True price drop: (100,000 - 10,684.21) / 100,000 * 100 = 89.32%
      expect(result.truePriceDropPercentage).toBeCloseTo(89.32, 2)
    })

    it('should handle different platforms correctly', () => {
      const strikeParams = { ...testParams, platform: 'strike' as const }
      const customParams = { ...testParams, platform: 'custom' as const }

      const firefishResult = service.calculateLiquidationMetrics(testParams)
      const strikeResult = service.calculateLiquidationMetrics(strikeParams)
      const customResult = service.calculateLiquidationMetrics(customParams)

      // Strike has 99% liquidation LTV (higher than Firefish 95%)
      expect(strikeResult.liquidationPrice).toBeLessThan(firefishResult.liquidationPrice)
      expect(strikeResult.trueLiquidationPrice).toBeLessThan(firefishResult.trueLiquidationPrice)

      // Custom has 97% liquidation LTV (between Firefish and Strike)
      expect(customResult.liquidationPrice).toBeLessThan(firefishResult.liquidationPrice)
      expect(customResult.liquidationPrice).toBeGreaterThan(strikeResult.liquidationPrice)
    })

    it('should handle zero loan amount', () => {
      const zeroLoanParams = { ...testParams, loanAmountPercent: 0 }
      const result = service.calculateLiquidationMetrics(zeroLoanParams)

      expect(result.liquidationPrice).toBe(0)
      expect(result.trueLiquidationPrice).toBe(0)
      expect(result.priceDropPercentage).toBe(0)
      expect(result.truePriceDropPercentage).toBe(0)
      expect(result.freeBtcAmount).toBe(testParams.btcAmount)
      expect(result.hasFreeCollateral).toBe(true)
    })

    it('should handle scenarios without free collateral', () => {
      // High loan percentage that uses all BTC as collateral
      const highLoanParams = { ...testParams, loanAmountPercent: 50, riskManagement: { ...testParams.riskManagement, targetLtv: 95 } }
      const result = service.calculateLiquidationMetrics(highLoanParams)

      // When no free collateral, immediate and true liquidation should be the same
      expect(result.liquidationPrice).toBeCloseTo(result.trueLiquidationPrice, 2)
      expect(result.priceDropPercentage).toBeCloseTo(result.truePriceDropPercentage, 2)
      expect(result.freeBtcAmount).toBeCloseTo(0, 4)
      expect(result.hasFreeCollateral).toBe(false)
    })

    it('should include ATH calculations when provided', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      // ATH calculations should be included in the result
      expect(result.athPrice).toBeDefined()
      expect(result.athMetrics).toBeDefined()

      if (result.athMetrics) {
        expect(typeof result.athMetrics.liquidationPrice).toBe('number')
        expect(typeof result.athMetrics.priceDropPercentage).toBe('number')
        expect(typeof result.athMetrics.trueLiquidationPrice).toBe('number')
        expect(typeof result.athMetrics.truePriceDropPercentage).toBe('number')
      }
    })

    it('should match PriceDropToleranceCard calculations exactly', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      // These values should match the existing PriceDropToleranceCard component calculations
      // Based on the component analysis:
      // - Total loan cost: $10,150
      // - BTC locked: 0.203 BTC
      // - Free BTC: 0.797 BTC
      // - Immediate liquidation: $52,631.58 (47.37% drop)
      // - True liquidation: $10,684.21 (89.32% drop)

      expect(result.liquidationPrice).toBeCloseTo(52631.58, 2)
      expect(result.trueLiquidationPrice).toBeCloseTo(10684.21, 2)
      expect(result.priceDropPercentage).toBeCloseTo(47.37, 2)
      expect(result.truePriceDropPercentage).toBeCloseTo(89.32, 2)
      expect(result.freeBtcAmount).toBeCloseTo(0.797, 3)
      expect(result.hasFreeCollateral).toBe(true)
    })
  })

  describe('Collateral Calculations', () => {
    const testParams: SimulationParams = {
      btcAmount: 2,
      initialBtcPrice: 80000,
      monthlyWithdrawal: 0,
      btcAccumulation: false,
      loanAmountPercent: 25,
      platform: 'strike',
      riskManagement: {
        targetLtv: 60,
        maxLoanAmount: 80000,
        annualInterestRate: 7.0,
        loanTermMonths: 12,
        liquidationFeePercent: 3
      }
    }

    it('should calculate collateral metrics correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      expect(result).toBeDefined()
      expect(typeof result.totalStackValue).toBe('number')
      expect(typeof result.lockedCollateralBtc).toBe('number')
      expect(typeof result.freeCollateralBtc).toBe('number')
      expect(typeof result.collateralUtilizationPercent).toBe('number')
      expect(typeof result.lockedCollateralValue).toBe('number')
      expect(typeof result.freeCollateralValue).toBe('number')
      expect(typeof result.isSufficient).toBe('boolean')
    })

    it('should calculate total stack value correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      const expectedStackValue = testParams.btcAmount * testParams.initialBtcPrice // 2 * 80,000 = $160,000
      expect(result.totalStackValue).toBe(expectedStackValue)
    })

    it('should calculate locked collateral correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Manual calculation for verification:
      // Current loan amount = 25% * $160,000 = $40,000
      // Origination fee = $40,000 * 0% (Strike) = $0
      // Total loan cost = $40,000 + $0 = $40,000
      // Locked collateral = $40,000 / (60% / 100) / $80,000 = 0.833 BTC
      expect(result.lockedCollateralBtc).toBeCloseTo(0.833, 3)
      expect(result.lockedCollateralBtc).toBeGreaterThan(0)
      expect(result.lockedCollateralBtc).toBeLessThanOrEqual(testParams.btcAmount)
    })

    it('should calculate free collateral correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Free collateral = 2 BTC - 0.833 BTC = 1.167 BTC
      expect(result.freeCollateralBtc).toBeCloseTo(1.167, 3)
      expect(result.freeCollateralBtc).toBeGreaterThanOrEqual(0)
    })

    it('should calculate collateral utilization percentage correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Collateral utilization = (0.833 / 2) * 100 = 41.65%
      expect(result.collateralUtilizationPercent).toBeCloseTo(41.65, 2)
      expect(result.collateralUtilizationPercent).toBeGreaterThanOrEqual(0)
      expect(result.collateralUtilizationPercent).toBeLessThanOrEqual(100)
    })

    it('should calculate USD values correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Locked collateral value = 0.833 BTC * $80,000 = $66,640
      expect(result.lockedCollateralValue).toBeCloseTo(66640, 0)

      // Free collateral value = 1.167 BTC * $80,000 = $93,360
      expect(result.freeCollateralValue).toBeCloseTo(93360, 0)

      // Total should equal stack value
      expect(result.lockedCollateralValue + result.freeCollateralValue).toBeCloseTo(result.totalStackValue, 0)
    })

    it('should validate collateral sufficiency correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // With 2 BTC and 0.833 BTC locked, collateral should be sufficient
      expect(result.isSufficient).toBe(true)
    })

    it('should handle insufficient collateral scenarios', () => {
      const insufficientParams = {
        ...testParams,
        btcAmount: 0.5, // Only 0.5 BTC but need 0.833 BTC for collateral
        loanAmountPercent: 25 // Same loan percentage
      }

      const result = service.calculateCollateralMetrics(insufficientParams)

      expect(result.isSufficient).toBe(false)
      expect(result.lockedCollateralBtc).toBeGreaterThan(insufficientParams.btcAmount)
      expect(result.freeCollateralBtc).toBe(0) // No free collateral when insufficient
    })

    it('should handle zero loan amount', () => {
      const zeroLoanParams = { ...testParams, loanAmountPercent: 0 }
      const result = service.calculateCollateralMetrics(zeroLoanParams)

      expect(result.lockedCollateralBtc).toBe(0)
      expect(result.freeCollateralBtc).toBe(testParams.btcAmount)
      expect(result.collateralUtilizationPercent).toBe(0)
      expect(result.lockedCollateralValue).toBe(0)
      expect(result.freeCollateralValue).toBe(testParams.btcAmount * testParams.initialBtcPrice)
      expect(result.isSufficient).toBe(true)
    })

    it('should handle different platforms correctly', () => {
      const firefishParams = { ...testParams, platform: 'firefish' as const }
      const customParams = { ...testParams, platform: 'custom' as const }

      const strikeResult = service.calculateCollateralMetrics(testParams)
      const firefishResult = service.calculateCollateralMetrics(firefishParams)
      const customResult = service.calculateCollateralMetrics(customParams)

      // Strike has 0% origination fee, others have fees
      // This should result in different locked collateral amounts
      expect(firefishResult.lockedCollateralBtc).toBeGreaterThan(strikeResult.lockedCollateralBtc) // Firefish has 1.5% fee
      expect(customResult.lockedCollateralBtc).toBeGreaterThan(strikeResult.lockedCollateralBtc) // Custom has 1.0% fee
      expect(firefishResult.lockedCollateralBtc).toBeGreaterThan(customResult.lockedCollateralBtc) // Firefish > Custom
    })

    it('should match CollateralVisualizationCard calculations exactly', () => {
      // Test parameters matching CollateralVisualizationCard component
      const visualizationParams: SimulationParams = {
        btcAmount: 1,
        initialBtcPrice: 100000,
        monthlyWithdrawal: 0,
        btcAccumulation: false,
        loanAmountPercent: 10,
        platform: 'firefish',
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5,
          loanTermMonths: 6,
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateCollateralMetrics(visualizationParams)

      // Expected calculations from CollateralVisualizationCard:
      // Total loan cost = $10,000 + ($10,000 * 1.5%) = $10,150
      // Locked collateral = $10,150 / (50% / 100) / $100,000 = 0.203 BTC
      // Free collateral = 1 - 0.203 = 0.797 BTC
      // Utilization = (0.203 / 1) * 100 = 20.3%

      expect(result.lockedCollateralBtc).toBeCloseTo(0.203, 3)
      expect(result.freeCollateralBtc).toBeCloseTo(0.797, 3)
      expect(result.collateralUtilizationPercent).toBeCloseTo(20.3, 1)
      expect(result.lockedCollateralValue).toBeCloseTo(20300, 0)
      expect(result.freeCollateralValue).toBeCloseTo(79700, 0)
      expect(result.isSufficient).toBe(true)
    })

    it('should handle edge cases gracefully', () => {
      // Test with very small BTC amount
      const smallBtcParams = { ...testParams, btcAmount: 0.001 }
      const smallResult = service.calculateCollateralMetrics(smallBtcParams)

      expect(smallResult.totalStackValue).toBeGreaterThan(0)
      expect(smallResult.lockedCollateralBtc).toBeFinite()
      expect(smallResult.freeCollateralBtc).toBeFinite()
      expect(smallResult.collateralUtilizationPercent).toBeFinite()

      // Test with very high BTC price
      const highPriceParams = { ...testParams, initialBtcPrice: 1000000 }
      const highPriceResult = service.calculateCollateralMetrics(highPriceParams)

      expect(highPriceResult.totalStackValue).toBeGreaterThan(0)
      expect(highPriceResult.lockedCollateralBtc).toBeFinite()
      expect(highPriceResult.freeCollateralBtc).toBeFinite()
    })
  })

  describe('Loan Calculations', () => {
    const testParams: SimulationParams = {
      btcAmount: 1.5,
      initialBtcPrice: 120000,
      monthlyWithdrawal: 0,
      btcAccumulation: false,
      loanAmountPercent: 15,
      platform: 'custom',
      riskManagement: {
        targetLtv: 45,
        maxLoanAmount: 60000,
        annualInterestRate: 8.0,
        loanTermMonths: 9,
        liquidationFeePercent: 4
      }
    }

    it('should calculate loan metrics correctly', () => {
      const result = service.calculateLoanMetrics(testParams)
      
      expect(result).toBeDefined()
      expect(typeof result.currentLoanAmount).toBe('number')
      expect(typeof result.originationFee).toBe('number')
      expect(typeof result.totalLoanCost).toBe('number')
      expect(typeof result.maxLoanCapacity).toBe('number')
      expect(typeof result.loanUtilizationPercent).toBe('number')
    })

    it('should calculate current loan amount correctly', () => {
      const result = service.calculateLoanMetrics(testParams)
      
      const expectedLoanAmount = (testParams.loanAmountPercent / 100) * 
                                 (testParams.btcAmount * testParams.initialBtcPrice)
      expect(result.currentLoanAmount).toBe(expectedLoanAmount)
    })

    it('should calculate origination fee correctly', () => {
      const result = service.calculateLoanMetrics(testParams)
      
      expect(result.originationFee).toBeGreaterThanOrEqual(0)
      expect(result.totalLoanCost).toBeGreaterThanOrEqual(result.currentLoanAmount)
    })
  })

  describe('Performance Requirements', () => {
    const testParams: SimulationParams = {
      btcAmount: 1,
      initialBtcPrice: 100000,
      monthlyWithdrawal: 0,
      btcAccumulation: false,
      loanAmountPercent: 10,
      platform: 'firefish',
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5
      }
    }

    it('should complete calculations within 16ms', () => {
      const startTime = performance.now()
      
      service.calculateLiquidationMetrics(testParams)
      service.calculateCollateralMetrics(testParams)
      service.calculateLoanMetrics(testParams)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(16)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero loan amount', () => {
      const zeroLoanParams: SimulationParams = {
        btcAmount: 1,
        initialBtcPrice: 100000,
        monthlyWithdrawal: 0,
        btcAccumulation: false,
        loanAmountPercent: 0,
        platform: 'firefish',
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5,
          loanTermMonths: 6,
          liquidationFeePercent: 5
        }
      }

      expect(() => service.calculateLiquidationMetrics(zeroLoanParams)).not.toThrow()
      expect(() => service.calculateCollateralMetrics(zeroLoanParams)).not.toThrow()
      expect(() => service.calculateLoanMetrics(zeroLoanParams)).not.toThrow()
    })

    it('should handle very small BTC amounts', () => {
      const smallBtcParams: SimulationParams = {
        btcAmount: 0.001,
        initialBtcPrice: 100000,
        monthlyWithdrawal: 0,
        btcAccumulation: false,
        loanAmountPercent: 5,
        platform: 'firefish',
        riskManagement: {
          targetLtv: 30,
          maxLoanAmount: 1000,
          annualInterestRate: 6.5,
          loanTermMonths: 6,
          liquidationFeePercent: 5
        }
      }

      const result = service.calculateLiquidationMetrics(smallBtcParams)
      expect(result.liquidationPrice).toBeGreaterThan(0)
      expect(result.liquidationPrice).toBeFinite()
    })
  })

  describe('React Integration - useCalculations Hook', () => {
    const baseParams: SimulationParams = {
      btcAmount: 1,
      initialBtcPrice: 100000,
      monthlyWithdrawal: 0,
      btcAccumulation: false,
      loanAmountPercent: 10,
      platform: 'firefish',
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5
      }
    }

    it('should return calculations when parameters are valid', () => {
      const { result } = renderHook(() => useCalculations(baseParams))

      expect(result.current).not.toBeNull()
      expect(result.current?.liquidation).toBeDefined()
      expect(result.current?.collateral).toBeDefined()
      expect(result.current?.loan).toBeDefined()
      expect(result.current?.platform).toBeDefined()
      expect(result.current?.validation.isValid).toBe(true)
    })

    it('should return null when parameters are invalid', () => {
      const invalidParams = { ...baseParams, btcAmount: -1 }
      const { result } = renderHook(() => useCalculations(invalidParams))

      expect(result.current).toBeNull()
    })

    it('should recalculate when parameters change', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      expect(initialResult?.liquidation.liquidationPrice).toBeCloseTo(52631.58, 2)

      // Change BTC amount
      params = { ...baseParams, btcAmount: 2 }
      rerender()

      const updatedResult = result.current
      expect(updatedResult?.liquidation.liquidationPrice).not.toBe(initialResult?.liquidation.liquidationPrice)
      expect(updatedResult?.collateral.totalStackValue).toBe(200000) // 2 BTC * $100k
    })

    it('should recalculate when BTC price changes', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      expect(initialResult?.collateral.totalStackValue).toBe(100000)

      // Change BTC price
      params = { ...baseParams, initialBtcPrice: 80000 }
      rerender()

      const updatedResult = result.current
      expect(updatedResult?.collateral.totalStackValue).toBe(80000) // 1 BTC * $80k
      expect(updatedResult?.liquidation.liquidationPrice).not.toBe(initialResult?.liquidation.liquidationPrice)
    })

    it('should recalculate when loan percentage changes', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      expect(initialResult?.loan.currentLoanAmount).toBe(10000) // 10% of $100k

      // Change loan percentage
      params = { ...baseParams, loanAmountPercent: 20 }
      rerender()

      const updatedResult = result.current
      expect(updatedResult?.loan.currentLoanAmount).toBe(20000) // 20% of $100k
      expect(updatedResult?.collateral.lockedCollateralBtc).toBeGreaterThan(initialResult?.collateral.lockedCollateralBtc || 0)
    })

    it('should recalculate when platform changes', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const firefishResult = result.current
      expect(firefishResult?.platform.platform).toBe('Firefish')
      expect(firefishResult?.platform.originationFeePercent).toBe(1.5)

      // Change to Strike platform
      params = { ...baseParams, platform: 'strike' }
      rerender()

      const strikeResult = result.current
      expect(strikeResult?.platform.platform).toBe('Strike')
      expect(strikeResult?.platform.originationFeePercent).toBe(0)
      expect(strikeResult?.loan.originationFee).toBe(0) // Strike has no origination fee
    })

    it('should recalculate when risk management parameters change', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      const initialLocked = initialResult?.collateral.lockedCollateralBtc || 0

      // Change target LTV
      params = {
        ...baseParams,
        riskManagement: {
          ...baseParams.riskManagement,
          targetLtv: 70 // Higher LTV = less collateral needed
        }
      }
      rerender()

      const updatedResult = result.current
      const updatedLocked = updatedResult?.collateral.lockedCollateralBtc || 0
      expect(updatedLocked).toBeLessThan(initialLocked) // Less collateral needed with higher LTV
    })

    it('should handle rapid parameter changes efficiently', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const startTime = performance.now()

      // Simulate rapid parameter changes
      for (let i = 0; i < 10; i++) {
        params = { ...params, btcAmount: 1 + (i * 0.1) }
        rerender()
        expect(result.current).not.toBeNull()
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should complete all recalculations quickly (less than 100ms total)
      expect(totalTime).toBeLessThan(100)
    })

    it('should provide cache management functions', () => {
      const { result } = renderHook(() => useCalculations(baseParams))

      expect(result.current).not.toBeNull()
      expect(typeof result.current?.clearCache).toBe('function')
      expect(typeof result.current?.getCacheStats).toBe('function')

      // Test cache stats
      const stats = result.current?.getCacheStats()
      expect(stats).toBeDefined()
      expect(typeof stats?.size).toBe('number')
      expect(Array.isArray(stats?.keys)).toBe(true)
    })

    it('should handle edge cases gracefully', () => {
      // Test with zero loan
      const zeroLoanParams = { ...baseParams, loanAmountPercent: 0 }
      const { result: zeroResult } = renderHook(() => useCalculations(zeroLoanParams))

      expect(zeroResult.current).not.toBeNull()
      expect(zeroResult.current?.loan.currentLoanAmount).toBe(0)
      expect(zeroResult.current?.collateral.lockedCollateralBtc).toBe(0)
      expect(zeroResult.current?.liquidation.liquidationPrice).toBe(0)

      // Test with very small BTC amount
      const smallBtcParams = { ...baseParams, btcAmount: 0.001 }
      const { result: smallResult } = renderHook(() => useCalculations(smallBtcParams))

      expect(smallResult.current).not.toBeNull()
      expect(smallResult.current?.collateral.totalStackValue).toBe(100) // 0.001 * $100k
    })

    it('should maintain referential stability for unchanged calculations', () => {
      const { result, rerender } = renderHook(() => useCalculations(baseParams))

      const firstResult = result.current

      // Rerender with same parameters
      rerender()

      const secondResult = result.current

      // Results should be referentially equal due to memoization
      expect(firstResult).toBe(secondResult)
    })

    it('should handle all platform types correctly', () => {
      const platforms = ['firefish', 'strike', 'custom'] as const

      platforms.forEach(platform => {
        const params = { ...baseParams, platform }
        const { result } = renderHook(() => useCalculations(params))

        expect(result.current).not.toBeNull()
        expect(result.current?.platform.platform).toBeDefined()
        expect(result.current?.validation.isValid).toBe(true)
      })
    })
  })
})
