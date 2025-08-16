"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PriceModelChart } from "@/components/price-model-chart"
import { useSimulation } from "../../context/SimulationContext"
import { usePriceGeneration } from "../../hooks/usePriceGeneration"
import { useCentralizedData } from "../../hooks/useCentralizedData"

/**
 * Price Chart Component
 * 
 * Wrapper component for the PriceModelChart that integrates with the simulation context.
 * Displays the Bitcoin price projection based on the selected price model and parameters.
 */
export function PriceChart() {
  const { t } = useTranslation()
  const { priceChartData, isLoading } = useSimulation()

  // Enable both historical data loading and price generation when this component is rendered
  useCentralizedData(true)
  usePriceGeneration(true)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Chart.priceProjectionTitle")}</CardTitle>
        <CardDescription>{t("Chart.priceProjectionDescription")}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <PriceModelChart chartData={priceChartData} isLoading={isLoading} />
      </CardContent>
    </Card>
  )
}
