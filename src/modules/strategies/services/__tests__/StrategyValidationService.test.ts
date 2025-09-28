import { describe, it, expect, beforeEach } from 'vitest'
import { StrategyValidationService, StrategyValidationParams } from '../StrategyValidationService'

describe('StrategyValidationService', () => {
  let validationService: StrategyValidationService
  let validParams: StrategyValidationParams

  beforeEach(() => {
    validationService = StrategyValidationService.getInstance()
    validParams = {
      loanAmount: 10000,
      btcStackValue: 100000,
      loanTermMonths: 6,
      annualInterestRate: 6.5,
      platform: 'firefish',
      originationFeePercent: 1.5,
      liquidationFeePercent: 5,
      targetLtv: 50,
      liquidationLtv: 80,
      maxLoanAmount: 50000,
      btcAccumulationEnabled: true,
      rolloverEnabled: true
    }
  })

  describe('Loan Amount Validation', () => {
    it('should reject loan amounts below $100', () => {
      const params = { ...validParams, loanAmount: 50 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('LOAN_AMOUNT_TOO_LOW')
      expect(result.errors[0].message).toContain('at least $100')
    })

    it('should reject loan amounts above 90% of BTC stack', () => {
      const params = { ...validParams, loanAmount: 95000 } // 95% of 100k stack
      const result = validationService.validateRollingLoanStrategy(params)

      expect(result.isValid).toBe(false)
      expect(result.errors.filter(e => e.code === 'LOAN_AMOUNT_TOO_HIGH')).toHaveLength(1)
      expect(result.errors.find(e => e.code === 'LOAN_AMOUNT_TOO_HIGH')?.message).toContain('90% of BTC stack')
    })

    it('should warn for high loan amounts (>50% of stack)', () => {
      const params = { ...validParams, loanAmount: 60000, targetLtv: 70 } // 60% of 100k stack, higher LTV to avoid collateral issues
      const result = validationService.validateRollingLoanStrategy(params)

      // Should be valid but with warnings
      expect(result.errors).toHaveLength(0)
      expect(result.warnings.filter(w => w.code === 'HIGH_LOAN_AMOUNT')).toHaveLength(1)
      expect(result.warnings.find(w => w.code === 'HIGH_LOAN_AMOUNT')?.message).toContain('liquidation risk')
    })

    it('should provide info for small loan amounts', () => {
      const params = { ...validParams, loanAmount: 500 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.infos.some(info => info.code === 'SMALL_LOAN_AMOUNT')).toBe(true)
    })

    it('should accept valid loan amounts', () => {
      const params = { ...validParams, loanAmount: 25000 } // 25% of stack
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.errors.filter(e => e.field === 'loanAmount')).toHaveLength(0)
    })
  })

  describe('Loan Term Validation', () => {
    it('should reject terms below 1 month', () => {
      const params = { ...validParams, loanTermMonths: 0 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('LOAN_TERM_TOO_SHORT')
    })

    it('should reject terms above 36 months', () => {
      const params = { ...validParams, loanTermMonths: 48 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('LOAN_TERM_TOO_LONG')
    })

    it('should warn for very short terms', () => {
      const params = { ...validParams, loanTermMonths: 2 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'SHORT_LOAN_TERM')).toBe(true)
    })

    it('should warn for very long terms', () => {
      const params = { ...validParams, loanTermMonths: 30 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'LONG_LOAN_TERM')).toBe(true)
    })

    it('should provide info for optimal terms', () => {
      const params = { ...validParams, loanTermMonths: 9 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.infos.some(info => info.code === 'OPTIMAL_LOAN_TERM')).toBe(true)
    })
  })

  describe('Interest Rate Validation', () => {
    it('should reject rates below 0.1%', () => {
      const params = { ...validParams, annualInterestRate: 0.05 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INTEREST_RATE_TOO_LOW')
    })

    it('should reject rates above 50%', () => {
      const params = { ...validParams, annualInterestRate: 60 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INTEREST_RATE_TOO_HIGH')
    })

    it('should warn for unrealistically low rates', () => {
      const params = { ...validParams, annualInterestRate: 1 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'UNREALISTIC_LOW_RATE')).toBe(true)
    })

    it('should warn for high rates', () => {
      const params = { ...validParams, annualInterestRate: 20 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'HIGH_INTEREST_RATE')).toBe(true)
    })

    it('should provide info for typical rates', () => {
      const params = { ...validParams, annualInterestRate: 7.5 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.infos.some(info => info.code === 'TYPICAL_INTEREST_RATE')).toBe(true)
    })
  })

  describe('LTV Ratio Validation', () => {
    it('should reject invalid target LTV', () => {
      const params = { ...validParams, targetLtv: 0 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_TARGET_LTV')).toBe(true)
    })

    it('should reject invalid liquidation LTV', () => {
      const params = { ...validParams, liquidationLtv: 105 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_LIQUIDATION_LTV')).toBe(true)
    })

    it('should reject target LTV >= liquidation LTV', () => {
      const params = { ...validParams, targetLtv: 80, liquidationLtv: 75 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_LTV_RELATIONSHIP')).toBe(true)
    })

    it('should warn for high target LTV', () => {
      const params = { ...validParams, targetLtv: 75, liquidationLtv: 85 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'HIGH_TARGET_LTV')).toBe(true)
    })

    it('should warn for small LTV buffer', () => {
      const params = { ...validParams, targetLtv: 75, liquidationLtv: 80 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'SMALL_LTV_BUFFER')).toBe(true)
    })
  })

  describe('Platform Constraints Validation', () => {
    it('should reject target LTV exceeding platform limits', () => {
      const params = { ...validParams, platform: 'firefish', targetLtv: 80 } // Firefish max is 75%
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'PLATFORM_LTV_EXCEEDED')).toBe(true)
    })

    it('should warn for long terms on Firefish', () => {
      const params = { ...validParams, platform: 'firefish', loanTermMonths: 18 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'PLATFORM_TERM_WARNING')).toBe(true)
    })
  })

  describe('Collateral Sufficiency Validation', () => {
    it('should reject insufficient collateral', () => {
      const params = { ...validParams, loanAmount: 80000, targetLtv: 50 } // Needs 160k collateral but only have 100k
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_COLLATERAL')).toBe(true)
    })

    it('should accept sufficient collateral', () => {
      const params = { ...validParams, loanAmount: 40000, targetLtv: 50 } // Needs 80k collateral, have 100k
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.errors.filter(e => e.code === 'INSUFFICIENT_COLLATERAL')).toHaveLength(0)
    })
  })

  describe('Strategy Parameters Validation', () => {
    it('should require rollover to be enabled', () => {
      const params = { ...validParams, rolloverEnabled: false }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'ROLLOVER_REQUIRED')).toBe(true)
    })

    it('should provide info about accumulation mode', () => {
      const params = { ...validParams, btcAccumulationEnabled: true }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.infos.some(info => info.code === 'ACCUMULATION_MODE')).toBe(true)
    })

    it('should provide info about cash generation mode', () => {
      const params = { ...validParams, btcAccumulationEnabled: false }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.infos.some(info => info.code === 'CASH_GENERATION_MODE')).toBe(true)
    })

    it('should warn for small accumulation loans', () => {
      const params = { ...validParams, btcAccumulationEnabled: true, loanAmount: 3000 }
      const result = validationService.validateRollingLoanStrategy(params)
      
      expect(result.warnings.some(w => w.code === 'SMALL_ACCUMULATION_LOAN')).toBe(true)
    })
  })

  describe('Validation Summary', () => {
    it('should return success message for valid parameters', () => {
      const result = validationService.validateRollingLoanStrategy(validParams)
      const summary = validationService.getValidationSummary(result)
      
      expect(summary).toBe('All parameters are valid for rolling loan strategy')
    })

    it('should return error count for invalid parameters', () => {
      const params = { ...validParams, loanAmount: 50, loanTermMonths: 0 }
      const result = validationService.validateRollingLoanStrategy(params)
      const summary = validationService.getValidationSummary(result)
      
      expect(summary).toContain('2 errors must be fixed')
    })

    it('should return warning count when only warnings exist', () => {
      const params = { ...validParams, loanAmount: 60000, targetLtv: 70 } // High loan amount, higher LTV
      const result = validationService.validateRollingLoanStrategy(params)

      // Ensure no errors, only warnings
      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)

      const summary = validationService.getValidationSummary(result)
      expect(summary).toContain('warning')
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StrategyValidationService.getInstance()
      const instance2 = StrategyValidationService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })
})
