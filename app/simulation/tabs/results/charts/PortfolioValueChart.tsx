"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts"
import { TrendingUp, DollarSign } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  portfolioValue: number
  netWorth: number
  totalDebt: number
  btcPrice: number
}

/**
 * Portfolio Value Chart Component
 * 
 * Displays the evolution of portfolio value, net worth, and debt over time.
 * Shows the relationship between collateral value and debt levels throughout the simulation.
 */
export function PortfolioValueChart() {
  const { t } = useTranslation()
  const { results, params } = useSimulation()

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    return results.map((result: MonthlyResult) => ({
      month: result.month,
      date: result.dateString,
      portfolioValue: result.collateralValue,
      netWorth: result.collateralValue - result.totalDebt,
      totalDebt: result.totalDebt,
      btcPrice: result.btcPrice,
    }))
  }, [results])

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null

    const initialValue = params.initialBtcAmount * params.initialBtcPrice
    const finalValue = chartData[chartData.length - 1].portfolioValue
    const finalNetWorth = chartData[chartData.length - 1].netWorth
    const maxValue = Math.max(...chartData.map(d => d.portfolioValue))
    const minNetWorth = Math.min(...chartData.map(d => d.netWorth))
    
    return {
      initialValue,
      finalValue,
      finalNetWorth,
      maxValue,
      minNetWorth,
      totalGrowth: ((finalValue - initialValue) / initialValue) * 100,
      netWorthGrowth: ((finalNetWorth - initialValue) / initialValue) * 100,
    }
  }, [chartData, params])

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('PortfolioValueChart.title', 'Portfolio Value Over Time')}
          </CardTitle>
          <CardDescription>
            {t('PortfolioValueChart.description', 'Track your portfolio value, net worth, and debt levels throughout the simulation')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('PortfolioValueChart.runSimulation', 'Run a simulation to see portfolio value chart')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Portfolio Value Over Time
        </CardTitle>
        <CardDescription>
          Portfolio value, net worth, and debt progression over {chartData.length} months
        </CardDescription>
        
        {/* Summary Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Final Portfolio</div>
              <div className="text-lg font-semibold">
                ${stats.finalValue.toLocaleString("en-US")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Final Net Worth</div>
              <div className={`text-lg font-semibold ${stats.finalNetWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.finalNetWorth.toLocaleString("en-US")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Portfolio Growth</div>
              <div className={`text-lg font-semibold ${stats.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalGrowth >= 0 ? '+' : ''}{stats.totalGrowth.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Net Worth Growth</div>
              <div className={`text-lg font-semibold ${stats.netWorthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.netWorthGrowth >= 0 ? '+' : ''}{stats.netWorthGrowth.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis
                dataKey="date"
                tickFormatter={(dateString) => {
                  // Convert dateString to same format as Price Projection tab
                  const date = new Date(dateString)
                  return date.toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'short'
                  })
                }}
                minTickGap={20}
              />
              
              <YAxis 
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
              />
              
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString('en-US')}`,
                  name === 'portfolioValue' ? 'Portfolio Value' :
                  name === 'netWorth' ? 'Net Worth' :
                  name === 'totalDebt' ? 'Total Debt' : name
                ]}
                labelFormatter={(dateString: string) => {
                  // Convert dateString to readable format matching Price Projection tab
                  const date = new Date(dateString)
                  return date.toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long'
                  })
                }}
              />
              
              <Legend />
              
              {/* Portfolio Value Area */}
              <Area
                type="monotone"
                dataKey="portfolioValue"
                stackId="1"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.1}
                name={t('PortfolioValueChart.portfolioValue', 'Portfolio Value')}
              />
              
              {/* Total Debt Area */}
              <Area
                type="monotone"
                dataKey="totalDebt"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.1}
                name={t('PortfolioValueChart.totalDebt', 'Total Debt')}
              />
              
              {/* Net Worth Line */}
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                name={t('PortfolioValueChart.netWorth', 'Net Worth')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart Legend */}
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Portfolio Value (Total BTC value)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Total Debt (Outstanding loans)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Net Worth (Portfolio - Debt)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
