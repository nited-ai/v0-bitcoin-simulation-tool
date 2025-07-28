import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { loadHistoricalPriceDataWithFallbacks, getCurrentBitcoinPrice } from "@/lib/price-engine/client-historical-data-loader"
import { PerformanceMonitor } from "@/lib/price-engine/performance-monitor"
import { useSimulation } from "../context/SimulationContext"
import { DEFAULT_PARAMS } from "../types/simulation"

/**
 * Hook for loading historical Bitcoin price data
 * 
 * Handles the initial loading of historical price data with caching optimization.
 * Also sets the initial BTC price from the latest historical data or current API price.
 * This hook runs only once on component mount to avoid unnecessary re-loads.
 */
export function useHistoricalData() {
  const { t } = useTranslation()
  const {
    setIsLoading,
    setErrors,
    setCacheStatus,
    setHistoricalPriceData,
    setParams,
    setInitialDataLoaded,
  } = useSimulation()
  
  const firstRun = useRef(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setErrors([])
      setCacheStatus('loading')

      try {
        const startTime = performance.now()
        const data = await loadHistoricalPriceDataWithFallbacks()
        const loadTime = performance.now() - startTime

        // Cache-Status basierend auf Ladezeit und Cache-Logs bestimmen
        const isCacheHit = loadTime < 1000 // Großzügige Grenze für Cache-Hits
        setCacheStatus(isCacheHit ? 'cached' : 'fresh')

        console.log(`📊 Historical data loaded: ${data.length} points in ${Math.round(loadTime)}ms`)

        // Set historical data first
        setHistoricalPriceData(data)

        // Update initial price only on first run, but do it after historical data is set
        if (firstRun.current) {
          firstRun.current = false
          const latestPrice = data.length > 0 ? data[data.length - 1].close : DEFAULT_PARAMS.initialBtcPrice
          const initialPrice = (await getCurrentBitcoinPrice()) ?? latestPrice
          console.log(`💰 Setting initial BTC price: ${initialPrice}`)
          setParams((p) => ({ ...p, initialBtcPrice: initialPrice }))
        }

        // Performance Report nach dem ersten Load
        if (firstRun.current === false) {
          PerformanceMonitor.logPerformanceReport()
        }

        // Mark initial data as loaded and stop initial loading
        setInitialDataLoaded(true)
        setIsLoading(false)

      } catch (e) {
        console.error("Failed to load data:", e)
        setCacheStatus('error')
        setErrors((prev) => [...prev, t("Errors.failedToLoadHistoricalData")])
        setInitialDataLoaded(true) // Also set this in error case to prevent hanging
        setIsLoading(false)
      }
    }

    loadData()
  }, [t]) // Only depend on translation function

  return { firstRun }
}
