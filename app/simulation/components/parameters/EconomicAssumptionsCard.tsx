"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceModelChart } from "@/components/price-model-chart"
import { useSimulation } from "../../context/SimulationContext"
import type { PriceModel, PowerLawLine } from "@/lib/price-engine/types"

/**
 * Economic Assumptions Card Component
 * 
 * Handles economic assumptions including price models, growth rates, and
 * power law settings. This component manages the complex price modeling
 * logic that drives the simulation.
 */
export function EconomicAssumptionsCard() {
  // Temporarily disable translations to avoid infinite loops
  // const { t } = useTranslation()
  const {
    params,
    setParams
    // Temporarily remove priceChartData and isLoading to avoid chart issues
    // priceChartData,
    // isLoading
  } = useSimulation()

  // Simple fallback function for translations
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "EconomicAssumptions.title": "Economic Assumptions",
      "EconomicAssumptions.description": "Configure price models and growth assumptions",
      "EconomicAssumptions.priceModel": "Price Model",
      "EconomicAssumptions.powerLaw": "Power Law",
      "EconomicAssumptions.manual": "Manual Growth Rates",
      "EconomicAssumptions.cycleRepeat": "Cycle Repeat",
      "EconomicAssumptions.prognosisLine": "Prognosis Line",
      "EconomicAssumptions.fit": "Fit",
      "EconomicAssumptions.support": "Support",
      "EconomicAssumptions.resistance": "Resistance",
    }
    return translations[key] || key
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("EconomicAssumptions.title")}</CardTitle>
        <CardDescription>{t("EconomicAssumptions.description")}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Price Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <Label htmlFor="priceModel">{t("PriceModel.selectModel")}</Label>
              <Select
                value={params.priceModel}
                onValueChange={(value: PriceModel) => setParams((p) => ({ ...p, priceModel: value }))}
              >
                <SelectTrigger id="priceModel">
                  <SelectValue placeholder={t("PriceModel.selectModel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t("PriceModel.manualGrowth")}</SelectItem>
                  <SelectItem value="powerLaw">{t("PriceModel.powerLaw")}</SelectItem>
                  <SelectItem value="cycleRepeat">{t("PriceModel.cycleRepeat")}</SelectItem>
                  <SelectItem value="cycleRepeatPowerLaw">{t("PriceModel.cycleRepeatPowerLaw")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Power Law Prognosis Line (conditional) */}
            {params.priceModel === "powerLaw" && (
              <div>
                <Label htmlFor="prognosisLine">{t("PriceModel.prognosisLine")}</Label>
                <Select
                  value={params.powerLawSettings?.prognosisLine || 'fit'}
                  onValueChange={(value: PowerLawLine) => {
                    console.log(`🔄 Prognosis line changed to ${value}`)
                    setParams((p) => ({
                      ...p,
                      powerLawSettings: { ...(p?.powerLawSettings || {}), prognosisLine: value },
                    }))
                  }}
                >
                  <SelectTrigger id="prognosisLine">
                    <SelectValue placeholder={t("PriceModel.prognosisLine")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">{t("PriceModel.fit")}</SelectItem>
                    <SelectItem value="support">{t("PriceModel.support")}</SelectItem>
                    <SelectItem value="resistance">{t("PriceModel.resistance")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Price Model Chart - Temporarily disabled to avoid infinite loops */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">📈 Price Chart</h4>
            <p className="text-sm text-muted-foreground">
              Chart will be added once the infinite loop issues are resolved.
            </p>
          </div>

          {/* Manual Growth Rates (conditional) */}
          {params.priceModel === "manual" && (
            <div className="space-y-2">
              <Label>{t("PriceModel.manualSettingsDescription")}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {params.annualGrowthRates.map((rate, index) => (
                  <div key={index}>
                    <Label htmlFor={`growth-${index}`}>
                      {t("PriceModel.year")} {index + 1} (%)
                    </Label>
                    <Input
                      id={`growth-${index}`}
                      type="number"
                      value={rate}
                      onChange={(e) => {
                        const newRates = [...params.annualGrowthRates]
                        newRates[index] = Number(e.target.value)
                        setParams((prev) => ({ ...prev, annualGrowthRates: newRates }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
