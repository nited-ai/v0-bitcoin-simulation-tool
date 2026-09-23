'use client'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { simulate } from '@/src/modules/simulator/engine'
import { STRATEGIES, type Plan, type PriceDay, type SimulationResult, type StrategyId } from '@/src/modules/simulator/types'
import { simulationPlan } from './planAdapter'
import { projectionPath } from './projectionPath'
import { researchSettings } from './settings'

interface ResearchState {
  plan: Plan | null; path: PriceDay[]; results: Partial<Record<StrategyId, SimulationResult>>
  selectedStrategy: StrategyId; error: string | null; quality: string; loading: boolean
}
const Context = createContext<ResearchState | null>(null)
export function ResearchProvider({children}: {children: ReactNode}) {
  const { params, priceProjection, historicalPriceData, chartLoading, errors } = useSimulation()
  const value = useMemo<ResearchState>(() => {
    const selectedStrategy = researchSettings(params).strategy
    const empty = { selectedStrategy, plan: null, path: [], results: {}, error: null, quality: '', loading: chartLoading }
    if (!priceProjection || chartLoading) return { ...empty, error: errors.find(e => e.startsWith('Projektion:')) ?? null }
    try {
      const plan = simulationPlan(params, priceProjection, historicalPriceData)
      const path = projectionPath(priceProjection)
      const results: Partial<Record<StrategyId,SimulationResult>> = {}
      for (const strategy of STRATEGIES) results[strategy.id] = simulate(plan, path, strategy.id)
      const quality = priceProjection.metadata.candleKind === 'cycle-replay'
        ? 'Tagesbewegungen und Tagestiefs aus der gewählten historischen Zyklusvorlage, auf deinen Startkurs übertragen.'
        : 'Glatte Tagesinterpolation zwischen Monatskursen. Zusätzliche Schwankungen fehlen; Kreditrisiken können dadurch zu niedrig erscheinen.'
      return { plan, path, results, selectedStrategy, error: null, loading: false, quality: quality +
        (priceProjection.metadata.stress ? ' Der eingestellte Flashcrash ist im Tagestief enthalten.' : '') +
        (selectedStrategy === 'ma-dca' && !plan.warmupCloses?.length ? ' Der gleitende Durchschnitt baut sich ab Simulationsstart auf, da unmittelbar vorherige Tageskurse fehlen.' : '') }
    } catch (e) { return { ...empty, loading: false, error: e instanceof Error ? e.message : 'Simulation fehlgeschlagen.' } }
  }, [params, priceProjection, historicalPriceData, chartLoading, errors])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useResearch() {
  const state = useContext(Context)
  if (!state) throw new Error('ResearchProvider fehlt.')
  return state
}
