import type { PriceModelParams } from './types'
import type { SimulationParams } from '../types/simulation'
import { DIMINISHING_RETURNS_PRESETS, type DiminishingReturnsParams } from './models/EnhancedCycleRepeatModel'

export function readCycleSettings(): DiminishingReturnsParams {
  try {
    const saved = sessionStorage.getItem('bitcoin-sim-diminishing-returns-params')
    if (saved) return { ...DIMINISHING_RETURNS_PRESETS.moderate.params, ...JSON.parse(saved) }
  } catch { /* Storage is optional; the scenario remains usable without it. */ }
  return { ...DIMINISHING_RETURNS_PRESETS.moderate.params }
}

export function scenarioModelParams(params: SimulationParams): PriceModelParams {
  return {
    startPrice: params.initialBtcPrice,
    projectionMonths: params.simulationMonths,
    modelSpecificParams: params.priceModel === 'manual'
      ? { annualGrowthRates: params.annualGrowthRates }
      : params.priceModel === 'powerLaw'
        ? { ...params.powerLawSettings }
        : { diminishingReturns: params.cycleReplaySettings ?? readCycleSettings() },
  }
}
