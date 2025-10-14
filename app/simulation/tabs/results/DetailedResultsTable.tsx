"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSimulation } from "../../context/SimulationContext"
import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"
import type { StrategyExecutionParams } from "@/src/modules/strategies/types"

import { useRollingLoanCalculations } from "../../hooks/useRollingLoanCalculations"

/**
 * DetailedResultsTable
 *
 * Renders the comprehensive rollover table (with expandable monthly rows)
 * identical to the Debug tab's "Results Table", but shown inside the Results tab.
 * Uses centralized helpers for Locked BTC and Net BTC calculations.
 */
export function DetailedResultsTable() {
  const { params, priceProjection, results } = useSimulation()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const toggleExpanded = (m: number) => setExpanded(prev => ({ ...prev, [m]: !prev[m] }))

  const { rolloverResults, monthlyResults, isMonthly } = useRollingLoanCalculations()

  const hasInterest = useMemo(() =>
    rolloverResults.some((r: any) => (r.interest ?? 0) > 0) || monthlyResults.some((m: any) => (m.interest ?? 0) > 0)
  , [rolloverResults, monthlyResults])
  const hasFees = useMemo(() =>
    rolloverResults.some((r: any) => (r.fees ?? 0) > 0) || monthlyResults.some((m: any) => (m.fees ?? 0) > 0)
  , [rolloverResults, monthlyResults])
  const showSavings = (params?.monthlyWithdrawalAmount || 0) !== 0


  if (!params || rolloverResults.length === 0) return null

  // Formatter helpers
  const formatUsd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const formatBtc = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

  const pts = priceProjection?.projectionPoints || []
  // Column width and alignment classes (content-based sizing)
  const col = {
    month: 'min-w-fit',
    btc: 'min-w-fit text-right',
    usd: 'min-w-fit text-right',
    percent: 'min-w-fit text-right',
    combined: 'min-w-fit text-right',
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Table</CardTitle>
        <CardDescription>
          Summary per (Start/Rollover) with formulas in tooltips; expandable monthly rows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className={`py-2 pr-4 text-left ${col.month}`}>Month</th>
                <th className={`py-2 pr-4 whitespace-nowrap ${col.btc}`}>BTC<br></br>(before loan)</th>
                <th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>BTC<br></br>Price</th>
                <th className={`py-2 pr-4 ${col.usd}`}>Portfolio Value<br></br>(before loan)</th>
                <th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>Loan<br></br>Principal</th>
                {hasFees && (<th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>Fees</th>)}
                {hasInterest && (<th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>Interest</th>)}
                <th className={`py-2 pr-4 leading-snug ${col.combined}`}>Total&nbsp;Debt/
                  <br/>Locked&nbsp;BTC</th>

                <th className={`py-2 pr-4 whitespace-nowrap ${col.percent}`}>TopUp<br></br>LTV</th>
                {showSavings && (<th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>Savings/<br></br>Withdrawal</th>)}
                <th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>Excess<br></br>Proceeds</th>
                <th className={`py-2 pr-4 leading-snug ${col.combined}`}>Purchased/
                  <br/>Total BTC</th>
                <th className={`py-2 pr-4 ${col.usd}`}>Portfolio Value<br></br>(after&nbsp;purchase)</th>
                <th className={`py-2 pr-4 whitespace-nowrap ${col.btc}`}>Net BTC<br></br>(after payoff)</th>
              </tr>
            </thead>
            <tbody>
              {rolloverResults.map((row, idx) => {
                const rawIndex = isMonthly ? row.month : row.month * 30
                const idxClamped = Math.max(0, Math.min(rawIndex, Math.max(pts.length - 1, 0)))
                const pricePoint = row.month === 0
                  ? { price: params.initialBtcPrice, timestamp: pts[0]?.timestamp ?? Date.now() }
                  : pts[idxClamped]
                const ts = pricePoint?.timestamp
                const monthLabel = ts
                  ? new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : `Month ${row.month}`

                const btcPrice = row.btcPrice
                const totalBtcBefore = row.totalBtcBefore
                const totalBtcAfter = row.totalBtcAfter
                const collateralBefore = totalBtcBefore * btcPrice
                const collateralAfter = totalBtcAfter * btcPrice
                const debt = row.loanRepayment
                const platformMaxLtv = (params.riskManagement as any)?.initialLtv ?? (params as any)?.platformMaxLtv ?? 50
                // TopUp LTV uses portfolio value after purchase (collateralAfter)
                const effectiveCollateral = collateralAfter * (platformMaxLtv / 100)
                const topUpLtv = effectiveCollateral > 0 ? (debt / effectiveCollateral) * 100 : 0
                const targetLtv = params.riskManagement?.targetLtv ?? 50
                const lockedBtc = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(debt, btcPrice, targetLtv)
                // Immediate LTV: Total Debt / (Locked BTC × Current Price)

                const netBtc = centralizedLoanCalculationService.netBtcAfterPayoff(totalBtcAfter, debt, btcPrice)

                // Sum of monthly USD flows since previous rollover up to and INCLUDING this rollover month
                const prevRolloverMonth = idx === 0 ? 0 : rolloverResults[idx - 1].month
                const sumSincePrev = (monthlyResults || [])
                  .filter(m => idx === 0 ? m.month === 0 : (m.month >= (prevRolloverMonth + 1) && m.month <= row.month))
                  .reduce((acc: number, m: any) => acc + m.usdFlow, 0)

                const adjustedExcessProceeds = (row.excessProceeds || 0) + (sumSincePrev || 0)
                const purchased = btcPrice > 0 ? (adjustedExcessProceeds > 0 ? adjustedExcessProceeds / btcPrice : 0) : 0

                // Tooltips
                const ttBtcBefore = `BTC_before_loan_n = ${formatBtc(totalBtcBefore)}`
                const ttPrice = isMonthly
                  ? `btcPrice_n = priceProjection[${row.month}] → ${formatUsd(btcPrice)}`
                  : `btcPrice_n = priceProjection[${row.month} × 30] → priceProjection[${row.month * 30}] → ${formatUsd(btcPrice)}`
                const ttCollBefore = `Collateral_before_n = ${formatBtc(totalBtcBefore)} × ${formatUsd(btcPrice)} = ${formatUsd(collateralBefore)}`
                const ttPrincipal = `Loan_Principal_n = ${formatUsd(row.loanPrincipal)}`
                const ttExcess = `Excess_n = (Loan_Principal_n − Previous_Debt) + Σ monthly flow = (${formatUsd(row.loanPrincipal)} − ${formatUsd(row.oldLoanRepayment || 0)}) + ${formatUsd(sumSincePrev)} = ${formatUsd(adjustedExcessProceeds)}`

                const ttDelta = `ΔBTC_n = Excess_n / price_n = ${formatUsd(adjustedExcessProceeds)} / ${formatUsd(btcPrice)} = ${formatBtc(purchased)}`
                const ttBtcAfter = `BTC_after_loan_n = ${formatBtc(totalBtcBefore)} + ${formatBtc(purchased)} = ${formatBtc(totalBtcAfter)}`
                const ttCollAfter = `Collateral_after_n = ${formatBtc(totalBtcAfter)} × ${formatUsd(btcPrice)} = ${formatUsd(collateralAfter)}`
                const ttSavings = `Σ monthly flow since last rollover (incl. this month) = ${formatUsd(sumSincePrev)}`
                const ttDebt = `Total_Debt_n = Principal + Interest + Fees = ${formatUsd(debt)}`
                const ttLocked = `Locked_BTC_n = (Total_Debt_n / (targetLtv / 100)) / price_n = (${formatUsd(debt)} / (${targetLtv}% / 100)) / ${formatUsd(btcPrice)} = ${formatBtc(lockedBtc)}`
                const ttNet = `Net_BTC_n = BTC_after_loan_n − (Total_Debt_n / price_n) = ${formatBtc(totalBtcAfter)} − (${formatUsd(debt)} / ${formatUsd(btcPrice)}) = ${formatBtc(netBtc)}`

                // Monthly rows of this period (after this rollover until before next)
                const nextRolloverMonth = rolloverResults[idx + 1]?.month
                const periodStart = row.month === 0 ? 0 : row.month + 1
                const periodEnd = nextRolloverMonth ? nextRolloverMonth - 1 : (params.simulationMonths || 0)
                const monthlyRows = (monthlyResults || []).filter(m => m.month >= periodStart && m.month <= periodEnd)

                const hasMonthly = monthlyRows.length > 0
                const isExpanded = !!expanded[row.month]

                // DEV: Deep comparison for a specific month (e.g., 120 ~ Sep 2035)
                if (process.env.NODE_ENV !== 'production' && row.month === 120) {
                  const ctx = Array.isArray(results) && results.length > 120 ? results[120] : undefined
                  console.groupCollapsed(`🧮 [DetailedResultsTable] month=${row.month}`)
                  console.log('table computed:', { price: btcPrice, totalDebt: debt, totalBtc: totalBtcAfter, lockedBtc, netBtc })
                  console.log('context results[120]:', ctx)
                  if (ctx) {
                    const ctxNet = centralizedLoanCalculationService.netBtcAfterPayoff((ctx as any).totalBtcAmount ?? ctx.currentBtcAmount, ctx.totalDebt, btcPrice)
                    console.log('context derived:', {
                      price: btcPrice,
                      totalDebt: ctx.totalDebt,
                      totalBtc: (ctx as any).totalBtcAmount ?? ctx.currentBtcAmount,
                      lockedBtc: ctx.lockedBtc,
                      netBtc: ctxNet,
                    })
                  }
                  console.groupEnd()
                }

                return (
                  <React.Fragment key={`rollover-${row.month}`}>
                    <tr className="border-t">
                      <td className="py-2 pr-4">
                        {hasMonthly && (
                          <button onClick={() => toggleExpanded(row.month)} className="mr-2 text-xs text-blue-600">
                            {isExpanded ? '\u25bc' : '\u25b6'}
                          </button>
                        )}
                        {monthLabel}
                      </td>
                      <td className={`py-2 pr-4 ${col.btc}`} title={ttBtcBefore}>{formatBtc(totalBtcBefore)}</td>
                      <td className={`py-2 pr-4 ${col.usd}`} title={ttPrice}>{formatUsd(btcPrice)}</td>
                      <td className={`py-2 pr-4 ${col.usd}`} title={ttCollBefore}>{formatUsd(collateralBefore)}</td>
                      <td className={`py-2 pr-4 ${col.usd}`} title={ttPrincipal}>{formatUsd(row.loanPrincipal)}</td>
                      { hasFees ? (<td className={`py-2 pr-4 ${col.usd}`} title="Fees (origination)">{formatUsd(row.fees || 0)}</td>) : null }
                      { hasInterest ? (<td className={`py-2 pr-4 ${col.usd}`} title="Interest for this loan">{formatUsd(row.interest || 0)}</td>) : null }
                      <td className={`py-2 pr-4 ${col.combined}`}>
                        <div className="flex flex-col items-end space-y-0.5">
                          <span title={ttDebt}>{formatUsd(debt)}</span>
                          <span className="text-muted-foreground text-xs" title={ttLocked}>{formatBtc(lockedBtc)} BTC</span>
                        </div>
                      </td>

                      <td className={`py-2 pr-4 ${col.percent} ${topUpLtv <= 100 ? 'text-green-600' : (topUpLtv <= 110 ? 'text-yellow-600' : 'text-red-600')}`}
                        title={`TopUp LTV = Total Debt / (Portfolio After Purchase × Platform Max LTV) = ${formatUsd(debt)} / (${formatUsd(collateralAfter)} × ${platformMaxLtv}%) = ${topUpLtv.toFixed(1)}%`}>
                        {topUpLtv.toFixed(1)}%
                      </td>
                      { showSavings ? (
                        <td className={`py-2 pr-4 ${col.usd}`} title={ttSavings}>{formatUsd(sumSincePrev)}</td>
                      ) : null }
                      <td className={`py-2 pr-4 ${col.usd} ${adjustedExcessProceeds > 0 ? 'text-green-600' : adjustedExcessProceeds === 0 ? 'text-yellow-600' : 'text-red-600'}`} title={ttExcess}>{formatUsd(adjustedExcessProceeds)}</td>
                      <td className={`py-2 pr-4 ${col.combined}`}>
                        <div className="flex flex-col items-end space-y-0.5">
                          <span className={`${purchased > 0 ? 'text-green-600' : purchased === 0 ? 'text-yellow-600' : 'text-red-600'}`} title={ttDelta}>{purchased > 0 ? '+' : ''}{formatBtc(purchased)} BTC</span>
                          <span className="text-muted-foreground text-xs" title={ttBtcAfter}>{formatBtc(totalBtcAfter)} BTC</span>
                        </div>
                      </td>
                      <td className={`py-2 pr-4 ${col.usd}`} title={ttCollAfter}>{formatUsd(collateralAfter)}</td>
                      <td className={`py-2 pr-4 ${col.btc}`} title={ttNet}>{formatBtc(netBtc)}</td>
                    </tr>

                    {isExpanded && monthlyRows.map((m: any) => {
                      const mIdx = isMonthly ? m.month : Math.max(0, Math.min(m.month * 30, Math.max(pts.length - 1, 0)))
                      const mLabelTs = pts[mIdx]?.timestamp
                      const mLabel = mLabelTs
                        ? new Date(mLabelTs).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : `Month ${m.month}`
                      const mCollateralBefore = m.totalBtcBefore * m.btcPrice
                      const mCollateralAfter = m.totalBtcAfter * m.btcPrice
                      const flowTitle = m.usdFlow >= 0 ? 'Savings (buy BTC)' : 'Withdrawal (sell BTC)'

                      return (
                        <tr key={`monthly-${m.month}`} className="border-t text-muted-foreground">
                          <td className="py-2 pr-4 pl-6">{mLabel} (Monthly)</td>
                          <td className="py-2 pr-4" title={`BTC before monthly flow`}>{formatBtc(m.totalBtcBefore)}</td>
                          <td className="py-2 pr-4" title={isMonthly ? `btcPrice_n = priceProjection[${m.month}]` : `btcPrice_n = priceProjection[${m.month} × 30]`}>{formatUsd(m.btcPrice)}</td>
                          <td className="py-2 pr-4" title={`Portfolio Value before = BTC × Price`}>{formatUsd(mCollateralBefore)}</td>
                          <td className="py-2 pr-4" title="No loan this month">-</td>
                          {hasFees ? (<td className="py-2 pr-4" title="Fees this month">-</td>) : null}
                          {hasInterest ? (<td className="py-2 pr-4" title="Interest this month">-</td>) : null}
                          <td className="py-2 pr-4">
                            <div className="flex flex-col">
                              <span title="No debt this month">-</span>
                              <span className="text-muted-foreground" title="No locked collateral this month">-</span>
                            </div>
                          </td>

                          <td className={`py-2 pr-4 ${col.percent}`} title="No loan this month">-</td>
                          {showSavings ? (
                            <td className="py-2 pr-4" title={`${flowTitle}: ${formatUsd(m.usdFlow)}`}>{formatUsd(m.usdFlow)}</td>
                          ) : null}
                          <td className={`py-2 pr-4 text-yellow-600`} title="No excess proceeds this month">-</td>
                          <td className={`py-2 pr-4 ${col.combined}`}>
                            <div className="flex flex-col items-end space-y-0.5">
                              <span className={`${m.btcDelta > 0 ? 'text-green-600' : m.btcDelta === 0 ? 'text-yellow-600' : 'text-red-600'}`} title={`BTC Δ = ${formatUsd(m.usdFlow)} / ${formatUsd(m.btcPrice)} = ${formatBtc(m.btcDelta)}`}>{m.btcDelta >= 0 ? `+${formatBtc(m.btcDelta)}` : formatBtc(m.btcDelta)} BTC</span>
                              <span className="text-muted-foreground" title={`BTC after monthly flow`}>{formatBtc(m.totalBtcAfter)} BTC</span>
                            </div>
                          </td>
                          <td className={`py-2 pr-4 ${col.usd}`} title={`Portfolio Value after = BTC × Price`}>{formatUsd(mCollateralAfter)}</td>
                          <td className={`py-2 pr-4 ${col.btc}`} title="Net BTC unchanged by debt this month">{formatBtc(m.totalBtcAfter)}</td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

