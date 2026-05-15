"use client"


import { useEffect, useMemo } from "react"
import { SimulationProvider, useSimulation } from "./context/SimulationContext"
import { SimulationHeader, TabNavigation } from "./shared"
import { usePriceData } from "@/src/modules/price-data/hooks/usePriceData"
import { adaptManyToHistoricalDataPoints } from "@/src/modules/price-data/utils/adaptToHistoricalDataPoint"
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"
import { useRollingLoanCalculations } from "./hooks/useRollingLoanCalculations"
import { toLegacyMonthlyResults } from "@/src/modules/strategies/services/simulateRollingLoan"

/**
 * Bridge: keeps SimulationContext in sync with the SWR cache.
 *
 * PR3's usePriceData() returns prices/currentPrice/ath via SWR but does NOT
 * touch SimulationContext. This component lives once at the top of the tree
 * (inside SimulationProvider) and mirrors the SWR state into the existing
 * context fields (historicalPriceData, initialDataLoaded, isLoading, errors,
 * initialBtcPrice) so existing context consumers (BasicParametersCard,
 * useSimulationRunner, usePriceGeneration, etc.) keep working unchanged.
 */
function PriceDataBridge() {
  const { prices, currentPrice, isLoading, error } = usePriceData()
  const {
    setHistoricalPriceData,
    setInitialDataLoaded,
    setIsLoading,
    setErrors,
    setParams,
  } = useSimulation()

  // Adapt PR3's PricePoint[] to the legacy HistoricalDataPoint[] shape that
  // SimulationContext consumers (chart, price engine, etc.) expect.
  const historicalData = useMemo<HistoricalDataPoint[]>(
    () => adaptManyToHistoricalDataPoints(prices),
    [prices],
  )

  // Push historical data into context once it arrives.
  useEffect(() => {
    if (historicalData.length > 0) {
      setHistoricalPriceData(historicalData)
      setInitialDataLoaded(true)

      // Mirror legacy behaviour: seed initialBtcPrice from current price (preferred)
      // or latest historical close, but only if it actually changed (prevents
      // clobbering user edits via render loops).
      const latestClose = historicalData[historicalData.length - 1]?.close
      const initialPrice = currentPrice?.value ?? latestClose
      if (initialPrice) {
        setParams((prev) =>
          prev.initialBtcPrice !== initialPrice
            ? { ...prev, initialBtcPrice: initialPrice }
            : prev,
        )
      }
    }
  }, [historicalData, currentPrice?.value, setHistoricalPriceData, setInitialDataLoaded, setParams])

  // Mirror loading state.
  useEffect(() => {
    setIsLoading(isLoading)
  }, [isLoading, setIsLoading])

  // Mirror error state.
  useEffect(() => {
    if (error) {
      setErrors([error.message ?? String(error)])
    } else {
      setErrors([])
    }
  }, [error, setErrors])

  return null
}

/**
 * Bridge: keeps `context.results` (legacy `MonthlyResult[]`) in sync with the
 * reactive `useRollingLoanCalculations` hook output for the rollingLoan strategy.
 *
 * Before PR6, two pipelines ran in parallel: the hook (driving DetailedResultsTable
 * / HeadlineComparison / StrategyResultsChart) and the imperative
 * `useSimulationRunner.runSimulation` (driving Summary cards / per-aspect charts
 * via context.results). Both already called the same `simulateRollingLoan`
 * function — but the simulation was executed TWICE per parameter change and a
 * "Run Simulation" click was required to refresh `results`.
 *
 * This bridge collapses that: for rollingLoan, the hook's memoized output is
 * projected into `context.results` via `toLegacyMonthlyResults`. Sim runs once,
 * all consumers update reactively, no button-click needed.
 *
 * Non-rollingLoan strategies (default / ATH / movingAverage / athCollateral)
 * still use the imperative `useSimulationRunner` → `LegacyStrategyAdapter`
 * path; this bridge is a no-op for them.
 */
function SimulationDataBridge() {
  const { params, setResults } = useSimulation()
  const sim = useRollingLoanCalculations()

  const legacyResults = useMemo(
    () =>
      params.investmentStrategy === "rollingLoan"
        ? toLegacyMonthlyResults(sim, params)
        : null,
    [sim, params],
  )

  useEffect(() => {
    if (legacyResults) setResults(legacyResults)
  }, [legacyResults, setResults])

  return null
}

/**
 * Internal component that uses business logic hooks
 */
function SimulationContent() {
  return (
    <div className="w-full">
      <div className="container mx-auto p-4">
        {/* PR4 cut-over: keeps SimulationContext in sync with SWR cache */}
        <PriceDataBridge />

        {/* PR6: keeps context.results in sync with the unified rollingLoan sim */}
        <SimulationDataBridge />

        {/* Header with title and controls */}
        <SimulationHeader />

        {/* Main content with modular tab navigation */}
        <TabNavigation />
      </div>
    </div>
  )
}

/**
 * Modular Simulation Page.
 *
 * Replaces the legacy 1500+ line simulation.tsx. PR1 modularization →
 * PR3-PR5 price-data refactor; see docs/superpowers/specs/ for details.
 */
export default function SimulationPage() {
  return (
    <SimulationProvider>
      <SimulationContent />
    </SimulationProvider>
  )
}
