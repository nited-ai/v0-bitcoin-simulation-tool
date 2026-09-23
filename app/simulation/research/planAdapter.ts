import type { SimulationParams } from '../types/simulation'
import type { PriceProjectionResult } from '../price-models/types'
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'
import { DEFAULT_PLAN, type Plan } from '@/src/modules/simulator/types'
import { DAY } from '@/src/modules/simulator/paths'
import { researchSettings } from './settings'

export function simulationPlan(params: SimulationParams, projection: PriceProjectionResult, history: HistoricalDataPoint[]): Plan {
  const settings = researchSettings(params)
  const first = projection.projectionPoints[0]
  const startDate = new Date(first.timestamp).toISOString().slice(0, 10)
  const past = history.filter(p => p.time * 1000 < first.timestamp && Number.isFinite(p.close) && p.close > 0).sort((a,b) => a.time - b.time)
  // A stale snapshot must not masquerade as yesterday's MA history.
  const warmup: number[] = []
  let expected = first.timestamp - DAY
  for (let i = past.length - 1; i >= 0 && warmup.length < settings.maDays; i--) {
    if (past[i].time * 1000 !== expected) break
    warmup.unshift(past[i].close)
    expected -= DAY
  }
  return { ...DEFAULT_PLAN, ...settings, startDate, months: params.simulationMonths,
    startPrice: params.initialBtcPrice, initialBtc: params.initialBtcAmount,
    contributionIncrease: params.annualSavingsIncrease ?? 0,
    loanLtv: params.loanAmountPercent / 100, maxLtv: params.maxInitialLtv / 100,
    collateralLtv: params.riskManagement.targetLtv / 100,
    liquidationLtv: params.riskManagement.liquidationLtv / 100,
    annualInterest: params.annualInterestRate, originationFee: params.originationFeePercent,
    feeAnnual: params.originationFeeType === 'annual', loanTerm: Number.isFinite(params.loanTermMonths) ? params.loanTermMonths : 12,
    openEnded: !Number.isFinite(params.loanTermMonths), liquidationFee: params.liquidationFeePercent,
    maxLoanAmount: params.maxLoanAmount, creditProfile: params.platform,
    referenceAth: settings.referenceAth > 0 ? settings.referenceAth : Math.max(params.initialBtcPrice, ...past.map(p => Math.max(p.high, p.close))),
    warmupCloses: warmup,
  }
}
