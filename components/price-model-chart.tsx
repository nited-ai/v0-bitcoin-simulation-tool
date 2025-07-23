"use client"
import { useTranslation } from "react-i18next"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GENESIS_DATE } from "@/lib/price-engine/models/power-law"
import type { PriceChartDataPoint } from "@/lib/price-engine/types"

interface PriceModelChartProps {
  chartData: PriceChartDataPoint[]
  isLoading: boolean
}

export function PriceModelChart({ chartData, isLoading }: PriceModelChartProps) {
  const { t } = useTranslation()

  const formatXAxis = (tickItem: number) => {
    // tickItem is now the number of days
    const date = new Date(GENESIS_DATE.getTime() + tickItem * 24 * 60 * 60 * 1000)
    return date.getFullYear().toString()
  }

  const formatTooltipLabel = (label: number) => {
    // label is now the number of days
    const date = new Date(GENESIS_DATE.getTime() + label * 24 * 60 * 60 * 1000)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">{t("PriceModelChart.loading")}</div>
  }

  if (chartData.length === 0) {
    return <div className="h-96 flex items-center justify-center">{t("PriceModelChart.noData")}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("PriceModelChart.title")}</CardTitle>
        <CardDescription>{t("PriceModelChart.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis
                dataKey="days"
                type="number"
                scale="log"
                domain={["auto", "auto"]}
                tickFormatter={formatXAxis}
                minTickGap={80}
              />
              <YAxis
                scale="log"
                type="number"
                domain={["auto", "auto"]}
                allowDataOverflow
                tickFormatter={(value) => value.toLocaleString(undefined, { notation: "compact" })}
              />
              <Tooltip
                labelFormatter={formatTooltipLabel}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} €`,
                  t(`PriceModelChart.${name}`),
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="historicalPrice"
                name="historicalPrice"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="simulationPath"
                name="projectedPrice"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="resistance"
                name="resistance"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="fit"
                name="fit"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="support"
                name="support"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
              <Brush dataKey="days" height={30} stroke="#8884d8" tickFormatter={formatXAxis} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
