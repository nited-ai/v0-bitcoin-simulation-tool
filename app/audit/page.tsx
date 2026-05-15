"use client"

/**
 * Programmatic audit harness for the rollingLoan simulation.
 *
 * Runs `simulateRollingLoan` against a matrix of parameter combinations with
 * synthetic price projections, then asserts per-row invariants on every month.
 * Surfaces logical bugs that would be infeasible to catch by visual inspection
 * of the DetailedResultsTable across hundreds of scenarios.
 *
 * Lives at /audit so it can be hit on the Vercel preview without altering the
 * main simulation page.
 */

import { useEffect, useMemo, useState } from "react"
import { simulateRollingLoan } from "@/src/modules/strategies/services/simulateRollingLoan"
import { DEFAULT_PARAMS } from "../simulation/types/simulation"
import type { SimulationParams } from "../simulation/types/simulation"
import type {
  PriceProjectionResult,
  ProjectionPoint,
} from "../simulation/price-models/types"

// ─── Synthetic price-projection generators ────────────────────────────────

function buildProjection(
  startPrice: number,
  months: number,
  pricePathFn: (m: number) => number,
  modelName: string,
): PriceProjectionResult {
  const projectionPoints: ProjectionPoint[] = []
  // monthly cadence: each point 30 days apart (sim treats >2 days as monthly)
  const baseTs = Date.now()
  for (let m = 0; m <= months; m++) {
    projectionPoints.push({
      timestamp: baseTs + m * 30 * 24 * 60 * 60 * 1000,
      price: pricePathFn(m),
      confidence: 0.9,
    })
  }
  return {
    modelName,
    modelVersion: "audit",
    projectionPoints,
    metadata: {
      totalMonths: months,
      totalGrowth: (pricePathFn(months) / startPrice - 1) * 100,
      averageMonthlyGrowth: 0,
      confidence: 0.9,
      generatedAt: new Date().toISOString(),
    },
  }
}

function flat(startPrice: number, months: number) {
  return buildProjection(startPrice, months, () => startPrice, "flat")
}
function steadyUp(startPrice: number, months: number, annualPct: number) {
  const monthly = Math.pow(1 + annualPct / 100, 1 / 12) - 1
  return buildProjection(
    startPrice,
    months,
    m => startPrice * Math.pow(1 + monthly, m),
    `steady_+${annualPct}%/y`,
  )
}
function steadyDown(startPrice: number, months: number, annualPct: number) {
  const monthly = Math.pow(1 - annualPct / 100, 1 / 12) - 1
  return buildProjection(
    startPrice,
    months,
    m => Math.max(1, startPrice * Math.pow(1 + monthly, m)),
    `steady_-${annualPct}%/y`,
  )
}
function crash(startPrice: number, months: number, atMonth: number, dropPct: number) {
  return buildProjection(
    startPrice,
    months,
    m => (m < atMonth ? startPrice : startPrice * (1 - dropPct / 100)),
    `crash_${dropPct}%@m${atMonth}`,
  )
}
function cycle(startPrice: number, months: number, amplitudePct: number) {
  return buildProjection(
    startPrice,
    months,
    m => startPrice * (1 + (amplitudePct / 100) * Math.sin((m / 48) * 2 * Math.PI)),
    `cycle_amp${amplitudePct}%`,
  )
}
function vshape(startPrice: number, months: number, troughPct: number) {
  // Drops linearly to trough by mid, recovers to start by end
  return buildProjection(
    startPrice,
    months,
    m => {
      const mid = months / 2
      const factor =
        m <= mid
          ? 1 - (troughPct / 100) * (m / mid)
          : 1 - (troughPct / 100) * (1 - (m - mid) / mid)
      return startPrice * factor
    },
    `vshape_trough${troughPct}%`,
  )
}
function bullCycle(startPrice: number, months: number) {
  // 4-yr cycle: +200%, -75%, +30%, +180% then repeats
  return buildProjection(
    startPrice,
    months,
    m => {
      const yr = Math.floor(m / 12)
      const yrInCycle = yr % 4
      const inYear = (m % 12) / 12
      const yearRates = [200, -75, 30, 180]
      const yearStartPrice = (() => {
        let p = startPrice
        for (let y = 0; y < yr; y++) {
          p = p * (1 + yearRates[y % 4] / 100)
        }
        return p
      })()
      const monthlyRate = Math.pow(1 + yearRates[yrInCycle] / 100, 1 / 12) - 1
      return yearStartPrice * Math.pow(1 + monthlyRate, m % 12)
    },
    "bull_cycle_4yr",
  )
}

// ─── Per-row assertions ───────────────────────────────────────────────────

interface AuditFinding {
  scenario: string
  month: number
  severity: "warn" | "error"
  rule: string
  detail: string
}

function auditScenario(
  scenarioName: string,
  params: SimulationParams,
  projection: PriceProjectionResult,
): AuditFinding[] {
  const sim = simulateRollingLoan(params, projection)
  const findings: AuditFinding[] = []
  const push = (
    month: number,
    severity: "warn" | "error",
    rule: string,
    detail: string,
  ) => findings.push({ scenario: scenarioName, month, severity, rule, detail })

  const snaps = sim.monthlySnapshots
  if (snaps.length === 0) {
    push(-1, "error", "no_snapshots", "Sim returned zero snapshots")
    return findings
  }

  const targetLtv = params.riskManagement?.targetLtv ?? 50
  const liquidationLtv = params.riskManagement?.liquidationLtv ?? 80
  const topUpTriggerLtv = params.riskManagement?.topUpTriggerLtv ?? 70
  const totalMonths = params.simulationMonths || 0

  // Per-row checks
  for (let i = 0; i < snaps.length; i++) {
    const s = snaps[i]
    const m = s.month
    const price = sim.getBtcPriceForMonth(m)

    // 1. Finite numbers
    const numeric: Record<string, number | undefined> = {
      totalBtc: s.totalBtc,
      totalDebt: s.totalDebt,
      lockedBtc: s.lockedBtc,
      unlockedBtc: s.unlockedBtc,
      topUpLtv: s.topUpLtv,
      initialLtvAfter: s.initialLtvAfter,
      btcSoldForLiquidation: s.btcSoldForLiquidation,
      debtReducedByLiquidation: s.debtReducedByLiquidation,
      btcTopUpForCollateral: s.btcTopUpForCollateral,
    }
    for (const [k, v] of Object.entries(numeric)) {
      if (v !== undefined && (!Number.isFinite(v))) {
        push(m, "error", "nonfinite_number", `${k}=${v}`)
      }
    }

    // 2. Non-negative quantities
    if (s.totalBtc < -1e-9) push(m, "error", "negative_totalBtc", `totalBtc=${s.totalBtc}`)
    if (s.totalDebt < -1e-3) push(m, "error", "negative_totalDebt", `totalDebt=${s.totalDebt}`)
    if ((s.lockedBtc ?? 0) < -1e-9)
      push(m, "error", "negative_lockedBtc", `lockedBtc=${s.lockedBtc}`)
    if ((s.unlockedBtc ?? 0) < -1e-9)
      push(m, "error", "negative_unlockedBtc", `unlockedBtc=${s.unlockedBtc}`)

    // 3. locked + unlocked ≈ total
    if (
      s.lockedBtc !== undefined &&
      s.unlockedBtc !== undefined
    ) {
      const sumBtc = s.lockedBtc + s.unlockedBtc
      const diff = Math.abs(sumBtc - s.totalBtc)
      if (diff > Math.max(1e-6, s.totalBtc * 1e-6)) {
        push(
          m,
          "error",
          "locked+unlocked!=total",
          `locked=${s.lockedBtc.toFixed(8)} + unlocked=${s.unlockedBtc.toFixed(8)} = ${sumBtc.toFixed(8)}, total=${s.totalBtc.toFixed(8)}`,
        )
      }
    }

    // 4. lockedBtc <= totalBtc
    if (s.lockedBtc !== undefined && s.lockedBtc > s.totalBtc + 1e-6) {
      push(
        m,
        "error",
        "lockedBtc>totalBtc",
        `locked=${s.lockedBtc} total=${s.totalBtc}`,
      )
    }

    // 5. LTV recomputation consistency (initialLtv vs locked-debt)
    if (s.lockedBtc && s.lockedBtc > 0 && price > 0 && s.initialLtvAfter !== undefined) {
      const recomputed = (s.totalDebt / (s.lockedBtc * price)) * 100
      const reported = s.initialLtvAfter
      const diff = Math.abs(recomputed - reported)
      if (diff > 0.5) {
        push(
          m,
          "warn",
          "initialLtv_mismatch",
          `reported=${reported.toFixed(3)} recomputed=${recomputed.toFixed(3)}`,
        )
      }
    }

    // 6. After all risk-management actions, if initialLtvAfter still
    // breaches liquidationLtv, the sim should either have triggered a
    // liquidation OR be in a genuinely unrecoverable state (no btc left,
    // denom <= 0). This is the meaningful check — pre-action LTV can be
    // above threshold and still be saved by tier-1 top-up before tier-2.
    if (
      i > 0 &&
      (s.initialLtvAfter ?? 0) >= liquidationLtv + 0.01 &&
      !s.liquidationTriggered
    ) {
      const recoverable =
        (s.unlockedBtc ?? 0) > 1e-6 || (s.lockedBtc ?? 0) > 1e-6
      push(
        m,
        recoverable ? "error" : "warn",
        "post_action_ltv_still_breached",
        `initialLtvAfter=${(s.initialLtvAfter || 0).toFixed(2)} liqLtv=${liquidationLtv} recoverable=${recoverable}`,
      )
    }

    // 7. Rollover months must align with loan term
    if (
      s.isRollover &&
      m > 0 &&
      params.loanTermMonths !== Infinity &&
      m % (params.loanTermMonths || 12) !== 0
    ) {
      push(m, "error", "rollover_off_cycle", `loanTerm=${params.loanTermMonths}`)
    }

    // 8. With finite-term loan, debt should drop to new principal+fees at
    // rollover, not accumulate forever. Sanity: debt should not grow beyond
    // ~3x the original principal+interest across one term in flat market
    // (no interest accrual between rollovers on finite-term loans).

    // 9. With monthlyWithdrawalAmount=0 and btcAccumulation=true and flat
    // market, BTC should be non-decreasing (no involuntary sales).
    if (
      params.monthlyWithdrawalAmount === 0 &&
      params.btcAccumulation &&
      i > 0
    ) {
      const prev = snaps[i - 1]
      // Only assert in scenarios without forced sales triggered
      const noLiqOrRollSale =
        !s.liquidationTriggered &&
        !(s.btcSoldForRollover && s.btcSoldForRollover > 0)
      if (noLiqOrRollSale && s.totalBtc + 1e-6 < prev.totalBtc) {
        push(
          m,
          "warn",
          "btc_decreased_without_sale_event",
          `prev=${prev.totalBtc.toFixed(8)} now=${s.totalBtc.toFixed(8)}`,
        )
      }
    }

    // 10. withdrawalSuspended must imply user wanted a withdrawal
    if (s.withdrawalSuspended && params.monthlyWithdrawalAmount >= 0) {
      push(
        m,
        "warn",
        "withdrawalSuspended_without_withdrawal_intent",
        `monthlyAmount=${params.monthlyWithdrawalAmount}`,
      )
    }

    // 11. Liquidation only ever reduces debt + BTC (never grows them).
    if (s.liquidationTriggered && i > 0) {
      const prev = snaps[i - 1]
      if (s.totalDebt > prev.totalDebt + 1e-3) {
        push(
          m,
          "error",
          "liquidation_grew_debt",
          `prev=${prev.totalDebt.toFixed(2)} now=${s.totalDebt.toFixed(2)}`,
        )
      }
    }
  }

  // Cross-row checks
  // 11. Final month exists
  const lastSnap = snaps[snaps.length - 1]
  if (lastSnap.month !== totalMonths) {
    push(
      lastSnap.month,
      "warn",
      "missing_final_month",
      `expected ${totalMonths} got ${lastSnap.month}`,
    )
  }

  // 12. Monthly snapshots must be strictly monotonic in month
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].month !== snaps[i - 1].month + 1) {
      push(
        snaps[i].month,
        "error",
        "month_index_gap",
        `${snaps[i - 1].month} → ${snaps[i].month}`,
      )
      break
    }
  }

  // 13. With targetLtv=0 (no loans) → no debt, no rolloverResults beyond init
  // (Skipping: targetLtv=0 isn't a realistic configuration.)

  // 14. At maturity rollovers, the principal should be re-set (not blown up)
  for (const r of sim.rolloverResults) {
    if (!Number.isFinite(r.loanPrincipal) || r.loanPrincipal < 0) {
      push(
        r.month,
        "error",
        "bad_rollover_principal",
        `loanPrincipal=${r.loanPrincipal}`,
      )
    }
    if (!Number.isFinite(r.loanRepayment) || r.loanRepayment < r.loanPrincipal - 1e-3) {
      push(
        r.month,
        "error",
        "repayment_lt_principal",
        `repay=${r.loanRepayment} principal=${r.loanPrincipal}`,
      )
    }
  }

  return findings
}

// ─── Parameter matrix ─────────────────────────────────────────────────────

function buildScenarios(): Array<{
  name: string
  params: SimulationParams
  projection: PriceProjectionResult
}> {
  const scenarios: Array<{
    name: string
    params: SimulationParams
    projection: PriceProjectionResult
  }> = []
  const startPrice = 100000

  const baseTemplate = (over: Partial<SimulationParams>): SimulationParams => ({
    ...DEFAULT_PARAMS,
    investmentStrategy: "rollingLoan",
    initialBtcPrice: startPrice,
    ...over,
    riskManagement: {
      ...DEFAULT_PARAMS.riskManagement,
      ...(over.riskManagement || {}),
    },
  })

  const loanTermVariants = [3, 6, 12, 24, 36]
  const loanPctVariants = [10, 20, 30, 40, 50]
  const targetLtvVariants = [20, 30, 40, 50]
  const liqLtvVariants = [70, 80, 90]
  const monthsVariants = [12, 60, 144]
  const savingsVariants = [-500, 0, 150, 1000]
  const interestVariants = [0, 6, 12]
  const priceScenarios: Array<{ name: string; gen: (m: number) => PriceProjectionResult }> = [
    { name: "flat", gen: m => flat(startPrice, m) },
    { name: "steadyUp_15", gen: m => steadyUp(startPrice, m, 15) },
    { name: "steadyDown_15", gen: m => steadyDown(startPrice, m, 15) },
    { name: "crash_60@m6", gen: m => crash(startPrice, m, Math.min(6, m), 60) },
    { name: "crash_80@m12", gen: m => crash(startPrice, m, Math.min(12, m), 80) },
    { name: "vshape_60", gen: m => vshape(startPrice, m, 60) },
    { name: "cycle_30", gen: m => cycle(startPrice, m, 30) },
    { name: "bull4y", gen: m => bullCycle(startPrice, m) },
  ]

  // Curated cross-product (≈90 scenarios): vary one or two dims at a time
  // around realistic defaults rather than full Cartesian explosion.
  for (const months of monthsVariants) {
    for (const ps of priceScenarios) {
      const proj = ps.gen(months)
      // Baseline
      scenarios.push({
        name: `base|${months}m|${ps.name}`,
        params: baseTemplate({ simulationMonths: months }),
        projection: proj,
      })
      // Loan term sweep
      for (const lt of loanTermVariants) {
        scenarios.push({
          name: `loanTerm=${lt}|${months}m|${ps.name}`,
          params: baseTemplate({
            simulationMonths: months,
            loanTermMonths: lt,
          }),
          projection: proj,
        })
      }
      // Loan percent sweep
      for (const lp of loanPctVariants) {
        scenarios.push({
          name: `loanPct=${lp}|${months}m|${ps.name}`,
          params: baseTemplate({
            simulationMonths: months,
            loanAmountPercent: lp,
          }),
          projection: proj,
        })
      }
      // Risk LTV sweep
      for (const tl of targetLtvVariants) {
        for (const ll of liqLtvVariants) {
          if (ll <= tl) continue
          scenarios.push({
            name: `tgtLtv=${tl}/liq=${ll}|${months}m|${ps.name}`,
            params: baseTemplate({
              simulationMonths: months,
              riskManagement: {
                ...DEFAULT_PARAMS.riskManagement,
                targetLtv: tl,
                liquidationLtv: ll,
              },
            }),
            projection: proj,
          })
        }
      }
      // Savings sweep
      for (const sv of savingsVariants) {
        scenarios.push({
          name: `savings=${sv}|${months}m|${ps.name}`,
          params: baseTemplate({
            simulationMonths: months,
            monthlyWithdrawalAmount: sv,
          }),
          projection: proj,
        })
      }
      // Interest sweep
      for (const ir of interestVariants) {
        scenarios.push({
          name: `ir=${ir}|${months}m|${ps.name}`,
          params: baseTemplate({
            simulationMonths: months,
            annualInterestRate: ir,
          }),
          projection: proj,
        })
      }
    }
  }

  return scenarios
}

export default function AuditPage() {
  const [filter, setFilter] = useState<"all" | "error" | "warn">("error")
  const [showOnly, setShowOnly] = useState("")

  // Expose for browser-console debugging of specific failing scenarios
  useEffect(() => {
    ;(window as any).__simulateRollingLoan = simulateRollingLoan
    ;(window as any).__DEFAULT_PARAMS = DEFAULT_PARAMS
    ;(window as any).__buildScenarios = buildScenarios
  }, [])

  const { scenarios, findings, summary } = useMemo(() => {
    const scenarios = buildScenarios()
    const all: AuditFinding[] = []
    for (const s of scenarios) {
      const f = auditScenario(s.name, s.params, s.projection)
      all.push(...f)
    }
    // Group by rule
    const ruleCounts: Record<string, { error: number; warn: number; scenarios: Set<string> }> = {}
    for (const f of all) {
      const k = f.rule
      if (!ruleCounts[k]) ruleCounts[k] = { error: 0, warn: 0, scenarios: new Set() }
      ruleCounts[k][f.severity]++
      ruleCounts[k].scenarios.add(f.scenario)
    }
    const summary = Object.entries(ruleCounts)
      .map(([rule, c]) => ({
        rule,
        errors: c.error,
        warns: c.warn,
        scenarios: c.scenarios.size,
      }))
      .sort((a, b) => b.errors + b.warns - (a.errors + a.warns))
    return { scenarios, findings: all, summary }
  }, [])

  const filtered = findings.filter(f => {
    if (filter !== "all" && f.severity !== filter) return false
    if (showOnly && !f.rule.includes(showOnly) && !f.scenario.includes(showOnly)) return false
    return true
  })

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Rolling Loan — Programmatic Audit</h1>
      <p>
        Ran <b>{scenarios.length}</b> simulations across parameter combinations.
        Found <b>{findings.filter(f => f.severity === "error").length}</b> errors
        and <b>{findings.filter(f => f.severity === "warn").length}</b> warnings.
      </p>

      <h2>Summary by rule</h2>
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th align="left">Rule</th>
            <th>Errors</th>
            <th>Warns</th>
            <th>Scenarios affected</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(r => (
            <tr key={r.rule} style={{ borderBottom: "1px solid #ddd" }}>
              <td>{r.rule}</td>
              <td align="right" style={{ color: r.errors > 0 ? "#b00" : "#888" }}>
                {r.errors}
              </td>
              <td align="right" style={{ color: r.warns > 0 ? "#b90" : "#888" }}>
                {r.warns}
              </td>
              <td align="right">{r.scenarios}</td>
            </tr>
          ))}
          {summary.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 12, color: "#080" }}>
                No findings — all per-row invariants held.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32 }}>Findings</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setFilter("error")}>errors only</button>{" "}
        <button onClick={() => setFilter("warn")}>warns only</button>{" "}
        <button onClick={() => setFilter("all")}>all</button>{" "}
        <input
          placeholder="filter (rule or scenario)"
          value={showOnly}
          onChange={e => setShowOnly(e.target.value)}
          style={{ marginLeft: 12, padding: 4 }}
        />
      </div>
      <p>Showing {filtered.length} of {findings.length}.</p>
      <table cellPadding={4} style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th align="left">Severity</th>
            <th align="left">Rule</th>
            <th align="left">Scenario</th>
            <th align="right">Month</th>
            <th align="left">Detail</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 500).map((f, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ color: f.severity === "error" ? "#b00" : "#b90" }}>
                {f.severity}
              </td>
              <td>{f.rule}</td>
              <td style={{ fontFamily: "monospace" }}>{f.scenario}</td>
              <td align="right">{f.month}</td>
              <td style={{ fontFamily: "monospace" }}>{f.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 500 && (
        <p>(showing first 500 of {filtered.length})</p>
      )}
    </div>
  )
}
