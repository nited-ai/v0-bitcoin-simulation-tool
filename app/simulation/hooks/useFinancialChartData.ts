import { useMemo } from "react"
import type { MonthlyResult } from "../types/simulation"

/**
 * Financial chart data point interface
 */
export interface FinancialChartDataPoint {
  date: string
  collateralValue: number
  lockedCollateralValue: number
  totalDebt: number
  btcPrice: number
}

/**
 * Hook to generate financial chart data
 * 
 * Creates chart data from simulation results showing the relationship between
 * collateral value, locked collateral, total debt, and BTC price over time.
 */
export function useFinancialChartData(results: MonthlyResult[]): FinancialChartDataPoint[] {
  return useMemo(() => {
    if (results.length === 0) return []

    // Create chart data directly from simulation results
    return results.map((result) => ({
      date: result.dateString,
      collateralValue: result.collateralValue,
      lockedCollateralValue: result.lockedBtc * result.btcPrice,
      totalDebt: result.totalDebt,
      btcPrice: result.btcPrice,
    }))
  }, [results])
}
