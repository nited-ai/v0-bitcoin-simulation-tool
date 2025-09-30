import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Bitcoin, Percent, HelpCircle } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { MonthlyResult, MonthlyEvent } from '../../../types/simulation'

interface LoanMetrics {
  totalLoansCount: number
  totalInterestPaid: number
  btcAccumulated: number
  cashGenerated: number
  averageLtv: number
  maxLtv: number
  liquidationCount: number
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Extreme'
  totalLoanVolume: number
  averageLoanSize: number
}

export function RollingLoanMetricsCard() {
  const { results, params } = useSimulation()

  // Only render for rolling loan strategy
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }

  const metrics = useMemo((): LoanMetrics => {
    if (results.length === 0) {
      return {
        totalLoansCount: 0,
        totalInterestPaid: 0,
        btcAccumulated: 0,
        cashGenerated: 0,
        averageLtv: 0,
        maxLtv: 0,
        liquidationCount: 0,
        riskLevel: 'Low',
        totalLoanVolume: 0,
        averageLoanSize: 0
      }
    }

    const initialBtc = params.initialBtcAmount || 1.0
    const finalResult = results[results.length - 1]

    // Count loans and calculate metrics using available data from app/simulation type
    let totalLoansCount = 0
    let totalLoanVolume = 0
    let totalInterestPaid = 0
    let liquidationCount = 0
    let maxLoanCount = 0

    results.forEach((result: MonthlyResult, index: number) => {
      const previousResult = index > 0 ? results[index - 1] : null

      // Track maximum concurrent loans
      maxLoanCount = Math.max(maxLoanCount, result.loanCount)

      // Count new loans taken (when newLoanPrincipal > 0)
      if (result.newLoanPrincipal > 0) {
        totalLoansCount++
        totalLoanVolume += result.newLoanPrincipal
      }

      // Calculate interest paid from repayments
      if (result.repaymentsDue > 0) {
        // Estimate interest as the difference between repayment and average loan principal
        // This is an approximation since we don't have access to individual loan details
        const averageLoanPrincipal = totalLoanVolume > 0 ? totalLoanVolume / Math.max(1, totalLoansCount) : 0
        const estimatedInterest = Math.max(0, result.repaymentsDue - averageLoanPrincipal)
        totalInterestPaid += estimatedInterest
      }

      // Count liquidations from events
      result.events.forEach((event: MonthlyEvent) => {
        if (event.type === 'liquidated') {
          liquidationCount++
        }
      })
    })

    // Calculate BTC accumulated or cash generated using app/simulation type properties
    const btcAccumulated = Math.max(0, finalResult.currentBtcAmount - initialBtc)
    const cashGenerated = results.reduce((sum, result) => sum + result.withdrawalAmount, 0)

    // Calculate average LTV using debt-to-collateral ratio (since ltv property doesn't exist)
    const ltvValues = results
      .filter(r => r.collateralValue > 0 && r.totalDebt > 0)
      .map(r => (r.totalDebt / r.collateralValue) * 100)
    const averageLtv = ltvValues.length > 0 ? ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length : 0

    // Find max LTV from highestLtv property (this exists in app/simulation type)
    const maxLtv = Math.max(...results.map(r => r.highestLtv || 0))

    // Determine risk level based on max LTV
    let riskLevel: LoanMetrics['riskLevel'] = 'Low'
    if (maxLtv >= 80) riskLevel = 'Extreme'
    else if (maxLtv >= 65) riskLevel = 'High'
    else if (maxLtv >= 45) riskLevel = 'Moderate'

    const averageLoanSize = totalLoansCount > 0 ? totalLoanVolume / totalLoansCount : 0

    return {
      totalLoansCount,
      totalInterestPaid,
      btcAccumulated,
      cashGenerated,
      averageLtv,
      maxLtv,
      liquidationCount,
      riskLevel,
      totalLoanVolume,
      averageLoanSize
    }
  }, [results, params.initialBtcAmount])

  const getRiskBadgeVariant = (riskLevel: LoanMetrics['riskLevel']) => {
    switch (riskLevel) {
      case 'Low':
        return 'default'
      case 'Moderate':
        return 'secondary'
      case 'High':
        return 'destructive'
      case 'Extreme':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getRiskIcon = (riskLevel: LoanMetrics['riskLevel']) => {
    switch (riskLevel) {
      case 'Low':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'Moderate':
        return <TrendingUp className="h-4 w-4 text-yellow-600" />
      case 'High':
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      case 'Extreme':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  // Always show metrics, even with empty results (will show zeros)

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Rolling Loan Metrics
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-semibold mb-2">Rolling Loan Strategy Metrics</p>
                  <p className="text-sm">Comprehensive analysis of loan performance, interest costs, BTC accumulation, and risk metrics for your rolling loan strategy.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Strategy performance summary</CardDescription>
        </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {/* Total Loans Taken */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Loans Taken</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Total Loans Taken</p>
                    <p className="text-sm">Number of individual loans taken throughout the simulation. Each time newLoanPrincipal &gt; 0, a new loan is counted.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold">{metrics.totalLoansCount}</div>
            <div className="text-xs text-muted-foreground">
              Avg: ${metrics.averageLoanSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Total Interest Paid */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Interest Paid</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Total Interest Paid</p>
                    <p className="text-sm">Estimated total interest and fees paid on all loans. Calculated as the difference between repayments and estimated principal amounts.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold">${metrics.totalInterestPaid.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Volume: ${metrics.totalLoanVolume.toLocaleString()}
            </div>
          </div>

          {/* BTC Accumulated or Cash Generated */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {params.btcAccumulation ? 'BTC Accumulated' : 'Cash Generated'}
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">{params.btcAccumulation ? 'BTC Accumulated' : 'Cash Generated'}</p>
                    <p className="text-sm">
                      {params.btcAccumulation
                        ? 'Additional BTC acquired beyond initial amount through loan proceeds reinvestment.'
                        : 'Total cash withdrawn from loan proceeds for personal use or other investments.'
                      }
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold">
              {params.btcAccumulation ? (
                `${metrics.btcAccumulated.toFixed(3)} BTC`
              ) : (
                `$${metrics.cashGenerated.toLocaleString()}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {params.btcAccumulation ? 'Additional BTC' : 'Total withdrawn'}
            </div>
          </div>

          {/* Average LTV */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Average LTV</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Average LTV</p>
                    <p className="text-sm">Average Loan-to-Value ratio calculated as (totalDebt / collateralValue) × 100. Shows typical leverage throughout the simulation.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold">{metrics.averageLtv.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              Max: {metrics.maxLtv.toFixed(1)}%
            </div>
          </div>

          {/* Risk Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getRiskIcon(metrics.riskLevel)}
              <span className="text-sm font-medium text-muted-foreground">Risk Level</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Risk Level</p>
                    <p className="text-sm mb-2">Risk assessment based on maximum LTV reached:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Low: &lt;45% LTV</li>
                      <li>• Moderate: 45-64% LTV</li>
                      <li>• High: 65-79% LTV</li>
                      <li>• Extreme: ≥80% LTV</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getRiskBadgeVariant(metrics.riskLevel)}>
                {metrics.riskLevel}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Based on max LTV
            </div>
          </div>

          {/* Liquidations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Liquidations</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Liquidations</p>
                    <p className="text-sm">Number of loans that were liquidated due to collateral value falling below liquidation threshold. Detected from monthly events.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold">
              <span className={metrics.liquidationCount > 0 ? 'text-red-600' : 'text-green-600'}>
                {metrics.liquidationCount}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.liquidationCount === 0 ? 'No liquidations' : 'Loans liquidated'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}
