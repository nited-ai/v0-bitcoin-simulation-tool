"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
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
      "Strategy.description": "Configure monthly withdrawal strategy",
      "Strategy.monthlyWithdrawalAmount": "Monthly Withdrawal Amount (€)",
      "Strategy.monthlyWithdrawalDescription": "Amount to withdraw monthly from the loan",
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
        {/* Monthly Withdrawal Amount */}
        <div>
          <Label htmlFor="monthlyWithdrawalAmount">
            {t("Strategy.monthlyWithdrawal")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 ml-1 inline" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("Strategy.monthlyWithdrawalTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <NumberInput
            value={params.monthlyWithdrawalAmount}
            onChange={(value) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: value }))}
            min={0}
            max={50000}
            step={100}
            decimals={0}
            suffix="$"
            placeholder="0"
          />
        </div>
      </CardContent>
    </Card>
  )
}
