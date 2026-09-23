"use client"


import { useEffect, useMemo, useRef } from "react"
import { usePriceGeneration } from './hooks/usePriceGeneration'
import { LegalFooter } from "@/components/legal-footer"
import { DEFAULT_PARAMS, PARAMS_STORAGE_KEY } from "./types/simulation"
import { SimulationProvider, useSimulation } from "./context/SimulationContext"
import { SimulationHeader, TabNavigation } from "./shared"
import { usePriceData } from "@/src/modules/price-data/hooks/usePriceData"
import { adaptManyToHistoricalDataPoints } from "@/src/modules/price-data/utils/adaptToHistoricalDataPoint"
import type { HistoricalDataPoint } from "@/src/modules/price-data/types"
import { ResearchProvider } from "./research/ResearchContext"


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
  const priceSeeded = useRef(false)
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
      if (initialPrice && !priceSeeded.current) {
        priceSeeded.current = true
        let savedPrice = false
        try { savedPrice = !!JSON.parse(localStorage.getItem(PARAMS_STORAGE_KEY) || "null")?.initialBtcPrice } catch {}
        if (savedPrice) return
        setParams((prev) =>
          prev.initialBtcPrice === DEFAULT_PARAMS.initialBtcPrice
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
      setErrors(previous => [...previous.filter(message => !message.startsWith('Kursdaten: ')), `Kursdaten: ${error.message ?? String(error)}`])
    } else {
      setErrors(previous => previous.filter(message => !message.startsWith('Kursdaten: ')))
    }
  }, [error, setErrors])

  return null
}

/**
 * Internal component that uses business logic hooks
 */
function SimulationContent() {
  usePriceGeneration(true)
  const data = usePriceData()
  return (
    <div className="w-full">
      <div className="container mx-auto p-4">
        {/* PR4 cut-over: keeps SimulationContext in sync with SWR cache */}
        <PriceDataBridge />

        {/* Header with title and controls */}
        <SimulationHeader />

        {(data.error || data.isStale) && <p role="status" className="mb-4 text-sm text-muted-foreground">
          {data.error ? 'Historische Kursdaten sind derzeit nicht verfügbar. Eigene Jahresszenarien funktionieren weiterhin.'
            : `${data.sourceDescription ?? 'Kursdaten sind nicht aktuell'}${data.prices.length ? ` (letzter Tag: ${data.prices[data.prices.length - 1].date})` : ''}. Der Startkurs bleibt frei editierbar.`}
        </p>}

        {/* Main content with modular tab navigation */}
        <ResearchProvider><TabNavigation /></ResearchProvider>
        <LegalFooter className="mt-12 border-t pt-6 pb-4 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground" />
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
