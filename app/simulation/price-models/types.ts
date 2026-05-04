/**
 * Price Model Types
 * 
 * Type definitions for the price projection microservices system.
 * Provides standardized interfaces for all price models.
 */

import type { HistoricalDataPoint } from "@/src/modules/price-data/types"

/**
 * Price line types for strategy selection
 */
export type PriceLineType = 'volatile' | 'average' | 'support' | 'resistance'

/**
 * Individual projection point
 */
export interface ProjectionPoint {
  timestamp: number
  price: number
  support?: number
  resistance?: number
  confidence: number
  metadata?: Record<string, any>
}

/**
 * Complete price projection result
 */
export interface PriceProjectionResult {
  modelName: string
  modelVersion: string
  projectionPoints: ProjectionPoint[]
  metadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    confidence: number
    generatedAt: string
    [key: string]: any
  }
}

/**
 * Parameters for price model generation
 */
export interface PriceModelParams {
  startPrice: number
  projectionMonths: number
  modelSpecificParams?: Record<string, any>
}

/**
 * Power Law specific parameters for enhanced volatility support
 */
export interface PowerLawModelParams extends PriceModelParams {
  modelSpecificParams: {
    prognosisLine: 'fit' | 'support' | 'resistance'
    // Independent price projection parameters (separate from regression lines)
    priceProjectionParams?: {
      slope: number                  // Custom slope for price projection
      intercept: number              // Custom intercept for price projection
    }
    // Cycle Repeat Volatility settings
    cycleRepeatVolatility?: {
      enabled: boolean               // Enable/disable volatility feature
      patternLengthMonths: number    // 24-120 months, default: 96
      diminishingFactor: number      // 0.5-1.0, default: 1.0 (no diminishing)
    }
  }
}

/**
 * Core interface that all price models must implement
 */
export interface PriceProjectionModel {
  readonly name: string
  readonly version: string
  readonly description: string
  
  /**
   * Generate price projection
   */
  generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult>
  
  /**
   * Validate parameters before generation
   */
  validateParams(params: PriceModelParams): boolean
  
  /**
   * Get default parameters for this model
   */
  getDefaultParams(): Record<string, any>
}

/**
 * Registry entry for a price model
 */
export interface PriceModelRegistryEntry {
  id: string
  model: PriceProjectionModel
  enabled: boolean
  priority: number
}

/**
 * Model metadata for UI display
 */
export interface PriceModelMetadata {
  name: string
  version: string
  description: string
  author: string
  tags: string[]
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high' | 'user-defined'
  complexity: 'beginner' | 'intermediate' | 'advanced'
  timeHorizon: 'short-term' | 'medium-term' | 'long-term' | 'flexible'
  dataRequirements: 'none' | 'historical-price-data' | 'external-api'
  confidenceRange: string
  [key: string]: any
}

/**
 * Model comparison result
 */
export interface ModelComparisonResult {
  modelId: string
  modelName: string
  result: PriceProjectionResult | null
  error?: string
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  total: number
  enabled: number
  disabled: number
  models: Array<{
    id: string
    name: string
    enabled: boolean
    priority: number
  }>
}

/**
 * Model validation result
 */
export interface ModelValidationResult {
  valid: string[]
  invalid: string[]
}

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  date: string
  timestamp: number
  volatile: number
  average: number
  support: number
  resistance: number
}

/**
 * Price model configuration
 */
export interface PriceModelConfig {
  id: string
  enabled: boolean
  priority: number
  defaultParams: Record<string, any>
  metadata: PriceModelMetadata
}

/**
 * Projection request
 */
export interface ProjectionRequest {
  modelId: string
  historicalData: HistoricalDataPoint[]
  params: PriceModelParams
}

/**
 * Projection response
 */
export interface ProjectionResponse {
  success: boolean
  result?: PriceProjectionResult
  error?: string
  modelId: string
  generatedAt: string
}

/**
 * Batch projection request
 */
export interface BatchProjectionRequest {
  modelIds: string[]
  historicalData: HistoricalDataPoint[]
  params: PriceModelParams
}

/**
 * Batch projection response
 */
export interface BatchProjectionResponse {
  results: ModelComparisonResult[]
  successful: number
  failed: number
  generatedAt: string
}

/**
 * Model performance metrics
 */
export interface ModelPerformanceMetrics {
  modelId: string
  accuracy?: number
  averageConfidence: number
  executionTime: number
  lastUsed: string
  usageCount: number
}

/**
 * Price model events
 */
export type PriceModelEvent = 
  | { type: 'MODEL_REGISTERED'; modelId: string; modelName: string }
  | { type: 'MODEL_UNREGISTERED'; modelId: string }
  | { type: 'MODEL_ENABLED'; modelId: string }
  | { type: 'MODEL_DISABLED'; modelId: string }
  | { type: 'PROJECTION_STARTED'; modelId: string; params: PriceModelParams }
  | { type: 'PROJECTION_COMPLETED'; modelId: string; result: PriceProjectionResult }
  | { type: 'PROJECTION_FAILED'; modelId: string; error: string }

/**
 * Event listener for price model events
 */
export type PriceModelEventListener = (event: PriceModelEvent) => void

/**
 * Price model registry interface
 */
export interface IPriceModelRegistry {
  registerModel(id: string, model: PriceProjectionModel, enabled?: boolean, priority?: number): void
  unregisterModel(id: string): boolean
  getModel(id: string): PriceProjectionModel | null
  getAllModels(): PriceModelRegistryEntry[]
  getModelNames(): Array<{ id: string; name: string; description: string }>
  setModelEnabled(id: string, enabled: boolean): boolean
  generateProjection(modelId: string, historicalData: HistoricalDataPoint[], params: PriceModelParams): Promise<PriceProjectionResult | null>
  getModelDefaultParams(modelId: string): Record<string, any> | null
  validateAllModels(): ModelValidationResult
  getStats(): RegistryStats
  compareModels(modelIds: string[], historicalData: HistoricalDataPoint[], params: PriceModelParams): Promise<ModelComparisonResult[]>
}

/**
 * Utility type for extracting model-specific parameters
 */
export type ExtractModelParams<T extends PriceProjectionModel> = 
  T extends { getDefaultParams(): infer P } ? P : Record<string, any>

/**
 * Type guard for checking if an object is a valid price model
 */
export function isPriceProjectionModel(obj: any): obj is PriceProjectionModel {
  return (
    obj &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.generateProjection === 'function' &&
    typeof obj.validateParams === 'function' &&
    typeof obj.getDefaultParams === 'function'
  )
}

/**
 * Type guard for checking if an object is a valid projection result
 */
export function isPriceProjectionResult(obj: any): obj is PriceProjectionResult {
  return (
    obj &&
    typeof obj.modelName === 'string' &&
    typeof obj.modelVersion === 'string' &&
    Array.isArray(obj.projectionPoints) &&
    obj.metadata &&
    typeof obj.metadata.totalMonths === 'number' &&
    typeof obj.metadata.confidence === 'number'
  )
}
