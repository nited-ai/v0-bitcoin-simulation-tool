"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { getAvailableStrategies } from "@/lib/strategy-engine"
import type { InvestmentStrategy } from "@/lib/strategy-engine/types"

/**
 * Investment Strategy Card Component
 * 
 * Handles the selection of investment strategies and displays strategy-specific
 * configuration options. This component will be extended to show different
 * strategy settings based on the selected strategy.
 */
export function InvestmentStrategyCard() {
  // Temporarily disable translations to avoid infinite loops
  // const { t } = useTranslation()
  const { params, setParams } = useSimulation()

  // Simple fallback function for translations
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "InvestmentStrategy.title": "Investment Strategy",
      "InvestmentStrategy.description": "Select your investment strategy",
      "InvestmentStrategy.athBased": "ATH-Based Strategy",
      "InvestmentStrategy.movingAverage": "Moving Average Strategy",
      "InvestmentStrategy.athCollateral": "ATH Collateral Strategy",
      "InvestmentStrategy.athBasedDescription": "Strategy based on all-time high analysis",
      "InvestmentStrategy.movingAverageDescription": "Strategy based on moving averages",
      "InvestmentStrategy.athCollateralDescription": "Strategy based on ATH collateral management",
    }
    return translations[key] || key
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t("InvestmentStrategy.title")}
        </CardTitle>
        <CardDescription>{t("InvestmentStrategy.description")}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Strategy Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("InvestmentStrategy.settingsTitle")}</h3>

            <div>
              <Label htmlFor="investment-strategy">{t("InvestmentStrategy.selectStrategy")}</Label>
              <Select
                value={params.investmentStrategy}
                onValueChange={(value: InvestmentStrategy) =>
                  setParams((prev) => ({ ...prev, investmentStrategy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("InvestmentStrategy.selectStrategy")} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStrategies().map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {t(`InvestmentStrategy.${strategy.id}Strategy`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Side: Strategy-Specific Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Strategy Settings</h3>
            
            {/* Placeholder for strategy-specific components */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">🚧 Strategy Settings Coming Soon</h4>
              <p className="text-sm text-muted-foreground">
                Selected Strategy: <strong>{params.investmentStrategy}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Strategy-specific settings will be extracted in the next migration phase
                when we create the strategy microservices architecture.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
