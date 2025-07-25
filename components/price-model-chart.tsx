"use client"
import { useTranslation } from "react-i18next"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GENESIS_DATE } from "@/lib/price-engine/models/power-law"
import type { PriceChartDataPoint } from "@/lib/price-engine/types"
import { useMemo, memo, useCallback } from "react"

interface PriceModelChartProps {
  chartData: PriceChartDataPoint[]
  isLoading: boolean
}



// Custom comparison function to prevent unnecessary re-renders
function arePropsEqual(prevProps: PriceModelChartProps, nextProps: PriceModelChartProps) {
  // Always re-render if loading state changes
  if (prevProps.isLoading !== nextProps.isLoading) {
    console.log(`📊 Chart re-render: loading state changed (${prevProps.isLoading} → ${nextProps.isLoading})`)
    return false
  }

  // Always re-render if data length changes (new historical data)
  if (prevProps.chartData.length !== nextProps.chartData.length) {
    console.log(`📊 Chart re-render: data length changed (${prevProps.chartData.length} → ${nextProps.chartData.length})`)
    return false
  }

  // Check if projection data actually changed
  const prevProjection = prevProps.chartData.filter(d => d.simulationPath !== undefined)
  const nextProjection = nextProps.chartData.filter(d => d.simulationPath !== undefined)

  if (prevProjection.length !== nextProjection.length) {
    console.log(`📊 Chart re-render: projection length changed (${prevProjection.length} → ${nextProjection.length})`)
    return false
  }

  // Sample a few projection points to detect changes
  const sampleSize = Math.min(5, prevProjection.length)
  for (let i = 0; i < sampleSize; i++) {
    if (prevProjection[i]?.simulationPath !== nextProjection[i]?.simulationPath) {
      console.log(`📊 Chart re-render: projection data changed`)
      return false
    }
  }

  // Props are equal - prevent re-render
  console.log(`📦 Chart re-render prevented: data unchanged`)
  return true
}

const PriceModelChart = memo(function PriceModelChart({ chartData, isLoading }: PriceModelChartProps) {
  const { t } = useTranslation()

  // Debug: Log when chart actually re-renders
  console.log(`📊 PriceModelChart rendering: ${chartData.length} points, loading: ${isLoading}`)

  // Combined chart data with stable references
  const stableChartData = useMemo(() => {
    console.log(`🔄 Creating stable chart data reference`)

    // Sample for performance if needed
    let data = chartData
    if (chartData.length > 1000) {
      const sampleRate = Math.ceil(chartData.length / 1000)
      data = chartData.filter((_, index) => index % sampleRate === 0)
    }

    return data
  }, [
    chartData.length, // Historical data length
    // Only changes when projection actually changes
    chartData.filter(d => d.simulationPath !== undefined).length,
    chartData.filter(d => d.simulationPath !== undefined).slice(0, 3).map(d => Math.round(d.simulationPath || 0)).join(',')
  ])

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

  if (isLoading || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("Price Model Chart")}</CardTitle>
          <CardDescription>{isLoading ? t("Loading price data...") : t("No data available")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="text-muted-foreground">{isLoading ? t("Loading...") : t("No data")}</div>
          </div>
        </CardContent>
      </Card>
    )
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
            <LineChart
              data={stableChartData}
              key="stable-chart"
            >
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

              {/* Historical price line - stable data */}
              <Line
                key="historical-line"
                type="monotone"
                dataKey="historicalPrice"
                name="historicalPrice"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Projection line - dynamic data */}
              <Line
                key="projection-line"
                type="monotone"
                dataKey="simulationPath"
                name="projectedPrice"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Power Law lines - stable when not changing models */}
              <Line
                key="resistance-line"
                type="monotone"
                dataKey="resistance"
                name="resistance"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
                isAnimationActive={false}
              />
              <Line
                key="fit-line"
                type="monotone"
                dataKey="fit"
                name="fit"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
                isAnimationActive={false}
              />
              <Line
                key="support-line"
                type="monotone"
                dataKey="support"
                name="support"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
                isAnimationActive={false}
              />

              <Brush dataKey="days" height={30} stroke="#8884d8" tickFormatter={formatXAxis} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}, arePropsEqual)

export { PriceModelChart }
