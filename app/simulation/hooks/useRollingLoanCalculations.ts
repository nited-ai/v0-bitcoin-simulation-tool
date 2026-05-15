"use client"

/**
 * Thin React wrapper around the pure `simulateRollingLoan` service.
 *
 * Until recently this file owned ~700 lines of inline simulation logic
 * that diverged from `StrategyExecutionService`'s parallel implementation.
 * The math has been moved to `src/modules/strategies/services/simulateRollingLoan.ts`
 * so both this hook (driving DetailedResultsTable / HeadlineComparison /
 * StrategyResultsChart) and `useSimulationRunner` (driving Summary cards
 * via the legacy `results: MonthlyResult[]`) call the SAME function.
 * Result: no more cross-component number drift.
 *
 * The type names are re-exported here so existing imports keep working.
 */

import { useMemo } from "react"
import { useSimulation } from "../context/SimulationContext"
import {
  simulateRollingLoan,
  type RollingLoanSimulationResult,
} from "@/src/modules/strategies/services/simulateRollingLoan"

export type {
  RolloverResult,
  MonthlyResultRow,
  MonthlySnapshot,
  StrategyChartPoint,
  RollingLoanSimulationResult,
} from "@/src/modules/strategies/services/simulateRollingLoan"

export function useRollingLoanCalculations(): RollingLoanSimulationResult {
  const { params, priceProjection } = useSimulation()
  return useMemo(
    () => simulateRollingLoan(params, priceProjection),
    [params, priceProjection],
  )
}
