"use client"

import { useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, Bitcoin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"
import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"
import { useLiquidationCalculations } from "../../../hooks/useCalculationsIntegration"

interface ChartDataPoint {
  month: number
  timestamp: number
  dateLabel: string
  // USD axis
  btcPrice: number // main price line (projection when available)
  projectionPrice?: number
  collateralValue?: number
  totalDebt?: number
  immediateLiquidation?: number
  liquidationWithTopUp?: number
  // BTC axis
  lockedBtc?: number
  netBtc?: number
  totalBtc?: number
}

/**
 * Bitcoin Price Chart Component
 *
 * Displays Bitcoin price progression throughout the simulation period and overlays
 * key metrics from the results and price projection.
 */
export function BitcoinPriceChart() {
  const { results, priceProjection, params } = useSimulation()

  // Scale toggles (match UnifiedPriceChart)
  const [isLogScale, setIsLogScale] = useState(true)
  const [isLogLogScale, setIsLogLogScale] = useState(false)

  // Legend toggle state
  const [showProjection, setShowProjection] = useState(true)
  const [showCollateral, setShowCollateral] = useState(true)
  const [showDebt, setShowDebt] = useState(true)
  const [showLockedBtc, setShowLockedBtc] = useState(false)
  const [showNetBtc, setShowNetBtc] = useState(false)
  const [showTotalBtc, setShowTotalBtc] = useState(true)
  const [showImmediateLiq, setShowImmediateLiq] = useState(true)
  const [showTopUpLiq, setShowTopUpLiq] = useState(true)

  // Detect if projection points are monthly (vs daily) similar to DetailedResultsTable
  const isProjectionMonthly = useMemo(() => {
    const pts = priceProjection?.projectionPoints || []
    if (pts.length < 2) return false
    const dt = Math.abs((pts[1]?.timestamp || 0) - (pts[0]?.timestamp || 0))
    return dt > 2 * 24 * 60 * 60 * 1000
  }, [priceProjection?.projectionPoints])

  const getProjectionPriceForMonth = (m: number) => {
    const pts = priceProjection?.projectionPoints || []
    if (pts.length === 0) return undefined
    const rawIndex = isProjectionMonthly ? m : m * 30
    const idx = Math.max(0, Math.min(rawIndex, Math.max(pts.length - 1, 0)))
    return pts[idx]?.price
  }

  // Liquidation prices from centralized calculations (initial values)
  const liquidationData = useLiquidationCalculations()
  const { immediateLiquidation, liquidationWithTopUp } = useMemo(() => {
    if (!liquidationData) return { immediateLiquidation: undefined as number | undefined, liquidationWithTopUp: undefined as number | undefined }
    const immediate = liquidationData.initialImmediateLiquidationPrice
    const withTopUp = liquidationData.initialTrueLiquidationPrice
    const hasFreeBtc = liquidationData.initialHasFreeCollateral
    return {
      immediateLiquidation: immediate > 0 ? Math.round(immediate) : undefined,
      liquidationWithTopUp: hasFreeBtc && withTopUp > 0 ? Math.round(withTopUp) : undefined
    }
  }, [liquidationData])

  // Build chart data combining results and projection; compute overlay metrics
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    const pts = priceProjection?.projectionPoints || []

    return results.map((r: MonthlyResult) => {
      const projectionPrice = getProjectionPriceForMonth(r.month)
      // Hauptpreis aus Projektion; Fallback: result price
      const mainPrice = projectionPrice ?? (r.btcPrice || 0)

      // Timestamp aus Projektion; Fallback: dateString
      const rawIndex = isProjectionMonthly ? r.month : r.month * 30
      const safeIdx = Math.max(0, Math.min(rawIndex, Math.max(pts.length - 1, 0)))
      const ts = pts[safeIdx]?.timestamp || (Date.parse(r.dateString || '') || Date.now())
      const dateLabel = new Date(ts).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' })

      // EXAKT dieselben Felder wie in DetailedResultsTable
      const totalDebt = r.totalDebt
      const totalBtc = (r as any).totalBtcAmount ?? r.currentBtcAmount
      const lockedBtc = r.lockedBtc
      const netBtc = centralizedLoanCalculationService.netBtcAfterPayoff(totalBtc, totalDebt, mainPrice)
      const collateralValue = totalBtc * mainPrice

      // Dynamische monatliche Liquidationspreise
      const liqLtv = params?.riskManagement?.liquidationLtv ?? 80
      const liqF = Math.max(0.0001, liqLtv / 100)
      const immediateLiqPrice = (lockedBtc ?? 0) > 0 ? (totalDebt / (lockedBtc * liqF)) : undefined
      const topUpLiqPrice = totalBtc > 0 ? (totalDebt / (totalBtc * liqF)) : undefined

      // DEV: Vergleichslog (Monat, Debt, Locked, TotalBTC, NetBTC)
      if (process.env.NODE_ENV !== 'production' && (r.month <= 2 || r.month === 120)) {
        const lockedByService = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(totalDebt, mainPrice, params?.riskManagement?.targetLtv ?? 50)
        const netByService = centralizedLoanCalculationService.netBtcAfterPayoff(totalBtc, totalDebt, mainPrice)
        console.groupCollapsed(`📈 [BitcoinPriceChart] month=${r.month}`)
        console.log('raw result[month]:', r)
        console.log('chart reads:', { price: mainPrice, totalDebt, totalBtc, lockedBtc, netBtc, collateralValue })
        console.log('service comparison:', { lockedByService, netByService })
        console.groupEnd()
      }

      return {
        month: r.month,
        timestamp: ts,
        dateLabel,
        btcPrice: mainPrice,
        projectionPrice: projectionPrice,
        collateralValue,
        totalDebt,
        immediateLiquidation: immediateLiqPrice,
        liquidationWithTopUp: topUpLiqPrice,
        lockedBtc,
        netBtc,
        totalBtc,
      }
    })
  }, [results, isProjectionMonthly, priceProjection?.projectionPoints, params?.riskManagement?.liquidationLtv])

  // Ensure data sorted by time and timestamps valid
  const sortedData = useMemo(() => {
    return chartData
      .filter(d => Number.isFinite(d.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [chartData])

  // Apply log-log time transform for rendering when enabled
  const genesisDate = useMemo(() => new Date('2009-01-03').getTime(), [])
  const renderData = useMemo(() => {
    if (!isLogLogScale) return sortedData
    return sortedData.map(p => {
      const daysSinceGenesis = Math.max(1, (p.timestamp - genesisDate) / (1000 * 60 * 60 * 24))
      const logTime = Math.log10(daysSinceGenesis)
      return { ...p, originalTimestamp: p.timestamp as any, timestamp: logTime * 1000000 }
    })
  }, [sortedData, isLogLogScale, genesisDate])

  // Calculate price statistics (based on btcPrice from results)
  const priceStats = useMemo(() => {
    if (sortedData.length === 0) return null
    const prices = sortedData.map(d => d.btcPrice)
    const initialPrice = prices[0]
    const finalPrice = prices[prices.length - 1]
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const totalGrowth = initialPrice > 0 ? ((finalPrice - initialPrice) / initialPrice) * 100 : 0
    return { initialPrice, finalPrice, minPrice, maxPrice, totalGrowth }
  }, [sortedData])

  // Don't render if no data
  if (sortedData.length === 0 || !priceStats) {
    return null
  }

  // Legend click and content for visual feedback
  const handleLegendClick = useCallback((e: any) => {
    const key = e?.dataKey as string
    if (key === 'projectionPrice') setShowProjection(p => !p)
    else if (key === 'collateralValue') setShowCollateral(p => !p)
    else if (key === 'totalDebt') setShowDebt(p => !p)
    else if (key === 'lockedBtc') setShowLockedBtc(p => !p)
    else if (key === 'netBtc') setShowNetBtc(p => !p)
    else if (key === "totalBtc") setShowTotalBtc(p => !p)
    else if (key === 'immediateLiquidation') setShowImmediateLiq(p => !p)
    else if (key === 'liquidationWithTopUp') setShowTopUpLiq(p => !p)
  }, [])

  const visibility: Record<string, boolean> = {
    projectionPrice: showProjection,
    collateralValue: showCollateral,
    totalDebt: showDebt,
    lockedBtc: showLockedBtc,
    netBtc: showNetBtc,
    totalBtc: showTotalBtc,
    immediateLiquidation: showImmediateLiq,
    liquidationWithTopUp: showTopUpLiq,
  }

  const renderLegend = useCallback((props: any) => {
    const payload = props?.payload || []
    return (
      <div className="pt-2">
        <ul className="flex flex-wrap items-center gap-4">
          {payload.map((entry: any) => {
            const key = entry.dataKey as string
            const visible = visibility[key] ?? true
            return (
              <li key={key}
                  onClick={() => handleLegendClick({ dataKey: key })}
                  className={`cursor-pointer ${visible ? '' : 'text-muted-foreground/60'}`}>
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
                {entry.value}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }, [handleLegendClick, visibility])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-orange-500" />
          Bitcoin Price & Strategy Metrics
        </CardTitle>
        <CardDescription>
          Projection, collateral, debt, locked and net BTC over time
        </CardDescription>
        {/* Stats */}
        {priceStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Initial Price</div>
              <div className="text-lg font-semibold">
                ${Math.round(priceStats.initialPrice).toLocaleString('en-US')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Final Price</div>
              <div className="text-lg font-semibold">
                ${Math.round(priceStats.finalPrice).toLocaleString('en-US')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Price Range</div>
              <div className="text-sm font-medium">
                ${Math.round(priceStats.minPrice).toLocaleString('en-US')} - ${Math.round(priceStats.maxPrice).toLocaleString('en-US')}
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
        {/* Scale toggle buttons (same style as UnifiedPriceChart) */}
        <div className="flex gap-2 w-full md:w-auto pt-4">
          <Button
            variant={!isLogScale && !isLogLogScale ? "default" : "outline"}
            size="sm"
            onClick={() => { setIsLogScale(false); setIsLogLogScale(false) }}
            title="Linear scale for both axes"
            className="flex-1 md:flex-none"
          >
            Linear
          </Button>
          <Button
            variant={isLogScale && !isLogLogScale ? "default" : "outline"}
            size="sm"
            onClick={() => { setIsLogScale(true); setIsLogLogScale(false) }}
            title="Logarithmic Y-axis, linear time axis"
            className="flex-1 md:flex-none"
          >
            Log
          </Button>
          <Button
            variant={isLogLogScale ? "default" : "outline"}
            size="sm"
            onClick={() => { setIsLogScale(true); setIsLogLogScale(true) }}
            title="Logarithmic scale for both axes - Power Law lines appear straight"
            className="flex-1 md:flex-none"
          >
            Log-Log
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={renderData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale={isLogLogScale ? "linear" : "time"}
                domain={["dataMin", "dataMax"]}
                allowDataOverflow={false}
                tickFormatter={(ts) => {
                  if (isLogLogScale) {
                    const logDays = (ts as number) / 1000000
                    const daysSinceGenesis = Math.pow(10, logDays)
                    const d = new Date(genesisDate + daysSinceGenesis * 24 * 60 * 60 * 1000)
                    return d.getFullYear().toString()
                  }
                  return new Date(ts).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' })
                }}
                minTickGap={20}
                padding={{ left: 0, right: 0 }}
                interval="preserveStartEnd"
              />

              {/* USD Axis (left) */}
              <YAxis
                yAxisId="usd"
                orientation="left"
                scale={isLogScale || isLogLogScale ? "log" : "linear"}
                domain={['dataMin * 0.5', 'dataMax * 2']}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
              />

              {/* BTC Axis (right) */}
              <YAxis
                yAxisId="btc"
                orientation="right"
                scale={isLogScale || isLogLogScale ? "log" : "linear"}
                domain={['dataMin * 0.5', 'dataMax * 2']}
                tickFormatter={(value) => `${value.toFixed(2)} BTC`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0]?.payload
                  if (!data) return null

                  const formatUsd0 = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
                  const formatBtc0 = (v: number) => `${v.toFixed(4)} BTC`

                  return (
                    <div className="bg-background/95 border border-border rounded-md p-3 shadow-lg backdrop-blur-sm">
                      <p className="font-medium mb-2 text-foreground">
                        {isLogLogScale
                          ? (() => {
                              const logDays = (label as number) / 1000000
                              const daysSinceGenesis = Math.pow(10, logDays)
                              const date = new Date(genesisDate + daysSinceGenesis * 24 * 60 * 60 * 1000)
                              return `Date: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                            })()
                          : `Date: ${new Date(label as number).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                      </p>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-foreground">BTC Price: <strong>{formatUsd0(data.btcPrice)}</strong></span>
                        </div>
                        {showProjection && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Projection: <strong>{formatUsd0(data.projectionPrice)}</strong></span>
                          </div>
                        )}
                        {showCollateral && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-teal-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Collateral Value: <strong>{formatUsd0(data.collateralValue)}</strong></span>
                          </div>
                        )}
                        {showDebt && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Total Debt: <strong>{formatUsd0(data.totalDebt)}</strong></span>
                          </div>
                        )}
                        {showLockedBtc && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Locked BTC: <strong>{formatBtc0(data.lockedBtc)}</strong></span>
                          </div>
                        )}
                        {showNetBtc && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Net BTC: <strong>{formatBtc0(data.netBtc)}</strong></span>
                          </div>
                        )}
                        {showTotalBtc && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-cyan-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Total BTC: <strong>{formatBtc0(data.totalBtc)}</strong></span>
                          </div>
                        )}
                        {showImmediateLiq && data.immediateLiquidation && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Immediate Liquidation: <strong>{formatUsd0(data.immediateLiquidation)}</strong></span>
                          </div>
                        )}
                        {showTopUpLiq && data.liquidationWithTopUp && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full opacity-70"></div>
                            <span className="text-sm text-foreground">Liquidation (Top-up): <strong>{formatUsd0(data.liquidationWithTopUp)}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
                labelFormatter={(timestamp: number) => {
                  let date: Date
                  if (isLogLogScale) {
                    const logDays = timestamp / 1000000
                    const daysSinceGenesis = Math.pow(10, logDays)
                    date = new Date(genesisDate + daysSinceGenesis * 24 * 60 * 60 * 1000)
                  } else {
                    date = new Date(timestamp)
                  }
                  return `Date: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  color: '#000'
                }}
              />

              <Legend content={renderLegend} />

              {/* BTC Price (USD) - always rendered */}
              <Line yAxisId="usd" type="monotone" dataKey="btcPrice" stroke="#f97316" strokeWidth={3} dot={false} name="BTC Price" strokeOpacity={1} />

              {/* Projection Price (USD) */}
              <Line yAxisId="usd" type="monotone" dataKey="projectionPrice" stroke={showProjection ? "#3b82f6" : "#9ca3af"} strokeWidth={2} dot={false} strokeDasharray="4 4" name="Projection" strokeOpacity={showProjection ? 1 : 0} />

              {/* Collateral Value (USD) */}
              <Line yAxisId="usd" type="monotone" dataKey="collateralValue" stroke={showCollateral ? "#14b8a6" : "#9ca3af"} strokeWidth={2} dot={false} name="Collateral Value" strokeOpacity={showCollateral ? 1 : 0} />

              {/* Total Debt (USD) */}
              <Line yAxisId="usd" type="monotone" dataKey="totalDebt" stroke={showDebt ? "#ef4444" : "#9ca3af"} strokeWidth={2} dot={false} name="Total Debt" strokeOpacity={showDebt ? 1 : 0} />

              {/* Locked BTC (BTC) */}
              <Line yAxisId="btc" type="monotone" dataKey="lockedBtc" stroke={showLockedBtc ? "#8b5cf6" : "#9ca3af"} strokeWidth={2} dot={false} name="Locked BTC" strokeOpacity={showLockedBtc ? 1 : 0} />

              {/* Net BTC (BTC) */}
              <Line yAxisId="btc" type="monotone" dataKey="netBtc" stroke={showNetBtc ? "#22c55e" : "#9ca3af"} strokeWidth={2} dot={false} name="Net BTC" strokeOpacity={showNetBtc ? 1 : 0} />

              {/* Total BTC (BTC) */}
              <Line yAxisId="btc" type="monotone" dataKey="totalBtc" stroke={showTotalBtc ? "#06b6d4" : "#9ca3af"} strokeWidth={2} dot={false} name="Total BTC" strokeOpacity={showTotalBtc ? 1 : 0} />

              {/* Liquidation Lines (USD) - dynamic per-month */}
              <Line yAxisId="usd" type="monotone" dataKey="immediateLiquidation" stroke={showImmediateLiq ? "#eab308" : "#9ca3af"} strokeWidth={1} dot={false} strokeDasharray="2 2" name="Immediate Liquidation" strokeOpacity={showImmediateLiq ? 1 : 0} />
              <Line yAxisId="usd" type="monotone" dataKey="liquidationWithTopUp" stroke={showTopUpLiq ? "#16a34a" : "#9ca3af"} strokeWidth={1} dot={false} strokeDasharray="2 2" name="Liquidation (Top-up)" strokeOpacity={showTopUpLiq ? 1 : 0} />

            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
