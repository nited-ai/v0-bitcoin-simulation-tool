"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart } from "recharts"
import { TrendingUp, AlertTriangle, Shield, Target } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  ltv: number
  targetLtv: number
  liquidationLtv: number
  collateralValue: number
  totalDebt: number
  loanCount: number
  riskZone: 'safe' | 'moderate' | 'high' | 'extreme'
}

/**
 * LTV Progression Chart Component
 * 
 * Provides detailed analysis of Loan-to-Value ratio progression over time,
 * including risk zones, target levels, and liquidation thresholds.
 */
export function LTVProgressionChart() {
  const { results, params } = useSimulation()

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    return results.map((result: MonthlyResult) => {
      const ltv = result.collateralValue > 0 
        ? (result.totalDebt / result.collateralValue) * 100 
        : 0

      // Determine risk zone
      let riskZone: 'safe' | 'moderate' | 'high' | 'extreme' = 'safe'
      if (ltv >= 85) riskZone = 'extreme'
      else if (ltv >= 80) riskZone = 'high'
      else if (ltv >= 60) riskZone = 'moderate'

      return {
        month: result.month,
        date: result.dateString,
        ltv: Math.min(ltv, 100), // Cap at 100% for display
        targetLtv: params.riskManagement?.targetLtv || 50,
        liquidationLtv: params.riskManagement?.liquidationLtv || 85,
        collateralValue: result.collateralValue,
        totalDebt: result.totalDebt,
        loanCount: result.loanCount,
        riskZone,
      }
    })
  }, [results, params])

  // Calculate LTV statistics
  const ltvStats = useMemo(() => {
    if (chartData.length === 0) return null

    const ltvValues = chartData.map(d => d.ltv)
    const maxLtv = Math.max(...ltvValues)
    const minLtv = Math.min(...ltvValues)
    const avgLtv = ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length
    
    // Count months in each risk zone
    const riskZoneCounts = {
      safe: chartData.filter(d => d.riskZone === 'safe').length,
      moderate: chartData.filter(d => d.riskZone === 'moderate').length,
      high: chartData.filter(d => d.riskZone === 'high').length,
      extreme: chartData.filter(d => d.riskZone === 'extreme').length,
    }

    // Calculate volatility (standard deviation)
    const variance = ltvValues.reduce((sum, ltv) => sum + Math.pow(ltv - avgLtv, 2), 0) / ltvValues.length
    const volatility = Math.sqrt(variance)

    return {
      maxLtv,
      minLtv,
      avgLtv,
      volatility,
      riskZoneCounts,
      totalMonths: chartData.length,
    }
  }, [chartData])

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            LTV Progression Analysis
          </CardTitle>
          <CardDescription>
            Detailed analysis of loan-to-value ratios and risk zones over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run a simulation to see LTV progression analysis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskZoneColor = (zone: string) => {
    switch (zone) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'extreme': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          LTV Progression Analysis
        </CardTitle>
        <CardDescription>
          Detailed loan-to-value ratio analysis with risk zones over {chartData.length} months
        </CardDescription>
        
        {/* LTV Statistics */}
        {ltvStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Average LTV</div>
              <div className="text-lg font-semibold">
                {ltvStats.avgLtv.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Max LTV</div>
              <div className={`text-lg font-semibold ${ltvStats.maxLtv > 80 ? 'text-red-600' : ltvStats.maxLtv > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                {ltvStats.maxLtv.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">LTV Range</div>
              <div className="text-lg font-semibold">
                {(ltvStats.maxLtv - ltvStats.minLtv).toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Volatility</div>
              <div className="text-lg font-semibold">
                {ltvStats.volatility.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Risk Zone Distribution */}
        {ltvStats && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Risk Zone Distribution</div>
            <div className="flex flex-wrap gap-2">
              <Badge className={getRiskZoneColor('safe')}>
                Safe: {ltvStats.riskZoneCounts.safe} months
              </Badge>
              <Badge className={getRiskZoneColor('moderate')}>
                Moderate: {ltvStats.riskZoneCounts.moderate} months
              </Badge>
              <Badge className={getRiskZoneColor('high')}>
                High Risk: {ltvStats.riskZoneCounts.high} months
              </Badge>
              <Badge className={getRiskZoneColor('extreme')}>
                Extreme: {ltvStats.riskZoneCounts.extreme} months
              </Badge>
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
                dataKey="month"
                tickFormatter={(month) => `M${month}`}
                minTickGap={20}
              />
              
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'ltv' ? `${value.toFixed(1)}%` :
                  name === 'targetLtv' ? `${value}% (Target)` :
                  name === 'liquidationLtv' ? `${value}% (Liquidation)` :
                  `${value.toFixed(1)}%`,
                  name === 'ltv' ? 'Current LTV' :
                  name === 'targetLtv' ? 'Target LTV' :
                  name === 'liquidationLtv' ? 'Liquidation LTV' : name
                ]}
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
                type="monotone"
                dataKey={() => 100}
                stackId="1"
                stroke="none"
                fill="#fee2e2"
                fillOpacity={0.3}
                name="Extreme Risk Zone (85%+)"
              />
              
              <Area
                type="monotone"
                dataKey={() => 85}
                stackId="2"
                stroke="none"
                fill="#fed7aa"
                fillOpacity={0.3}
                name="High Risk Zone (80-85%)"
              />
              
              <Area
                type="monotone"
                dataKey={() => 80}
                stackId="3"
                stroke="none"
                fill="#fef3c7"
                fillOpacity={0.3}
                name="Moderate Risk Zone (60-80%)"
              />
              
              <Area
                type="monotone"
                dataKey={() => 60}
                stackId="4"
                stroke="none"
                fill="#dcfce7"
                fillOpacity={0.3}
                name="Safe Zone (0-60%)"
              />
              
              {/* Reference Lines */}
              <ReferenceLine 
                y={chartData[0]?.targetLtv || 50} 
                stroke="#22c55e" 
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: "Target LTV", position: "top" }}
              />
              
              <ReferenceLine 
                y={chartData[0]?.liquidationLtv || 85} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: "Liquidation LTV", position: "top" }}
              />
              
              {/* Current LTV Line */}
              <Line
                type="monotone"
                dataKey="ltv"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  const ltv = payload?.ltv || 0
                  const color = ltv >= 85 ? '#ef4444' : ltv >= 80 ? '#f59e0b' : ltv >= 60 ? '#eab308' : '#22c55e'
                  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={2} />
                }}
                name="Current LTV"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Risk Warnings */}
        {ltvStats && (ltvStats.riskZoneCounts.high > 0 || ltvStats.riskZoneCounts.extreme > 0) && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Risk Warning</span>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              {ltvStats.riskZoneCounts.extreme > 0 && 
                `${ltvStats.riskZoneCounts.extreme} months with extreme liquidation risk (85%+ LTV). `
              }
              {ltvStats.riskZoneCounts.high > 0 && 
                `${ltvStats.riskZoneCounts.high} months with high risk (80-85% LTV). `
              }
              Consider adjusting your strategy parameters to reduce risk exposure.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
