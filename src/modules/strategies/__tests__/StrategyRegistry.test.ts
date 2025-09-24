/**
 * Strategy Registry Tests
 * 
 * Test suite for the strategy registry functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StrategyRegistry } from '../services/StrategyRegistry'
import { DefaultStrategy } from '../implementations/DefaultStrategy'
import type { StrategyExecutionParams } from '../types'
import type { PriceProjectionResult } from '../../price-projection/types'

describe('StrategyRegistry', () => {
  let registry: StrategyRegistry
  let mockPriceProjection: PriceProjectionResult

  beforeEach(() => {
    registry = new StrategyRegistry()
    
    // Mock price projection data
    mockPriceProjection = {
      projectionPoints: [
        { timestamp: Date.now(), price: 50000 },
        { timestamp: Date.now() + 86400000, price: 51000 },
        { timestamp: Date.now() + 172800000, price: 52000 }
      ],
      metadata: {
        model: 'test',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        parameters: {}
      }
    }
  })

  describe('Strategy Registration', () => {
    it('should register a strategy successfully', () => {
      const strategy = new DefaultStrategy()
      registry.registerStrategy('test', strategy)
      
      expect(registry.hasStrategy('test')).toBe(true)
      expect(registry.getStrategy('test')).toBe(strategy)
    })

    it('should unregister a strategy successfully', () => {
      const strategy = new DefaultStrategy()
      registry.registerStrategy('test', strategy)
      
      const result = registry.unregisterStrategy('test')
      
      expect(result).toBe(true)
      expect(registry.hasStrategy('test')).toBe(false)
    })

    it('should return false when unregistering non-existent strategy', () => {
      const result = registry.unregisterStrategy('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('Strategy Management', () => {
    beforeEach(() => {
      const strategy = new DefaultStrategy()
      registry.registerStrategy('test', strategy, true, 100)
    })

    it('should get all strategies', () => {
      const strategies = registry.getAllStrategies()
      expect(strategies).toHaveLength(1)
      expect(strategies[0].id).toBe('test')
    })

    it('should get strategy names', () => {
      const names = registry.getStrategyNames()
      expect(names).toHaveLength(1)
      expect(names[0].id).toBe('test')
      expect(names[0].name).toBe('Default Strategy')
    })

    it('should enable/disable strategies', () => {
      expect(registry.setStrategyEnabled('test', false)).toBe(true)
      
      const names = registry.getStrategyNames()
      expect(names).toHaveLength(0) // Disabled strategies not included
      
      expect(registry.setStrategyEnabled('test', true)).toBe(true)
      const enabledNames = registry.getStrategyNames()
      expect(enabledNames).toHaveLength(1)
    })
  })

  describe('Strategy Execution', () => {
    let mockParams: StrategyExecutionParams

    beforeEach(() => {
      const strategy = new DefaultStrategy()
      registry.registerStrategy('test', strategy)
      
      mockParams = {
        btcAmount: 1.0,
        initialBtcPrice: 50000,
        monthlyWithdrawalAmount: -2000,
        annualInterestRate: 6.5,
        loanOriginationFeePercent: 1.0,
        loanTermMonths: 6,
        simulationMonths: 12,
        maxLoanAmount: 100000,
        expectedAnnualInflation: 3.0,
        btcAccumulation: true,
        investmentStrategy: 'test',
        riskManagement: {
          targetLtv: 50,
          liquidationLtv: 85,
          maxLoanAmount: 100000,
          liquidationFeePercent: 5,
          annualInterestRate: 6.5
        }
      }
    })

    it('should execute strategy successfully', async () => {
      const result = await registry.executeStrategy('test', mockParams, mockPriceProjection)
      
      expect(result).not.toBeNull()
      expect(result?.metadata.strategyUsed).toBe('Default Strategy')
      expect(result?.metadata.totalMonths).toBe(12)
      expect(result?.monthlyResults).toHaveLength(12)
    })

    it('should return null for non-existent strategy', async () => {
      const result = await registry.executeStrategy('nonexistent', mockParams, mockPriceProjection)
      expect(result).toBeNull()
    })

    it('should return null for disabled strategy', async () => {
      registry.setStrategyEnabled('test', false)
      const result = await registry.executeStrategy('test', mockParams, mockPriceProjection)
      expect(result).toBeNull()
    })
  })

  describe('Strategy Validation', () => {
    it('should validate all strategies', () => {
      const validStrategy = new DefaultStrategy()
      registry.registerStrategy('valid', validStrategy)
      
      const validation = registry.validateAllStrategies()
      
      expect(validation.valid).toContain('valid')
      expect(validation.invalid).toHaveLength(0)
    })
  })

  describe('Registry Statistics', () => {
    it('should provide accurate statistics', () => {
      const strategy1 = new DefaultStrategy()
      const strategy2 = new DefaultStrategy()
      
      registry.registerStrategy('strategy1', strategy1, true)
      registry.registerStrategy('strategy2', strategy2, false)
      
      const stats = registry.getStats()
      
      expect(stats.total).toBe(2)
      expect(stats.enabled).toBe(1)
      expect(stats.disabled).toBe(1)
      expect(stats.strategies).toHaveLength(2)
    })
  })
})
