/**
 * Unified Price Projection Service
 * 
 * This service provides a standardized interface for all price projection needs.
 * It automatically routes requests to the appropriate model system and ensures
 * all outputs conform to the standard PriceProjectionResult format.
 */

import type {
  PriceProjectionResult,
  PriceModelParams
} from "../../../../app/simulation/price-models/types"
import type {
  PriceEngineParams,
  HistoricalDataPoint,
  PriceModel
} from "../../price-data/types"
import { PriceProjectionAdapter } from "../adapters/PriceProjectionAdapter"
import { priceModelRegistry } from "../../../../app/simulation/price-models/PriceModelRegistry"

/**
 * Unified Price Projection Service
 * 
 * This service provides a standardized interface for all price projection needs.
 * It automatically routes requests to the appropriate model system and ensures
 * all outputs conform to the standard PriceProjectionResult format.
 */
export class UnifiedPriceProjectionService {
  
  /**
   * Generate price projection using standardized format
   * 
   * @param modelId - Price model identifier (manual, powerLaw, cycleRepeat, enhancedCycleRepeat)
   * @param params - Model parameters
   * @param historicalData - Historical Bitcoin price data
   * @returns Standardized price projection result
   */
  async generateProjection(
    modelId: PriceModel,
    params: PriceModelParams,
    historicalData: HistoricalDataPoint[]
  ): Promise<PriceProjectionResult> {
    
    console.log(`🎯 Unified Service: Generating projection for model: ${modelId}`)
    
    try {
      // Get model from registry
      const model = priceModelRegistry.getModel(modelId)
      
      if (!model) {
        throw new Error(`Model not found: ${modelId}`)
      }
      
      // Generate projection using the model
      const projection = await model.generateProjection(historicalData, params)
      
      // Validate the result
      const validation = PriceProjectionAdapter.validate(projection)
      if (!validation.valid) {
        console.warn('⚠️ Projection validation warnings:', validation.errors)
      }
      
      console.log(`✅ Unified Service: Generated ${projection.projectionPoints.length} projection points`)
      
      return projection
      
    } catch (error) {
      console.error(`❌ Unified Service: Failed to generate projection for ${modelId}:`, error)
      throw error
    }
  }
  
  /**
   * Generate projection from legacy PriceEngineParams format
   * Provides backward compatibility during migration
   * 
   * @param legacyParams - Legacy price engine parameters
   * @param historicalData - Historical Bitcoin price data
   * @returns Standardized price projection result
   */
  async generateProjectionFromLegacyParams(
    legacyParams: PriceEngineParams,
    historicalData: HistoricalDataPoint[]
  ): Promise<PriceProjectionResult> {
    
    console.log(`🔄 Unified Service: Converting legacy params for model: ${legacyParams.priceModel}`)
    
    // Convert legacy params to new format
    const params = this.convertLegacyParams(legacyParams)
    
    // Generate using standard method
    return this.generateProjection(legacyParams.priceModel, params, historicalData)
  }
  
  /**
   * Convert legacy PriceEngineParams to new PriceModelParams format
   * 
   * @param legacyParams - Legacy parameters
   * @returns New format parameters
   */
  private convertLegacyParams(legacyParams: PriceEngineParams): PriceModelParams {
    const modelSpecificParams: Record<string, any> = {}
    
    // Convert model-specific parameters
    switch (legacyParams.priceModel) {
      case 'manual':
        if (legacyParams.annualGrowthRates) {
          modelSpecificParams.annualGrowthRates = legacyParams.annualGrowthRates
        }
        break
        
      case 'powerLaw':
        if (legacyParams.powerLawSettings) {
          modelSpecificParams.powerLawSettings = legacyParams.powerLawSettings
        }
        break
        
      case 'cycleRepeat':
        // Cycle repeat uses historical data patterns
        break
        
      case 'enhancedCycleRepeat':
        // Try loading from sessionStorage (where the UI saves them)
        try {
          const savedParams = sessionStorage.getItem('enhancedCycleRepeat_params')
          if (savedParams) {
            modelSpecificParams.diminishingReturns = JSON.parse(savedParams)
          }
        } catch (error) {
          console.warn('Failed to load saved Enhanced Cycle Repeat parameters:', error)
        }
        
        // Use moderate preset as fallback
        if (!modelSpecificParams.diminishingReturns) {
          modelSpecificParams.diminishingReturns = {
            institutionalSaturation: 0,
            competitionLevel: 0,
            regulatoryImpact: 0,
            marketMaturity: 0,
            adoptionCeiling: 0
          }
        }
        break
    }
    
    return {
      startPrice: legacyParams.initialBtcPrice,
      projectionMonths: legacyParams.simulationMonths,
      modelSpecificParams
    }
  }
  
  /**
   * Get list of available price models
   * 
   * @returns Array of available model IDs
   */
  getAvailableModels(): PriceModel[] {
    return ['manual', 'powerLaw', 'cycleRepeat', 'enhancedCycleRepeat']
  }
  
  /**
   * Check if a model is available
   * 
   * @param modelId - Model identifier to check
   * @returns True if model is available
   */
  isModelAvailable(modelId: PriceModel): boolean {
    try {
      const model = priceModelRegistry.getModel(modelId)
      return model !== null
    } catch {
      return false
    }
  }
  
  /**
   * Get model information
   * 
   * @param modelId - Model identifier
   * @returns Model information or null if not found
   */
  getModelInfo(modelId: PriceModel): { name: string; version: string; description: string } | null {
    try {
      const model = priceModelRegistry.getModel(modelId)
      if (!model) return null
      
      return {
        name: model.name,
        version: model.version,
        description: model.description
      }
    } catch {
      return null
    }
  }
}

/**
 * Singleton instance of the unified price projection service
 */
export const unifiedPriceProjectionService = new UnifiedPriceProjectionService()

