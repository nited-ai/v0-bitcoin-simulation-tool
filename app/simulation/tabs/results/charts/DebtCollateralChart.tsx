"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { Shield, AlertTriangle } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import { useRollingLoanCalculations } from "../../../hooks/useRollingLoanCalculations"

interface ChartDataPoint {
  month: number
  date: string
  // Immediate LTV (After top-up if any)
  immediateLtv: number
  // Immediate LTV at start of month (Before top-up); null when no top-up change
  immediateLtvBefore: number | null
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

  // Use unified chartPoints and monthlySnapshots from useRollingLoanCalculations for 1:1 consistency
  const { chartPoints, monthlySnapshots } = useRollingLoanCalculations()

  const chartData: Array<ChartDataPoint & { timestamp: number }> = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return []

    const sorted = chartPoints
      .filter(p => typeof p.timestamp === 'number' && Number.isFinite(p.timestamp))
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)

    return sorted.map((p, idx) => {
      const debt = (p.totalDebt ?? 0)
      const totalBtcAfter = (p.totalBtc ?? 0)
      const lockedBtc = (p.lockedBtc ?? 0)
      const btcPrice = (p.btcPrice ?? 0)

      // Prefer snapshot-provided Immediate LTV before/after if available
      const snap: any = monthlySnapshots?.[idx] ?? null
      const computedImmediate = (lockedBtc > 0 && btcPrice > 0) ? (debt / (lockedBtc * btcPrice)) * 100 : 0
      const before = typeof snap?.initialLtvBefore === 'number' ? snap.initialLtvBefore : computedImmediate
      const after = typeof snap?.initialLtvAfter === 'number' ? snap.initialLtvAfter : computedImmediate

      return {
        month: idx + 1,
        date: new Date(p.timestamp).toISOString(),
        timestamp: p.timestamp,
        immediateLtv: Math.min(after, 100),
        immediateLtvBefore: Math.min(before, 100),
        collateralValue: totalBtcAfter * btcPrice,
        totalDebt: debt,
        loanCount: 0,
        targetLtv: params.riskManagement?.targetLtv || 50,
        liquidationLtv: params.riskManagement?.liquidationLtv || 85,
      }
    })
  }, [chartPoints, params])

  // Calculate risk statistics
  const riskStats = useMemo(() => {
    if (chartData.length === 0) return null

    const maxLtv = Math.max(...chartData.map(d => d.immediateLtv))
    const avgLtv = chartData.reduce((sum, d) => sum + d.immediateLtv, 0) / chartData.length
    const dangerousMonths = chartData.filter(d => d.immediateLtv > 80).length
    const liquidationMonths = chartData.filter(d => d.immediateLtv >= 100).length
    
    return {
      maxLtv,
      avgLtv,
      dangerousMonths,
      liquidationMonths,
      riskLevel: maxLtv > 90 ? 'extreme' : maxLtv > 80 ? 'high' : maxLtv > 60 ? 'medium' : 'low'
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
              
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => new Date(ts as number).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' })}
                minTickGap={50}
                angle={-45}
                textAnchor="end"
                height={60}
              />

              <YAxis 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const d: any = payload[0]?.payload
                  if (!d) return null
                  const dateStr = new Date(label as number).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  return (
                    <div className="bg-background/95 border border-border rounded-md p-3 shadow-lg backdrop-blur-sm">
                      <p className="font-medium mb-2 text-foreground">Date: {dateStr}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-foreground/90">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                          <span className="text-sm">Immediate LTV (After): <strong>{(d.immediateLtv as number).toFixed(1)}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground/90">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                          <span className="text-sm">Immediate LTV (Before): <strong>{(d.immediateLtvBefore as number).toFixed(1)}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground/90">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                          <span className="text-sm">Target LTV: <strong>{(d.targetLtv as number).toFixed(0)}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground/90">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                          <span className="text-sm">Danger Zone: <strong>70%</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground/90">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                          <span className="text-sm">Liquidation LTV: <strong>{(d.liquidationLtv as number).toFixed(0)}%</strong></span>
                        </div>
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
              
              {/* Danger Zone (70% LTV) */}
              <ReferenceLine
                y={70}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label="Danger Zone"
              />

              {/* Immediate LTV (Before) - continuous dashed orange */}
              <Line
                type="monotone"
                dataKey="immediateLtvBefore"
                stroke="#f59e0b"
                strokeDasharray="4 2"
                strokeWidth={1}
                dot={false}
                name="Immediate LTV (Before)"
                connectNulls={true}
              />

              {/* Immediate LTV (After) - continuous solid purple */}
              <Line
                type="monotone"
                dataKey="immediateLtv"
                stroke="#8b5cf6"
                strokeWidth={1}
                dot={false}
                name="Immediate LTV (After)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Risk Level Indicators */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Safe (0-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Moderate (60-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>High Risk (80-85%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Liquidation Risk (85%+)</span>
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
