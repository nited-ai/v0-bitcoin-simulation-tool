"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { useRollingLoanCalculations } from "../../hooks/useRollingLoanCalculations"
import {
  computeHodlBaseline,
  compareVsHodl,
} from "@/src/modules/strategies/services/HodlBaselineService"

/**
 * HeadlineComparison
 *
 * The "did the strategy beat HODL?" headline card that lives at the very
 * top of the Results page. Answers the most important question for any
 * leveraged BTC strategy in one glance:
 *
 *   +0.44 BTC vs HODL  (+4.2%)
 *
 * Reads the strategy result from `useRollingLoanCalculations` (the same
 * source of truth the DetailedResultsTable uses), and the baseline from
 * `HodlBaselineService` — a pure helper that applies the same monthly
 * cash flow to a no-loan, no-debt BTC stack.
 */
export function HeadlineComparison() {
  const { params } = useSimulation()
  const { monthlySnapshots, getBtcPriceForMonth } = useRollingLoanCalculations()

  const comparison = useMemo(() => {
    if (!params || !monthlySnapshots || monthlySnapshots.length === 0) return null

    // Strategy's final state — last monthly snapshot
    const last = monthlySnapshots[monthlySnapshots.length - 1]
    const finalMonth = last.month
    const finalPrice = getBtcPriceForMonth(finalMonth)
    const strategyTotalBtc = last.totalBtc
    const strategyTotalDebt = last.totalDebt

    // HODL baseline using the same monthly flow + price trajectory
    const hodl = computeHodlBaseline({
      initialBtcAmount: params.initialBtcAmount,
      monthlyWithdrawalAmount: params.monthlyWithdrawalAmount || 0,
      annualSavingsIncrease: (params as any).annualSavingsIncrease,
      simulationMonths: finalMonth,
      priceForMonth: getBtcPriceForMonth,
    })

    return {
      ...compareVsHodl(strategyTotalBtc, strategyTotalDebt, finalPrice, hodl.finalBtc),
      finalPrice,
      simulationMonths: finalMonth,
      hodlMonthExhausted: hodl.monthExhausted,
    }
  }, [params, monthlySnapshots, getBtcPriceForMonth])

  if (!comparison) return null

  const isNeutral = Math.abs(comparison.deltaBtc) < 0.0001
  const Icon = isNeutral ? Minus : comparison.outperformed ? TrendingUp : TrendingDown
  const accent = isNeutral
    ? "text-muted-foreground border-muted"
    : comparison.outperformed
      ? "text-green-600 border-green-600/40"
      : "text-red-600 border-red-600/40"
  const bgAccent = isNeutral
    ? ""
    : comparison.outperformed
      ? "bg-green-50/50 dark:bg-green-950/20"
      : "bg-red-50/50 dark:bg-red-950/20"
  const verdict = isNeutral
    ? "matched HODL"
    : comparison.outperformed
      ? "more than just holding"
      : "less than just holding"
  const verdictSubtle = isNeutral
    ? "no advantage"
    : comparison.outperformed
      ? "outperformance"
      : "underperformance"

  const formatBtc = (v: number) =>
    `${v >= 0 ? "+" : ""}${v.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })} BTC`
  const formatPercent = (v: number) =>
    `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`

  return (
    <Card className={`border-2 ${accent} ${bgAccent}`}>
      <CardContent className="py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${accent}`} />
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Strategy vs. HODL Baseline
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            after {comparison.simulationMonths} months
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <div className={`text-4xl font-bold ${accent}`}>
              {formatBtc(comparison.deltaBtc)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{verdict}</div>
          </div>
          <div className="md:text-right">
            <div className={`text-4xl font-bold ${accent}`}>
              {formatPercent(comparison.deltaPercent)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{verdictSubtle}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-current/10 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {comparison.strategyNetBtc.toFixed(4)} BTC
            </span>{" "}
            strategy net (post-payoff)
          </span>
          <span>
            <span className="font-medium text-foreground">
              {comparison.hodlBtc.toFixed(4)} BTC
            </span>{" "}
            HODL baseline
          </span>
          {comparison.hodlMonthExhausted > 0 && (
            <span className="text-orange-600">
              ⚠ HODL would have exhausted the stack at month{" "}
              {comparison.hodlMonthExhausted}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
