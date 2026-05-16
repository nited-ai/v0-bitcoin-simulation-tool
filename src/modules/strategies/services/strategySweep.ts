/**
 * strategySweep — pure parameter-sweep engine for the Strategy Lab.
 *
 * Runs `simulateRollingLoan` across a grid of strategy parameters (leverage,
 * loan term, interest rate) against a FIXED price projection, and ranks each
 * combination by how far it beats the HODL baseline.
 *
 * Pure functions only — no React, no context. The Strategy Lab tab calls
 * these from a `useMemo` gated behind an explicit "run" trigger.
 *
 * Why a dedicated module: both the Optimizer (full grid sweep) and the
 * Scenario Comparison (a handful of named variants) need the exact same
 * "run sim → derive net BTC → compare vs HODL" pipeline. Centralising it
 * guarantees the two views never disagree.
 */

import { simulateRollingLoan } from "./simulateRollingLoan"
import { computeHodlBaseline } from "./HodlBaselineService"
import { RISK_LEVEL_PRESETS, type RiskLevel } from "../../../../app/simulation/constants/riskLevelPresets"
import type { PriceProjectionResult } from "../../../../app/simulation/price-models/types"
import type { SimulationParams } from "../../../../app/simulation/types/simulation"

// ─── Types ────────────────────────────────────────────────────────────────

export interface SweepAxes {
  /** Leverage values to test, as % of pre-purchase collateral */
  loanAmountPercent: number[]
  /** Loan terms to test; Infinity = interest-only / no maturity */
  loanTermMonths: number[]
  /** Annual interest rates (%) to test */
  annualInterestRate: number[]
}

export interface StrategyOutcome {
  /** BTC the investor walks away with after paying off all debt at final price */
  netBtc: number
  /** Gross BTC stack at simulation end (before debt payoff) */
  totalBtc: number
  /** Outstanding debt (USD) at simulation end */
  debtUsd: number
  /** Highest locked-collateral LTV reached at any point (%) */
  maxLtv: number
  /** True if a fatal liquidation wrote off debt at any month */
  insolvent: boolean
  /** Final BTC price used */
  finalPrice: number
}

export interface SweepResultRow extends StrategyOutcome {
  loanAmountPercent: number
  loanTermMonths: number
  annualInterestRate: number
  /** HODL counterfactual net BTC for the same price path + cash flow */
  hodlNetBtc: number
  /** netBtc − hodlNetBtc */
  outperformanceBtc: number
  /** (netBtc / hodlNetBtc − 1) × 100 */
  outperformancePct: number
  /** True when this row matches the user's current parameters */
  isCurrent: boolean
}

export interface ScenarioRow extends StrategyOutcome {
  /** Human-readable variant name (e.g. "Moderate", "Current config") */
  name: string
  loanAmountPercent: number
  loanTermMonths: number
  annualInterestRate: number
  targetLtv: number
  hodlNetBtc: number
  outperformanceBtc: number
  outperformancePct: number
  isCurrent: boolean
}

// ─── Core: run one strategy config ────────────────────────────────────────

/**
 * Run a single strategy configuration against the projection and derive the
 * outcome metrics. `loanTermMonths` may be Infinity for interest-only loans.
 */
function runOne(
  params: SimulationParams,
  priceProjection: PriceProjectionResult,
): StrategyOutcome {
  const sim = simulateRollingLoan(params, priceProjection)
  const snaps = sim.monthlySnapshots
  if (snaps.length === 0) {
    return { netBtc: 0, totalBtc: 0, debtUsd: 0, maxLtv: 0, insolvent: false, finalPrice: 0 }
  }
  const last = snaps[snaps.length - 1]
  const finalPrice = sim.getBtcPriceForMonth(last.month)
  const netBtc =
    last.totalDebt > 0 && finalPrice > 0
      ? last.totalBtc - last.totalDebt / finalPrice
      : last.totalBtc
  const maxLtv = Math.max(
    0,
    ...snaps.map(s => s.initialLtvAfter ?? 0).filter(x => Number.isFinite(x)),
  )
  const insolvent = snaps.some(s => (s.insolvencyWriteOff ?? 0) > 0)
  return {
    netBtc,
    totalBtc: last.totalBtc,
    debtUsd: last.totalDebt,
    maxLtv,
    insolvent,
    finalPrice,
  }
}

/** HODL net BTC for the same price path + cash-flow assumptions as `params`. */
function hodlNetBtcFor(
  params: SimulationParams,
  priceProjection: PriceProjectionResult,
): number {
  // Run the sim once purely to borrow its month→price mapping, so HODL and
  // strategy are evaluated on an identical price path.
  const sim = simulateRollingLoan(params, priceProjection)
  const hodl = computeHodlBaseline({
    initialBtcAmount: params.initialBtcAmount,
    monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
    annualSavingsIncrease: params.annualSavingsIncrease,
    simulationMonths: params.simulationMonths || 0,
    priceForMonth: m => sim.getBtcPriceForMonth(m),
  })
  return hodl.finalBtc
}

/** Apply a strategy config onto base params, keeping everything else fixed. */
function withStrategyConfig(
  base: SimulationParams,
  cfg: {
    loanAmountPercent: number
    loanTermMonths: number
    annualInterestRate: number
    targetLtv?: number
  },
): SimulationParams {
  return {
    ...base,
    loanAmountPercent: cfg.loanAmountPercent,
    loanTermMonths: cfg.loanTermMonths,
    annualInterestRate: cfg.annualInterestRate,
    riskManagement: {
      ...base.riskManagement,
      annualInterestRate: cfg.annualInterestRate,
      loanTermMonths: cfg.loanTermMonths === Infinity ? "infinity" : cfg.loanTermMonths,
      targetLtv: cfg.targetLtv ?? base.riskManagement.targetLtv,
    },
  }
}

const isSameConfig = (
  a: { loanAmountPercent: number; loanTermMonths: number; annualInterestRate: number },
  b: { loanAmountPercent: number; loanTermMonths: number; annualInterestRate: number },
) =>
  a.loanAmountPercent === b.loanAmountPercent &&
  a.loanTermMonths === b.loanTermMonths &&
  Math.abs(a.annualInterestRate - b.annualInterestRate) < 1e-6

// ─── Optimizer: full grid sweep ───────────────────────────────────────────

/**
 * Sweep every (loanPct × loanTerm × interestRate) combination and return the
 * ranked results (best outperformance first).
 */
export function runStrategySweep(
  baseParams: SimulationParams,
  priceProjection: PriceProjectionResult | null,
  axes: SweepAxes,
): SweepResultRow[] {
  if (!priceProjection || priceProjection.projectionPoints.length === 0) return []

  // HODL net BTC is independent of strategy config — compute once.
  const hodlNetBtc = hodlNetBtcFor(baseParams, priceProjection)

  const current = {
    loanAmountPercent: baseParams.loanAmountPercent,
    loanTermMonths:
      baseParams.loanTermMonths === Infinity
        ? Infinity
        : baseParams.loanTermMonths,
    annualInterestRate: baseParams.annualInterestRate,
  }

  const rows: SweepResultRow[] = []
  for (const lp of axes.loanAmountPercent) {
    for (const lt of axes.loanTermMonths) {
      for (const ir of axes.annualInterestRate) {
        const cfg = { loanAmountPercent: lp, loanTermMonths: lt, annualInterestRate: ir }
        const params = withStrategyConfig(baseParams, cfg)
        const outcome = runOne(params, priceProjection)
        const outperformanceBtc = outcome.netBtc - hodlNetBtc
        rows.push({
          ...cfg,
          ...outcome,
          hodlNetBtc,
          outperformanceBtc,
          outperformancePct:
            hodlNetBtc > 0 ? (outcome.netBtc / hodlNetBtc - 1) * 100 : 0,
          isCurrent: isSameConfig(cfg, current),
        })
      }
    }
  }

  rows.sort((a, b) => b.outperformanceBtc - a.outperformanceBtc)
  return rows
}

// ─── Scenario comparison: named variants ──────────────────────────────────

/**
 * Compare the user's current config against the four built-in risk-level
 * presets (Conservative / Moderate / Optimistic / Moonshots). All variants
 * run on the same fixed price projection.
 */
export function runRiskLevelComparison(
  baseParams: SimulationParams,
  priceProjection: PriceProjectionResult | null,
): ScenarioRow[] {
  if (!priceProjection || priceProjection.projectionPoints.length === 0) return []

  const hodlNetBtc = hodlNetBtcFor(baseParams, priceProjection)
  const current = {
    loanAmountPercent: baseParams.loanAmountPercent,
    loanTermMonths:
      baseParams.loanTermMonths === Infinity ? Infinity : baseParams.loanTermMonths,
    annualInterestRate: baseParams.annualInterestRate,
  }

  const rows: ScenarioRow[] = []

  const mkRow = (
    name: string,
    cfg: {
      loanAmountPercent: number
      loanTermMonths: number
      annualInterestRate: number
      targetLtv: number
    },
    isCurrent: boolean,
  ): ScenarioRow => {
    const params = withStrategyConfig(baseParams, cfg)
    const outcome = runOne(params, priceProjection)
    return {
      name,
      ...cfg,
      ...outcome,
      hodlNetBtc,
      outperformanceBtc: outcome.netBtc - hodlNetBtc,
      outperformancePct:
        hodlNetBtc > 0 ? (outcome.netBtc / hodlNetBtc - 1) * 100 : 0,
      isCurrent,
    }
  }

  // Current config first
  rows.push(
    mkRow(
      "Current config",
      {
        loanAmountPercent: current.loanAmountPercent,
        loanTermMonths: current.loanTermMonths,
        annualInterestRate: current.annualInterestRate,
        targetLtv: baseParams.riskManagement.targetLtv,
      },
      true,
    ),
  )

  // Risk-level presets — loan term comes from the firefish column (the
  // simulator's default platform). 'infinity' maps to Infinity.
  for (const level of ["conservative", "moderate", "optimistic", "moonshots"] as RiskLevel[]) {
    const p = RISK_LEVEL_PRESETS[level]
    const term = p.loanTermMonths.firefish
    const cfg = {
      loanAmountPercent: p.loanAmountPercent,
      loanTermMonths: term === "infinity" ? Infinity : term,
      annualInterestRate: p.annualInterestRate,
      targetLtv: p.targetLtv,
    }
    rows.push(mkRow(p.name, cfg, isSameConfig(cfg, current)))
  }

  return rows
}

// ─── Default sweep axes ───────────────────────────────────────────────────

/**
 * Sensible default grid centred on realistic Rolling Loan parameters.
 * The Optimizer uses this unless the user narrows it.
 */
export const DEFAULT_SWEEP_AXES: SweepAxes = {
  loanAmountPercent: [5, 10, 15, 20, 25, 30, 35, 40],
  loanTermMonths: [12, 24, Infinity],
  annualInterestRate: [9.0],
}
