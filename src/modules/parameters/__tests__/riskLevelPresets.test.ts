import { describe, it, expect } from 'vitest'
import { 
  RISK_LEVEL_PRESETS, 
  getRiskLevelPreset,
  getAvailableRiskLevels,
  validateRiskLevelPreset,
  applyRiskLevelToParams
} from '../constants/riskLevelPresets'
import type { RiskLevel, RiskLevelPreset } from '../types'

describe('Risk Level Presets', () => {
  describe('RISK_LEVEL_PRESETS', () => {
    it('should contain all required risk levels', () => {
      expect(RISK_LEVEL_PRESETS).toHaveProperty('conservative')
      expect(RISK_LEVEL_PRESETS).toHaveProperty('moderate')
      expect(RISK_LEVEL_PRESETS).toHaveProperty('optimistic')
      expect(RISK_LEVEL_PRESETS).toHaveProperty('moonshots')
    })

    it('should have valid conservative preset', () => {
      const conservative = RISK_LEVEL_PRESETS.conservative
      
      expect(conservative.id).toBe('conservative')
      expect(conservative.name).toBe('Conservative')
      expect(conservative.description).toBeTruthy()
      expect(conservative.loanAmountPercent).toBe(5)
      expect(conservative.targetLtv).toBe(20)
      expect(conservative.annualInterestRate).toBe(9.0)
      expect(conservative.loanTermMonths).toHaveProperty('firefish')
      expect(conservative.loanTermMonths).toHaveProperty('strike')
      expect(conservative.loanTermMonths).toHaveProperty('custom')
      expect(conservative.loanTermMonths).toHaveProperty('default')
    })

    it('should have valid moderate preset', () => {
      const moderate = RISK_LEVEL_PRESETS.moderate
      
      expect(moderate.id).toBe('moderate')
      expect(moderate.name).toBe('Moderate')
      expect(moderate.description).toBeTruthy()
      expect(moderate.loanAmountPercent).toBe(10)
      expect(moderate.targetLtv).toBe(30)
      expect(moderate.annualInterestRate).toBe(9.0)
      expect(moderate.loanTermMonths.firefish).toBe(24)
      expect(moderate.loanTermMonths.strike).toBe('infinity')
    })

    it('should have valid optimistic preset', () => {
      const optimistic = RISK_LEVEL_PRESETS.optimistic
      
      expect(optimistic.id).toBe('optimistic')
      expect(optimistic.name).toBe('Optimistic')
      expect(optimistic.description).toBeTruthy()
      expect(optimistic.loanAmountPercent).toBe(15)
      expect(optimistic.targetLtv).toBe(40)
      expect(optimistic.annualInterestRate).toBe(6.5)
      expect(optimistic.loanTermMonths.firefish).toBe(12)
      expect(optimistic.loanTermMonths.strike).toBe(12)
    })

    it('should have valid moonshots preset', () => {
      const moonshots = RISK_LEVEL_PRESETS.moonshots
      
      expect(moonshots.id).toBe('moonshots')
      expect(moonshots.name).toBe('Moonshots')
      expect(moonshots.description).toBeTruthy()
      expect(moonshots.loanAmountPercent).toBe(30)
      expect(moonshots.targetLtv).toBe(50)
      expect(moonshots.annualInterestRate).toBe(6.5)
      expect(moonshots.loanTermMonths.firefish).toBe(6)
      expect(moonshots.loanTermMonths.strike).toBe(6)
    })
  })

  describe('getRiskLevelPreset', () => {
    it('should return correct preset for valid risk level', () => {
      const conservative = getRiskLevelPreset('conservative')
      expect(conservative).toEqual(RISK_LEVEL_PRESETS.conservative)

      const moderate = getRiskLevelPreset('moderate')
      expect(moderate).toEqual(RISK_LEVEL_PRESETS.moderate)

      const optimistic = getRiskLevelPreset('optimistic')
      expect(optimistic).toEqual(RISK_LEVEL_PRESETS.optimistic)

      const moonshots = getRiskLevelPreset('moonshots')
      expect(moonshots).toEqual(RISK_LEVEL_PRESETS.moonshots)
    })

    it('should return moderate preset for invalid risk level', () => {
      const invalidPreset = getRiskLevelPreset('invalid' as RiskLevel)
      expect(invalidPreset).toEqual(RISK_LEVEL_PRESETS.moderate)
    })
  })

  describe('getAvailableRiskLevels', () => {
    it('should return all available risk levels', () => {
      const riskLevels = getAvailableRiskLevels()
      
      expect(riskLevels).toHaveLength(4)
      expect(riskLevels.map(r => r.id)).toContain('conservative')
      expect(riskLevels.map(r => r.id)).toContain('moderate')
      expect(riskLevels.map(r => r.id)).toContain('optimistic')
      expect(riskLevels.map(r => r.id)).toContain('moonshots')
    })

    it('should return risk levels with all required properties', () => {
      const riskLevels = getAvailableRiskLevels()
      
      riskLevels.forEach(riskLevel => {
        expect(riskLevel).toHaveProperty('id')
        expect(riskLevel).toHaveProperty('name')
        expect(riskLevel).toHaveProperty('description')
        expect(riskLevel).toHaveProperty('loanAmountPercent')
        expect(riskLevel).toHaveProperty('targetLtv')
        expect(riskLevel).toHaveProperty('annualInterestRate')
        expect(riskLevel).toHaveProperty('loanTermMonths')
      })
    })
  })

  describe('validateRiskLevelPreset', () => {
    it('should validate correct risk level preset', () => {
      const validPreset: RiskLevelPreset = {
        id: 'test',
        name: 'Test Risk Level',
        description: 'Test description',
        loanAmountPercent: 10,
        targetLtv: 30,
        annualInterestRate: 8.0,
        loanTermMonths: {
          firefish: 12,
          strike: 24,
          custom: 18,
          default: 12
        }
      }

      const result = validateRiskLevelPreset(validPreset)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid loan amount percentage', () => {
      const invalidPreset: RiskLevelPreset = {
        id: 'test',
        name: 'Test Risk Level',
        description: 'Test description',
        loanAmountPercent: 150, // Invalid high percentage
        targetLtv: 30,
        annualInterestRate: 8.0,
        loanTermMonths: {
          firefish: 12,
          strike: 24,
          custom: 18,
          default: 12
        }
      }

      const result = validateRiskLevelPreset(invalidPreset)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('loanAmountPercent'))).toBe(true)
    })

    it('should detect invalid target LTV', () => {
      const invalidPreset: RiskLevelPreset = {
        id: 'test',
        name: 'Test Risk Level',
        description: 'Test description',
        loanAmountPercent: 10,
        targetLtv: 150, // Invalid high LTV
        annualInterestRate: 8.0,
        loanTermMonths: {
          firefish: 12,
          strike: 24,
          custom: 18,
          default: 12
        }
      }

      const result = validateRiskLevelPreset(invalidPreset)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('targetLtv'))).toBe(true)
    })

    it('should detect invalid interest rate', () => {
      const invalidPreset: RiskLevelPreset = {
        id: 'test',
        name: 'Test Risk Level',
        description: 'Test description',
        loanAmountPercent: 10,
        targetLtv: 30,
        annualInterestRate: -5, // Invalid negative rate
        loanTermMonths: {
          firefish: 12,
          strike: 24,
          custom: 18,
          default: 12
        }
      }

      const result = validateRiskLevelPreset(invalidPreset)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('annualInterestRate'))).toBe(true)
    })

    it('should detect missing loan term platforms', () => {
      const invalidPreset = {
        id: 'test',
        name: 'Test Risk Level',
        description: 'Test description',
        loanAmountPercent: 10,
        targetLtv: 30,
        annualInterestRate: 8.0,
        loanTermMonths: {
          firefish: 12
          // Missing other platforms
        }
      } as RiskLevelPreset

      const result = validateRiskLevelPreset(invalidPreset)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('loanTermMonths'))).toBe(true)
    })
  })

  describe('applyRiskLevelToParams', () => {
    it('should apply conservative risk level correctly', () => {
      const baseParams = {
        initialBtcAmount: 1,
        initialBtcPrice: 70000,
        platform: 'firefish' as const,
        loanAmountPercent: 0,
        annualInterestRate: 0,
        loanTermMonths: 0,
        riskManagement: {
          targetLtv: 0,
          liquidationLtv: 95,
          annualInterestRate: 0,
          loanTermMonths: 0,
          maxLoanAmount: 50000,
          liquidationFeePercent: 5
        }
      }

      const result = applyRiskLevelToParams(baseParams, 'conservative')
      
      expect(result.loanAmountPercent).toBe(5)
      expect(result.annualInterestRate).toBe(9.0)
      expect(result.loanTermMonths).toBe(24) // Firefish default for conservative
      expect(result.riskManagement.targetLtv).toBe(20)
      expect(result.riskManagement.annualInterestRate).toBe(9.0)
      expect(result.riskManagement.loanTermMonths).toBe(24)
    })

    it('should apply optimistic risk level correctly', () => {
      const baseParams = {
        initialBtcAmount: 1,
        initialBtcPrice: 70000,
        platform: 'strike' as const,
        loanAmountPercent: 0,
        annualInterestRate: 0,
        loanTermMonths: 0,
        riskManagement: {
          targetLtv: 0,
          liquidationLtv: 85,
          annualInterestRate: 0,
          loanTermMonths: 0,
          maxLoanAmount: 50000,
          liquidationFeePercent: 1
        }
      }

      const result = applyRiskLevelToParams(baseParams, 'optimistic')
      
      expect(result.loanAmountPercent).toBe(15)
      expect(result.annualInterestRate).toBe(6.5)
      expect(result.loanTermMonths).toBe(12) // Strike default for optimistic
      expect(result.riskManagement.targetLtv).toBe(40)
      expect(result.riskManagement.annualInterestRate).toBe(6.5)
      expect(result.riskManagement.loanTermMonths).toBe(12)
    })

    it('should handle infinity loan terms correctly', () => {
      const baseParams = {
        initialBtcAmount: 1,
        initialBtcPrice: 70000,
        platform: 'strike' as const,
        loanAmountPercent: 0,
        annualInterestRate: 0,
        loanTermMonths: 0,
        riskManagement: {
          targetLtv: 0,
          liquidationLtv: 85,
          annualInterestRate: 0,
          loanTermMonths: 0,
          maxLoanAmount: 50000,
          liquidationFeePercent: 1
        }
      }

      const result = applyRiskLevelToParams(baseParams, 'moderate')
      
      expect(result.loanTermMonths).toBe(Infinity) // Strike default for moderate
      expect(result.riskManagement.loanTermMonths).toBe(Infinity)
    })
  })

  describe('Risk Level Progression', () => {
    it('should have increasing risk levels', () => {
      const conservative = RISK_LEVEL_PRESETS.conservative
      const moderate = RISK_LEVEL_PRESETS.moderate
      const optimistic = RISK_LEVEL_PRESETS.optimistic
      const moonshots = RISK_LEVEL_PRESETS.moonshots

      // Loan amount should increase with risk
      expect(conservative.loanAmountPercent).toBeLessThan(moderate.loanAmountPercent)
      expect(moderate.loanAmountPercent).toBeLessThan(optimistic.loanAmountPercent)
      expect(optimistic.loanAmountPercent).toBeLessThan(moonshots.loanAmountPercent)

      // Target LTV should increase with risk
      expect(conservative.targetLtv).toBeLessThan(moderate.targetLtv)
      expect(moderate.targetLtv).toBeLessThan(optimistic.targetLtv)
      expect(optimistic.targetLtv).toBeLessThan(moonshots.targetLtv)
    })

    it('should have appropriate interest rates for risk levels', () => {
      const conservative = RISK_LEVEL_PRESETS.conservative
      const moderate = RISK_LEVEL_PRESETS.moderate
      const optimistic = RISK_LEVEL_PRESETS.optimistic
      const moonshots = RISK_LEVEL_PRESETS.moonshots

      // Conservative and moderate should have higher rates (safer lending)
      expect(conservative.annualInterestRate).toBe(9.0)
      expect(moderate.annualInterestRate).toBe(9.0)

      // Optimistic and moonshots should have lower rates (more aggressive)
      expect(optimistic.annualInterestRate).toBe(6.5)
      expect(moonshots.annualInterestRate).toBe(6.5)
    })
  })
})
