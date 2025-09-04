import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PriceModelRegistry } from '../services/PriceModelRegistry'
import type { 
  PriceProjectionModel, 
  PriceModelRegistryEntry,
  PriceProjectionResult,
  PriceModelParams 
} from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

describe('PriceModelRegistry', () => {
  let registry: PriceModelRegistry
  let mockModel: PriceProjectionModel
  let mockHistoricalData: HistoricalDataPoint[]
  let mockParams: PriceModelParams

  beforeEach(() => {
    registry = new PriceModelRegistry()
    
    mockHistoricalData = [
      { time: 1640995200000, close: 50000 }, // 2022-01-01
      { time: 1672531200000, close: 60000 }, // 2023-01-01
      { time: 1704067200000, close: 70000 }  // 2024-01-01
    ]

    mockParams = {
      startPrice: 70000,
      projectionMonths: 12,
      modelSpecificParams: {
        annualGrowthRates: [20, 15, 10, 8, 5]
      }
    }

    mockModel = {
      name: 'Test Model',
      version: '1.0.0',
      description: 'Test price projection model',
      
      generateProjection: vi.fn().mockResolvedValue({
        modelName: 'Test Model',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: 1704067200000,
            price: 70000,
            confidence: 0.9,
            metadata: {}
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 20,
          averageMonthlyGrowth: 1.67,
          confidence: 0.8,
          generatedAt: '2025-01-09T00:00:00.000Z'
        }
      } as PriceProjectionResult),
      
      validateParams: vi.fn().mockReturnValue(true),
      getDefaultParams: vi.fn().mockReturnValue({})
    }
  })

  describe('Model Registration', () => {
    it('should register a model successfully', () => {
      registry.registerModel('test', mockModel, true, 50)
      
      const retrievedModel = registry.getModel('test')
      expect(retrievedModel).toBe(mockModel)
    })

    it('should unregister a model successfully', () => {
      registry.registerModel('test', mockModel)
      
      const unregistered = registry.unregisterModel('test')
      expect(unregistered).toBe(true)
      
      const retrievedModel = registry.getModel('test')
      expect(retrievedModel).toBeNull()
    })

    it('should return false when unregistering non-existent model', () => {
      const unregistered = registry.unregisterModel('nonexistent')
      expect(unregistered).toBe(false)
    })

    it('should not return disabled models', () => {
      registry.registerModel('test', mockModel, false) // disabled
      
      const retrievedModel = registry.getModel('test')
      expect(retrievedModel).toBeNull()
    })
  })

  describe('Model Retrieval', () => {
    beforeEach(() => {
      registry.registerModel('model1', mockModel, true, 100)
      registry.registerModel('model2', mockModel, true, 50)
      registry.registerModel('model3', mockModel, false, 75) // disabled
    })

    it('should get all enabled models sorted by priority', () => {
      const models = registry.getAllModels()

      expect(models).toHaveLength(4) // 2 default + 2 test models
      expect(models[0].priority).toBe(100) // Highest priority first (manual or model1)
      // Don't assume specific order for models with same priority
      expect(models.some(m => m.priority === 100)).toBe(true)
      expect(models.some(m => m.priority === 90)).toBe(true)
    })

    it('should get model names for UI selection', () => {
      const modelNames = registry.getModelNames()

      expect(modelNames).toHaveLength(4) // 2 default + 2 test models
      expect(modelNames[0]).toHaveProperty('id')
      expect(modelNames[0]).toHaveProperty('name')
      expect(modelNames[0]).toHaveProperty('description')
    })

    it('should return null for non-existent model', () => {
      const model = registry.getModel('nonexistent')
      expect(model).toBeNull()
    })
  })

  describe('Model Management', () => {
    beforeEach(() => {
      registry.registerModel('test', mockModel, true)
    })

    it('should enable/disable models', () => {
      // Disable model
      const disabled = registry.setModelEnabled('test', false)
      expect(disabled).toBe(true)
      expect(registry.getModel('test')).toBeNull()

      // Enable model
      const enabled = registry.setModelEnabled('test', true)
      expect(enabled).toBe(true)
      expect(registry.getModel('test')).toBe(mockModel)
    })

    it('should return false when enabling/disabling non-existent model', () => {
      const result = registry.setModelEnabled('nonexistent', true)
      expect(result).toBe(false)
    })

    it('should get model default parameters', () => {
      const defaultParams = { testParam: 'value' }
      vi.mocked(mockModel.getDefaultParams).mockReturnValue(defaultParams)

      const params = registry.getModelDefaultParams('test')
      expect(params).toEqual(defaultParams)
    })

    it('should return null for default params of non-existent model', () => {
      const params = registry.getModelDefaultParams('nonexistent')
      expect(params).toBeNull()
    })
  })

  describe('Projection Generation', () => {
    beforeEach(() => {
      registry.registerModel('test', mockModel, true)
    })

    it('should generate projection successfully', async () => {
      const result = await registry.generateProjection('test', mockHistoricalData, mockParams)
      
      expect(result).toBeDefined()
      expect(result?.modelName).toBe('Test Model')
      expect(mockModel.generateProjection).toHaveBeenCalledWith(mockHistoricalData, mockParams)
    })

    it('should return null for non-existent model', async () => {
      const result = await registry.generateProjection('nonexistent', mockHistoricalData, mockParams)
      expect(result).toBeNull()
    })

    it('should return null for invalid parameters', async () => {
      vi.mocked(mockModel.validateParams).mockReturnValue(false)
      
      const result = await registry.generateProjection('test', mockHistoricalData, mockParams)
      expect(result).toBeNull()
    })

    it('should handle projection generation errors', async () => {
      vi.mocked(mockModel.generateProjection).mockRejectedValue(new Error('Generation failed'))
      
      const result = await registry.generateProjection('test', mockHistoricalData, mockParams)
      expect(result).toBeNull()
    })
  })

  describe('Model Comparison', () => {
    beforeEach(() => {
      registry.registerModel('model1', mockModel, true)
      registry.registerModel('model2', mockModel, true)
    })

    it('should compare multiple models', async () => {
      const comparisons = await registry.compareModels(
        ['model1', 'model2'], 
        mockHistoricalData, 
        mockParams
      )
      
      expect(comparisons).toHaveLength(2)
      expect(comparisons[0].modelId).toBe('model1')
      expect(comparisons[1].modelId).toBe('model2')
      expect(comparisons[0].result).toBeDefined()
      expect(comparisons[1].result).toBeDefined()
    })

    it('should handle failed model comparisons', async () => {
      vi.mocked(mockModel.generateProjection).mockRejectedValue(new Error('Failed'))
      
      const comparisons = await registry.compareModels(
        ['model1'], 
        mockHistoricalData, 
        mockParams
      )
      
      expect(comparisons).toHaveLength(1)
      expect(comparisons[0].result).toBeNull()
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      registry.registerModel('valid', mockModel, true)
      
      const invalidModel = {
        ...mockModel,
        validateParams: vi.fn().mockReturnValue(false)
      }
      registry.registerModel('invalid', invalidModel, true)
    })

    it('should validate all models', () => {
      const validation = registry.validateAllModels()

      expect(validation.totalModels).toBe(4) // 2 default + 2 test models
      expect(validation.validModels).toBe(3) // manual, powerLaw, valid
      expect(validation.invalidModels).toBe(1) // invalid
      expect(validation.results).toHaveLength(4)
    })

    it('should provide detailed validation results', () => {
      const validation = registry.validateAllModels()
      
      const validResult = validation.results.find(r => r.modelId === 'valid')
      const invalidResult = validation.results.find(r => r.modelId === 'invalid')
      
      expect(validResult?.isValid).toBe(true)
      expect(invalidResult?.isValid).toBe(false)
    })
  })

  describe('Registry Statistics', () => {
    beforeEach(() => {
      registry.registerModel('enabled1', mockModel, true)
      registry.registerModel('enabled2', mockModel, true)
      registry.registerModel('disabled1', mockModel, false)
    })

    it('should provide registry statistics', () => {
      const stats = registry.getStats()

      expect(stats.totalModels).toBe(5) // 2 default + 3 test models
      expect(stats.enabledModels).toBe(4) // manual, powerLaw, enabled1, enabled2
      expect(stats.disabledModels).toBe(1) // disabled1
      expect(stats.modelIds).toContain('enabled1')
      expect(stats.modelIds).toContain('enabled2')
      expect(stats.modelIds).toContain('disabled1')
    })
  })

  describe('Default Models Registration', () => {
    it('should register default models on construction', () => {
      const newRegistry = new PriceModelRegistry()
      const models = newRegistry.getAllModels()
      
      // Should have at least the default models
      expect(models.length).toBeGreaterThan(0)
      
      // Check for specific default models
      const modelNames = newRegistry.getModelNames().map(m => m.id)
      expect(modelNames).toContain('manual')
      expect(modelNames).toContain('powerLaw')
      // Note: enhancedCycleRepeat not yet migrated to new module structure
    })

    it('should have manual model with highest priority', () => {
      const newRegistry = new PriceModelRegistry()
      const models = newRegistry.getAllModels()
      
      // Manual model should be first (highest priority)
      const manualModel = models.find(m => m.id === 'manual')
      expect(manualModel).toBeDefined()
      expect(manualModel?.priority).toBe(100)
    })
  })
})
