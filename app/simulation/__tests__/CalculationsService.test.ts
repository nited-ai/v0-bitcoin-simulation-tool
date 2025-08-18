import { CalculationsService } from '../components/parameters/calculationsService'
import { SimulationParams, LiquidationMetrics, CollateralMetrics, LoanMetrics, PlatformMetrics, ValidationResult } from '../components/parameters/calculationsService'

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

    it('should validate valid parameters successfully', () => {
      const result = service.validateParameters(validParams)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative BTC amount', () => {
      const invalidParams = { ...validParams, btcAmount: -1 }
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

    it('should calculate liquidation metrics correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams)

      expect(result).toBeDefined()
      expect(typeof result.liquidationPrice).toBe('number')
      expect(typeof result.priceDropPercentage).toBe('number')
      expect(typeof result.trueLiquidationPrice).toBe('number')
      expect(typeof result.truePriceDropPercentage).toBe('number')
      expect(typeof result.freeBtcAmount).toBe('number')
      expect(typeof result.hasFreeCollateral).toBe('boolean')
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
    })

    it('should calculate total stack value correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)
      
      const expectedStackValue = testParams.btcAmount * testParams.initialBtcPrice
      expect(result.totalStackValue).toBe(expectedStackValue)
    })

    it('should calculate locked collateral correctly', () => {
      const result = service.calculateCollateralMetrics(testParams)
      
      expect(result.lockedCollateralBtc).toBeGreaterThan(0)
      expect(result.lockedCollateralBtc).toBeLessThanOrEqual(testParams.btcAmount)
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
})
