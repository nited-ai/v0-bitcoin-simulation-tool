/**
 * Price Projection Types
 * 
 * Type definitions for price projection models and results.
 */

/**
 * Price projection result interface
 */
export interface PriceProjectionResult {
  projectedPrices: Array<{
    month: number
    date: string
    price: number
  }>
  projectionPoints: Array<{
    timestamp: number
    price: number
    date: string
  }>
  metadata: {
    model: string
    version: string
    parameters: Record<string, any>
    generatedAt: string
    totalMonths: number
    initialPrice: number
    finalPrice: number
  }
}

/**
 * Price projection model interface
 */
export interface IPriceProjectionModel {
  name: string
  version: string
  generateProjection(params: any): Promise<PriceProjectionResult>
}

/**
 * Price projection parameters
 */
export interface PriceProjectionParams {
  model: string
  simulationLength: number
  initialPrice: number
  parameters: Record<string, any>
}
