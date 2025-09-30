'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Bitcoin } from 'lucide-react'
import { useSimulation } from '@/app/simulation/context/SimulationContext'
import { MonthlyResult } from '@/app/simulation/types/simulation'

interface ChartDataPoint {
  month: number
  date: string
  btcPrice: number
  formattedPrice: string
}

/**
 * Bitcoin Price Chart Component
 * 
 * Displays the Bitcoin price progression used in the simulation.
 * This allows users to verify that the correct price projection model is being used.
 */
export function BitcoinPriceChart() {
  const { t } = useTranslation()
  const { results, params } = useSimulation()

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    return results.map((result: MonthlyResult) => ({
      month: result.month,
      date: result.dateString || `M${result.month}`,
      btcPrice: result.btcPrice || 0,
      formattedPrice: `$${(result.btcPrice || 0).toLocaleString('en-US')}`
    }))
  }, [results])

  // Calculate price statistics
  const priceStats = useMemo(() => {
    if (chartData.length === 0) return null

    const firstPrice = chartData[0]?.btcPrice || 0
    const lastPrice = chartData[chartData.length - 1]?.btcPrice || 0
    const maxPrice = Math.max(...chartData.map(d => d.btcPrice))
    const minPrice = Math.min(...chartData.map(d => d.btcPrice))
    const totalGrowth = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

    return {
      firstPrice,
      lastPrice,
      maxPrice,
      minPrice,
      totalGrowth,
      growthFactor: firstPrice > 0 ? lastPrice / firstPrice : 1
    }
  }, [chartData])

  // Show placeholder if no results
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5" />
            Bitcoin Price Projection
          </CardTitle>
          <CardDescription>
            Shows the Bitcoin price progression used in your simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2" />
            <p>Run simulation to see Bitcoin price progression</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5" />
          Bitcoin Price Projection
        </CardTitle>
        <CardDescription>
          Price progression from your configured {params.priceModel} model
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Price Statistics */}
        {priceStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                ${priceStats.firstPrice.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">Start Price</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ${priceStats.lastPrice.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">End Price</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {priceStats.growthFactor.toFixed(1)}x
              </div>
              <div className="text-sm text-muted-foreground">Growth Factor</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {priceStats.totalGrowth > 0 ? '+' : ''}{priceStats.totalGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Total Growth</div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis 
                dataKey="date"
                tickFormatter={(dateString) => {
                  // Convert dateString to same format as Price Projection tab
                  if (!dateString) return 'Invalid'
                  
                  // Handle both date strings and month format
                  if (dateString.startsWith('M')) return dateString
                  
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) {
                    return dateString // Return as-is if can't parse
                  }
                  
                  return date.toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'short'
                  })
                }}
                minTickGap={20}
              />
              
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                domain={['dataMin', 'dataMax']}
              />
              
              <Tooltip
                labelFormatter={(dateString: string) => {
                  if (!dateString) return 'Invalid Date'
                  
                  // Handle both date strings and month format
                  if (dateString.startsWith('M')) return dateString
                  
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) {
                    return dateString
                  }
                  
                  return date.toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long'
                  })
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString('en-US')}`,
                  'BTC Price'
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              
              <Legend />
              
              <Line
                type="monotone"
                dataKey="btcPrice"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Bitcoin Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Model Information */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Price Model:</strong> {params.priceModel} 
            {params.powerLawSettings?.prognosisLine && (
              <span> ({params.powerLawSettings.prognosisLine} line)</span>
            )}
            <br />
            <strong>Simulation Period:</strong> {results.length} months
            <br />
            <strong>Data Source:</strong> Configured price projection from Price Projection tab
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
