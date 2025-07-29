import { useEffect } from "react"
import { generatePriceChartData } from "@/lib/price-engine"
import { getPowerLawPrice } from "@/lib/price-engine/models/power-law"
import { useSimulation } from "../context/SimulationContext"
import type { PriceEngineParams } from "@/lib/price-engine/types"

/**
 * Hook for generating price chart data
 * 
 * Handles the generation of complete price chart data by calling the Price Engine
 * whenever chart-relevant parameters change. This includes historical data processing
 * and price model calculations.
 */
export function usePriceGeneration() {
  const {
    params,
    historicalPriceData,
    initialDataLoaded,
    setChartLoading,
    setPriceChartData,
    setErrors,
  } = useSimulation()

  useEffect(() => {
    if (historicalPriceData.length === 0) return
    if (!initialDataLoaded) return // Wait for initial data loading to complete

    console.log(`🔄 Chart generation useEffect triggered for model: ${params.priceModel}`)

    const generateData = async () => {
      // Show loading for chart generation
      setChartLoading(true)

      console.log(`🔄 Regenerating chart data for price model: ${params.priceModel}`)
      if (params.priceModel === 'powerLaw') {
        console.log(`   📊 Power Law prognosis line: ${params.powerLawSettings?.prognosisLine || 'fit'}`)
      }

      try {
        // Calculate historical patterns needed for specific models
        const historicalDailyMultipliers = historicalPriceData
          .slice(-1458)
          .map((p, i, arr) => (i > 0 ? p.close / arr[i - 1].close : 1))
          .slice(1)

        const historicalChannelPositions = historicalPriceData.slice(-1458).map((dataPoint) => {
          const date = new Date(dataPoint.time * 1000)
          const price = dataPoint.close
          const support = getPowerLawPrice(date, "support")
          const resistance = getPowerLawPrice(date, "resistance")
          const channelWidth = resistance - support
          if (channelWidth <= 0) return 0.5
          return Math.max(0, Math.min(1, (price - support) / channelWidth))
        })

        // Prepare parameters for the engine using the full params object
        const engineParams: PriceEngineParams = {
          ...params,
          historicalDailyMultipliers,
          historicalChannelPositions,
        }

        // Call the engine to get the complete chart data
        const chartData = await generatePriceChartData(engineParams, historicalPriceData)
        setPriceChartData(chartData)
        console.log(`✅ Chart data generated: ${chartData.length} points for model ${params.priceModel}`)
      } catch (error) {
        console.error("Error generating price chart data:", error)
        setErrors((prev) => [...prev, "Failed to generate price model data."])
      } finally {
        setChartLoading(false)
      }
    }

    generateData()
  }, [
    params.priceModel,
    params.initialBtcPrice,
    params.simulationMonths,
    params.powerLawSettings?.prognosisLine,
    JSON.stringify(params.annualGrowthRates || []), // Stable string representation
    historicalPriceData.length,
    initialDataLoaded,
    // Remove setter functions from dependencies to prevent infinite loops
  ])
}
