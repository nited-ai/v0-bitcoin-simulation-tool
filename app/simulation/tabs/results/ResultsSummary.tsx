"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSimulation } from "../../context/SimulationContext"
import { useResultsAnalysis } from "../../hooks/useResultsAnalysis"
import { TrendingUp, TrendingDown, AlertTriangle, Shield, DollarSign, Bitcoin } from "lucide-react"

/**
 * Enhanced Results Summary Component
 *
 * Displays comprehensive simulation metrics in a grid of summary cards.
 * Uses the useResultsAnalysis hook to provide detailed insights and visual indicators.
 */
export function ResultsSummary() {
  const { results, params } = useSimulation()
  const analysis = useResultsAnalysis(results, params)

  // Show placeholder if no results
  if (!analysis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "Portfolio Value", icon: DollarSign, value: "Run Simulation" },
          { title: "Net Worth", icon: TrendingUp, value: "Run Simulation" },
          { title: "Total Return", icon: TrendingUp, value: "Run Simulation" },
          { title: "Risk Level", icon: Shield, value: "Run Simulation" },
          { title: "Performance", icon: TrendingUp, value: "Run Simulation" },
        ].map((item, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-muted-foreground">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Helper function to get color based on value
  const getValueColor = (value: number, isPositive: boolean = true) => {
    if (value === 0) return "text-muted-foreground"
    return isPositive
      ? (value > 0 ? "text-green-600" : "text-red-600")
      : (value > 0 ? "text-red-600" : "text-green-600")
  }

  // Helper function to get risk color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return "text-green-600"
      case 'medium': return "text-yellow-600"
      case 'high': return "text-orange-600"
      case 'extreme': return "text-red-600"
      default: return "text-muted-foreground"
    }
  }

  // Helper function to get performance color
  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return "text-green-600"
      case 'good': return "text-blue-600"
      case 'fair': return "text-yellow-600"
      case 'poor': return "text-red-600"
      default: return "text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Final Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(analysis.finalPortfolioValue).toLocaleString("en-US")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total BTC value at end
            </p>
          </CardContent>
        </Card>

        {/* Net Worth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getValueColor(analysis.finalNetWorth)}`}>
              ${Math.round(analysis.finalNetWorth).toLocaleString("en-US")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Portfolio value minus debt
            </p>
          </CardContent>
        </Card>

        {/* Total Return */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {analysis.totalReturn >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Total Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getValueColor(analysis.totalReturn)}`}>
              {analysis.totalReturnPercent >= 0 ? '+' : ''}
              {analysis.totalReturnPercent.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.annualizedReturn.toFixed(1)}% annualized
            </p>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${getRiskColor(analysis.riskLevel)} border-current`}
              >
                {analysis.riskLevel.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Score: {analysis.riskScore}/100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* BTC Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bitcoin className="h-4 w-4" />
              BTC Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${getValueColor(analysis.btcGrowth)}`}>
              {analysis.btcGrowth >= 0 ? '+' : ''}
              {analysis.btcGrowth.toFixed(4)} BTC
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.btcGrowthPercent.toFixed(1)}% increase
            </p>
          </CardContent>
        </Card>

        {/* Total BTC Purchased */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bitcoin className="h-4 w-4" />
              BTC Purchased
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {(() => {
                const totalBtcPurchased = results.reduce(
                  (sum: number, month: any) => sum + (month.btcPurchased || 0),
                  0
                )
                return totalBtcPurchased.toFixed(4)
              })()} BTC
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From loan proceeds
            </p>
          </CardContent>
        </Card>

        {/* Total Savings/Withdrawals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Savings/Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${(() => {
              const totalSavings = results.reduce(
                (sum: number, month: any) => sum + (month.monthlySavingsApplied || 0),
                0
              )
              return getValueColor(totalSavings)
            })()}`}>
              {(() => {
                const totalSavings = results.reduce(
                  (sum: number, month: any) => sum + (month.monthlySavingsApplied || 0),
                  0
                )
                return `${totalSavings >= 0 ? '+' : ''}$${Math.round(Math.abs(totalSavings)).toLocaleString("en-US")}`
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net monthly flow
            </p>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Max Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              -{analysis.maxDrawdownPercent.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${Math.round(analysis.maxDrawdown).toLocaleString("en-US")}
            </p>
          </CardContent>
        </Card>

        {/* Liquidations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Liquidations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${analysis.liquidationCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {analysis.liquidationCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.firstLiquidationMonth
                ? `First: Month ${analysis.firstLiquidationMonth}`
                : 'None occurred'
              }
            </p>
          </CardContent>
        </Card>

        {/* Total Interest Accrued (Dynamic LTV mode only) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Interest Accrued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">
              {(() => {
                const totalInterest = results.reduce(
                  (sum: number, month: any) => sum + (month.interestAccrued || 0),
                  0
                )
                return totalInterest > 0
                  ? `$${Math.round(totalInterest).toLocaleString("en-US")}`
                  : 'N/A'
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(() => {
                const hasInterest = results.some((m: any) => m.interestAccrued && m.interestAccrued > 0)
                return hasInterest ? 'Dynamic LTV mode' : 'Fixed Term mode'
              })()}
            </p>
          </CardContent>
        </Card>

        {/* Loan Rollover Count (Fixed Term mode only) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Loan Rollovers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {(() => {
                const rolloverCount = results.filter(
                  (month: any) => month.loanRollover !== undefined
                ).length
                return rolloverCount > 0 ? rolloverCount : 'N/A'
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(() => {
                const hasRollovers = results.some((m: any) => m.loanRollover !== undefined)
                return hasRollovers ? 'Fixed Term mode' : 'Dynamic LTV mode'
              })()}
            </p>
          </CardContent>
        </Card>

        {/* Max LTV */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Max LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${analysis.maxLTV > 80 ? 'text-red-600' : analysis.maxLTV > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
              {analysis.maxLTV.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {analysis.averageLTV.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* Performance Rating */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${getPerformanceColor(analysis.performanceRating)} border-current`}
              >
                {analysis.performanceRating.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Score: {analysis.performanceScore}/100
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
