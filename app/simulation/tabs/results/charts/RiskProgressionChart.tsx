"use client"

import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { Shield, AlertTriangle, TrendingUp } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  ltv: number
  targetLtv: number
  liquidationLtv: number
  btcPrice: number
  collateralValue: number
  totalDebt: number
  riskZone: 'safe' | 'moderate' | 'high' | 'extreme'
  liquidationEvent: boolean
  priceChange: number
}

/**
 * Risk Progression Chart Component
 * 
 * Displays LTV and liquidation risk evolution with price projection context.
 * Shows how price movements affect risk levels throughout rolling loan strategy execution.
 */
export function RiskProgressionChart() {
  const { t } = useTranslation()
  const { results, params, priceProjection } = useSimulation()

  // Only show for rolling loan strategy
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    const targetLtv = params.riskManagement?.targetLtv || 50
    const liquidationLtv = params.riskManagement?.liquidationLtv || 85

    return results.map((result: MonthlyResult, index: number) => {
      // Calculate risk zone based on LTV
      let riskZone: 'safe' | 'moderate' | 'high' | 'extreme'
      if (result.ltv <= targetLtv) {
        riskZone = 'safe'
      } else if (result.ltv <= targetLtv + 15) {
        riskZone = 'moderate'
      } else if (result.ltv <= liquidationLtv - 5) {
        riskZone = 'high'
      } else {
        riskZone = 'extreme'
      }

      // Check for liquidation events
      const liquidationEvent = result.events.some(event => event.type === 'liquidated')

      // Calculate price change from previous month
      const priceChange = index > 0 
        ? ((result.btcPrice - results[index - 1].btcPrice) / results[index - 1].btcPrice) * 100
        : 0

      return {
        month: result.month,
        date: result.dateString || result.date,
        ltv: result.ltv,
        targetLtv,
        liquidationLtv,
        btcPrice: result.btcPrice,
        collateralValue: result.collateralValue,
        totalDebt: result.totalDebt,
        riskZone,
        liquidationEvent,
        priceChange
      }
    })
  }, [results, params.riskManagement])

  // Calculate risk metrics
  const riskMetrics = useMemo(() => {
    if (chartData.length === 0) return null

    const maxLtv = Math.max(...chartData.map(d => d.ltv))
    const avgLtv = chartData.reduce((sum, d) => sum + d.ltv, 0) / chartData.length
    const liquidationCount = chartData.filter(d => d.liquidationEvent).length
    const highRiskPeriods = chartData.filter(d => d.riskZone === 'high' || d.riskZone === 'extreme').length
    const currentRisk = chartData[chartData.length - 1]?.riskZone || 'safe'

    return {
      maxLtv,
      avgLtv,
      liquidationCount,
      highRiskPeriods,
      currentRisk
    }
  }, [chartData])

  // Show placeholder if no results
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Progression Over Time
          </CardTitle>
          <CardDescription>
            Shows LTV and liquidation risk evolution with price context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2" />
            <p>Run simulation to see risk evolution analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Progression Over Time
            </CardTitle>
            <CardDescription>
              LTV evolution and liquidation risk with price movements
              {priceProjection && (
                <span className="ml-2">
                  • Using {priceProjection.modelName} price model
                </span>
              )}
            </CardDescription>
          </div>
          
          {riskMetrics && (
            <div className="flex gap-2">
              <Badge 
                variant={
                  riskMetrics.currentRisk === 'safe' ? 'default' :
                  riskMetrics.currentRisk === 'moderate' ? 'secondary' :
                  riskMetrics.currentRisk === 'high' ? 'destructive' : 'destructive'
                }
              >
                {riskMetrics.currentRisk.toUpperCase()} RISK
              </Badge>
              {riskMetrics.liquidationCount > 0 && (
                <Badge variant="destructive">
                  {riskMetrics.liquidationCount} Liquidations
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Risk Metrics */}
        {riskMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {riskMetrics.maxLtv.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Max LTV</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {riskMetrics.avgLtv.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg LTV</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {riskMetrics.highRiskPeriods}
              </div>
              <div className="text-sm text-muted-foreground">High Risk Months</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {riskMetrics.liquidationCount}
              </div>
              <div className="text-sm text-muted-foreground">Liquidations</div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis 
                dataKey="month"
                tickFormatter={(month) => `M${month}`}
                minTickGap={20}
              />
              
              {/* Left Y-axis for LTV percentages */}
              <YAxis 
                yAxisId="ltv"
                orientation="left"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              
              {/* Right Y-axis for BTC price */}
              <YAxis 
                yAxisId="price"
                orientation="right"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
              />
              
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'btcPrice') {
                    return [`$${value.toLocaleString('en-US')}`, 'BTC Price']
                  }
                  if (name === 'priceChange') {
                    return [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Price Change']
                  }
                  return [
                    `${value.toFixed(1)}%`,
                    name === 'ltv' ? 'Current LTV' :
                    name === 'targetLtv' ? 'Target LTV' :
                    name === 'liquidationLtv' ? 'Liquidation LTV' : name
                  ]
                }}
                labelFormatter={(month: number) => `Month ${month}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                }}
              />
              
              <Legend />
              
              {/* Risk Zone Areas */}
              <Area
                yAxisId="ltv"
                type="monotone"
                dataKey={() => 100}
                stackId="1"
                stroke="none"
                fill="#fee2e2"
                fillOpacity={0.3}
                name="Extreme Risk Zone (85%+)"
              />
              
              <Area
                yAxisId="ltv"
                type="monotone"
                dataKey={() => 85}
                stackId="2"
                stroke="none"
                fill="#fed7aa"
                fillOpacity={0.3}
                name="High Risk Zone (70-85%)"
              />
              
              <Area
                yAxisId="ltv"
                type="monotone"
                dataKey={() => 70}
                stackId="3"
                stroke="none"
                fill="#fef3c7"
                fillOpacity={0.3}
                name="Moderate Risk Zone (50-70%)"
              />
              
              {/* Reference Lines */}
              <ReferenceLine 
                yAxisId="ltv"
                y={chartData[0]?.targetLtv || 50} 
                stroke="#22c55e" 
                strokeDasharray="2 2"
                label="Target LTV"
              />
              
              <ReferenceLine 
                yAxisId="ltv"
                y={chartData[0]?.liquidationLtv || 85} 
                stroke="#ef4444" 
                strokeDasharray="2 2"
                label="Liquidation LTV"
              />
              
              {/* Current LTV Line */}
              <Line
                yAxisId="ltv"
                type="monotone"
                dataKey="ltv"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={(props: any) => {
                  const { payload } = props
                  if (payload?.liquidationEvent) {
                    return <circle {...props} fill="#ef4444" stroke="#ef4444" strokeWidth={2} r={6} />
                  }
                  return <circle {...props} fill="#3b82f6" stroke="#3b82f6" strokeWidth={2} r={3} />
                }}
                name="Current LTV"
              />
              
              {/* BTC Price Line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="btcPrice"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="BTC Price"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Risk Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>Safe Zone (0-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
            <span>Moderate Risk (50-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-200 rounded"></div>
            <span>High Risk (70-85%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-200 rounded"></div>
            <span>Extreme Risk (85%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>Liquidation Event</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
