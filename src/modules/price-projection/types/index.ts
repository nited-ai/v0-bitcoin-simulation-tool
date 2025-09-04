/**
 * Price Projection Module Types
 * 
 * Type definitions for price projection models, services, and components.
 * Provides standardized interfaces for all price projection functionality.
 */

import type { HistoricalDataPoint } from '@/modules/shared/types'

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
    maxDecline?: number
    prognosis?: string
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
 * Model validation result
 */
export interface ModelValidationResult {
  totalModels: number
  validModels: number
  invalidModels: number
  results: Array<{
    modelId: string
    isValid: boolean
    errors: string[]
  }>
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalModels: number
  enabledModels: number
  disabledModels: number
  modelIds: string[]
}

/**
 * Model comparison result
 */
export interface ModelComparisonResult {
  modelId: string
  result: PriceProjectionResult | null
  error?: string
  executionTime: number
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
 * Manual Growth Model specific parameters
 */
export interface ManualGrowthParams {
  annualGrowthRates: number[]
}

/**
 * Power Law Model specific parameters
 */
export interface PowerLawParams {
  prognosis: 'fit' | 'support' | 'resistance'
}

/**
 * Cycle Repeat Model specific parameters
 */
export interface CycleRepeatParams {
  diminishingReturns?: {
    enabled: boolean
    earlyInstitutionalSaturation: number
    lowCompetition: number
    highSaturation: number
    highCompetition: number
  }
  cycleLength?: number
}

/**
 * Enhanced Cycle Repeat Model specific parameters
 */
export interface EnhancedCycleRepeatParams extends CycleRepeatParams {
  economicMaturationEffects?: {
    enabled: boolean
    institutionalAdoption: number
    marketMaturity: number
    regulatoryClarity: number
  }
}

/**
 * Logarithmic Curve Repeat Model specific parameters
 */
export interface LogarithmicCurveRepeatParams {
  curveType: 'logarithmic' | 'linear' | 'exponential' | 'sigmoid'
  curveControls: {
    earlyInstitutionalSaturation: number
    lowCompetition: number
    highSaturation: number
    highCompetition: number
  }
}

/**
 * Model performance metrics
 */
export interface ModelPerformanceMetrics {
  modelId: string
  averageExecutionTime: number
  successRate: number
  totalExecutions: number
  lastExecution: Date
  errors: string[]
}

/**
 * Price projection service configuration
 */
export interface PriceProjectionServiceConfig {
  enableCaching: boolean
  cacheTimeout: number
  maxConcurrentProjections: number
  defaultProjectionMonths: number
  enablePerformanceMetrics: boolean
}

/**
 * Price projection cache entry
 */
export interface ProjectionCacheEntry {
  key: string
  result: PriceProjectionResult
  timestamp: Date
  expiresAt: Date
  modelId: string
  params: PriceModelParams
}

/**
 * Price projection service interface
 */
export interface IPriceProjectionService {
  generateProjection(request: ProjectionRequest): Promise<ProjectionResponse>
  generateBatchProjections(request: BatchProjectionRequest): Promise<BatchProjectionResponse>
  getAvailableModels(): Array<{ id: string; name: string; description: string }>
  getModelDefaultParams(modelId: string): Record<string, any> | null
  validateModelParams(modelId: string, params: PriceModelParams): boolean
  clearCache(): void
  getPerformanceMetrics(): ModelPerformanceMetrics[]
}
