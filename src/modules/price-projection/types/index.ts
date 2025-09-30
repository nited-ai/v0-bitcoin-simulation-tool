/**
 * Price Projection Types
 *
 * Type definitions for price projection models and results.
 *
 * @deprecated This module is deprecated and will be removed in Phase 4.
 * Use types from `app/simulation/price-models/types.ts` instead.
 * See migration guide: `.agent-os/specs/2025-09-30-price-projection-standardization/`
 */

/**
 * Price projection result interface
 *
 * @deprecated Use `PriceProjectionResult` from `app/simulation/price-models/types.ts` instead.
 * This interface will be removed in Phase 4 of the standardization migration.
 *
 * Migration path:
 * ```typescript
 * // Old (deprecated):
 * import { PriceProjectionResult } from '@/src/modules/price-projection/types'
 *
 * // New (standard):
 * import { PriceProjectionResult } from '@/app/simulation/price-models/types'
 * ```
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
 *
 * @deprecated Use `PriceProjectionModel` from `app/simulation/price-models/types.ts` instead.
 * This interface will be removed in Phase 4 of the standardization migration.
 */
export interface IPriceProjectionModel {
  name: string
  version: string
  generateProjection(params: any): Promise<PriceProjectionResult>
}

/**
 * Price projection parameters
 *
 * @deprecated Use `PriceModelParams` from `app/simulation/price-models/types.ts` instead.
 * This interface will be removed in Phase 4 of the standardization migration.
 */
export interface PriceProjectionParams {
  model: string
  simulationLength: number
  initialPrice: number
  parameters: Record<string, any>
}
