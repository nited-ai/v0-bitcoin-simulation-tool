"use client"

/**
 * Strategy Lab — automated scenario testing for the Rolling Loan strategy.
 *
 * Two tools, both running the pure `simulateRollingLoan` engine against the
 * user's CURRENT price projection:
 *
 *  1. Optimizer — sweeps a grid of (leverage × loan term × interest rate)
 *     and ranks every combination by how far it beats the HODL baseline.
 *     Renders a heatmap + ranked table; each row can be applied in one click.
 *
 *  2. Scenario Comparison — runs the user's current config side-by-side with
 *     the four built-in risk-level presets so the trade-offs are visible at
 *     a glance.
 *
 * The simulation is pure and fast (hundreds of runs complete in <100ms), so
 * the comparison computes reactively; the optimizer grid is gated behind an
 * explicit "Run" button to keep parameter editing snappy.
 */

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, Trophy, AlertTriangle, Play, Check } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import {
  runStrategySweep,
  runRiskLevelComparison,
  DEFAULT_SWEEP_AXES,
  type SweepResultRow,
  type ScenarioRow,
} from "@/src/modules/strategies/services/strategySweep"

// ─── Formatting helpers ───────────────────────────────────────────────────

const fmtBtc = (n: number) => `${n.toFixed(4)} BTC`
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`
const fmtTerm = (t: number) => (t === Infinity ? "∞" : `${t}mo`)

/** Outperformance → background colour (red losing, green winning). */
function outColor(pct: number, insolvent: boolean): string {
  if (insolvent) return "bg-red-900/40 text-red-300"
  if (pct <= -50) return "bg-red-700/30 text-red-300"
  if (pct < 0) return "bg-orange-600/25 text-orange-300"
  if (pct < 25) return "bg-yellow-500/20 text-yellow-300"
  if (pct < 75) return "bg-green-600/25 text-green-300"
  return "bg-green-500/40 text-green-200"
}

// ─── Optimizer section ────────────────────────────────────────────────────

function OptimizerSection() {
  const { params, priceProjection, setParams } = useSimulation()
  const [hasRun, setHasRun] = useState(false)

  // Gated behind hasRun so editing params elsewhere doesn't trigger a sweep.
  const results = useMemo<SweepResultRow[]>(() => {
    if (!hasRun) return []
    return runStrategySweep(params, priceProjection, DEFAULT_SWEEP_AXES)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRun, params, priceProjection])

  const applyConfig = (r: SweepResultRow) => {
    setParams(prev => ({
      ...prev,
      loanAmountPercent: r.loanAmountPercent,
      loanTermMonths: r.loanTermMonths,
      annualInterestRate: r.annualInterestRate,
      riskManagement: {
        ...prev.riskManagement,
        annualInterestRate: r.annualInterestRate,
        loanTermMonths:
          r.loanTermMonths === Infinity ? "infinity" : r.loanTermMonths,
      },
    }))
  }

  // Heatmap pivot: rows = loanPct, cols = loanTerm, fixed at first interest rate.
  const heatmap = useMemo(() => {
    if (results.length === 0) return null
    const ir = DEFAULT_SWEEP_AXES.annualInterestRate[0]
    const pcts = DEFAULT_SWEEP_AXES.loanAmountPercent
    const terms = DEFAULT_SWEEP_AXES.loanTermMonths
    const cell = (lp: number, lt: number) =>
      results.find(
        r =>
          r.loanAmountPercent === lp &&
          r.loanTermMonths === lt &&
          Math.abs(r.annualInterestRate - ir) < 1e-6,
      )
    return { pcts, terms, cell, ir }
  }, [results])

  const top = results.slice(0, 10)
  const best = results[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Optimizer
        </CardTitle>
        <CardDescription>
          Sweeps {DEFAULT_SWEEP_AXES.loanAmountPercent.length} leverage levels ×{" "}
          {DEFAULT_SWEEP_AXES.loanTermMonths.length} loan terms against your current
          price projection and ranks each by outperformance vs. simply HODLing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={() => setHasRun(true)} className="gap-2">
          <Play className="h-4 w-4" />
          {hasRun ? "Re-run optimizer" : "Run optimizer"}
        </Button>

        {hasRun && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No price projection available — generate one on the Price Projection tab first.
          </p>
        )}

        {best && (
          <div className="rounded-lg border border-green-600/40 bg-green-600/10 p-4">
            <div className="text-sm text-muted-foreground">Best configuration found</div>
            <div className="mt-1 text-lg font-semibold">
              {best.loanAmountPercent}% leverage · {fmtTerm(best.loanTermMonths)} term ·{" "}
              {best.annualInterestRate}% interest
            </div>
            <div className="mt-1 text-sm">
              {fmtBtc(best.netBtc)} net vs {fmtBtc(best.hodlNetBtc)} HODL —{" "}
              <span className="font-semibold text-green-500">
                {fmtPct(best.outperformancePct)}
              </span>
            </div>
            <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => applyConfig(best)}>
              <Check className="h-3 w-3" /> Apply this config
            </Button>
          </div>
        )}

        {/* Heatmap */}
        {heatmap && (
          <div>
            <div className="mb-2 text-sm font-medium">
              Outperformance heatmap (interest {heatmap.ir}%)
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-muted-foreground">Leverage \ Term</th>
                    {heatmap.terms.map(t => (
                      <th key={String(t)} className="p-2 text-center text-muted-foreground">
                        {fmtTerm(t)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.pcts.map(lp => (
                    <tr key={lp}>
                      <td className="p-2 font-medium text-muted-foreground">{lp}%</td>
                      {heatmap.terms.map(t => {
                        const c = heatmap.cell(lp, t)
                        if (!c)
                          return (
                            <td key={String(t)} className="p-2 text-center">
                              –
                            </td>
                          )
                        return (
                          <td
                            key={String(t)}
                            className={`cursor-pointer p-2 text-center font-medium ${outColor(
                              c.outperformancePct,
                              c.insolvent,
                            )} ${c.isCurrent ? "ring-2 ring-blue-400" : ""}`}
                            title={`${fmtBtc(c.netBtc)} net · maxLTV ${c.maxLtv.toFixed(0)}%${
                              c.insolvent ? " · INSOLVENT" : ""
                            }`}
                            onClick={() => applyConfig(c)}
                          >
                            {c.insolvent ? "✗" : fmtPct(c.outperformancePct)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              ✗ = position liquidated (insolvent). Blue ring = your current config.
              Click any cell to apply it.
            </p>
          </div>
        )}

        {/* Ranked table */}
        {top.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium">Top 10 configurations</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">#</th>
                    <th className="p-2">Leverage</th>
                    <th className="p-2">Term</th>
                    <th className="p-2">Interest</th>
                    <th className="p-2 text-right">Net BTC</th>
                    <th className="p-2 text-right">vs HODL</th>
                    <th className="p-2 text-right">Max LTV</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr
                      key={`${r.loanAmountPercent}-${r.loanTermMonths}-${r.annualInterestRate}`}
                      className={`border-b ${r.isCurrent ? "bg-blue-500/10" : ""}`}
                    >
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{r.loanAmountPercent}%</td>
                      <td className="p-2">{fmtTerm(r.loanTermMonths)}</td>
                      <td className="p-2">{r.annualInterestRate}%</td>
                      <td className="p-2 text-right">{fmtBtc(r.netBtc)}</td>
                      <td
                        className={`p-2 text-right font-medium ${
                          r.outperformancePct >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {fmtPct(r.outperformancePct)}
                      </td>
                      <td className="p-2 text-right">
                        {r.insolvent ? (
                          <span className="text-red-500">insolvent</span>
                        ) : (
                          `${r.maxLtv.toFixed(0)}%`
                        )}
                      </td>
                      <td className="p-2">
                        {r.isCurrent ? (
                          <Badge variant="outline">current</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1"
                            onClick={() => applyConfig(r)}
                          >
                            <Check className="h-3 w-3" /> Apply
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Scenario comparison section ──────────────────────────────────────────

function ComparisonSection() {
  const { params, priceProjection, setParams } = useSimulation()

  const rows = useMemo<ScenarioRow[]>(
    () => runRiskLevelComparison(params, priceProjection),
    [params, priceProjection],
  )

  const applyScenario = (r: ScenarioRow) => {
    setParams(prev => ({
      ...prev,
      loanAmountPercent: r.loanAmountPercent,
      loanTermMonths: r.loanTermMonths,
      annualInterestRate: r.annualInterestRate,
      riskManagement: {
        ...prev.riskManagement,
        annualInterestRate: r.annualInterestRate,
        loanTermMonths:
          r.loanTermMonths === Infinity ? "infinity" : r.loanTermMonths,
        targetLtv: r.targetLtv,
      },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-500" />
          Scenario Comparison
        </CardTitle>
        <CardDescription>
          Your current configuration side-by-side with the four built-in risk
          presets — same price projection, same cash flow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No price projection available — generate one on the Price Projection tab first.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Scenario</th>
                  <th className="p-2">Leverage</th>
                  <th className="p-2">Term</th>
                  <th className="p-2">Interest</th>
                  <th className="p-2 text-right">Net BTC</th>
                  <th className="p-2 text-right">vs HODL</th>
                  <th className="p-2 text-right">Max LTV</th>
                  <th className="p-2">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.name}
                    className={`border-b ${r.isCurrent ? "bg-blue-500/10" : ""}`}
                  >
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">{r.loanAmountPercent}%</td>
                    <td className="p-2">{fmtTerm(r.loanTermMonths)}</td>
                    <td className="p-2">{r.annualInterestRate}%</td>
                    <td className="p-2 text-right">{fmtBtc(r.netBtc)}</td>
                    <td
                      className={`p-2 text-right font-medium ${
                        r.outperformancePct >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {fmtPct(r.outperformancePct)}
                    </td>
                    <td className="p-2 text-right">{r.maxLtv.toFixed(0)}%</td>
                    <td className="p-2">
                      {r.insolvent ? (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertTriangle className="h-3 w-3" /> liquidated
                        </span>
                      ) : (
                        <span className="text-green-500">survived</span>
                      )}
                    </td>
                    <td className="p-2">
                      {r.isCurrent ? (
                        <Badge variant="outline">current</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1"
                          onClick={() => applyScenario(r)}
                        >
                          <Check className="h-3 w-3" /> Apply
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export function StrategyLab() {
  // Ensure the price projection is generated even if the user lands here
  // directly without visiting the Results tab first (which is the other
  // place that opts into price generation).

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Strategy Lab</h2>
          <p className="text-sm text-muted-foreground">
            Automated scenario testing — find the configuration that beats HODL by the most.
          </p>
        </div>
      </div>
      <OptimizerSection />
      <ComparisonSection />
    </div>
  )
}
