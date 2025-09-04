/**
 * Price Projection Interface
 * 
 * Defines the contract for price projection services and data structures
 * used for cross-module communication between price projection and strategy modules.
 */

import type { PriceModelParams, PriceProjectionResult, HistoricalDataPoint } from '../types'

/**
 * Price line types for strategy selection
 */
export type PriceLineType = 'volatile' | 'average' | 'support' | 'resistance'

/**
 * Individual price point optimized for strategy consumption
 */
export interface StrategyPricePoint {
  timestamp: number
  price: number           // Main price for strategy decisions
  supportPrice?: number   // Conservative price estimate
  resistancePrice?: number // Optimistic price estimate
  confidence: number      // 0.0 to 1.0
}

/**
 * Price projection data optimized for strategy consumption
 */
export interface StrategyPriceData {
  projectionPoints: StrategyPricePoint[]
  metadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    confidence: number
    generatedAt: string
    [key: string]: any
  }
  supportLines?: number[]
  resistanceLines?: number[]
}

/**
 * Available price line options for a projection
 */
export interface PriceLineOptions {
  volatile: {
    available: boolean
    description: string
  }
  average: {
    available: boolean
    description: string
  }
  support: {
    available: boolean
    description: string
  }
  resistance: {
    available: boolean
    description: string
  }
}

/**
 * Main interface for price projection services
 * 
 * This interface defines how other modules can request price projections
 * and receive data in a format optimized for their specific needs.
 */
export interface PriceProjectionService {
  /**
   * Generate price projection optimized for strategy consumption
   * 
   * @param modelId - ID of the price model to use
   * @param params - Parameters for price projection generation
   * @param historicalData - Historical Bitcoin price data
   * @returns Promise resolving to strategy-optimized price data
   */
  generateProjectionForStrategy(
    modelId: string,
    params: PriceModelParams,
    historicalData: HistoricalDataPoint[]
  ): Promise<StrategyPriceData>

  /**
   * Get available price lines for a projection result
   * 
   * @param projectionResult - Original projection result
   * @returns Available price line options with descriptions
   */
  getAvailablePriceLines(projectionResult: PriceProjectionResult): PriceLineOptions
}

/**
 * Price projection request structure
 */
export interface ProjectionRequest {
  modelId: string
  params: PriceModelParams
  historicalData: HistoricalDataPoint[]
  selectedPriceLine?: PriceLineType
}

/**
 * Price projection response structure
 */
export interface ProjectionResponse {
  success: boolean
  data?: StrategyPriceData
  error?: string
  modelId: string
  generatedAt: string
}
