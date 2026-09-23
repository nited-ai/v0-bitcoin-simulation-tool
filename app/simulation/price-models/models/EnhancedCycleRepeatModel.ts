/**
 * Enhanced Cycle Repeat Model
 *
 * Advanced implementation of the Bitcoin cycle repeat price prediction model     
 * with diminishing returns theory and economic maturation effects.
 */

import type {
  PriceProjectionModel,
  PriceProjectionResult,
  PriceModelParams,
  ProjectionPoint

} from "../types"
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"
import { replayHistoricalCycle } from './cycleReplay'

/**
 * Diminishing Returns Parameters
 */
export interface DiminishingReturnsParams {
  referenceCycle?: 'trailing' | '2016-2020' | '2020-2024'
  phaseMonths?: number
  diminishingFactor: number // 0-1, how strongly diminishing returns affect growth
  maturityThreshold: number // Market cap threshold where effects begin
  cycleDegradation: number // 0-1, how much each cycle degrades
  adoptionCurveType: 'linear' | 'logarithmic' | 'sigmoid'
  institutionalSaturation: number // 0-1, level of institutional adoption
  regulatoryMaturity: number // 0-1, regulatory framework development
  liquidityConstraint: number // 0-1, market liquidity constraints
  competitionFactor: number // 0-1, competitive pressure from other assets
}

/**
 * Preset configurations for different economic scenarios
 */
/**
 * Preset values are designed so the user-perceived label matches the forecast outcome:
 *
 *   Conservative → LOW forecast (heavy dampening): high diminishingFactor, LOW
 *     cycleDegradation threshold so most daily gains get dampened.
 *   Optimistic   → HIGH forecast (minimal dampening): low diminishingFactor, HIGH
 *     cycleDegradation threshold so few daily gains get dampened.
 *
 * NOTE on `cycleDegradation`: in `applyDiminishingReturns` it is used as a
 * percentage THRESHOLD (gainPercentage <= threshold → no dampening). Higher
 * threshold = LESS dampening overall.
 */
export const DIMINISHING_RETURNS_PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'Strong diminishing returns with high market maturity assumptions',
    params: {
      diminishingFactor: 0.8, // High = heavy dampening of excess gains
      maturityThreshold: 1_000_000_000_000,
      cycleDegradation: 0.05, // Low threshold → most daily gains caught
      adoptionCurveType: 'logarithmic' as const,
      institutionalSaturation: 0.7,
      regulatoryMaturity: 0.8,
      liquidityConstraint: 0.6,
      competitionFactor: 0.5
    }
  },
  moderate: {
    name: 'Moderate',
    description: 'Balanced diminishing returns reflecting gradual market evolution',
    params: {
      diminishingFactor: 0.5,
      maturityThreshold: 2_000_000_000_000,
      cycleDegradation: 0.15,
      adoptionCurveType: 'sigmoid' as const,
      institutionalSaturation: 0.4,
      regulatoryMaturity: 0.5,
      liquidityConstraint: 0.4,
      competitionFactor: 0.3
    }
  },
  optimistic: {
    name: 'Optimistic',
    description: 'Minimal diminishing returns with continued growth potential',
    params: {
      diminishingFactor: 0.2, // Low = light dampening
      maturityThreshold: 5_000_000_000_000,
      cycleDegradation: 0.30, // High threshold → few daily gains caught
      adoptionCurveType: 'linear' as const,
      institutionalSaturation: 0.2,
      regulatoryMaturity: 0.3,
      liquidityConstraint: 0.2,
      competitionFactor: 0.1
    }
  },
  moonshots: {
    name: 'Moonshots',
    description: 'Aggressive growth assumptions with minimal constraints',
    params: {
      diminishingFactor: 0.05, // Very minimal impact
      maturityThreshold: 10_000_000_000_000,
      cycleDegradation: 0.02,
      adoptionCurveType: 'linear' as const,
      institutionalSaturation: 0.1,
      regulatoryMaturity: 0.2,
      liquidityConstraint: 0.1,
      competitionFactor: 0.05
    }
  }
} as const

/**
 * Enhanced Cycle Repeat Model Implementation
 */
export class EnhancedCycleRepeatModel implements PriceProjectionModel {
  readonly name = "Historical Cycle Replay"
  readonly version = "3.0.0"
  readonly description = "Historische Tagesbewegungen und Zyklusphasen wiederholen"

  async generateProjection(
    historicalData: HistoricalDataPoint[],
    params: PriceModelParams
  ): Promise<PriceProjectionResult> {
    if (!this.validateParams(params)) throw new Error('Ungültige Zyklusparameter.')
    const settings = params.modelSpecificParams?.diminishingReturns ?? DIMINISHING_RETURNS_PRESETS.moderate.params
    return replayHistoricalCycle(historicalData, params, settings)
  }

  /**
   * Validate model parameters
   */
  validateParams(params: PriceModelParams): boolean {
    if (!Number.isFinite(params.startPrice) || params.startPrice <= 0) {
      console.error("Enhanced Cycle Repeat Model: Invalid start price")
      return false
    }

    if (!Number.isInteger(params.projectionMonths) || params.projectionMonths <= 0 || params.projectionMonths > 300) {
      console.error("Enhanced Cycle Repeat Model: Invalid projection months")
      return false
    }

    // Validate diminishing returns parameters if provided
    const diminishingReturns = params.modelSpecificParams?.diminishingReturns as DiminishingReturnsParams
    if (diminishingReturns) {
      if (!Number.isFinite(diminishingReturns.diminishingFactor) || diminishingReturns.diminishingFactor < 0 || diminishingReturns.diminishingFactor > 1) {
        console.error("Enhanced Cycle Repeat Model: Invalid diminishing factor (must be 0-1)")
        return false
      }

      if (!Number.isFinite(diminishingReturns.cycleDegradation) || diminishingReturns.cycleDegradation < 0 || diminishingReturns.cycleDegradation > 1) {
        console.error("Enhanced Cycle Repeat Model: Invalid cycle degradation (must be 0-1)")
        return false
      }
    }

    return true
  }
  /**
   * Get default parameters for the model
   */
  getDefaultParams(): Record<string, any> {
    return {
      diminishingReturns: DIMINISHING_RETURNS_PRESETS.moderate.params
    }
  }

  /**
   * Get model metadata
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: "Bitcoin Simulation Team",
      tags: ['cycle', 'historical', 'diminishing-returns'],
      complexity: 'advanced',
      dataRequirements: 'complete-daily-historical-price-data',
      confidenceRange: 'not-estimated',
      volatilityHandling: 'replayed historical daily movements',
      limitations: ['Historical patterns need not recur', 'Dampening is a user assumption'],
      presets: Object.keys(DIMINISHING_RETURNS_PRESETS)
    }
  }
}

// Export singleton instance
export const enhancedCycleRepeatModel = new EnhancedCycleRepeatModel()
