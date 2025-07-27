"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Legend 
} from "recharts"
import { useSimulation } from "../../context/SimulationContext"
import { useFinancialChartData } from "../../hooks/useFinancialChartData"

/**
 * Financial Chart Component
 * 
 * Displays a line chart showing the relationship between collateral value,
 * locked collateral, total debt, and BTC price over the simulation period.
 * This helps visualize the financial dynamics of the Bitcoin-backed loan strategy.
 */
export function FinancialChart() {
  const { t } = useTranslation()
  const { results } = useSimulation()
  const financialChartData = useFinancialChartData(results)

  if (financialChartData.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">📈 Financial Chart</h3>
        <p className="text-sm text-muted-foreground">
          Run a simulation to see the financial chart showing debt vs collateral over time.
        </p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Chart.debtVsCollateralTitle")}</CardTitle>
        <CardDescription>{t("Chart.debtVsCollateralDescription")}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={financialChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={30} />
              
              {/* Left Y-Axis for EUR amounts */}
              <YAxis
                yAxisId="left"
                label={{ value: t("Chart.amountInEur"), angle: -90, position: "insideLeft" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              
              {/* Right Y-Axis for BTC price */}
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: t("Chart.btcPriceInEur"), angle: 90, position: "insideRight" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              
              <RechartsTooltip
                formatter={(value: number, name: string) => [`${value.toLocaleString("de-DE")} €`, name]}
                labelFormatter={(date: any) => `${t("Chart.date")}: ${date}`}
              />
              
              <Legend />
              
              {/* Collateral Value Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="collateralValue"
                name={t("Chart.legendCollateral")}
                stroke="#8884d8"
                dot={false}
              />
              
              {/* Locked Collateral Value Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="lockedCollateralValue"
                name={t("Chart.legendLockedCollateral")}
                stroke="#82ca9d"
                dot={false}
              />
              
              {/* Total Debt Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalDebt"
                name={t("Chart.legendTotalDebt")}
                stroke="#ef4444"
                dot={false}
              />
              
              {/* BTC Price Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="btcPrice"
                name={t("Chart.legendBtcPrice")}
                stroke="#f97316"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
