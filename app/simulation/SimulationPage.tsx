"use client"


import { useEffect, useMemo } from "react"
import { SimulationProvider, useSimulation } from "./context/SimulationContext"
import { SimulationHeader, TabNavigation } from "./shared"
import { usePriceData } from "@/src/modules/price-data/hooks/usePriceData"
import { adaptManyToHistoricalDataPoints } from "@/src/modules/price-data/utils/adaptToHistoricalDataPoint"
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"

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
 * Internal component that uses business logic hooks
 */
function SimulationContent() {
  return (
    <div className="w-full">
      <div className="container mx-auto p-4">
        {/* PR4 cut-over: keeps SimulationContext in sync with SWR cache */}
        <PriceDataBridge />

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
