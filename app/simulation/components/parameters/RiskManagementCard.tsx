"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"

/**
 * Risk Management Card Component
 * 
 * Handles risk management parameters like target LTV and liquidation LTV.
 * These parameters are crucial for managing the risk of the Bitcoin-backed loans.
 */
export function RiskManagementCard() {
  // Temporarily disable translations to avoid infinite loops
  // const { t } = useTranslation()
  const { params, setParams } = useSimulation()

  // Simple fallback function for translations
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "RiskManagement.title": "Risk Management",
      "RiskManagement.description": "Configure risk management parameters",
      "RiskManagement.targetLtv": "Target LTV (%)",
      "RiskManagement.liquidationLtv": "Liquidation LTV (%)",
      "RiskManagement.targetLtvDescription": "Target loan-to-value ratio to maintain",
      "RiskManagement.liquidationLtvDescription": "LTV at which liquidation occurs",
    }
    return translations[key] || key
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("RiskManagement.title")}</CardTitle>
        <CardDescription>{t("RiskManagement.description")}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target LTV */}
          <div>
            <Label htmlFor="targetLtv">
              {t("RiskManagement.targetLtv")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("RiskManagement.targetLtvTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="targetLtv"
              type="number"
              value={params.riskManagement.targetLtv}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  riskManagement: { ...p.riskManagement, targetLtv: Number(e.target.value) },
                }))
              }
              min="0"
              max="90"
              step="1"
            />
          </div>
          
          {/* Liquidation LTV */}
          <div>
            <Label htmlFor="liquidationLtv">
              {t("RiskManagement.liquidationLtv")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("RiskManagement.liquidationLtvTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="liquidationLtv"
              type="number"
              value={params.riskManagement.liquidationLtv}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  riskManagement: { ...p.riskManagement, liquidationLtv: Number(e.target.value) },
                }))
              }
              min="50"
              max="100"
              step="1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
