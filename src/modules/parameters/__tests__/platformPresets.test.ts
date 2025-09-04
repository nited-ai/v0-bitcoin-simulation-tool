import { describe, it, expect } from 'vitest'
import { 
  PLATFORM_CONFIGS, 
  getPlatformConfig, 
  getAvailablePlatforms,
  validatePlatformConfig 
} from '../constants/platformPresets'
import type { PlatformConfig } from '../types'

describe('Platform Presets', () => {
  describe('PLATFORM_CONFIGS', () => {
    it('should contain all required platforms', () => {
      expect(PLATFORM_CONFIGS).toHaveProperty('firefish')
      expect(PLATFORM_CONFIGS).toHaveProperty('strike')
      expect(PLATFORM_CONFIGS).toHaveProperty('custom')
    })

    it('should have valid firefish configuration', () => {
      const firefish = PLATFORM_CONFIGS.firefish
      
      expect(firefish.id).toBe('firefish')
      expect(firefish.name).toBe('Firefish')
      expect(firefish.description).toBeTruthy()
      expect(firefish.originationFeePercent).toBe(1.5)
      expect(firefish.originationFeeType).toBe('annual')
      expect(firefish.liquidationLtv).toBe(95)
      expect(firefish.liquidationFeePercent).toBe(5.0)
      expect(firefish.maxInitialLtv).toBe(50)
      expect(firefish.availableLoanTerms).toContain(6)
      expect(firefish.availableLoanTerms).toContain(12)
      expect(firefish.defaultLoanTerm).toBe(24)
    })

    it('should have valid strike configuration', () => {
      const strike = PLATFORM_CONFIGS.strike
      
      expect(strike.id).toBe('strike')
      expect(strike.name).toBe('Strike')
      expect(strike.description).toBeTruthy()
      expect(strike.originationFeePercent).toBe(0)
      expect(strike.originationFeeType).toBe('one-time')
      expect(strike.liquidationLtv).toBe(85)
      expect(strike.liquidationFeePercent).toBe(1.0)
      expect(strike.maxInitialLtv).toBe(50)
      expect(strike.availableLoanTerms).toContain('infinity')
      expect(strike.defaultLoanTerm).toBe('infinity')
    })

    it('should have valid custom configuration', () => {
      const custom = PLATFORM_CONFIGS.custom
      
      expect(custom.id).toBe('custom')
      expect(custom.name).toBe('Custom')
      expect(custom.description).toBeTruthy()
      expect(custom.originationFeePercent).toBe(1.0)
      expect(custom.originationFeeType).toBe('one-time')
      expect(custom.liquidationLtv).toBe(97)
      expect(custom.liquidationFeePercent).toBe(3.0)
      expect(custom.maxInitialLtv).toBe(75)
      expect(custom.availableLoanTerms).toContain(12)
      expect(custom.defaultLoanTerm).toBe(12)
    })
  })

  describe('getPlatformConfig', () => {
    it('should return correct platform config for valid platform', () => {
      const firefishConfig = getPlatformConfig('firefish')
      expect(firefishConfig).toEqual(PLATFORM_CONFIGS.firefish)

      const strikeConfig = getPlatformConfig('strike')
      expect(strikeConfig).toEqual(PLATFORM_CONFIGS.strike)

      const customConfig = getPlatformConfig('custom')
      expect(customConfig).toEqual(PLATFORM_CONFIGS.custom)
    })

    it('should return firefish config for invalid platform', () => {
      const invalidConfig = getPlatformConfig('invalid-platform')
      expect(invalidConfig).toEqual(PLATFORM_CONFIGS.firefish)
    })

    it('should return firefish config for undefined platform', () => {
      const undefinedConfig = getPlatformConfig(undefined as any)
      expect(undefinedConfig).toEqual(PLATFORM_CONFIGS.firefish)
    })
  })

  describe('getAvailablePlatforms', () => {
    it('should return all available platforms', () => {
      const platforms = getAvailablePlatforms()
      
      expect(platforms).toHaveLength(3)
      expect(platforms.map(p => p.id)).toContain('firefish')
      expect(platforms.map(p => p.id)).toContain('strike')
      expect(platforms.map(p => p.id)).toContain('custom')
    })

    it('should return platforms with all required properties', () => {
      const platforms = getAvailablePlatforms()
      
      platforms.forEach(platform => {
        expect(platform).toHaveProperty('id')
        expect(platform).toHaveProperty('name')
        expect(platform).toHaveProperty('description')
        expect(platform).toHaveProperty('originationFeePercent')
        expect(platform).toHaveProperty('originationFeeType')
        expect(platform).toHaveProperty('liquidationLtv')
        expect(platform).toHaveProperty('liquidationFeePercent')
        expect(platform).toHaveProperty('maxInitialLtv')
        expect(platform).toHaveProperty('availableLoanTerms')
        expect(platform).toHaveProperty('defaultLoanTerm')
      })
    })
  })

  describe('validatePlatformConfig', () => {
    it('should validate correct platform config', () => {
      const validConfig: PlatformConfig = {
        id: 'test',
        name: 'Test Platform',
        description: 'Test description',
        originationFeePercent: 1.0,
        originationFeeType: 'one-time',
        liquidationLtv: 85,
        liquidationFeePercent: 2.0,
        maxInitialLtv: 50,
        availableLoanTerms: [6, 12, 24],
        defaultLoanTerm: 12
      }

      const result = validatePlatformConfig(validConfig)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const invalidConfig = {
        id: 'test',
        name: 'Test Platform'
        // Missing other required fields
      } as PlatformConfig

      const result = validatePlatformConfig(invalidConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should detect invalid fee percentages', () => {
      const invalidConfig: PlatformConfig = {
        id: 'test',
        name: 'Test Platform',
        description: 'Test description',
        originationFeePercent: -1, // Invalid negative fee
        originationFeeType: 'one-time',
        liquidationLtv: 85,
        liquidationFeePercent: 150, // Invalid high fee
        maxInitialLtv: 50,
        availableLoanTerms: [6, 12, 24],
        defaultLoanTerm: 12
      }

      const result = validatePlatformConfig(invalidConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('originationFeePercent'))).toBe(true)
      expect(result.errors.some(error => error.includes('liquidationFeePercent'))).toBe(true)
    })

    it('should detect invalid LTV values', () => {
      const invalidConfig: PlatformConfig = {
        id: 'test',
        name: 'Test Platform',
        description: 'Test description',
        originationFeePercent: 1.0,
        originationFeeType: 'one-time',
        liquidationLtv: 150, // Invalid high LTV
        liquidationFeePercent: 2.0,
        maxInitialLtv: 200, // Invalid high LTV
        availableLoanTerms: [6, 12, 24],
        defaultLoanTerm: 12
      }

      const result = validatePlatformConfig(invalidConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('liquidationLtv'))).toBe(true)
      expect(result.errors.some(error => error.includes('maxInitialLtv'))).toBe(true)
    })

    it('should detect invalid loan terms', () => {
      const invalidConfig: PlatformConfig = {
        id: 'test',
        name: 'Test Platform',
        description: 'Test description',
        originationFeePercent: 1.0,
        originationFeeType: 'one-time',
        liquidationLtv: 85,
        liquidationFeePercent: 2.0,
        maxInitialLtv: 50,
        availableLoanTerms: [], // Empty loan terms
        defaultLoanTerm: 12
      }

      const result = validatePlatformConfig(invalidConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('availableLoanTerms'))).toBe(true)
    })

    it('should detect default loan term not in available terms', () => {
      const invalidConfig: PlatformConfig = {
        id: 'test',
        name: 'Test Platform',
        description: 'Test description',
        originationFeePercent: 1.0,
        originationFeeType: 'one-time',
        liquidationLtv: 85,
        liquidationFeePercent: 2.0,
        maxInitialLtv: 50,
        availableLoanTerms: [6, 12, 24],
        defaultLoanTerm: 36 // Not in available terms
      }

      const result = validatePlatformConfig(invalidConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('defaultLoanTerm'))).toBe(true)
    })
  })

  describe('Platform Comparison', () => {
    it('should have different fee structures between platforms', () => {
      const firefish = PLATFORM_CONFIGS.firefish
      const strike = PLATFORM_CONFIGS.strike
      const custom = PLATFORM_CONFIGS.custom

      // Firefish has annual origination fee, Strike has none, Custom has one-time
      expect(firefish.originationFeeType).toBe('annual')
      expect(strike.originationFeePercent).toBe(0)
      expect(custom.originationFeeType).toBe('one-time')

      // Different liquidation LTVs
      expect(firefish.liquidationLtv).not.toBe(strike.liquidationLtv)
      expect(strike.liquidationLtv).not.toBe(custom.liquidationLtv)

      // Different liquidation fees
      expect(firefish.liquidationFeePercent).not.toBe(strike.liquidationFeePercent)
      expect(strike.liquidationFeePercent).not.toBe(custom.liquidationFeePercent)
    })

    it('should have appropriate loan term options', () => {
      const firefish = PLATFORM_CONFIGS.firefish
      const strike = PLATFORM_CONFIGS.strike
      const custom = PLATFORM_CONFIGS.custom

      // Firefish has fixed terms only
      expect(firefish.availableLoanTerms).not.toContain('infinity')
      
      // Strike supports infinity loans
      expect(strike.availableLoanTerms).toContain('infinity')
      expect(strike.defaultLoanTerm).toBe('infinity')
      
      // Custom supports both fixed and infinity
      expect(custom.availableLoanTerms).toContain('infinity')
      expect(custom.availableLoanTerms).toContain(12)
    })
  })
})
