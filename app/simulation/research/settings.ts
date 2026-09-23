import type { SimulationParams } from '../types/simulation'
import type { StrategyId } from '@/src/modules/simulator/types'

export interface ResearchSettings {
  strategy: StrategyId
  initialCash: number
  contribution: number
  withdrawal: number
  withdrawalStart: number
  inflation: number
  tradingFee: number
  entryMonths: number
  btcWeight: number
  dipPercent: number
  referenceAth: number
  buyFraction: number
  buyMax: number
  buyFrequency: 'daily' | 'monthly'
  maDays: number
  maDiscount: number
  refinance: boolean
  autoTopUp: boolean
}
export interface StressSettings { enabled: boolean; month: number; dropPercent: number }
export function researchSettings(params: SimulationParams): ResearchSettings {
  return {
    strategy: params.investmentStrategy === 'rollingLoan' ? (params.btcAccumulation ? 'loan' : 'credit') : 'hold',
    initialCash: 0, contribution: Math.max(0, params.monthlyWithdrawalAmount),
    withdrawal: Math.max(0, -params.monthlyWithdrawalAmount), withdrawalStart: 1,
    inflation: 0, tradingFee: 0.25, entryMonths: 12, btcWeight: 0.7,
    dipPercent: 50, referenceAth: 0, buyFraction: 100, buyMax: 1000000,
    buyFrequency: 'daily', maDays: 200, maDiscount: 0, refinance: true, autoTopUp: true,
    ...params.research,
  }
}
