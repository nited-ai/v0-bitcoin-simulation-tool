"use client"

import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Bitcoin, TrendingUp, Info } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  totalBtc: number
  originalBtc: number
  accumulatedBtc: number
  btcPrice: number
  portfolioValue: number
  loanFundedBtc: number
}

/**
 * BTC Accumulation Chart Component
 * 
 * Displays BTC holdings growth over time through loan reinvestment with price projection context.
 * Shows correlation between price movements and accumulation decisions in rolling loan strategy.
 */
export function BTCAccumulationChart() {
  const { t } = useTranslation()
  const { results, params, priceProjection } = useSimulation()

  // Only show for rolling loan strategy
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }

  // Show message if BTC accumulation is disabled
  if (!params.btcAccumulation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5" />
            BTC Accumulation Over Time
          </CardTitle>
          <CardDescription>
            BTC accumulation is disabled for this simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>Enable BTC accumulation in Strategy tab to see accumulation analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    const initialBtc = params.initialBtcAmount || 1.0

    return results.map((result: MonthlyResult) => {
      // Use currentBtcAmount (mapped from totalBtcAmount) with defensive check
      const currentBtc = result.currentBtcAmount ?? 0
      const accumulatedBtc = Math.max(0, currentBtc - initialBtc)

      // Calculate loan funded BTC with defensive checks
      // reinvestment field contains the reinvestment amount
      const reinvestmentAmount = result.reinvestment ?? 0
      const btcPrice = result.btcPrice ?? 1
      const loanFundedBtc = reinvestmentAmount > 0 && btcPrice > 0
        ? reinvestmentAmount / btcPrice
        : 0

      return {
        month: result.month,
        date: result.dateString || result.date,
        totalBtc: currentBtc, // Use currentBtcAmount instead of totalBtcAmount
        originalBtc: initialBtc,
        accumulatedBtc,
        btcPrice: btcPrice,
        portfolioValue: result.collateralValue ?? 0,
        loanFundedBtc
      }
    })
  }, [results, params.initialBtcAmount])

  // Calculate summary metrics with defensive checks
  const summaryMetrics = useMemo(() => {
    if (chartData.length === 0) return null

    const finalData = chartData[chartData.length - 1]
    if (!finalData) return null

    const initialBtc = params.initialBtcAmount || 1.0
    const finalBtcAmount = finalData.totalBtc ?? 0
    const totalAccumulated = Math.max(0, finalBtcAmount - initialBtc)
    const accumulationPercent = initialBtc > 0 ? (totalAccumulated / initialBtc) * 100 : 0
    const totalLoanFunded = chartData.reduce((sum, data) => sum + (data.loanFundedBtc ?? 0), 0)

    return {
      totalAccumulated,
      accumulationPercent,
      totalLoanFunded,
      finalBtcAmount,
      finalPortfolioValue: finalData.portfolioValue ?? 0
    }
  }, [chartData, params.initialBtcAmount])

  // Show placeholder if no results
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5" />
            BTC Accumulation Over Time
          </CardTitle>
          <CardDescription>
            Shows BTC holdings growth through loan reinvestment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2" />
            <p>Run simulation to see BTC accumulation analysis</p>
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
              <Bitcoin className="h-5 w-5" />
              BTC Accumulation Over Time
            </CardTitle>
            <CardDescription>
              BTC holdings growth through rolling loan strategy
              {priceProjection && (
                <span className="ml-2">
                  • Using {priceProjection.modelName} price model
                </span>
              )}
            </CardDescription>
          </div>
          
          {summaryMetrics && (
            <div className="flex gap-2">
              <Badge variant="secondary">
                +{summaryMetrics.totalAccumulated.toFixed(4)} BTC
              </Badge>
              <Badge variant="outline">
                +{summaryMetrics.accumulationPercent.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Metrics */}
        {summaryMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(summaryMetrics.finalBtcAmount ?? 0).toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">Final BTC</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{(summaryMetrics.totalAccumulated ?? 0).toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">Accumulated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(summaryMetrics.totalLoanFunded ?? 0).toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">Loan Funded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                ${(summaryMetrics.finalPortfolioValue ?? 0).toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">Portfolio Value</div>
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
              
              {/* Left Y-axis for BTC amounts */}
              <YAxis 
                yAxisId="btc"
                orientation="left"
                tickFormatter={(value) => `${value.toFixed(2)} BTC`}
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
                  return [
                    `${value.toFixed(4)} BTC`,
                    name === 'totalBtc' ? 'Total BTC' :
                    name === 'originalBtc' ? 'Original BTC' :
                    name === 'accumulatedBtc' ? 'Accumulated BTC' :
                    name === 'loanFundedBtc' ? 'Loan Funded BTC' : name
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
              
              {/* Original BTC baseline */}
              <Area
                yAxisId="btc"
                type="monotone"
                dataKey="originalBtc"
                stackId="1"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.3}
                name="Original BTC"
              />
              
              {/* Accumulated BTC area */}
              <Area
                yAxisId="btc"
                type="monotone"
                dataKey="accumulatedBtc"
                stackId="1"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.6}
                name="Accumulated BTC"
              />
              
              {/* Total BTC line */}
              <Line
                yAxisId="btc"
                type="monotone"
                dataKey="totalBtc"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                name="Total BTC Holdings"
              />
              
              {/* BTC Price line */}
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
      </CardContent>
    </Card>
  )
}
