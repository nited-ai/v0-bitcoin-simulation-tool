"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, Bitcoin } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  btcPrice: number
  priceChange: number
}

/**
 * Bitcoin Price Chart Component
 * 
 * Displays Bitcoin price progression throughout the simulation period.
 * Shows price changes and trends over time.
 */
export function BitcoinPriceChart() {
  const { results } = useSimulation()

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    const initialPrice = results[0]?.btcPrice || 0

    return results.map((result: MonthlyResult, index: number) => {
      const priceChange = initialPrice > 0 
        ? ((result.btcPrice - initialPrice) / initialPrice) * 100 
        : 0

      return {
        month: result.month,
        date: result.dateString,
        btcPrice: result.btcPrice,
        priceChange,
      }
    })
  }, [results])

  // Calculate price statistics
  const priceStats = useMemo(() => {
    if (chartData.length === 0) return null

    const prices = chartData.map(d => d.btcPrice)
    const initialPrice = prices[0]
    const finalPrice = prices[prices.length - 1]
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const totalGrowth = initialPrice > 0 ? ((finalPrice - initialPrice) / initialPrice) * 100 : 0

    return {
      initialPrice,
      finalPrice,
      minPrice,
      maxPrice,
      totalGrowth,
    }
  }, [chartData])

  // Don't render if no data
  if (chartData.length === 0 || !priceStats) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-orange-500" />
          Bitcoin Price Progression
        </CardTitle>
        <CardDescription>
          Price evolution over the simulation period
        </CardDescription>
        
        {/* Price Statistics */}
        {priceStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Initial Price</div>
              <div className="text-lg font-semibold">
                ${priceStats.initialPrice.toLocaleString('en-US')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Final Price</div>
              <div className="text-lg font-semibold">
                ${priceStats.finalPrice.toLocaleString('en-US')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Price Range</div>
              <div className="text-sm font-medium">
                ${priceStats.minPrice.toLocaleString('en-US')} - ${priceStats.maxPrice.toLocaleString('en-US')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Growth</div>
              <div className={`text-lg font-semibold ${priceStats.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceStats.totalGrowth >= 0 ? '+' : ''}{priceStats.totalGrowth.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis 
                dataKey="month"
                tickFormatter={(month) => `M${month}`}
                minTickGap={20}
              />
              
              <YAxis 
                yAxisId="price"
                orientation="left"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
              />
              
              <YAxis 
                yAxisId="change"
                orientation="right"
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'btcPrice') {
                    return [`$${value.toLocaleString('en-US')}`, 'BTC Price']
                  }
                  if (name === 'priceChange') {
                    return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, 'Price Change']
                  }
                  return [value, name]
                }}
                labelFormatter={(month: number) => `Month ${month}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                }}
              />
              
              <Legend />
              
              {/* Bitcoin Price Line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="btcPrice"
                stroke="#f97316"
                strokeWidth={3}
                dot={false}
                name="BTC Price"
              />
              
              {/* Price Change Line */}
              <Line
                yAxisId="change"
                type="monotone"
                dataKey="priceChange"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                name="Price Change %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

