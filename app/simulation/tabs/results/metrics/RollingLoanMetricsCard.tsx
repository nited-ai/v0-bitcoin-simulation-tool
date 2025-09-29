import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Bitcoin, Percent } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { MonthlyResult } from '../../../../types/simulation'

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
    
    // Count unique loans taken
    const allLoanIds = new Set<number>()
    let totalLoanVolume = 0
    let totalInterestPaid = 0
    let liquidationCount = 0
    
    results.forEach((result: MonthlyResult) => {
      // Count new loans
      result.activeLoans.forEach(loan => {
        if (loan.month === result.month) {
          allLoanIds.add(loan.id)
          totalLoanVolume += loan.principal
        }
      })
      
      // Count interest paid (repayments - principal)
      if (result.repaymentDue > 0) {
        // Find the original principal for this repayment
        const previousResults = results.slice(0, results.indexOf(result))
        let originalPrincipal = 0
        
        for (let i = previousResults.length - 1; i >= 0; i--) {
          const prevResult = previousResults[i]
          const loanThatMatured = prevResult.activeLoans.find(loan => 
            loan.maturityMonth === result.month
          )
          if (loanThatMatured) {
            originalPrincipal = loanThatMatured.principal
            break
          }
        }
        
        if (originalPrincipal > 0) {
          totalInterestPaid += Math.max(0, result.repaymentDue - originalPrincipal)
        }
      }
      
      // Count liquidations
      result.events.forEach(event => {
        if (event.type === 'liquidated') {
          liquidationCount++
        }
      })
    })

    // Calculate BTC accumulated or cash generated
    const btcAccumulated = Math.max(0, finalResult.totalBtcAmount - initialBtc)
    const cashGenerated = results.reduce((sum, result) => sum + result.principalForNeeds, 0)

    // Calculate average LTV
    const ltvValues = results.filter(r => r.ltv > 0).map(r => r.ltv)
    const averageLtv = ltvValues.length > 0 ? ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length : 0

    // Find max LTV
    const maxLtv = Math.max(...results.map(r => r.highestLtv || r.ltv))

    // Determine risk level based on max LTV
    let riskLevel: LoanMetrics['riskLevel'] = 'Low'
    if (maxLtv >= 80) riskLevel = 'Extreme'
    else if (maxLtv >= 65) riskLevel = 'High'
    else if (maxLtv >= 45) riskLevel = 'Moderate'

    const averageLoanSize = allLoanIds.size > 0 ? totalLoanVolume / allLoanIds.size : 0

    return {
      totalLoansCount: allLoanIds.size,
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

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rolling Loan Metrics</CardTitle>
          <CardDescription>Strategy performance summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rolling Loan Metrics</CardTitle>
        <CardDescription>Strategy performance summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {/* Total Loans Taken */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Loans Taken</span>
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
  )
}
