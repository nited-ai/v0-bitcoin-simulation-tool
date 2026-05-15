"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { monthAxisProps, formatMonthAsDateFull } from "./chartFormatters"
import { Shield, AlertTriangle } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  ltv: number
  collateralValue: number
  totalDebt: number
  loanCount: number
  targetLtv: number
  liquidationLtv: number
}

/**
 * Debt vs Collateral Chart Component
 * 
 * Displays the relationship between debt and collateral over time,
 * focusing on LTV (Loan-to-Value) ratios and risk levels.
 */
export function DebtCollateralChart() {
  const { results, params } = useSimulation()

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    return results.map((result: MonthlyResult) => {
      const ltv = result.collateralValue > 0 
        ? (result.totalDebt / result.collateralValue) * 100 
        : 0

      return {
        month: result.month,
        date: result.dateString,
        ltv: Math.min(ltv, 100), // Cap at 100% for display
        collateralValue: result.collateralValue,
        totalDebt: result.totalDebt,
        loanCount: result.loanCount,
        targetLtv: params.riskManagement?.targetLtv || 50,
        liquidationLtv: params.riskManagement?.liquidationLtv || 85,
      }
    })
  }, [results, params])

  // Calculate risk statistics + month-count buckets for the color-key
  // legend (Safe/Moderate/High Risk/Liquidation Risk). The thresholds
  // here match the dot-color thresholds in the chart line below.
  const riskStats = useMemo(() => {
    if (chartData.length === 0) return null

    const maxLtv = Math.max(...chartData.map(d => d.ltv))
    const avgLtv = chartData.reduce((sum, d) => sum + d.ltv, 0) / chartData.length
    const dangerousMonths = chartData.filter(d => d.ltv > 80).length
    const liquidationMonths = chartData.filter(d => d.ltv >= 100).length

    const safeMonths = chartData.filter(d => d.ltv <= 60).length
    const moderateMonths = chartData.filter(d => d.ltv > 60 && d.ltv <= 80).length
    const highRiskMonths = chartData.filter(d => d.ltv > 80 && d.ltv < 85).length
    const liquidationRiskMonths = chartData.filter(d => d.ltv >= 85).length

    return {
      maxLtv,
      avgLtv,
      dangerousMonths,
      liquidationMonths,
      safeMonths,
      moderateMonths,
      highRiskMonths,
      liquidationRiskMonths,
      riskLevel: maxLtv > 90 ? 'extreme' : maxLtv > 80 ? 'high' : maxLtv > 60 ? 'medium' : 'low',
    }
  }, [chartData])

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Debt vs Collateral Analysis
          </CardTitle>
          <CardDescription>
            Monitor your loan-to-value (LTV) ratios and risk levels over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run a simulation to see debt vs collateral analysis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'extreme': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Debt vs Collateral Analysis
        </CardTitle>
        <CardDescription>
          LTV progression and risk assessment over {chartData.length} months
        </CardDescription>
        
        {/* Risk Statistics */}
        {riskStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Max LTV</div>
              <div className={`text-lg font-semibold ${riskStats.maxLtv > 80 ? 'text-red-600' : riskStats.maxLtv > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                {riskStats.maxLtv.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Avg LTV</div>
              <div className="text-lg font-semibold">
                {riskStats.avgLtv.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Risk Level</div>
              <div className={`text-lg font-semibold ${getRiskColor(riskStats.riskLevel)}`}>
                {riskStats.riskLevel.toUpperCase()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">High Risk Months</div>
              <div className={`text-lg font-semibold ${riskStats.dangerousMonths > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {riskStats.dangerousMonths}
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
              
              <XAxis dataKey="month" {...monthAxisProps} />
              
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const row = payload[0]?.payload as ChartDataPoint | undefined
                  if (!row) return null
                  const ltv = row.ltv
                  return (
                    <div
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        color: '#111',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {formatMonthAsDateFull(Number(label))}
                      </div>
                      <div>
                        <strong>Current LTV:</strong> {ltv.toFixed(1)}%
                      </div>
                      <div style={{ marginTop: 6, color: '#22c55e' }}>
                        Target LTV: {row.targetLtv}%
                      </div>
                      <div style={{ color: '#f59e0b' }}>
                        Danger Zone: 80%
                      </div>
                      <div style={{ color: '#ef4444' }}>
                        Liquidation LTV: {row.liquidationLtv}%
                      </div>
                    </div>
                  )
                }}
              />

              <Legend />
              
              {/* Target LTV Reference Line */}
              <ReferenceLine 
                y={chartData[0]?.targetLtv || 50} 
                stroke="#22c55e" 
                strokeDasharray="5 5"
                label="Target LTV"
              />
              
              {/* Liquidation LTV Reference Line */}
              <ReferenceLine 
                y={chartData[0]?.liquidationLtv || 85} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                label="Liquidation LTV"
              />
              
              {/* Danger Zone (80% LTV) */}
              <ReferenceLine 
                y={80} 
                stroke="#f59e0b" 
                strokeDasharray="3 3"
                label="Danger Zone"
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
                  const color = ltv > 85 ? '#ef4444' : ltv > 80 ? '#f59e0b' : ltv > 60 ? '#eab308' : '#22c55e'
                  return <circle cx={cx} cy={cy} r={3} fill={color} stroke={color} strokeWidth={2} />
                }}
                name="Current LTV"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Risk Level Indicators (with month counts so you can see how
            much time the strategy spent in each band — Safe vs Moderate
            vs ... — at a glance) */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>
                Safe (0-60%){riskStats && (
                  <span className="text-muted-foreground"> · {riskStats.safeMonths} months</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>
                Moderate (60-80%){riskStats && (
                  <span className="text-muted-foreground"> · {riskStats.moderateMonths} months</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>
                High Risk (80-85%){riskStats && (
                  <span className="text-muted-foreground"> · {riskStats.highRiskMonths} months</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>
                Liquidation Risk (85%+){riskStats && (
                  <span className="text-muted-foreground"> · {riskStats.liquidationRiskMonths} months</span>
                )}
              </span>
            </div>
          </div>
          
          {riskStats && riskStats.dangerousMonths > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Warning: {riskStats.dangerousMonths} months with LTV above 80%
                {riskStats.liquidationMonths > 0 && `, ${riskStats.liquidationMonths} with liquidation risk`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
