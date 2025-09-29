"use client"

import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts"
import { DollarSign, TrendingUp, ArrowUpDown } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  loanProceeds: number
  reinvestment: number
  cashTaken: number
  netCashFlow: number
  btcPrice: number
  rolloverEvent: boolean
  excessProceeds: number
  btcEquivalent: number
}

/**
 * Cash Flow Summary Chart Component
 * 
 * Displays monthly loan proceeds breakdown, reinvestment amounts, and net cash flows
 * with price-aware analysis for rolling loan strategy results.
 */
export function CashFlowSummaryChart() {
  const { t } = useTranslation()
  const { results, params, priceProjection } = useSimulation()

  // Only show for rolling loan strategy
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    return results.map((result: MonthlyResult, index: number) => {
      // Calculate loan proceeds (new loans taken)
      const loanProceeds = result.totalPrincipal

      // Reinvestment amount
      const reinvestment = result.principalForReinvestment

      // Cash taken (for living expenses)
      const cashTaken = result.principalForNeeds

      // Net cash flow (positive = cash in, negative = cash out)
      const netCashFlow = loanProceeds - result.repaymentDue

      // Check if this is a rollover month (has repayment due)
      const rolloverEvent = result.repaymentDue > 0

      // Calculate excess proceeds (loan amount minus repayment)
      const excessProceeds = Math.max(0, loanProceeds - result.repaymentDue)

      // BTC equivalent of cash flows
      const btcEquivalent = loanProceeds / result.btcPrice

      return {
        month: result.month,
        date: result.dateString || result.date,
        loanProceeds,
        reinvestment,
        cashTaken,
        netCashFlow,
        btcPrice: result.btcPrice,
        rolloverEvent,
        excessProceeds,
        btcEquivalent
      }
    })
  }, [results])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (chartData.length === 0) return null

    const totalLoanProceeds = chartData.reduce((sum, d) => sum + d.loanProceeds, 0)
    const totalReinvestment = chartData.reduce((sum, d) => sum + d.reinvestment, 0)
    const totalCashTaken = chartData.reduce((sum, d) => sum + d.cashTaken, 0)
    const totalExcessProceeds = chartData.reduce((sum, d) => sum + d.excessProceeds, 0)
    const rolloverCount = chartData.filter(d => d.rolloverEvent).length
    const avgMonthlyFlow = totalLoanProceeds / chartData.length

    return {
      totalLoanProceeds,
      totalReinvestment,
      totalCashTaken,
      totalExcessProceeds,
      rolloverCount,
      avgMonthlyFlow
    }
  }, [chartData])

  // Show placeholder if no results
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Flow Summary
          </CardTitle>
          <CardDescription>
            Monthly loan proceeds, reinvestments, and net cash flows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ArrowUpDown className="h-8 w-8 mx-auto mb-2" />
            <p>Run simulation to see cash flow analysis</p>
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
              <DollarSign className="h-5 w-5" />
              Cash Flow Summary
            </CardTitle>
            <CardDescription>
              Loan proceeds and cash flows with price correlation
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
                {summaryMetrics.rolloverCount} Rollovers
              </Badge>
              <Badge variant="outline">
                ${summaryMetrics.avgMonthlyFlow.toLocaleString('en-US', { maximumFractionDigits: 0 })} Avg
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
              <div className="text-2xl font-bold text-blue-600">
                ${summaryMetrics.totalLoanProceeds.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">Total Loan Proceeds</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${summaryMetrics.totalReinvestment.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">Total Reinvestment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${summaryMetrics.totalCashTaken.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">Total Cash Taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${summaryMetrics.totalExcessProceeds.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-muted-foreground">Excess Proceeds</div>
            </div>
          </div>
        )}

        {/* Mode-specific message */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {params.btcAccumulation ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span><strong>BTC Accumulation Mode:</strong> Loan proceeds are reinvested into additional Bitcoin</span>
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span><strong>Cash Generation Mode:</strong> Excess loan proceeds are taken as cash for living expenses</span>
              </>
            )}
          </div>
        </div>

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
              
              {/* Left Y-axis for cash amounts */}
              <YAxis 
                yAxisId="cash"
                orientation="left"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
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
                  if (name === 'btcEquivalent') {
                    return [`${value.toFixed(4)} BTC`, 'BTC Equivalent']
                  }
                  return [
                    `$${value.toLocaleString('en-US')}`,
                    name === 'loanProceeds' ? 'Loan Proceeds' :
                    name === 'reinvestment' ? 'Reinvestment' :
                    name === 'cashTaken' ? 'Cash Taken' :
                    name === 'netCashFlow' ? 'Net Cash Flow' :
                    name === 'excessProceeds' ? 'Excess Proceeds' : name
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
              
              {/* Loan Proceeds Bar */}
              <Bar
                yAxisId="cash"
                dataKey="loanProceeds"
                fill="#3b82f6"
                fillOpacity={0.8}
                name="Loan Proceeds"
              />
              
              {/* Reinvestment Bar (stacked) */}
              {params.btcAccumulation && (
                <Bar
                  yAxisId="cash"
                  dataKey="reinvestment"
                  fill="#22c55e"
                  fillOpacity={0.8}
                  name="Reinvestment"
                />
              )}
              
              {/* Cash Taken Bar (stacked) */}
              {!params.btcAccumulation && (
                <Bar
                  yAxisId="cash"
                  dataKey="cashTaken"
                  fill="#f97316"
                  fillOpacity={0.8}
                  name="Cash Taken"
                />
              )}
              
              {/* Net Cash Flow Line */}
              <Line
                yAxisId="cash"
                type="monotone"
                dataKey="netCashFlow"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { payload } = props
                  if (payload?.rolloverEvent) {
                    return <circle {...props} fill="#8b5cf6" stroke="#8b5cf6" strokeWidth={2} r={5} />
                  }
                  return <circle {...props} fill="#8b5cf6" stroke="#8b5cf6" strokeWidth={2} r={3} />
                }}
                name="Net Cash Flow"
              />
              
              {/* BTC Price Line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="btcPrice"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="BTC Price"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Cash Flow Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Loan Proceeds</span>
          </div>
          {params.btcAccumulation ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>BTC Reinvestment</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Cash for Living Expenses</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Net Cash Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
            <span>Rollover Event</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
