"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PriceModelChart } from "@/components/price-model-chart"
import { useSimulation } from "../../context/SimulationContext"

/**
 * Price Chart Component
 * 
 * Wrapper component for the PriceModelChart that integrates with the simulation context.
 * Displays the Bitcoin price projection based on the selected price model and parameters.
 */
export function PriceChart() {
  const { t } = useTranslation()
  const { priceChartData, isLoading } = useSimulation()

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
