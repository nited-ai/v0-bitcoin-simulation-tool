import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Bitcoin, DollarSign, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { MonthlyResult } from '../../../types/simulation'

interface PortfolioSummary {
  finalBtcAmount: number
  finalBtcValue: number
  totalDebt: number
  netPortfolioValue: number
  buyHoldValue: number
  outperformance: number
  outperformancePercent: number
  activeLoansCount: number
  totalRemainingDebt: number
  hasActiveLoans: boolean
}

export function FinalPortfolioSummary() {
  const { results, params } = useSimulation()

  // Only render for rolling loan strategy
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }

  const summary = useMemo((): PortfolioSummary => {
    if (results.length === 0) {
      return {
        finalBtcAmount: 0,
        finalBtcValue: 0,
        totalDebt: 0,
        netPortfolioValue: 0,
        buyHoldValue: 0,
        outperformance: 0,
        outperformancePercent: 0,
        activeLoansCount: 0,
        totalRemainingDebt: 0,
        hasActiveLoans: false
      }
    }

    const initialBtc = params.initialBtcAmount || 1.0
    const finalResult = results[results.length - 1]
    const initialResult = results[0]

    // Add defensive checks for undefined values
    if (!finalResult || !initialResult) {
      console.warn('FinalPortfolioSummary: Missing final or initial result data')
      return {
        finalBtcAmount: 0,
        finalBtcValue: 0,
        totalDebt: 0,
        netPortfolioValue: 0,
        buyHoldValue: 0,
        outperformance: 0,
        outperformancePercent: 0,
        activeLoansCount: 0,
        totalRemainingDebt: 0,
        hasActiveLoans: false
      }
    }

    // Final portfolio metrics with defensive checks
    const finalBtcAmount = finalResult.currentBtcAmount ?? 0 // Use nullish coalescing for safety
    const finalBtcValue = finalResult.collateralValue ?? 0
    const totalDebt = finalResult.totalDebt ?? 0
    const netPortfolioValue = finalBtcValue - totalDebt

    // Buy and hold comparison with defensive checks
    const finalBtcPrice = finalResult.btcPrice ?? 0
    const buyHoldValue = initialBtc * finalBtcPrice
    const outperformance = netPortfolioValue - buyHoldValue
    const outperformancePercent = buyHoldValue > 0 ? (outperformance / buyHoldValue) * 100 : 0

    // Active loans status - app/simulation types don't have activeLoans array
    // Use loanCount and totalDebt as approximation with defensive checks
    const activeLoansCount = finalResult.loanCount ?? 0
    const totalRemainingDebt = totalDebt // Total debt represents remaining debt
    const hasActiveLoans = activeLoansCount > 0

    return {
      finalBtcAmount,
      finalBtcValue,
      totalDebt,
      netPortfolioValue,
      buyHoldValue,
      outperformance,
      outperformancePercent,
      activeLoansCount,
      totalRemainingDebt,
      hasActiveLoans
    }
  }, [results, params.initialBtcAmount])

  const getPerformanceIcon = (outperformance: number) => {
    return outperformance >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getPerformanceColor = (outperformance: number) => {
    return outperformance >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Final Portfolio Summary</CardTitle>
          <CardDescription>Strategy vs Buy & Hold comparison</CardDescription>
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
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Final Portfolio Summary
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Comprehensive comparison of your rolling loan strategy performance versus simple buy-and-hold</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Strategy vs Buy & Hold comparison</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Portfolio Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bitcoin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Final BTC Amount</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total Bitcoin accumulated through your rolling loan strategy at the end of the simulation</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xl font-bold">{(summary.finalBtcAmount ?? 0).toFixed(3)} BTC</div>
              <div className="text-xs text-muted-foreground">
                ${(summary.finalBtcValue ?? 0).toLocaleString()}
              </div>
            </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Debt</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Outstanding loan debt at the end of the simulation. This represents money you still owe to lenders.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-xl font-bold">
              <span className={summary.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}>
                ${(summary.totalDebt ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {summary.totalDebt > 0 ? 'Outstanding debt' : 'No debt'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Net Portfolio Value</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your true net worth: total Bitcoin value minus outstanding debt. This is what you would have after paying off all loans.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-xl font-bold">${(summary.netPortfolioValue ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              After debt deduction
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getPerformanceIcon(summary.outperformance)}
              <span className="text-sm font-medium text-muted-foreground">Buy & Hold Comparison</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How much better (or worse) your rolling loan strategy performed compared to simply buying and holding Bitcoin</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className={`text-xl font-bold ${getPerformanceColor(summary.outperformance)}`}>
              {(summary.outperformance ?? 0) >= 0 ? '+' : ''}${(summary.outperformance ?? 0).toLocaleString()}
            </div>
            <div className={`text-xs ${getPerformanceColor(summary.outperformance)}`}>
              {(summary.outperformancePercent ?? 0) >= 0 ? '+' : ''}{(summary.outperformancePercent ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Buy & Hold Comparison Details */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-3">Strategy Performance vs Buy & Hold</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Rolling Loan Strategy:</span>
              <div className="font-medium">${(summary.netPortfolioValue ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Buy & Hold Strategy:</span>
              <div className="font-medium">${(summary.buyHoldValue ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className={`flex items-center gap-2 ${getPerformanceColor(summary.outperformance)}`}>
              {getPerformanceIcon(summary.outperformance)}
              <span className="font-medium">
                {(summary.outperformance ?? 0) >= 0 ? 'Outperformed' : 'Underperformed'} by{' '}
                ${Math.abs(summary.outperformance ?? 0).toLocaleString()} ({Math.abs(summary.outperformancePercent ?? 0).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Active Loans Status */}
        <Alert>
          <div className="flex items-center gap-2">
            {summary.hasActiveLoans ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {summary.hasActiveLoans ? (
                <>
                  <strong>Simulation ended with {summary.activeLoansCount} active loan{summary.activeLoansCount !== 1 ? 's' : ''}</strong>
                  {' '}totaling ${(summary.totalRemainingDebt ?? 0).toLocaleString()} remaining debt.
                  {' '}These loans would need to be repaid or rolled over in practice.
                </>
              ) : (
                <>
                  <strong>Simulation ended with no active loans.</strong>
                  {' '}All loans were successfully repaid during the simulation period.
                </>
              )}
            </AlertDescription>
          </div>
        </Alert>

        {/* Performance Summary Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={summary.outperformance >= 0 ? 'default' : 'destructive'}
            className="text-sm px-4 py-2"
          >
            {summary.outperformance >= 0 ? '🎉 Strategy Successful' : '⚠️ Strategy Underperformed'}
          </Badge>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}
