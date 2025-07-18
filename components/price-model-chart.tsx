"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts"
import { generatePowerLawChartData, GENESIS_DATE } from "@/lib/price-models"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PriceDataPoint {
  date: string
  days: number
  price?: number
  fit?: number
  support?: number
  resistance?: number
}

const getDaysSinceGenesis = (date: Date): number => {
  const diffTime = Math.abs(date.getTime() - GENESIS_DATE.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function PriceModelChart({ simulationMonths }: { simulationMonths: number }) {
  const [chartData, setChartData] = useState<PriceDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // 1. Define the full date range for the model
        const modelStartDate = new Date("2011-01-01")
        const modelEndDate = new Date()
        modelEndDate.setMonth(modelEndDate.getMonth() + simulationMonths)

        // 2. Generate the base model data for the entire range
        const modelData = generatePowerLawChartData(modelStartDate, modelEndDate)
        const dataMap = new Map<string, PriceDataPoint>()
        modelData.forEach((point) => {
          if (point.days > 0) {
            dataMap.set(point.date, point)
          }
        })

        // 3. Fetch historical data from a reliable source (CryptoCompare)
        const res = await fetch("https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=EUR&allData=true")
        const json = await res.json()

        // 4. Merge historical data into the model data map
        if (json.Response === "Success" && Array.isArray(json.Data?.Data)) {
          json.Data.Data.forEach((item: { time: number; close: number }) => {
            const date = new Date(item.time * 1000)
            const dateString = date.toISOString().split("T")[0]
            if (dataMap.has(dateString)) {
              const point = dataMap.get(dateString)!
              point.price = item.close
              dataMap.set(dateString, point)
            }
          })
        } else {
          console.warn("CryptoCompare response did not contain valid price data.", json.Message)
        }

        // 5. Convert map values to array for the chart
        setChartData(Array.from(dataMap.values()))
      } catch (err) {
        console.error("Failed to load chart data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [simulationMonths])

  const formatXAxis = (tickItem: number) => {
    const date = new Date(GENESIS_DATE)
    date.setDate(date.getDate() + tickItem)
    return date.getFullYear().toString()
  }

  const formatTooltipLabel = (label: number, payload: any[]) => {
    if (!payload || payload.length === 0) return ""
    const dateString = payload[0].payload.date
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">Lade Chart-Daten...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitcoin Power Law Modell (Log-Log)</CardTitle>
        <CardDescription>
          Historischer Preis im Vergleich zum Power Law Modell auf einer logarithmischen Skala.
        </CardDescription>
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
                allowDataOverflow
                tickFormatter={formatXAxis}
                minTickGap={80}
              />
              <YAxis
                scale="log"
                type="number"
                domain={["auto", "auto"]}
                allowDataOverflow
                tickFormatter={(value) => value.toLocaleString("de-DE", { notation: "compact" })}
              />
              <Tooltip
                labelFormatter={formatTooltipLabel}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`,
                  name,
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                name="Historischer Preis"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="resistance"
                name="Resistance"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <Line type="monotone" dataKey="fit" name="Fit (Prognose)" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="support"
                name="Support (Sicherheit)"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Brush dataKey="days" height={30} stroke="#8884d8" tickFormatter={formatXAxis} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
