"use client"

import React, { useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { TrendingUp } from "lucide-react"
import type { StrategyChartPoint } from "../../../hooks/useRollingLoanCalculations"

interface StrategyResultsChartProps {
  className?: string
  data: StrategyChartPoint[]
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-"
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${Math.round(value).toLocaleString("en-US")}`
}

function formatBtc(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-"
  // Show up to 4 decimals for readability
  return `${Number(value).toFixed(4)} BTC`
}

export function StrategyResultsChart({ className, data }: StrategyResultsChartProps) {
  // Local UI state only (presentation)
  const [isLogScale, setIsLogScale] = useState<boolean>(true)
  const [showBtcPrice, setShowBtcPrice] = useState(true)
  const [showCollateral, setShowCollateral] = useState(true)
  const [showTotalDebt, setShowTotalDebt] = useState(true)
  const [showImmediateLiq, setShowImmediateLiq] = useState(true)
  const [showTopUpLiq, setShowTopUpLiq] = useState(true)
  const [showTotalBtc, setShowTotalBtc] = useState(true)
  const [showLockedBtc, setShowLockedBtc] = useState(true)
  const [showNetBtc, setShowNetBtc] = useState(true)

  // Sanitize and sort data
  const chartData = useMemo(() => {
    const filtered = (data || []).filter(p => typeof p.timestamp === 'number' && !Number.isNaN(p.timestamp))
    const sorted = filtered.slice().sort((a, b) => a.timestamp - b.timestamp)
    return sorted
  }, [data])
  // Compute dynamic axis domains based on visible series
  const usdDomain = useMemo(() => {
    const keys: Array<{k:keyof StrategyChartPoint, visible:boolean}> = [
      { k: 'btcPrice', visible: showBtcPrice },
      { k: 'collateralValue', visible: showCollateral },
      { k: 'totalDebt', visible: showTotalDebt },
      { k: 'immediateLiquidationPrice', visible: showImmediateLiq },
      { k: 'topUpLiquidationPrice', visible: showTopUpLiq },
    ]
    const vals: number[] = []
    for (const d of chartData) {
      for (const {k, visible} of keys) {
        if (!visible) continue
        const v = d[k] as number | undefined | null
        if (v != null && Number.isFinite(v)) vals.push(Number(v))
      }
    }
    if (!vals.length) return ['auto', 'auto']
    let min = Math.min(...vals), max = Math.max(...vals)
    if (isLogScale) {
      // avoid non-positive for log scale
      min = Math.max(1, min)
    }
    const padLow = isLogScale ? min : min * 0.9
    const padHigh = isLogScale ? max : max * 1.1
    return [padLow, padHigh]
  }, [chartData, showBtcPrice, showCollateral, showTotalDebt, showImmediateLiq, showTopUpLiq, isLogScale]) as [number|string, number|string]

  const btcDomain = useMemo(() => {
    const keys: Array<{k:keyof StrategyChartPoint, visible:boolean}> = [
      { k: 'totalBtc', visible: showTotalBtc },
      { k: 'lockedBtc', visible: showLockedBtc },
      { k: 'netBtc', visible: showNetBtc },
    ]
    const vals: number[] = []
    for (const d of chartData) {
      for (const {k, visible} of keys) {
        if (!visible) continue
        const v = d[k] as number | undefined | null
        if (v != null && Number.isFinite(v)) vals.push(Number(v))
      }
    }
    if (!vals.length) return ['auto', 'auto']
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    return [min * 0.9, max * 1.1]
  }, [chartData, showTotalBtc, showLockedBtc, showNetBtc]) as [number|string, number|string]


  const handleLegendClick = useCallback((payload: { dataKey: string }) => {
    const key = payload?.dataKey
    switch (key) {
      case 'btcPrice': setShowBtcPrice(v => !v); break
      case 'collateralValue': setShowCollateral(v => !v); break
      case 'totalDebt': setShowTotalDebt(v => !v); break
      case 'immediateLiquidationPrice': setShowImmediateLiq(v => !v); break
      case 'topUpLiquidationPrice': setShowTopUpLiq(v => !v); break
      case 'totalBtc': setShowTotalBtc(v => !v); break
      case 'lockedBtc': setShowLockedBtc(v => !v); break
      case 'netBtc': setShowNetBtc(v => !v); break
    }
  }, [])

  const legendItems = useMemo(() => ([
    { key: 'btcPrice', label: 'BTC Price', color: '#f97316', visible: showBtcPrice },
    { key: 'collateralValue', label: 'Portfolio Value', color: '#22c55e', visible: showCollateral },
    { key: 'totalDebt', label: 'Total Debt', color: '#ef4444', visible: showTotalDebt },
    { key: 'immediateLiquidationPrice', label: 'Immediate Liq.', color: '#eab308', visible: showImmediateLiq },
    { key: 'topUpLiquidationPrice', label: 'Top-up Liq.', color: '#a3e635', visible: showTopUpLiq },
    { key: 'totalBtc', label: 'Total BTC', color: '#0ea5e9', visible: showTotalBtc },
    { key: 'lockedBtc', label: 'Locked BTC', color: '#64748b', visible: showLockedBtc },
    { key: 'netBtc', label: 'Net BTC', color: '#8b5cf6', visible: showNetBtc },
  ]), [showBtcPrice, showCollateral, showTotalDebt, showImmediateLiq, showTopUpLiq, showTotalBtc, showLockedBtc, showNetBtc])

  const renderLegend = useCallback(() => (
    <ul className="flex flex-wrap gap-4 justify-center mt-3 select-none">
      {legendItems.map(item => (
        <li key={item.key}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleLegendClick({ dataKey: item.key })}
            style={{ opacity: item.visible ? 1 : 0.5 }}>
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span className={item.visible ? '' : 'line-through'}>{item.label}</span>
        </li>
      ))}
    </ul>
  ), [legendItems, handleLegendClick])

  if (!chartData.length) {
    return (
      <Card className={["-mt-6", className].filter(Boolean).join(" ") }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategy Results
          </CardTitle>
          <CardDescription>Chart will appear when results are available.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[550px] flex items-center justify-center text-muted-foreground">
            No data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={["-mt-6", className].filter(Boolean).join(" ") }>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Strategy Results
            </CardTitle>

          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant={!isLogScale ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLogScale(false)}
              title="Linear scale for USD axis"
              className="flex-1 md:flex-none"
            >
              Linear
            </Button>
            <Button
              variant={isLogScale ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLogScale(true)}
              title="Logarithmic USD axis"
              className="flex-1 md:flex-none"
            >
              Log
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[550px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => new Date(ts as number).toLocaleDateString('en-US', { year: '2-digit', month: 'short' })}
                minTickGap={50}
                angle={-45}
                textAnchor="end"
                height={60}
              />

              {/* USD axis (left) */}
              <YAxis
                yAxisId="usd"
                orientation="left"
                scale={isLogScale ? "log" : "linear"}
                type="number"
                domain={usdDomain as any}
                tickFormatter={(v) => formatUsd(Number(v))}
                allowDataOverflow
              />

              {/* BTC axis (right) */}
              <YAxis
                yAxisId="btc"
                orientation="right"
                scale="linear"
                type="number"
                domain={btcDomain as any}
                tickFormatter={(v) => `${Math.round(Number(v))} BTC`}
                allowDecimals
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
                        {showBtcPrice && d.btcPrice != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                            <span className="text-sm">BTC Price: <strong>{formatUsd(d.btcPrice)}</strong></span>
                          </div>
                        )}
                        {showCollateral && d.collateralValue != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                            <span className="text-sm">Portfolio Value: <strong>{formatUsd(d.collateralValue)}</strong></span>
                          </div>
                        )}
                        {showTotalDebt && d.totalDebt != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                            <span className="text-sm">Total Debt: <strong>{formatUsd(d.totalDebt)}</strong></span>
                          </div>
                        )}
                        {showImmediateLiq && d.immediateLiquidationPrice != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
                            <span className="text-sm">Immediate Liq.: <strong>{formatUsd(d.immediateLiquidationPrice)}</strong></span>
                          </div>
                        )}
                        {showTopUpLiq && d.topUpLiquidationPrice != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a3e635' }}></div>
                            <span className="text-sm">Top-up Liq.: <strong>{formatUsd(d.topUpLiquidationPrice)}</strong></span>
                          </div>
                        )}
                        {showTotalBtc && d.totalBtc != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0ea5e9' }}></div>
                            <span className="text-sm">Total BTC: <strong>{formatBtc(d.totalBtc)}</strong></span>
                          </div>
                        )}
                        {showLockedBtc && d.lockedBtc != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }}></div>
                            <span className="text-sm">Locked BTC: <strong>{formatBtc(d.lockedBtc)}</strong></span>
                          </div>
                        )}
                        {showNetBtc && d.netBtc != null && (
                          <div className="flex items-center gap-2 text-foreground/90">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span className="text-sm">Net BTC: <strong>{formatBtc(d.netBtc)}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
              />

              <Legend content={renderLegend as any} />

              {/* USD series (areas below) */}
              {showCollateral && (
                <Area dataKey="collateralValue" name="Portfolio Value" type="monotone" yAxisId="usd"
                  stroke="#22c55e" strokeWidth={1} strokeOpacity={0.9} fill="#22c55e" fillOpacity={0.05}
                  connectNulls={true} isAnimationActive={false} dot={false} activeDot={false} baseValue="dataMin" />
              )}
              {showBtcPrice && (
                <Area dataKey="btcPrice" name="BTC Price" type="monotone" yAxisId="usd"
                  stroke="#f97316" strokeWidth={1} strokeOpacity={0.9} fill="#f97316" fillOpacity={0.05}
                  connectNulls={true} isAnimationActive={false} dot={false} activeDot={false} baseValue="dataMin" />
              )}

              {/* USD series (lines on top) */}
              <Line dataKey="totalDebt" name="Total Debt" type="stepAfter" yAxisId="usd" stroke="#ef4444" strokeWidth={1} dot={false} connectNulls={true} hide={!showTotalDebt} />
              <Line dataKey="immediateLiquidationPrice" name="Immediate Liq." type="stepAfter" yAxisId="usd" stroke="#eab308" strokeWidth={1} dot={false} connectNulls={true} strokeDasharray="4 4" hide={!showImmediateLiq} />
              <Line dataKey="topUpLiquidationPrice" name="Top-up Liq." type="stepAfter" yAxisId="usd" stroke="#a3e635" strokeWidth={1} dot={false} connectNulls={true} strokeDasharray="4 4" hide={!showTopUpLiq} />

              {/* BTC series */}
              <Line dataKey="totalBtc" name="Total BTC" type="stepAfter" yAxisId="btc" stroke="#0ea5e9" strokeWidth={1} dot={false} connectNulls={true} hide={!showTotalBtc} />
              <Line dataKey="lockedBtc" name="Locked BTC" type="stepAfter" yAxisId="btc" stroke="#64748b" strokeWidth={1} dot={false} connectNulls={true} hide={!showLockedBtc} />
              <Line dataKey="netBtc" name="Net BTC" type="monotone" yAxisId="btc" stroke="#8b5cf6" strokeWidth={1} dot={false} connectNulls={true} hide={!showNetBtc} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

