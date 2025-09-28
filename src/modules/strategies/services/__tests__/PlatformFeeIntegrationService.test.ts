import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PlatformFeeIntegrationService } from '../PlatformFeeIntegrationService'

// Mock the platform presets module
vi.mock('../../../../app/simulation/constants/platformPresets', () => ({
  getPlatformConfig: vi.fn((platformId: string) => {
    const configs = {
      firefish: {
        id: 'firefish',
        name: 'Firefish',
        description: 'Conservative lending platform with moderate fees',
        originationFeePercent: 1.5,
        originationFeeType: 'annual',
        liquidationLtv: 95,
        liquidationFeePercent: 5.0,
        availableLoanTerms: [3, 6, 12, 18, 24],
        defaultLoanTerm: 24,
        maxInitialLtv: 50
      },
      strike: {
        id: 'strike',
        name: 'Strike',
        description: 'Flexible lending platform with competitive rates',
        originationFeePercent: 0,
        originationFeeType: 'one-time',
        liquidationLtv: 85,
        liquidationFeePercent: 1.0,
        availableLoanTerms: [6, 12, 18, 24, 'infinity'],
        defaultLoanTerm: 'infinity',
        maxInitialLtv: 50
      },
      custom: {
        id: 'custom',
        name: 'Custom',
        description: 'Customizable platform settings',
        originationFeePercent: 1.0,
        originationFeeType: 'one-time',
        liquidationLtv: 97,
        liquidationFeePercent: 3.0,
        availableLoanTerms: [3, 6, 12, 18, 24, 'infinity'],
        defaultLoanTerm: 12,
        maxInitialLtv: 75
      }
    }
    return configs[platformId as keyof typeof configs] || configs.custom
  })
}))

describe('PlatformFeeIntegrationService', () => {
  let service: PlatformFeeIntegrationService

  beforeEach(() => {
    service = new PlatformFeeIntegrationService()
  })

  describe('Basic Interface', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(PlatformFeeIntegrationService)
    })

    it('should have all required methods', () => {
      expect(typeof service.getPlatformFeeConfig).toBe('function')
      expect(typeof service.calculatePlatformFees).toBe('function')
      expect(typeof service.getPlatformFeeSummary).toBe('function')
      expect(typeof service.validatePlatformFeeConfig).toBe('function')
      expect(typeof service.getAllPlatformFeeConfigurations).toBe('function')
    })
  })

  describe('Platform Fee Configuration', () => {
    it('should get Firefish platform fee configuration', () => {
      const config = service.getPlatformFeeConfig('firefish')
      
      expect(config.type).toBe('annual')
      expect(config.percent).toBe(1.5)
    })

    it('should get Strike platform fee configuration', () => {
      const config = service.getPlatformFeeConfig('strike')
      
      expect(config.type).toBe('none')
      expect(config.percent).toBe(0)
    })

    it('should get Custom platform fee configuration', () => {
      const config = service.getPlatformFeeConfig('custom')
      
      expect(config.type).toBe('one-time')
      expect(config.percent).toBe(1.0)
    })

    it('should handle unknown platform IDs', () => {
      const config = service.getPlatformFeeConfig('unknown-platform')
      
      // Should fallback to custom configuration
      expect(config.type).toBe('one-time')
      expect(config.percent).toBe(1.0)
    })
  })

  describe('Platform Fee Calculations', () => {
    it('should calculate Firefish annual fees correctly', () => {
      const result = service.calculatePlatformFees(10000, 'firefish', 12)
      
      expect(result.amount).toBe(150) // 10000 * 0.015 * 1 year
      expect(result.type).toBe('annual')
      expect(result.description).toContain('Annual platform fee: 1.5% for 1 years')
    })

    it('should calculate Firefish annual fees for multi-year loans', () => {
      const result = service.calculatePlatformFees(10000, 'firefish', 24)
      
      expect(result.amount).toBe(300) // 10000 * 0.015 * 2 years
      expect(result.type).toBe('annual')
      expect(result.description).toContain('Annual platform fee: 1.5% for 2 years')
    })

    it('should handle Strike platform with zero fees', () => {
      const result = service.calculatePlatformFees(10000, 'strike')
      
      expect(result.amount).toBe(0)
      expect(result.type).toBe('none')
      expect(result.description).toBe('No platform fees')
    })

    it('should calculate Custom platform one-time fees', () => {
      const result = service.calculatePlatformFees(10000, 'custom')
      
      expect(result.amount).toBe(100) // 10000 * 0.01
      expect(result.type).toBe('one-time')
      expect(result.description).toContain('One-time platform fee: 1%')
    })

    it('should throw error for annual fees without loan term', () => {
      expect(() => {
        service.calculatePlatformFees(10000, 'firefish')
      }).toThrow('Loan term months required for annual fee calculation')
    })
  })

  describe('Platform Fee Summary', () => {
    it('should provide Firefish platform summary', () => {
      const summary = service.getPlatformFeeSummary('firefish')
      
      expect(summary.platformName).toBe('Firefish')
      expect(summary.feeType).toBe('Annual recurring fee')
      expect(summary.feePercent).toBe(1.5)
      expect(summary.description).toContain('Firefish: Annual recurring fee (1.5%)')
    })

    it('should provide Strike platform summary', () => {
      const summary = service.getPlatformFeeSummary('strike')
      
      expect(summary.platformName).toBe('Strike')
      expect(summary.feeType).toBe('No fees')
      expect(summary.feePercent).toBe(0)
      expect(summary.description).toContain('Strike: No fees')
    })

    it('should provide Custom platform summary', () => {
      const summary = service.getPlatformFeeSummary('custom')
      
      expect(summary.platformName).toBe('Custom')
      expect(summary.feeType).toBe('One-time fee')
      expect(summary.feePercent).toBe(1.0)
      expect(summary.description).toContain('Custom: One-time fee (1%)')
    })
  })

  describe('Platform Fee Validation', () => {
    it('should validate Firefish platform configuration', () => {
      const validation = service.validatePlatformFeeConfig('firefish')
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should validate Strike platform configuration', () => {
      const validation = service.validatePlatformFeeConfig('strike')
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should validate Custom platform configuration', () => {
      const validation = service.validatePlatformFeeConfig('custom')
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('All Platform Configurations', () => {
    it('should return all platform fee configurations', () => {
      const configs = service.getAllPlatformFeeConfigurations()

      expect(configs).toHaveLength(3)

      const firefishConfig = configs.find(c => c.platformId === 'firefish')
      expect(firefishConfig).toBeDefined()
      expect(firefishConfig?.feeConfig.type).toBe('annual')
      expect(firefishConfig?.feeConfig.percent).toBe(1.5)

      const strikeConfig = configs.find(c => c.platformId === 'strike')
      expect(strikeConfig).toBeDefined()
      expect(strikeConfig?.feeConfig.type).toBe('none')
      expect(strikeConfig?.feeConfig.percent).toBe(0)

      const customConfig = configs.find(c => c.platformId === 'custom')
      expect(customConfig).toBeDefined()
      expect(customConfig?.feeConfig.type).toBe('one-time')
      expect(customConfig?.feeConfig.percent).toBe(1.0)
    })
  })

  describe('Platform Fee Integration Verification', () => {
    it('should verify Firefish platform fee calculations match expected values', () => {
      const loanAmount = 25000
      const loanTermMonths = 18

      const result = service.calculatePlatformFees(loanAmount, 'firefish', loanTermMonths)

      // Firefish: 1.5% annual for 1.5 years = 25000 * 0.015 * 1.5 = 562.5
      expect(result.amount).toBe(562.5)
      expect(result.type).toBe('annual')
      expect(result.description).toContain('1.5% for 1.5 years')
    })

    it('should verify Strike platform has zero fees', () => {
      const loanAmount = 50000

      const result = service.calculatePlatformFees(loanAmount, 'strike')

      expect(result.amount).toBe(0)
      expect(result.type).toBe('none')
      expect(result.description).toBe('No platform fees')
    })

    it('should verify Custom platform one-time fee calculations', () => {
      const loanAmount = 15000

      const result = service.calculatePlatformFees(loanAmount, 'custom')

      // Custom: 1.0% one-time = 15000 * 0.01 = 150
      expect(result.amount).toBe(150)
      expect(result.type).toBe('one-time')
      expect(result.description).toContain('One-time platform fee: 1%')
    })

    it('should handle infinity loan terms for annual fees', () => {
      const loanAmount = 20000
      const loanTermMonths = Infinity

      const result = service.calculatePlatformFees(loanAmount, 'firefish', loanTermMonths)

      // For infinity terms, should calculate 1 year of fees
      expect(result.amount).toBe(300) // 20000 * 0.015 * 1
      expect(result.type).toBe('annual')
      expect(result.description).toContain('1.5% for 1 years')
    })

    it('should provide consistent platform summaries', () => {
      const firefishSummary = service.getPlatformFeeSummary('firefish')
      const strikeSummary = service.getPlatformFeeSummary('strike')
      const customSummary = service.getPlatformFeeSummary('custom')

      expect(firefishSummary.description).toBe('Firefish: Annual recurring fee (1.5%)')
      expect(strikeSummary.description).toBe('Strike: No fees')
      expect(customSummary.description).toBe('Custom: One-time fee (1%)')
    })
  })
})
