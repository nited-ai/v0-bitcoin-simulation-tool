"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSimulation } from "../../context/SimulationContext"
import { useResultsSummary } from "../../hooks/useResultsSummary"

/**
 * Results Summary Component
 * 
 * Displays key simulation metrics in a grid of summary cards.
 * Shows first liquidation, max debt, final collateral, net worth, and BTC amount.
 */
export function ResultsSummary() {
  // Temporarily disable translations and complex hooks to avoid infinite loops
  // const { t } = useTranslation()
  // const { results } = useSimulation()
  // const summary = useResultsSummary(results)
  const { params } = useSimulation()

  // Simple fallback function for translations
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "Results.title": "Results Summary",
      "Results.description": "Key metrics from your simulation",
      "Results.totalValue": "Total Portfolio Value",
      "Results.monthlyIncome": "Monthly Income",
      "Results.totalDebt": "Total Debt",
      "Results.ltv": "Current LTV",
      "Results.noResults": "No simulation results yet",
      "Results.runSimulation": "Configure parameters and run simulation",
    }
    return translations[key] || key
  }

  // Simple mock data for now
  const summary = {
    totalPortfolioValue: params.btcAmount * params.initialBtcPrice,
    monthlyIncome: params.monthlyWithdrawalAmount,
    totalDebt: 0,
    currentLtv: 0,
  }

  // Always show summary with current parameters
  // if (!summary) {
  //   return (
  //     <div className="p-4 border rounded-lg bg-muted/50">
  //       <h3 className="font-medium mb-2">📊 Results Summary</h3>
  //       <p className="text-sm text-muted-foreground">
  //         Run a simulation to see the results summary.
  //       </p>
  //     </div>
  //   )
  // }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* First Liquidation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("Results.firstLiquidation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.firstLiquidationMonth
              ? `${t("Results.month")} ${summary.firstLiquidationMonth}`
              : t("Results.none")}
          </div>
        </CardContent>
      </Card>

      {/* Max Debt */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("Results.maxDebt")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.maxDebt.toLocaleString("de-DE")} €</div>
        </CardContent>
      </Card>

      {/* Final Collateral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">{t("Results.finalCollateral")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.finalCollateralValue.toLocaleString("de-DE")} €</div>
        </CardContent>
      </Card>

      {/* Final Net Worth */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">{t("Results.finalNetWorth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.finalNetWorth.toLocaleString("de-DE")} €</div>
        </CardContent>
      </Card>

      {/* Final BTC Amount */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">{t("Results.finalBtcAmount")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.finalBtcAmount?.toFixed(4)} BTC</div>
        </CardContent>
      </Card>
    </div>
  )
}
