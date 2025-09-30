/**
 * Price Projection Adapter
 * 
 * Central conversion utility for all price projection formats.
 * Provides conversion between the standard format and specialized formats
 * needed by different parts of the application.
 */

import type {
  PriceProjectionResult as NewPriceProjectionResult,
  ProjectionPoint,
  PriceModelParams
} from "../../../../app/simulation/price-models/types"
import type {
  PriceProjectionResult as OldPriceProjectionResult
} from "../../price-projection/types"
import type {
  PriceChartDataPoint,
  HistoricalDataPoint
} from "../../price-data/types"

/**
 * Strategy-compatible price data format
 */
export interface StrategyPriceData {
  modelName: string
  pricePoints: Array<{
    month: number
    price: number
    timestamp: number
  }>
  metadata: {
    totalMonths: number
    startPrice: number
    endPrice: number
  }
}

/**
 * Results-compatible price data format with analytics
 */
export interface ResultsPriceData extends StrategyPriceData {
  analytics: {
    totalGrowth: number
    averageMonthlyGrowth: number
    maxDecline: number
    volatility: number
  }
}

/**
 * Type guard to check if projection is new standard format
 */
export function isNewPriceProjectionResult(
  projection: any
): projection is NewPriceProjectionResult {
  return (
    projection &&
    typeof projection === 'object' &&
    'modelName' in projection &&
    'projectionPoints' in projection &&
    Array.isArray(projection.projectionPoints) &&
    'metadata' in projection &&
    typeof projection.metadata === 'object'
  )
}

/**
 * Type guard to check if projection is old format
 */
export function isOldPriceProjectionResult(
  projection: any
): projection is OldPriceProjectionResult {
  return (
    projection &&
    typeof projection === 'object' &&
    'projectedPrices' in projection &&
    'metadata' in projection &&
    typeof projection.metadata === 'object' &&
    'model' in projection.metadata
  )
}

/**
 * Price Projection Adapter
 * 
 * Provides conversion utilities between different price projection formats
 */
export class PriceProjectionAdapter {
  
  /**
   * Convert new standard format to strategy-compatible format
   * 
   * @param projection - Standard price projection result
   * @param selectedPriceLine - Which price line to use (price, support, resistance)
   * @returns Strategy-compatible price data
   */
  static toStrategyFormat(
    projection: NewPriceProjectionResult,
    selectedPriceLine: 'price' | 'support' | 'resistance' = 'price'
  ): StrategyPriceData {
    const pricePoints = projection.projectionPoints.map((point, index) => {
      let price = point.price
      
      // Use selected price line if available
      if (selectedPriceLine === 'support' && point.support !== undefined) {
        price = point.support
      } else if (selectedPriceLine === 'resistance' && point.resistance !== undefined) {
        price = point.resistance
      }
      
      return {
        month: index,
        price,
        timestamp: point.timestamp
      }
    })
    
    return {
      modelName: projection.modelName,
      pricePoints,
      metadata: {
        totalMonths: projection.metadata.totalMonths,
        startPrice: pricePoints[0]?.price || 0,
        endPrice: pricePoints[pricePoints.length - 1]?.price || 0
      }
    }
  }
  
  /**
   * Convert new standard format to results-compatible format
   * Includes additional analytics for results visualization
   */
  static toResultsFormat(projection: NewPriceProjectionResult): ResultsPriceData {
    const strategyData = this.toStrategyFormat(projection)
    
    return {
      ...strategyData,
      analytics: {
        totalGrowth: projection.metadata.totalGrowth,
        averageMonthlyGrowth: projection.metadata.averageMonthlyGrowth,
        maxDecline: projection.metadata.maxDecline || 0,
        volatility: projection.metadata.volatility || 0
      }
    }
  }
  
  /**
   * Convert from old format to new standard format
   * 
   * @param oldProjection - Old price projection result
   * @returns New standard format
   */
  static fromOldFormat(oldProjection: OldPriceProjectionResult): NewPriceProjectionResult {
    const projectionPoints: ProjectionPoint[] = oldProjection.projectionPoints.map(point => ({
      timestamp: point.timestamp,
      price: point.price,
      confidence: 1.0,
      metadata: { date: point.date }
    }))
    
    return {
      modelName: oldProjection.metadata.model,
      modelVersion: oldProjection.metadata.version,
      projectionPoints,
      metadata: {
        totalMonths: oldProjection.metadata.totalMonths,
        totalGrowth: ((oldProjection.metadata.finalPrice - oldProjection.metadata.initialPrice) / oldProjection.metadata.initialPrice) * 100,
        averageMonthlyGrowth: 0, // Calculate if needed
        maxDecline: 0,
        volatility: 0,
        confidence: 1.0,
        generatedAt: oldProjection.metadata.generatedAt
      }
    }
  }
  
  /**
   * Convert from legacy PriceChartDataPoint[] format to new standard format
   * 
   * @param chartData - Legacy chart data points
   * @param modelName - Name of the model that generated this data
   * @param historicalData - Optional historical data for context
   * @returns New standard format
   */
  static fromLegacyFormat(
    chartData: PriceChartDataPoint[],
    modelName: string,
    historicalData?: HistoricalDataPoint[]
  ): NewPriceProjectionResult {
    // Filter for projection data only (has simulationPath)
    const projectionData = chartData.filter(point => point.simulationPath !== undefined)
    
    const projectionPoints: ProjectionPoint[] = projectionData.map(point => {
      const timestamp = new Date(point.date).getTime()
      return {
        timestamp,
        price: point.simulationPath || point.historicalPrice || 0,
        support: point.support,
        resistance: point.resistance,
        confidence: 1.0,
        metadata: { days: point.days, date: point.date }
      }
    })
    
    // Calculate metadata
    const startPrice = projectionPoints[0]?.price || 0
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || 0
    const totalGrowth = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0
    
    return {
      modelName,
      modelVersion: '1.0.0',
      projectionPoints,
      metadata: {
        totalMonths: projectionPoints.length,
        totalGrowth,
        averageMonthlyGrowth: projectionPoints.length > 0 ? totalGrowth / projectionPoints.length : 0,
        maxDecline: 0,
        volatility: 0,
        confidence: 1.0,
        generatedAt: new Date().toISOString()
      }
    }
  }
  
  /**
   * Convert from new standard format to legacy PriceChartDataPoint[] format
   * For backward compatibility during migration
   * 
   * @param projection - Standard price projection result
   * @param historicalData - Optional historical data to merge
   * @returns Legacy chart data points
   */
  static toLegacyFormat(
    projection: NewPriceProjectionResult,
    historicalData?: HistoricalDataPoint[]
  ): PriceChartDataPoint[] {
    const chartData: PriceChartDataPoint[] = []
    
    // Add historical data if provided
    if (historicalData) {
      historicalData.forEach(point => {
        const date = new Date(point.date)
        const days = Math.floor((date.getTime() - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24))
        
        chartData.push({
          date: point.date,
          days,
          historicalPrice: point.close
        })
      })
    }
    
    // Add projection data
    projection.projectionPoints.forEach(point => {
      const date = new Date(point.timestamp).toISOString().split('T')[0]
      const days = point.metadata?.days || Math.floor((point.timestamp - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24))
      
      chartData.push({
        date,
        days,
        simulationPath: point.price,
        support: point.support,
        resistance: point.resistance
      })
    })
    
    return chartData
  }
  
  /**
   * Get price at specific month index with monthly-to-daily conversion
   * 
   * @param projection - Price projection data
   * @param monthIndex - Month index (0-based)
   * @param daysPerMonth - Days per month for conversion (default: 30)
   * @returns Price at the specified month
   */
  static getPriceAtMonth(
    projection: NewPriceProjectionResult | StrategyPriceData,
    monthIndex: number,
    daysPerMonth: number = 30
  ): number {
    if ('pricePoints' in projection) {
      // StrategyPriceData format
      const point = projection.pricePoints[monthIndex]
      return point?.price || projection.pricePoints[projection.pricePoints.length - 1]?.price || 0
    } else {
      // PriceProjectionResult format - convert month to day index
      const dayIndex = monthIndex * daysPerMonth
      const point = projection.projectionPoints[dayIndex]
      return point?.price || projection.projectionPoints[projection.projectionPoints.length - 1]?.price || 0
    }
  }
  
  /**
   * Validate projection data integrity
   * 
   * @param projection - Projection to validate
   * @returns Validation result with errors if any
   */
  static validate(projection: NewPriceProjectionResult): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!projection.modelName) {
      errors.push('Missing modelName')
    }
    
    if (!projection.projectionPoints || projection.projectionPoints.length === 0) {
      errors.push('No projection points')
    }
    
    if (!projection.metadata) {
      errors.push('Missing metadata')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

