/**
 * Price Model Registry Service
 * 
 * Central registry for all price projection models with management,
 * validation, and execution capabilities.
 */

import type { 
  PriceProjectionModel, 
  PriceModelRegistryEntry,
  PriceProjectionResult,
  PriceModelParams,
  ModelValidationResult,
  RegistryStats,
  ModelComparisonResult,
  IPriceModelRegistry
} from '../types'
import type { HistoricalDataPoint } from '@/modules/shared/types'

// Import available models
import { manualGrowthModel } from '../models/ManualGrowthModel'
import { powerLawModel } from '../models/PowerLawModel'

/**
 * Price Model Registry Implementation
 */
export class PriceModelRegistry implements IPriceModelRegistry {
  private models: Map<string, PriceModelRegistryEntry> = new Map()
  
  constructor() {
    this.registerDefaultModels()
  }
  
  /**
   * Register a price projection model
   */
  registerModel(
    id: string, 
    model: PriceProjectionModel, 
    enabled: boolean = true, 
    priority: number = 0
  ): void {
    console.log(`📝 Registering price model: ${id} (${model.name} v${model.version})`)
    
    this.models.set(id, {
      id,
      model,
      enabled,
      priority
    })
  }
  
  /**
   * Unregister a price projection model
   */
  unregisterModel(id: string): boolean {
    console.log(`🗑️ Unregistering price model: ${id}`)
    return this.models.delete(id)
  }
  
  /**
   * Get a specific model by ID
   */
  getModel(id: string): PriceProjectionModel | null {
    const entry = this.models.get(id)
    return entry?.enabled ? entry.model : null
  }
  
  /**
   * Get all available models
   */
  getAllModels(): PriceModelRegistryEntry[] {
    return Array.from(this.models.values())
      .filter(entry => entry.enabled)
      .sort((a, b) => b.priority - a.priority)
  }
  
  /**
   * Get model names for UI selection
   */
  getModelNames(): { id: string; name: string; description: string }[] {
    return this.getAllModels().map(entry => ({
      id: entry.id,
      name: entry.model.name,
      description: entry.model.description
    }))
  }

  /**
   * Enable or disable a model
   */
  setModelEnabled(id: string, enabled: boolean): boolean {
    const entry = this.models.get(id)
    if (!entry) {
      console.error(`❌ Model not found: ${id}`)
      return false
    }

    entry.enabled = enabled
    console.log(`${enabled ? '✅' : '❌'} Model ${id} ${enabled ? 'enabled' : 'disabled'}`)
    return true
  }
  
  /**
   * Generate projection using a specific model
   */
  async generateProjection(
    modelId: string,
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult | null> {
    
    const model = this.getModel(modelId)
    if (!model) {
      console.error(`❌ Model not found or disabled: ${modelId}`)
      return null
    }
    
    if (!model.validateParams(params)) {
      console.error(`❌ Invalid parameters for model: ${modelId}`)
      return null
    }
    
    try {
      console.log(`🚀 Generating projection with model: ${modelId}`)
      const result = await model.generateProjection(historicalData, params)
      console.log(`✅ Projection generated successfully with ${result.projectionPoints.length} points`)
      return result
    } catch (error) {
      console.error(`❌ Error generating projection with model ${modelId}:`, error)
      return null
    }
  }

  /**
   * Get default parameters for a specific model
   */
  getModelDefaultParams(modelId: string): Record<string, any> | null {
    const model = this.getModel(modelId)
    if (!model) {
      console.error(`❌ Model not found: ${modelId}`)
      return null
    }

    return model.getDefaultParams()
  }

  /**
   * Validate all registered models
   */
  validateAllModels(): ModelValidationResult {
    console.log('🔍 Validating all registered models...')
    
    const results: Array<{ modelId: string; isValid: boolean; errors: string[] }> = []
    let validModels = 0
    let invalidModels = 0

    // Test parameters for validation
    const testParams: PriceModelParams = {
      startPrice: 70000,
      projectionMonths: 12,
      modelSpecificParams: {}
    }

    for (const [modelId, entry] of this.models.entries()) {
      try {
        // Get default params and merge with test params
        const defaultParams = entry.model.getDefaultParams()
        const fullParams = {
          ...testParams,
          modelSpecificParams: defaultParams
        }

        const isValid = entry.model.validateParams(fullParams)
        
        if (isValid) {
          validModels++
          results.push({ modelId, isValid: true, errors: [] })
        } else {
          invalidModels++
          results.push({ 
            modelId, 
            isValid: false, 
            errors: [`Model ${modelId} failed parameter validation`] 
          })
        }
      } catch (error) {
        invalidModels++
        results.push({ 
          modelId, 
          isValid: false, 
          errors: [`Model ${modelId} threw error during validation: ${error}`] 
        })
      }
    }

    console.log(`✅ Model validation complete: ${validModels} valid, ${invalidModels} invalid`)

    return {
      totalModels: this.models.size,
      validModels,
      invalidModels,
      results
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const totalModels = this.models.size
    const enabledModels = Array.from(this.models.values()).filter(entry => entry.enabled).length
    const disabledModels = totalModels - enabledModels
    const modelIds = Array.from(this.models.keys())

    return {
      totalModels,
      enabledModels,
      disabledModels,
      modelIds
    }
  }
  
  /**
   * Compare multiple models with same parameters
   */
  async compareModels(
    modelIds: string[],
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<ModelComparisonResult[]> {
    
    console.log(`🔍 Comparing ${modelIds.length} models: [${modelIds.join(', ')}]`)
    
    const comparisons = await Promise.all(
      modelIds.map(async (modelId) => {
        const startTime = performance.now()
        
        try {
          const result = await this.generateProjection(modelId, historicalData, params)
          const executionTime = performance.now() - startTime
          
          return {
            modelId,
            result,
            executionTime
          }
        } catch (error) {
          const executionTime = performance.now() - startTime
          
          return {
            modelId,
            result: null,
            error: error instanceof Error ? error.message : String(error),
            executionTime
          }
        }
      })
    )
    
    const successful = comparisons.filter(c => c.result !== null).length
    console.log(`✅ Model comparison complete: ${successful}/${modelIds.length} models successful`)
    
    return comparisons
  }
  
  /**
   * Register default models
   */
  private registerDefaultModels(): void {
    console.log('🔧 Registering default price projection models...')
    
    // Register Manual Growth Model (highest priority - most user control)
    this.registerModel('manual', manualGrowthModel, true, 100)
    
    // Register Power Law Model (high priority - mathematical foundation)
    this.registerModel('powerLaw', powerLawModel, true, 90)
    
    // Note: Other models like Enhanced Cycle Repeat would be registered here
    // when they are migrated to the new module structure
    
    console.log(`✅ Registered ${this.models.size} default models`)
  }
}

// Export singleton instance
export const priceModelRegistry = new PriceModelRegistry()
