"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSimulation } from "../../context/SimulationContext"
import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"
import type { StrategyExecutionParams } from "@/src/modules/strategies/types"

import { useRollingLoanCalculations } from "../../hooks/useRollingLoanCalculations"
import { Calculator } from "lucide-react"


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

  const { rolloverResults, monthlyResults, monthlySnapshots, isMonthly } = useRollingLoanCalculations()


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
        <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-muted-foreground" /> Results Table</CardTitle>
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
                <th className={`py-2 pr-4 whitespace-nowrap ${col.btc}`}>BTC</th>
                <th className={`py-2 pr-4 whitespace-nowrap ${col.usd}`}>BTC<br></br>Price</th>
                <th className={`py-2 pr-4 ${col.usd}`}>Portfolio Value<br></br>(pre loan)</th>

                <th className={`py-2 pr-4 leading-snug ${col.combined}`}>Total&nbsp;Debt/
                  <br/>Locked&nbsp;BTC</th>

                <th className={`py-2 pr-4 whitespace-nowrap ${col.percent}`}>LTV<br></br>(loan)</th>
                <th className={`py-2 pr-4 whitespace-nowrap ${col.percent}`}>Debt/<br></br>Portf.</th>
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
                const targetLtv = params.riskManagement?.targetLtv ?? 50
                const snap = (monthlySnapshots || []).find(s => s.month === row.month)
                const requiredLocked = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(debt, btcPrice, targetLtv)
                // For display under Debt/Locked show actual snapshot when available (clamped)
                const lockedBtc = Math.min(
                  typeof (snap?.lockedBtc) === 'number' ? (snap!.lockedBtc as number) : requiredLocked,
                  totalBtcAfter
                )
                // For Initial LTV computation, always enforce target-LTV locked requirement
                const lockedForLtv = Math.min(requiredLocked, totalBtcAfter)

                const netBtc = centralizedLoanCalculationService.netBtcAfterPayoff(totalBtcAfter, debt, btcPrice)

                // Uniform formula: Excess = (Loan_Principal − Previous_Debt) + Monthly flow (this month)
                const adjustedExcessProceeds = row.excessProceeds || 0
                const purchased = btcPrice > 0 ? (adjustedExcessProceeds / btcPrice) : 0

                // Tooltips
                const ttBtcBefore = `BTC_before_loan_n = ${formatBtc(totalBtcBefore)}`
                const ttPrice = isMonthly
                  ? `btcPrice_n = priceProjection[${row.month}] → ${formatUsd(btcPrice)}`
                  : `btcPrice_n = priceProjection[${row.month} × 30] → priceProjection[${row.month * 30}] → ${formatUsd(btcPrice)}`
                const ttCollBefore = `Collateral_before_n = ${formatBtc(totalBtcBefore)} × ${formatUsd(btcPrice)} = ${formatUsd(collateralBefore)}`
                // Loan Principal tooltip removed from UI; target/minimum kept implicit in rollover formula
                const monthlyFlowThisRollover = (monthlyResults || []).find(m => m.month === row.month)?.usdFlow || 0
                const ttExcess = `Excess_n = (Loan_Principal_n − Previous_Debt) + Savings/Withdrawals = (${formatUsd(row.loanPrincipal)} − ${formatUsd(row.oldLoanRepayment || 0)}) + ${formatUsd(monthlyFlowThisRollover)} = ${formatUsd(adjustedExcessProceeds)}`

                const ttDelta = `ΔBTC_n = Excess_Proceeds_n / price_n = ${formatUsd(adjustedExcessProceeds)} / ${formatUsd(btcPrice)} = ${formatBtc(purchased)}`
                const rolloverSaleBtc = row.btcSoldForRollover || 0
                const ttBtcAfter = rolloverSaleBtc > 0
                  ? `BTC_after_loan_n = ${formatBtc(totalBtcBefore)} − ${formatBtc(rolloverSaleBtc)} + ${formatBtc(purchased)} = ${formatBtc(totalBtcAfter)}`
                  : `BTC_after_loan_n = ${formatBtc(totalBtcBefore)} + ${formatBtc(purchased)} = ${formatBtc(totalBtcAfter)}`
                const ttCollAfter = `Collateral_after_n = ${formatBtc(totalBtcAfter)} × ${formatUsd(btcPrice)} = ${formatUsd(collateralAfter)}`
                // Monthly flow for this rollover month (no aggregation)
                const ttSavings = `Monthly flow in this month = ${formatUsd(monthlyFlowThisRollover)}`
                const ttDebt = `Total_Debt_n = Principal + Interest + Fees = ${formatUsd(row.loanPrincipal)} + ${formatUsd(row.interest || 0)} + ${formatUsd(row.fees || 0)} = ${formatUsd(debt)}`
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

                      <td className={`py-2 pr-4 ${col.combined}`}>
                        <div className="flex flex-col items-end space-y-0.5">
                          <span title={ttDebt}>{formatUsd(debt)}</span>
                          <span className="text-muted-foreground text-xs" title={ttLocked}>{formatBtc(lockedBtc)} BTC</span>
                        </div>
                      </td>

                      <td className={`py-2 pr-4 ${col.percent}`}
                        title={`Initial LTV = Total Debt / (Locked BTC × Price) = ${formatUsd(debt)} / (${formatBtc(Math.min(requiredLocked, totalBtcAfter))} × ${formatUsd(btcPrice)}) • Auto Top-Up Trigger: ${params.riskManagement?.topUpTriggerLtv ?? 70}% • Target After Top-Up: ${(params.riskManagement?.topUpTargetLtvRange?.min ?? 50)}%–${(params.riskManagement?.topUpTargetLtvRange?.max ?? 80)}%`}>
                        <div className="flex flex-col items-end">
                          {(() => {
                            const L = Math.min(requiredLocked, totalBtcAfter);
                            const initialLtvAfter = L>0 && btcPrice>0 ? (debt/(L*btcPrice))*100 : 0;
                            const color = initialLtvAfter<=50?'text-green-600':(initialLtvAfter<=75?'text-yellow-600':'text-red-600');
                            return (<span className={color}>{initialLtvAfter.toFixed(1)}%</span>)
                          })()}
                          {(() => {
                            const snapRow = (monthlySnapshots || []).find(s => s.month === row.month)
                            const hadRolloverSale = (row.btcSoldForRollover || 0) > 0 || (row.debtReducedByRolloverSale || 0) > 0
                            if (!hadRolloverSale || !snapRow) return null
                            const beforeLtv = typeof snapRow.initialLtvBefore === 'number' ? snapRow.initialLtvBefore! : 0
                            const afterLtv = typeof snapRow.initialLtvAfter === 'number' ? snapRow.initialLtvAfter! : 0
                            return (
                              <span className="text-xs mt-0.5 text-red-600" title={`Rollover liquidation executed to reach target Initial LTV`}>
                                <span className="text-yellow-600">⚠</span> Rollover Liquidation:<br></br>
                                BTC: -{formatBtc(row.btcSoldForRollover || 0)} → {formatBtc(totalBtcAfter)}<br></br>
                                Debt: -{formatUsd(row.debtReducedByRolloverSale || 0)} → {formatUsd(debt)}<br></br>
                                LTV: {beforeLtv.toFixed(1)}% → {afterLtv.toFixed(1)}%
                              </span>
                            )
                          })()}
                        </div>
                      </td>
                      <td className={`py-2 pr-4 ${col.percent}`}>
                        {(() => {
                          const portfolio = totalBtcAfter * btcPrice
                          const utilization = portfolio > 0 ? (debt / portfolio) * 100 : 0
                          const color = utilization <= 30 ? 'text-green-600' : (utilization <= 60 ? 'text-yellow-600' : 'text-red-600')
                          return (
                            <span className={color}
                              title={`Loan Utilization = Total Debt / Portfolio Value = ${formatUsd(debt)} / ${formatUsd(portfolio)} = ${utilization.toFixed(1)}%`}>
                              {utilization.toFixed(1)}%
                            </span>
                          )
                        })()}
                      </td>
                      { showSavings ? (
                        <td className={`py-2 pr-4 ${col.usd}`} title={ttSavings}>{formatUsd(monthlyFlowThisRollover)}</td>
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

                          <td className="py-2 pr-4">
                            {(() => {
                              const snap = (monthlySnapshots || []).find(s => s.month === m.month)
                              if (!snap) return (
                                <div className="flex flex-col"><span>-</span><span className="text-muted-foreground">-</span></div>
                              )
                              const targetLtv = params.riskManagement?.targetLtv ?? 50
                              const lockedRaw = (typeof snap.lockedBtc === 'number')
                                ? snap.lockedBtc!
                                : centralizedLoanCalculationService.lockedBTCUnderTargetLtv(snap.totalDebt, m.btcPrice, targetLtv)
                              const locked = Math.min(lockedRaw, snap.totalBtc ?? 0)
                              const showEvent = (snap.liquidationTriggered || (snap.btcTopUpForCollateral || 0) > 0)
                              if (!showEvent) {
                                return (<div className="flex flex-col"><span>-</span><span className="text-muted-foreground">-</span></div>)
                              }
                              const debtCls = snap.liquidationTriggered ? 'text-red-600' : 'text-blue-600'
                              const debtTitle = snap.liquidationTriggered ? `Total Debt after liquidation in ${mLabel}` : `Total Debt (unchanged) in ${mLabel}`
                              return (
                                <div className="flex flex-col items-end space-y-0.5">
                                  <span className={debtCls} title={debtTitle}>{formatUsd(snap.totalDebt)}</span>
                                  <span className="text-muted-foreground text-xs" title={`Locked BTC based on target LTV or snapshot (clamped to available)`}>{formatBtc(locked)} BTC</span>
                                </div>
                              )
                            })()}
                          </td>

                          <td className={`py-2 pr-4 ${col.percent}`}>
                            {(() => {
                              const snap = (monthlySnapshots || []).find(s => s.month === m.month)
                              if (!snap) return <span title="No data">-</span>
                              const debtM = snap.totalDebt ?? 0
                              const locked = (typeof snap.lockedBtc === 'number') ? (snap.lockedBtc as number) : 0
                              const initial = locked>0 && m.btcPrice>0 ? (debtM/(locked*m.btcPrice))*100 : 0
                              const color = initial <= 50 ? 'text-green-600' : (initial <= 75 ? 'text-yellow-600' : 'text-red-600')
                              const before = (typeof snap.initialLtvBefore === 'number') ? snap.initialLtvBefore! : initial
                              return (
                                <div className="flex flex-col items-end">
                                  <span className={color}
                                    title={`Initial LTV = Total Debt / (Locked BTC × Price) = ${formatUsd(debtM)} / (${formatBtc(locked)} × ${formatUsd(m.btcPrice)}) = ${initial.toFixed(1)}% • Auto Top-Up Trigger: ${params.riskManagement?.topUpTriggerLtv ?? 70}% • Target After Top-Up: ${(params.riskManagement?.topUpTargetLtvRange?.min ?? 50)}%–${(params.riskManagement?.topUpTargetLtvRange?.max ?? 80)}%`}>
                                    {initial.toFixed(1)}%
                                  </span>
                                  {snap.liquidationTriggered ? (
                                    <span className="text-xs text-red-600 mt-0.5" title={`Automatic liquidation in this month • Platform Threshold: ${params.riskManagement?.liquidationLtv ?? 80}%`}>
                                      ⚠️ Liquidation: -{formatBtc(snap.btcSoldForLiquidation || 0)} BTC, -{formatUsd(snap.debtReducedByLiquidation || 0)}<br></br>LTV: {(snap.initialLtvBefore ?? before).toFixed(1)}% → {(snap.initialLtvAfter ?? initial).toFixed(1)}%
                                    </span>
                                  ) : null}
                                  {(snap.btcTopUpForCollateral || 0) > 0 ? (
                                    <span className="text-xs text-blue-600 mt-0.5" title={`Collateral top-up in this month • Trigger: ${params.riskManagement?.topUpTriggerLtv ?? 70}% • Target: ${(params.riskManagement?.topUpTargetLtvRange?.min ?? 50)}%–${(params.riskManagement?.topUpTargetLtvRange?.max ?? 80)}%`}>
                                      ⬆️ Top-Up: +{formatBtc(snap.btcTopUpForCollateral || 0)} BTC<br></br>LTV: {(snap.initialLtvBefore ?? before).toFixed(1)}% → {(snap.initialLtvAfter ?? initial).toFixed(1)}%
                                    </span>
                                  ) : null}
                                </div>
                              )
                            })()}
                          </td>
                          <td className={`py-2 pr-4 ${col.percent}`}>
                            {(() => {
                              const snap = (monthlySnapshots || []).find(s => s.month === m.month)
                              if (!snap) return <span title="No data">-</span>
                              const debtM = snap.totalDebt ?? 0
                              const totalM = snap.totalBtc ?? 0
                              const util = (totalM > 0 && m.btcPrice > 0) ? (debtM / (totalM * m.btcPrice)) * 100 : 0
                              const color = util <= 30 ? 'text-green-600' : (util <= 60 ? 'text-yellow-600' : 'text-red-600')
                              const portfolio = totalM * m.btcPrice
                              return (
                                <span className={color}
                                  title={`Loan Utilization = Total Debt / Portfolio Value = ${formatUsd(debtM)} / ${formatUsd(portfolio)} = ${util.toFixed(1)}%`}>
                                  {util.toFixed(1)}%
                                </span>
                              )
                            })()}
                          </td>
                          {showSavings ? (
                            (() => {
                              const snapRow = (monthlySnapshots || []).find(s => s.month === m.month)
                              const suspended = !!(snapRow?.withdrawalSuspended)
                              const isWithdrawal = m.usdFlow < 0
                              const displayValue = (isWithdrawal && suspended) ? 0 : m.usdFlow
                              const title = (isWithdrawal && suspended)
                                ? `Withdrawal requested: ${formatUsd(Math.abs(m.usdFlow))} but suspended (no unlocked BTC)`
                                : `${flowTitle}: ${formatUsd(m.usdFlow)}`
                              return (
                                <td className="py-2 pr-4" title={title}>{formatUsd(displayValue)}</td>
                              )
                            })()
                          ) : null}
                          {(() => {
                            const snapRow = (monthlySnapshots || []).find(s => s.month === m.month)
                            const suspended = !!(snapRow?.withdrawalSuspended)
                            const isWithdrawal = m.usdFlow < 0
                            const displayExcess = (isWithdrawal && suspended) ? 0 : m.excessProceeds
                            const clsExcess = displayExcess > 0 ? 'text-green-600' : displayExcess === 0 ? 'text-yellow-600' : 'text-red-600'
                            const tt = (isWithdrawal && suspended)
                              ? `Excess this month = Withdrawal suspended → ${formatUsd(0)}`
                              : `Excess this month = ${isWithdrawal ? 'Withdrawal' : 'Savings'} = ${formatUsd(displayExcess)}`
                            return (
                              <td className={`py-2 pr-4 ${clsExcess}`} title={tt}>{formatUsd(displayExcess)}</td>
                            )
                          })()}
                          <td className={`py-2 pr-4 ${col.combined}`}>
                            <div className="flex flex-col items-end space-y-0.5">
                              {(() => {
                                const snapRow = (monthlySnapshots || []).find(s => s.month === m.month)
                                const totalAfter = snapRow?.totalBtc ?? m.totalBtcAfter
                                const observedDelta = (totalAfter - m.totalBtcBefore)
                                const liqSold = snapRow?.btcSoldForLiquidation || 0
                                  const suspended = !!(snapRow?.withdrawalSuspended)
                                const requestedAbs = (m.usdFlow < 0 && m.btcPrice > 0) ? Math.abs(m.usdFlow) / m.btcPrice : 0
                                const executedAbs = Math.abs(m.btcDelta || 0)
                                const eps = Math.max(1e-10, requestedAbs * 1e-6)
                                const withdrawalLimited = (m.usdFlow < 0) && (executedAbs + eps) < (requestedAbs - eps)
                                const cls = observedDelta > 0 ? 'text-green-600' : observedDelta === 0 ? 'text-yellow-600' : 'text-red-600'
                                const title = liqSold > 0
                                  ? `Observed BTC Δ = Savings/Withdrawals Δ (${formatBtc(m.btcDelta)}) − Liquidation sale (${formatBtc(liqSold)}) = ${formatBtc(observedDelta)}`
                                  : suspended
                                    ? `Withdrawal suspended: no unlocked BTC available`
                                    : withdrawalLimited
                                      ? `Observed BTC Δ = Withdrawal requested ${formatBtc(-requestedAbs)} but limited by unlocked; executed ${formatBtc(-executedAbs)} → ${formatBtc(observedDelta)}`
                                      : `Observed BTC Δ = ${formatUsd(m.usdFlow)} / ${formatUsd(m.btcPrice)} = ${formatBtc(m.btcDelta)}`
                                return (
                                  <span className={cls} title={title}>{observedDelta >= 0 ? `+${formatBtc(observedDelta)}` : formatBtc(observedDelta)} BTC</span>
                                )
                              })()}
                              {(() => {
                                const snapRow = (monthlySnapshots || []).find(s => s.month === m.month)
                                const totalAfter = snapRow?.totalBtc ?? m.totalBtcAfter
                                return <span className="text-muted-foreground text-xs" title={`BTC after monthly flow (incl. liquidation if any)`}>{formatBtc(totalAfter)} BTC</span>
                              })()}

                            </div>
                          </td>
                          <td className={`py-2 pr-4 ${col.usd}`} title={`Portfolio Value after = BTC × Price`}>{formatUsd(mCollateralAfter)}</td>
                          <td className={`py-2 pr-4 ${col.btc}`}>
                            {(() => {
                              const snapRow = (monthlySnapshots || []).find(s => s.month === m.month)
                              if (!snapRow) return <span title="No data">-</span>
                              const net = m.btcPrice>0 ? (snapRow.totalBtc - (snapRow.totalDebt / m.btcPrice)) : snapRow.totalBtc
                              return <span title={`Net BTC = Total BTC − (Total Debt / Price)`}>{formatBtc(net)}</span>
                            })()}
                          </td>
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

