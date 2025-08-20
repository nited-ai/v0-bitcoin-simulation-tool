/**
 * Price Model Registry
 * 
 * Central registry for all price projection models. Allows for plugin-based
 * architecture where models can be registered, enabled/disabled, and used
 * independently.
 */

import type { 
  PriceProjectionModel, 
  PriceModelRegistryEntry,
  PriceProjectionResult,
  PriceModelParams 
} from "./types"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

// Import available models
import { manualGrowthModel } from "./models/ManualGrowthModel"
import { powerLawModel } from "./models/PowerLawModel"
import { cycleRepeatModel } from "./models/CycleRepeatModel"
import { enhancedCycleRepeatModel } from "./models/EnhancedCycleRepeatModel"
import { logarithmicCurveRepeatModel } from "./models/LogarithmicCurveRepeatModel"

/**
 * Price Model Registry Implementation
 */
export class PriceModelRegistry {
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
   * Enable/disable a model
   */
  setModelEnabled(id: string, enabled: boolean): boolean {
    const entry = this.models.get(id)
    if (entry) {
      entry.enabled = enabled
      console.log(`${enabled ? '✅' : '❌'} Model ${id} ${enabled ? 'enabled' : 'disabled'}`)
      return true
    }
    return false
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
   * Get default parameters for a model
   */
  getModelDefaultParams(modelId: string): Record<string, any> | null {
    const model = this.getModel(modelId)
    return model ? model.getDefaultParams() : null
  }
  
  /**
   * Get model metadata
   */
  getModelMetadata(modelId: string): Record<string, any> | null {
    const model = this.getModel(modelId)
    return model && 'getMetadata' in model ? (model as any).getMetadata() : null
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
    
    // Register Cycle Repeat Model (DISABLED - replaced by Enhanced version)
    this.registerModel('cycleRepeat', cycleRepeatModel, false, 80)

    // Register Enhanced Cycle Repeat Model (high priority - economic theory)
    this.registerModel('enhancedCycleRepeat', enhancedCycleRepeatModel, true, 85)

    // Register Logarithmic Curve Repeat Model (DISABLED - has exponential growth issues)
    this.registerModel('logarithmicCurveRepeat', logarithmicCurveRepeatModel, false, 87)

    console.log(`✅ Registered ${this.models.size} price projection models`)
  }
  
  /**
   * Validate all registered models
   */
  validateAllModels(): { valid: string[]; invalid: string[] } {
    const valid: string[] = []
    const invalid: string[] = []
    
    this.models.forEach((entry, id) => {
      try {
        // Basic validation - check if model has required methods
        const model = entry.model
        if (
          typeof model.generateProjection === 'function' &&
          typeof model.validateParams === 'function' &&
          typeof model.getDefaultParams === 'function' &&
          model.name && 
          model.description && 
          model.version
        ) {
          valid.push(id)
        } else {
          invalid.push(id)
        }
      } catch (error) {
        invalid.push(id)
      }
    })
    
    return { valid, invalid }
  }
  
  /**
   * Get registry statistics
   */
  getStats(): {
    total: number
    enabled: number
    disabled: number
    models: { id: string; name: string; enabled: boolean; priority: number }[]
  } {
    const allModels = Array.from(this.models.values())
    
    return {
      total: allModels.length,
      enabled: allModels.filter(m => m.enabled).length,
      disabled: allModels.filter(m => !m.enabled).length,
      models: allModels.map(entry => ({
        id: entry.id,
        name: entry.model.name,
        enabled: entry.enabled,
        priority: entry.priority
      }))
    }
  }
  
  /**
   * Compare multiple models with same parameters
   */
  async compareModels(
    modelIds: string[],
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<{ modelId: string; result: PriceProjectionResult | null }[]> {
    
    console.log(`🔍 Comparing ${modelIds.length} models: [${modelIds.join(', ')}]`)
    
    const comparisons = await Promise.all(
      modelIds.map(async (modelId) => ({
        modelId,
        result: await this.generateProjection(modelId, historicalData, params)
      }))
    )
    
    const successful = comparisons.filter(c => c.result !== null).length
    console.log(`✅ Model comparison complete: ${successful}/${modelIds.length} models successful`)
    
    return comparisons
  }
}

// Export singleton instance
export const priceModelRegistry = new PriceModelRegistry()
