"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { HybridTooltip, HybridTooltipTrigger, HybridTooltipContent } from "@/components/ui/hybrid-tooltip"
import { Info } from "lucide-react"
import { NumberInput } from "../../../../shared/ui/forms/NumberInput"
import { useSimulation } from "../../context/SimulationContext"

/**
 * Strategy Card Component
 * 
 * Handles basic strategy configuration like monthly withdrawal amount.
 * This is separate from the Investment Strategy Selection which handles
 * the complex strategy-specific parameters.
 */
export function StrategyCard() {
  // Temporarily disable translations to avoid infinite loops
  // const { t } = useTranslation()
  const { params, setParams } = useSimulation()

  // Simple fallback function for translations
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "Strategy.title": "Strategy",
      "Strategy.description": "Configure monthly savings/withdrawal strategy",
      "Strategy.monthlyWithdrawalAmount": "Monthly Savings/Withdrawal Amount ($)",
      "Strategy.monthlyWithdrawalDescription": "Positive values: Monthly savings added to BTC stack. Negative values: Monthly withdrawals from BTC stack.",
    }
    return translations[key] || key
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Strategy.title")}</CardTitle>
        <CardDescription>{t("Strategy.description")}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Monthly Savings/Withdrawal Amount */}
        <div>
          <Label htmlFor="monthlyWithdrawalAmount">
            {t("Strategy.monthlyWithdrawal")}
            <HybridTooltip>
              <HybridTooltipTrigger asChild>
                <Info className="w-4 h-4 ml-1 inline" />
              </HybridTooltipTrigger>
              <HybridTooltipContent>
                <p>{t("Strategy.monthlyWithdrawalTooltip")}</p>
              </HybridTooltipContent>
            </HybridTooltip>
          </Label>
          <NumberInput
            value={params.monthlyWithdrawalAmount}
            onChange={(value) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: value }))}
            min={-50000}
            max={50000}
            step={100}
            decimals={0}
            suffix="$"
            placeholder="150"
          />
        </div>
      </CardContent>
    </Card>
  )
}
