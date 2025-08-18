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
      
      // With 10% loan ($10k) and 50% target LTV, liquidation should occur when
      // collateral value drops to loan amount / liquidation LTV (95% for Firefish)
      const expectedLiquidationPrice = 10000 / 0.95 / testParams.btcAmount
      expect(result.liquidationPrice).toBeCloseTo(expectedLiquidationPrice, 2)
    })

    it('should identify free collateral correctly', () => {
      const result = service.calculateLiquidationMetrics(testParams)
      
      expect(result.hasFreeCollateral).toBe(true)
      expect(result.freeBtcAmount).toBeGreaterThan(0)
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
