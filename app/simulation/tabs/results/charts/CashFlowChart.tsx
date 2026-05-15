"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { monthAxisProps, formatMonthAsDateFull } from "./chartFormatters"
import { DollarSign, TrendingDown, TrendingUp, ArrowUpDown } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface ChartDataPoint {
  month: number
  date: string
  withdrawals: number
  reinvestments: number
  newLoans: number
  repayments: number
  netCashFlow: number
  cumulativeCashFlow: number
}

/**
 * Cash Flow Chart Component
 * 
 * Visualizes cash flows including withdrawals, reinvestments, loan originations,
 * and repayments over the simulation period.
 */
export function CashFlowChart() {
  const { results, params } = useSimulation()

  // Transform results data for chart display
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (results.length === 0) return []

    let cumulativeCashFlow = 0

    return results.map((result: MonthlyResult) => {
      // Convert withdrawalAmount to actual withdrawal (negative values are withdrawals)
      const withdrawals = Math.max(0, -result.withdrawalAmount)
      const savings = Math.max(0, result.withdrawalAmount)
      
      const reinvestments = result.reinvestment
      const newLoans = result.newLoanPrincipal
      const repayments = result.repaymentsDue
      
      // Net cash flow: positive = money in, negative = money out
      const netCashFlow = savings + newLoans - withdrawals - repayments + reinvestments
      cumulativeCashFlow += netCashFlow

      return {
        month: result.month,
        date: result.dateString,
        withdrawals: -withdrawals, // Negative for display
        reinvestments: reinvestments,
        newLoans: newLoans,
        repayments: -repayments, // Negative for display
        netCashFlow: netCashFlow,
        cumulativeCashFlow: cumulativeCashFlow,
      }
    })
  }, [results])

  // Calculate cash flow statistics
  const cashFlowStats = useMemo(() => {
    if (chartData.length === 0) return null

    const totalWithdrawals = chartData.reduce((sum, d) => sum + Math.abs(d.withdrawals), 0)
    const totalReinvestments = chartData.reduce((sum, d) => sum + d.reinvestments, 0)
    const totalNewLoans = chartData.reduce((sum, d) => sum + d.newLoans, 0)
    const totalRepayments = chartData.reduce((sum, d) => sum + Math.abs(d.repayments), 0)
    const finalCumulativeCashFlow = chartData[chartData.length - 1]?.cumulativeCashFlow || 0
    
    const avgMonthlyWithdrawal = totalWithdrawals / chartData.length
    const avgMonthlyReinvestment = totalReinvestments / chartData.length
    
    // Count positive vs negative cash flow months
    const positiveCashFlowMonths = chartData.filter(d => d.netCashFlow > 0).length
    const negativeCashFlowMonths = chartData.filter(d => d.netCashFlow < 0).length

    return {
      totalWithdrawals,
      totalReinvestments,
      totalNewLoans,
      totalRepayments,
      finalCumulativeCashFlow,
      avgMonthlyWithdrawal,
      avgMonthlyReinvestment,
      positiveCashFlowMonths,
      negativeCashFlowMonths,
      netCashFlow: totalNewLoans + totalReinvestments - totalWithdrawals - totalRepayments,
    }
  }, [chartData])

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Flow Analysis
          </CardTitle>
          <CardDescription>
            Track withdrawals, reinvestments, loan originations, and repayments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run a simulation to see cash flow analysis</p>
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
          <DollarSign className="h-5 w-5" />
          Cash Flow Analysis
        </CardTitle>
        <CardDescription>
          Monthly cash flows and cumulative analysis over {chartData.length} months
        </CardDescription>
        
        {/* Cash Flow Statistics — five tiles so Net Cash Flow visibly
            adds up (Loans + Reinvestments − Withdrawals − Repayments).
            Previously Total Repayments was computed but hidden, leaving
            the user unable to reconcile the Net value. */}
        {cashFlowStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Withdrawals</div>
              <div className="text-lg font-semibold text-red-600">
                -${cashFlowStats.totalWithdrawals.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Reinvestments</div>
              <div className="text-lg font-semibold text-green-600">
                +${cashFlowStats.totalReinvestments.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Loans</div>
              <div className="text-lg font-semibold text-blue-600">
                +${cashFlowStats.totalNewLoans.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Repayments</div>
              <div className="text-lg font-semibold text-red-600">
                -${cashFlowStats.totalRepayments.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground" title="Loans + Reinvestments − Withdrawals − Repayments">Net Cash Flow</div>
              <div className={`text-lg font-semibold ${cashFlowStats.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cashFlowStats.netCashFlow >= 0 ? '+' : ''}${cashFlowStats.netCashFlow.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Averages */}
        {cashFlowStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Avg Monthly Withdrawal</div>
              <div className="text-sm font-medium">
                ${cashFlowStats.avgMonthlyWithdrawal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Avg Monthly Reinvestment</div>
              <div className="text-sm font-medium">
                ${cashFlowStats.avgMonthlyReinvestment.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Positive Months</div>
              <div className="text-sm font-medium text-green-600">
                {cashFlowStats.positiveCashFlowMonths}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Negative Months</div>
              <div
                className={`text-sm font-medium ${cashFlowStats.negativeCashFlowMonths > 0 ? 'text-red-600' : 'text-muted-foreground'}`}
              >
                {cashFlowStats.negativeCashFlowMonths}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis dataKey="month" {...monthAxisProps} />
              
              <YAxis 
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
              />
              
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                  name,
                ]}
                labelFormatter={(month: number) => formatMonthAsDateFull(month)}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                }}
              />

              <Legend />

              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />

              {/* Cash Flow Bars (names are user-facing — also drive the
                  legend, so they include the Money In / Out hint that
                  used to live in a separate custom legend below). */}
              <Bar
                dataKey="withdrawals"
                fill="#ef4444"
                name="Withdrawals (Money Out)"
                radius={[2, 2, 0, 0]}
              />

              <Bar
                dataKey="repayments"
                fill="#f97316"
                name="Loan Repayments (Money Out)"
                radius={[2, 2, 0, 0]}
              />

              <Bar
                dataKey="newLoans"
                fill="#3b82f6"
                name="New Loans (Money In)"
                radius={[0, 0, 2, 2]}
              />

              <Bar
                dataKey="reinvestments"
                fill="#22c55e"
                name="Reinvestments (Money In)"
                radius={[0, 0, 2, 2]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Cash Flow Insights (legend is rendered by recharts above
            with the same labels we used to duplicate here) */}
        <div className="mt-4 space-y-2">
          {cashFlowStats && (
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Cash Flow Pattern:</strong> {' '}
                {cashFlowStats.positiveCashFlowMonths > cashFlowStats.negativeCashFlowMonths 
                  ? "Predominantly positive cash flow - building wealth through loans and reinvestments"
                  : "Mixed cash flow pattern - balancing withdrawals with loan proceeds"
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
