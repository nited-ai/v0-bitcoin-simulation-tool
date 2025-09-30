/**
 * Unified Price Projection Service
 * 
 * Provides a single, standardized interface for generating price projections
 * across all models. This service wraps both the legacy PriceDataService and
 * the new PriceModelRegistry, ensuring all outputs use the standard format.
 * 
 * BENEFITS:
 * - Single source of truth for price projections
 * - Automatic format conversion
 * - Backward compatibility
 * - Type-safe outputs
 * 
 * @module UnifiedPriceProjectionService
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
      // All models now use PriceModelRegistry
      const result = await priceModelRegistry.generateProjection(
        modelId,
        historicalData,
        params
      )
      
      if (!result) {
        throw new Error(`Failed to generate projection for model: ${modelId}`)
      }
      
      // Validate the result
      const validation = PriceProjectionAdapter.validate(result)
      if (!validation.valid) {
        console.error('❌ Invalid projection result:', validation.errors)
        throw new Error(`Invalid projection result: ${validation.errors.join(', ')}`)
      }
      
      console.log(`✅ Unified Service: Projection generated successfully`)
      console.log(`   - Model: ${result.modelName}`)
      console.log(`   - Points: ${result.projectionPoints.length}`)
      console.log(`   - Months: ${result.metadata.totalMonths}`)
      console.log(`   - Growth: ${result.metadata.totalGrowth.toFixed(2)}%`)
      
      return result
      
    } catch (error) {
      console.error(`❌ Unified Service: Failed to generate projection:`, error)
      throw error
    }
  }
  
  /**
   * Generate projection from legacy PriceEngineParams format
   * Provides backward compatibility for existing code
   * 
   * @param legacyParams - Legacy parameter format
   * @param historicalData - Historical Bitcoin price data
   * @returns Standardized price projection result
   */
  async generateProjectionFromLegacyParams(
    legacyParams: PriceEngineParams,
    historicalData: HistoricalDataPoint[]
  ): Promise<PriceProjectionResult> {
    
    console.log(`🔄 Converting legacy params to new format for model: ${legacyParams.priceModel}`)
    
    // Convert legacy params to new format
    const modelParams = this.convertLegacyParams(legacyParams)
    
    // Generate using standard method
    return this.generateProjection(
      legacyParams.priceModel,
      modelParams,
      historicalData
    )
  }
  
  /**
   * Convert legacy PriceEngineParams to new PriceModelParams format
   */
  private convertLegacyParams(legacyParams: PriceEngineParams): PriceModelParams {
    const modelSpecificParams: Record<string, any> = {}
    
    // Extract model-specific parameters based on model type
    switch (legacyParams.priceModel) {
      case 'manual':
        if (legacyParams.annualGrowthRates) {
          modelSpecificParams.annualGrowthRates = legacyParams.annualGrowthRates
        }
        break
        
      case 'powerLaw':
        if (legacyParams.powerLawSettings) {
          modelSpecificParams.prognosisLine = legacyParams.powerLawSettings.prognosisLine || 'fit'
        }
        break
        
      case 'cycleRepeat':
        if (legacyParams.historicalDailyMultipliers) {
          modelSpecificParams.historicalDailyMultipliers = legacyParams.historicalDailyMultipliers
        }
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
          console.log('📊 Using moderate preset for Enhanced Cycle Repeat model')
          modelSpecificParams.diminishingReturns = {
            diminishingFactor: 0.25,
            maturityThreshold: 2_000_000_000_000,
            cycleDegradation: 0.15,
            adoptionCurveType: 'sigmoid',
            institutionalSaturation: 0.4,
            regulatoryMaturity: 0.5,
            liquidityConstraint: 0.4,
            competitionFactor: 0.3
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
   * Get available price models
   */
  getAvailableModels(): string[] {
    return priceModelRegistry.listModels()
  }
  
  /**
   * Check if a model is available
   */
  isModelAvailable(modelId: string): boolean {
    const model = priceModelRegistry.getModel(modelId)
    return model !== null
  }
  
  /**
   * Get model information
   */
  getModelInfo(modelId: string): { name: string; version: string; description: string } | null {
    const model = priceModelRegistry.getModel(modelId)
    if (!model) return null
    
    return {
      name: model.name,
      version: model.version,
      description: model.description
    }
  }
}

/**
 * Singleton instance for global use
 */
export const unifiedPriceProjectionService = new UnifiedPriceProjectionService()

