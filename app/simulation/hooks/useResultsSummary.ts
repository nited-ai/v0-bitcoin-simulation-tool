import { useMemo } from "react"
import type { MonthlyResult } from "../types/simulation"

/**
 * Summary data interface
 */
export interface ResultsSummary {
  firstLiquidationMonth: number | null
  maxDebt: number
  finalCollateralValue: number
  finalNetWorth: number
  finalBtcAmount: number
}

/**
 * Hook to calculate results summary
 * 
 * Calculates key metrics from simulation results including first liquidation,
 * maximum debt, final collateral value, net worth, and BTC amount.
 */
export function useResultsSummary(results: MonthlyResult[]): ResultsSummary | null {
  return useMemo(() => {
    if (results.length === 0) return null
    
    const firstLiquidation = results.find((r) => r.events.some((e) => e.type === "liquidated"))
    const maxDebt = Math.max(...results.map((r) => r.totalDebt))
    const finalResult = results[results.length - 1]
    
    return {
      firstLiquidationMonth: firstLiquidation?.month || null,
      maxDebt,
      finalCollateralValue: finalResult.collateralValue,
      finalNetWorth: finalResult.collateralValue - finalResult.totalDebt,
      finalBtcAmount: finalResult.currentBtcAmount,
    }
  }, [results])
}
