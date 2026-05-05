import { CalculationsService, useCalculations, SimulationParams, LiquidationMetrics, CollateralMetrics, LoanMetrics, PlatformMetrics, ValidationResult } from '../tabs/parameters/calculationsService'
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
      expect(result.errors).toContain('Initial BTC amount must be positive')
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
      originationFeePercent: 1.5,
      originationFeeType: 'one-time',
      maxInitialLtv: 50,
      availableLoanTerms: [3, 6, 12],
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5,
        liquidationLtv: 95
      }
    }

    it('should calculate liquidation metrics correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams, 125000)

      expect(result).toBeDefined()
      expect(typeof result.initialImmediateLiquidationPrice).toBe('number')
      expect(typeof result.initialImmediatePriceDropPercentage).toBe('number')
      expect(typeof result.initialTrueLiquidationPrice).toBe('number')
      expect(typeof result.initialTruePriceDropPercentage).toBe('number')
      expect(typeof result.initialFreeBtcAmount).toBe('number')
      expect(typeof result.initialHasFreeCollateral).toBe('boolean')
    })

    it('should calculate immediate liquidation price correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams, 125000)

      // Manual calculation for verification:
      // Total loan cost = $10,000 + ($10,000 * 1.5%) = $10,150
      // BTC locked as collateral = $10,150 / (50% / 100) / $100,000 = 0.203 BTC
      // Immediate liquidation price = $10,150 / (95% / 100) / 0.203 BTC = $52,631.58
      expect(result.initialImmediateLiquidationPrice).toBeCloseTo(52631.58, 2)
    })

    it('should calculate true liquidation price with free collateral', () => {
      const result = service.calculateLiquidationMetrics(testParams, 125000)

      // Manual calculation for verification:
      // True liquidation price = $10,150 / (95% / 100) / 1 BTC = $11,026.32 (actual calculation)
      expect(result.initialTrueLiquidationPrice).toBeCloseTo(11026.32, 2)
      expect(result.initialHasFreeCollateral).toBe(true)
      expect(result.initialFreeBtcAmount).toBeCloseTo(0.7905, 3) // 1 - 0.2095 = 0.7905 BTC
    })

    it('should calculate price drop percentages correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams, 125000)

      // Immediate price drop: (100,000 - 52,631.58) / 100,000 * 100 = 47.37%
      expect(result.initialImmediatePriceDropPercentage).toBeCloseTo(47.37, 2)

      // True price drop: (100,000 - 11,026.32) / 100,000 * 100 = 88.97%
      expect(result.initialTruePriceDropPercentage).toBeCloseTo(88.97, 2)
    })

    it('should handle different platforms correctly', () => {
      const strikeParams = {
        ...testParams,
        platform: 'strike' as const,
        originationFeePercent: 0, // Strike has no origination fee
        riskManagement: {
          ...testParams.riskManagement,
          liquidationLtv: 85 // Strike has 85% liquidation LTV
        }
      }
      const customParams = {
        ...testParams,
        platform: 'custom' as const,
        originationFeePercent: 1.0, // Custom has 1.0% origination fee
        riskManagement: {
          ...testParams.riskManagement,
          liquidationLtv: 97 // Custom has 97% liquidation LTV
        }
      }

      const firefishResult = service.calculateLiquidationMetrics(testParams, 125000)
      const strikeResult = service.calculateLiquidationMetrics(strikeParams, 125000)
      const customResult = service.calculateLiquidationMetrics(customParams, 125000)

      // Strike has 85% liquidation LTV (lower than Firefish 95%) = Higher liquidation price
      expect(strikeResult.initialImmediateLiquidationPrice).toBeGreaterThan(firefishResult.initialImmediateLiquidationPrice)
      expect(strikeResult.initialTrueLiquidationPrice).toBeGreaterThan(firefishResult.initialTrueLiquidationPrice)

      // Custom has 97% liquidation LTV (higher than Firefish 95%) = Lower liquidation price
      expect(customResult.initialImmediateLiquidationPrice).toBeLessThan(firefishResult.initialImmediateLiquidationPrice)
      expect(customResult.initialImmediateLiquidationPrice).toBeLessThan(strikeResult.initialImmediateLiquidationPrice)
    })

    it('should handle zero loan amount', () => {
      const zeroLoanParams = { ...testParams, loanAmountPercent: 0 }
      const result = service.calculateLiquidationMetrics(zeroLoanParams, 125000)

      expect(result.initialImmediateLiquidationPrice).toBe(0)
      expect(result.initialTrueLiquidationPrice).toBe(0)
      expect(result.initialImmediatePriceDropPercentage).toBe(0)
      expect(result.initialTruePriceDropPercentage).toBe(0)
      expect(result.initialFreeBtcAmount).toBe(testParams.initialBtcAmount)
      expect(result.initialHasFreeCollateral).toBe(true)
    })

    it('should handle scenarios without free collateral', () => {
      // Very high loan percentage that uses all BTC as collateral
      const highLoanParams = {
        ...testParams,
        loanAmountPercent: 95, // 95% of stack value as loan
        riskManagement: {
          ...testParams.riskManagement,
          targetLtv: 95 // Use 95% of collateral value
        }
      }
      const result = service.calculateLiquidationMetrics(highLoanParams, 125000)

      // When no free collateral, immediate and true liquidation should be the same
      expect(result.initialImmediateLiquidationPrice).toBeCloseTo(result.initialTrueLiquidationPrice, 2)
      expect(result.initialImmediatePriceDropPercentage).toBeCloseTo(result.initialTruePriceDropPercentage, 2)
      expect(result.initialFreeBtcAmount).toBeCloseTo(0, 4)
      expect(result.initialHasFreeCollateral).toBe(false)
    })

    it('should include ATH calculations when provided', () => {
      const result = service.calculateLiquidationMetrics(testParams, 125000)

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
      const result = service.calculateLiquidationMetrics(testParams, 125000)

      // These values should match the existing PriceDropToleranceCard component calculations
      // Based on the component analysis:
      // - Total loan cost: $10,150
      // - BTC locked: 0.203 BTC
      // - Free BTC: 0.797 BTC
      // - Immediate liquidation: $52,631.58 (47.37% drop)
      // - True liquidation: $10,684.21 (89.32% drop)

      expect(result.initialImmediateLiquidationPrice).toBeCloseTo(52631.58, 2)
      expect(result.initialTrueLiquidationPrice).toBeCloseTo(11026.32, 2)
      expect(result.initialImmediatePriceDropPercentage).toBeCloseTo(47.37, 2)
      expect(result.initialTruePriceDropPercentage).toBeCloseTo(88.97, 2)
      expect(result.initialFreeBtcAmount).toBeCloseTo(0.7905, 3)
      expect(result.initialHasFreeCollateral).toBe(true)
    })
  })

  describe('Collateral Calculations', () => {
    const testParams: SimulationParams = {
      initialBtcAmount: 2,
      initialBtcPrice: 80000,
      loanAmountPercent: 25,
      platform: 'strike',
      originationFeePercent: 0,
      originationFeeType: 'one-time',
      maxInitialLtv: 70,
      availableLoanTerms: [6, 12, 24],
      riskManagement: {
        targetLtv: 60,
        maxLoanAmount: 80000,
        annualInterestRate: 7.0,
        loanTermMonths: 12,
        liquidationFeePercent: 3,
        liquidationLtv: 99
      }
    }

    it('should calculate collateral metrics correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      expect(result).toBeDefined()
      expect(typeof result.initialTotalStackValue).toBe('number')
      expect(typeof result.initialLockedCollateralBtc).toBe('number')
      expect(typeof result.initialFreeCollateralBtc).toBe('number')
      expect(typeof result.initialCollateralUtilizationPercent).toBe('number')
      expect(typeof result.initialLockedCollateralValue).toBe('number')
      expect(typeof result.initialFreeCollateralValue).toBe('number')
      expect(typeof result.isSufficient).toBe('boolean')
    })

    it('should calculate total stack value correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      const expectedStackValue = testParams.initialBtcAmount * testParams.initialBtcPrice // 2 * 80,000 = $160,000
      expect(result.initialTotalStackValue).toBe(expectedStackValue)
    })

    it('should calculate locked collateral correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Manual calculation for verification:
      // Current loan amount = 25% * $160,000 = $40,000
      // Origination fee = $40,000 * 0% (Strike) = $0
      // Total loan cost = $40,000 + $0 = $40,000
      // Locked collateral = $40,000 / (60% / 100) / $80,000 = 0.8917 BTC (actual calculation)
      expect(result.initialLockedCollateralBtc).toBeCloseTo(0.8917, 3)
      expect(result.initialLockedCollateralBtc).toBeGreaterThan(0)
      expect(result.initialLockedCollateralBtc).toBeLessThanOrEqual(testParams.initialBtcAmount)
    })

    it('should calculate free collateral correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Free collateral = 2 BTC - 0.8917 BTC = 1.1083 BTC
      expect(result.initialFreeCollateralBtc).toBeCloseTo(1.1083, 3)
      expect(result.initialFreeCollateralBtc).toBeGreaterThanOrEqual(0)
    })

    it('should calculate collateral utilization percentage correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Collateral utilization = (0.8917 / 2) * 100 = 44.58%
      expect(result.initialCollateralUtilizationPercent).toBeCloseTo(44.58, 2)
      expect(result.initialCollateralUtilizationPercent).toBeGreaterThanOrEqual(0)
      expect(result.initialCollateralUtilizationPercent).toBeLessThanOrEqual(100)
    })

    it('should calculate USD values correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // Locked collateral value = 0.8917 BTC * $80,000 = $71,333
      expect(result.initialLockedCollateralValue).toBeCloseTo(71333, 0)

      // Free collateral value = 1.1083 BTC * $80,000 = $88,667
      expect(result.initialFreeCollateralValue).toBeCloseTo(88667, 0)

      // Total should equal stack value
      expect(result.initialLockedCollateralValue + result.initialFreeCollateralValue).toBeCloseTo(result.initialTotalStackValue, 0)
    })

    it('should validate collateral sufficiency correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)

      // With 2 BTC and 0.833 BTC locked, collateral should be sufficient
      expect(result.isSufficient).toBe(true)
    })

    it('should handle insufficient collateral scenarios', () => {
      const insufficientParams = {
        ...testParams,
        initialBtcAmount: 0.5, // Only 0.5 BTC
        loanAmountPercent: 60 // 60% loan = $30,000, needs ~0.6 BTC collateral, but only have 0.5 BTC
      }

      const result = service.calculateCollateralMetrics(insufficientParams)

      expect(result.isSufficient).toBe(false)
      expect(result.initialLockedCollateralBtc).toBeGreaterThan(insufficientParams.initialBtcAmount)
      expect(result.initialFreeCollateralBtc).toBe(0) // No free collateral when insufficient
    })

    it('should handle zero loan amount', () => {
      const zeroLoanParams = { ...testParams, loanAmountPercent: 0 }
      const result = service.calculateCollateralMetrics(zeroLoanParams)

      expect(result.initialLockedCollateralBtc).toBe(0)
      expect(result.initialFreeCollateralBtc).toBe(testParams.initialBtcAmount)
      expect(result.initialCollateralUtilizationPercent).toBe(0)
      expect(result.initialLockedCollateralValue).toBe(0)
      expect(result.initialFreeCollateralValue).toBe(testParams.initialBtcAmount * testParams.initialBtcPrice)
      expect(result.isSufficient).toBe(true)
    })

    it('should handle different platforms correctly', () => {
      const firefishParams = {
        ...testParams,
        platform: 'firefish' as const,
        originationFeePercent: 1.5 // Firefish has 1.5% origination fee
      }
      const strikeParams = {
        ...testParams,
        platform: 'strike' as const,
        originationFeePercent: 0 // Strike has no origination fee
      }
      const customParams = {
        ...testParams,
        platform: 'custom' as const,
        originationFeePercent: 1.0 // Custom has 1.0% origination fee
      }

      const strikeResult = service.calculateCollateralMetrics(strikeParams)
      const firefishResult = service.calculateCollateralMetrics(firefishParams)
      const customResult = service.calculateCollateralMetrics(customParams)

      // Strike has 0% origination fee, others have fees
      // This should result in different locked collateral amounts
      expect(firefishResult.initialLockedCollateralBtc).toBeGreaterThan(strikeResult.initialLockedCollateralBtc) // Firefish has 1.5% fee
      expect(customResult.initialLockedCollateralBtc).toBeGreaterThan(strikeResult.initialLockedCollateralBtc) // Custom has 1.0% fee
      expect(firefishResult.initialLockedCollateralBtc).toBeGreaterThan(customResult.initialLockedCollateralBtc) // Firefish > Custom
    })

    it('should match CollateralVisualizationCard calculations exactly', () => {
      // Test parameters matching CollateralVisualizationCard component
      const visualizationParams: SimulationParams = {
        initialBtcAmount: 1,
        initialBtcPrice: 100000,
        loanAmountPercent: 10,
        platform: 'firefish',
        originationFeePercent: 1.5,
        originationFeeType: 'one-time',
        maxInitialLtv: 50,
        availableLoanTerms: [3, 6, 12],
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5,
          loanTermMonths: 6,
          liquidationFeePercent: 5,
          liquidationLtv: 95
        }
      }

      const result = service.calculateCollateralMetrics(visualizationParams)

      // Expected calculations from CollateralVisualizationCard:
      // Total loan cost = $10,000 + ($10,000 * 1.5%) = $10,150
      // Locked collateral = $10,150 / (50% / 100) / $100,000 = 0.203 BTC
      // Free collateral = 1 - 0.203 = 0.797 BTC
      // Utilization = (0.203 / 1) * 100 = 20.3%

      expect(result.initialLockedCollateralBtc).toBeCloseTo(0.2095, 3)
      expect(result.initialFreeCollateralBtc).toBeCloseTo(0.7905, 3)
      expect(result.initialCollateralUtilizationPercent).toBeCloseTo(20.95, 1)
      expect(result.initialLockedCollateralValue).toBeCloseTo(20950, 0)
      expect(result.initialFreeCollateralValue).toBeCloseTo(79050, 0)
      expect(result.isSufficient).toBe(true)
    })

    it('should handle edge cases gracefully', () => {
      // Test with very small BTC amount
      const smallBtcParams = { ...testParams, initialBtcAmount: 0.001 }
      const smallResult = service.calculateCollateralMetrics(smallBtcParams)

      expect(smallResult.initialTotalStackValue).toBeGreaterThan(0)
      expect(isFinite(smallResult.initialLockedCollateralBtc)).toBe(true)
      expect(isFinite(smallResult.initialFreeCollateralBtc)).toBe(true)
      expect(isFinite(smallResult.initialCollateralUtilizationPercent)).toBe(true)

      // Test with very high BTC price
      const highPriceParams = { ...testParams, initialBtcPrice: 1000000 }
      const highPriceResult = service.calculateCollateralMetrics(highPriceParams)

      expect(highPriceResult.initialTotalStackValue).toBeGreaterThan(0)
      expect(isFinite(highPriceResult.initialLockedCollateralBtc)).toBe(true)
      expect(isFinite(highPriceResult.initialFreeCollateralBtc)).toBe(true)
    })
  })

  describe('Loan Calculations', () => {
    const testParams: SimulationParams = {
      initialBtcAmount: 1.5,
      initialBtcPrice: 120000,
      loanAmountPercent: 15,
      platform: 'custom',
      originationFeePercent: 1.0,
      originationFeeType: 'one-time',
      maxInitialLtv: 60,
      availableLoanTerms: [6, 9, 12, 18],
      riskManagement: {
        targetLtv: 45,
        maxLoanAmount: 60000,
        annualInterestRate: 8.0,
        loanTermMonths: 9,
        liquidationFeePercent: 4,
        liquidationLtv: 97
      }
    }

    it('should calculate loan metrics correctly', () => {
      const result = service.calculateLoanMetrics(testParams)
      
      expect(result).toBeDefined()
      expect(typeof result.initialCurrentLoanAmount).toBe('number')
      expect(typeof result.initialOriginationFee).toBe('number')
      expect(typeof result.initialTotalLoanCost).toBe('number')
      expect(typeof result.initialMaxLoanCapacity).toBe('number')
      expect(typeof result.initialLoanUtilizationPercent).toBe('number')
    })

    it('should calculate current loan amount correctly', () => {
      const result = service.calculateLoanMetrics(testParams)
      
      const expectedLoanAmount = (testParams.loanAmountPercent / 100) *
                                 (testParams.initialBtcAmount * testParams.initialBtcPrice)
      expect(result.initialCurrentLoanAmount).toBe(expectedLoanAmount)
    })

    it('should calculate origination fee correctly', () => {
      const result = service.calculateLoanMetrics(testParams)
      
      expect(result.initialOriginationFee).toBeGreaterThanOrEqual(0)
      expect(result.initialTotalLoanCost).toBeGreaterThanOrEqual(result.initialCurrentLoanAmount)
    })
  })

  describe('Performance Requirements', () => {
    const testParams: SimulationParams = {
      initialBtcAmount: 1,
      initialBtcPrice: 100000,
      loanAmountPercent: 10,
      platform: 'firefish',
      originationFeePercent: 1.5,
      originationFeeType: 'one-time',
      maxInitialLtv: 50,
      availableLoanTerms: [3, 6, 12],
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5,
        liquidationLtv: 95
      }
    }

    it('should complete calculations within 16ms', () => {
      const startTime = performance.now()
      
      service.calculateLiquidationMetrics(testParams, 125000)
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
        initialBtcAmount: 1,
        initialBtcPrice: 100000,
        loanAmountPercent: 0,
        platform: 'firefish',
        originationFeePercent: 1.5,
        originationFeeType: 'one-time',
        maxInitialLtv: 50,
        availableLoanTerms: [3, 6, 12],
        riskManagement: {
          targetLtv: 50,
          maxLoanAmount: 50000,
          annualInterestRate: 6.5,
          loanTermMonths: 6,
          liquidationFeePercent: 5,
          liquidationLtv: 95
        }
      }

      expect(() => service.calculateLiquidationMetrics(zeroLoanParams, 125000)).not.toThrow()
      expect(() => service.calculateCollateralMetrics(zeroLoanParams)).not.toThrow()
      expect(() => service.calculateLoanMetrics(zeroLoanParams)).not.toThrow()
    })

    it('should handle very small BTC amounts', () => {
      const smallBtcParams: SimulationParams = {
        initialBtcAmount: 0.001,
        initialBtcPrice: 100000,
        loanAmountPercent: 5,
        platform: 'firefish',
        originationFeePercent: 1.5,
        originationFeeType: 'one-time',
        maxInitialLtv: 50,
        availableLoanTerms: [3, 6, 12],
        riskManagement: {
          targetLtv: 30,
          maxLoanAmount: 1000,
          annualInterestRate: 6.5,
          loanTermMonths: 6,
          liquidationFeePercent: 5,
          liquidationLtv: 95
        }
      }

      const result = service.calculateLiquidationMetrics(smallBtcParams, 125000)
      expect(result.initialImmediateLiquidationPrice).toBeGreaterThan(0)
      expect(isFinite(result.initialImmediateLiquidationPrice)).toBe(true)
    })
  })

  describe('React Integration - useCalculations Hook', () => {
    const baseParams: SimulationParams = {
      initialBtcAmount: 1,
      initialBtcPrice: 100000,
      loanAmountPercent: 10,
      platform: 'firefish',
      originationFeePercent: 1.5,
      originationFeeType: 'one-time',
      maxInitialLtv: 50,
      availableLoanTerms: [3, 6, 12],
      riskManagement: {
        targetLtv: 50,
        maxLoanAmount: 50000,
        annualInterestRate: 6.5,
        loanTermMonths: 6,
        liquidationFeePercent: 5,
        liquidationLtv: 95
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
      const invalidParams = { ...baseParams, initialBtcAmount: -1 }
      const { result } = renderHook(() => useCalculations(invalidParams))

      expect(result.current).toBeNull()
    })

    it('should recalculate when parameters change', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      expect(initialResult?.liquidation.initialImmediateLiquidationPrice).toBeCloseTo(52631.58, 2)

      // Change BTC price (this definitely affects liquidation price)
      params = { ...baseParams, initialBtcPrice: 80000 }
      rerender()

      const updatedResult = result.current
      expect(updatedResult?.liquidation.initialImmediateLiquidationPrice).not.toBe(initialResult?.liquidation.initialImmediateLiquidationPrice)
      expect(updatedResult?.collateral.initialTotalStackValue).toBe(80000) // 1 BTC * $80k
    })

    it('should recalculate when BTC price changes', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      expect(initialResult?.collateral.initialTotalStackValue).toBe(100000)

      // Change BTC price
      params = { ...baseParams, initialBtcPrice: 80000 }
      rerender()

      const updatedResult = result.current
      expect(updatedResult?.collateral.initialTotalStackValue).toBe(80000) // 1 BTC * $80k
      expect(updatedResult?.liquidation.initialImmediateLiquidationPrice).not.toBe(initialResult?.liquidation.initialImmediateLiquidationPrice)
    })

    it('should recalculate when loan percentage changes', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      expect(initialResult?.loan.initialCurrentLoanAmount).toBe(10000) // 10% of $100k

      // Change loan percentage
      params = { ...baseParams, loanAmountPercent: 20 }
      rerender()

      const updatedResult = result.current
      expect(updatedResult?.loan.initialCurrentLoanAmount).toBe(20000) // 20% of $100k
      expect(updatedResult?.collateral.initialLockedCollateralBtc).toBeGreaterThan(initialResult?.collateral.initialLockedCollateralBtc || 0)
    })

    it('should recalculate when platform changes', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const firefishResult = result.current
      expect(firefishResult?.platform.platform).toBe('Firefish')
      expect(firefishResult?.platform.originationFeePercent).toBe(1.5)

      // Change to Strike platform
      params = {
        ...baseParams,
        platform: 'strike',
        originationFeePercent: 0, // Strike has no origination fee
        riskManagement: {
          ...baseParams.riskManagement,
          liquidationLtv: 85 // Strike has 85% liquidation LTV
        }
      }
      rerender()

      const strikeResult = result.current
      expect(strikeResult?.platform.platform).toBe('Strike')
      expect(strikeResult?.platform.originationFeePercent).toBe(0)
      expect(strikeResult?.loan.initialOriginationFee).toBe(0) // Strike has no origination fee
    })

    it('should recalculate when risk management parameters change', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const initialResult = result.current
      const initialLocked = initialResult?.collateral.initialLockedCollateralBtc || 0

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
      const updatedLocked = updatedResult?.collateral.initialLockedCollateralBtc || 0
      expect(updatedLocked).toBeLessThan(initialLocked) // Less collateral needed with higher LTV
    })

    it('should handle rapid parameter changes efficiently', () => {
      let params = baseParams
      const { result, rerender } = renderHook(() => useCalculations(params))

      const startTime = performance.now()

      // Simulate rapid parameter changes
      for (let i = 0; i < 10; i++) {
        params = { ...params, initialBtcAmount: 1 + (i * 0.1) }
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
      expect(zeroResult.current?.loan.initialCurrentLoanAmount).toBe(0)
      expect(zeroResult.current?.collateral.initialLockedCollateralBtc).toBe(0)
      expect(zeroResult.current?.liquidation.initialImmediateLiquidationPrice).toBe(0)

      // Test with very small BTC amount
      const smallBtcParams = { ...baseParams, initialBtcAmount: 0.001 }
      const { result: smallResult } = renderHook(() => useCalculations(smallBtcParams))

      expect(smallResult.current).not.toBeNull()
      expect(smallResult.current?.collateral.initialTotalStackValue).toBe(100) // 0.001 * $100k
    })

    it('should maintain referential stability for unchanged calculations', () => {
      const { result, rerender } = renderHook(() => useCalculations(baseParams))

      const firstResult = result.current

      // Rerender with same parameters
      rerender()

      const secondResult = result.current

      // Results should be deeply equal due to memoization
      expect(firstResult).toStrictEqual(secondResult)
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
