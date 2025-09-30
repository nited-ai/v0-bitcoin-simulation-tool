"use client"

import { useCallback } from "react"
import { runStrategySimulation } from "@/src/modules/strategies"
import type { StrategyEngineParams, MonthlyResult as StrategyMonthlyResult } from "@/src/modules/strategies/types"
import type { MonthlyResult } from "../types/simulation"
import { useSimulation } from "../context/SimulationContext"
import { usePriceGeneration } from "./usePriceGeneration"
import { useCentralizedData } from "./useCentralizedData"
import { PriceProjectionAdapter } from "@/src/modules/shared/adapters/PriceProjectionAdapter"

/**
 * Hook for running strategy simulations
 *
 * Phase 3 Migration: Now uses priceProjection (new format) instead of priceChartData (legacy format)
 *
 * Handles the execution of strategy simulations with proper error handling
 * and loading state management. Converts strategy results to simulation results.
 */
export function useSimulationRunner() {
  const {
    params,
    setResults,
    setIsLoading,
    addError,
    clearErrors,
    priceProjection, // Phase 3 Migration: Use new format
    priceChartData, // @deprecated - Keep for backward compatibility during migration
    historicalPriceData,
  } = useSimulation()

  // Enable both historical data loading and price generation when simulation runner is used
  useCentralizedData(true)
  usePriceGeneration(true)

  /**
   * Run the strategy simulation with current parameters
   *
   * Phase 3 Migration: Uses priceProjection and converts to strategy format
   */
  const runSimulation = useCallback(async () => {
    // Phase 3 Migration: Check for priceProjection first, fallback to priceChartData
    const hasPriceData = priceProjection ? priceProjection.projectionPoints.length > 0 : priceChartData.length > 0

    if (!hasPriceData) {
      addError("Price projection data not available. Please wait for data to load.")
      return
    }

    setIsLoading(true)
    clearErrors()

    try {
      // Calculate actual loan amount from percentage of BTC stack value
      const btcStackValue = params.initialBtcAmount * params.initialBtcPrice
      const calculatedLoanAmount = (params.loanAmountPercent / 100) * btcStackValue

      // Prepare strategy parameters
      const strategyParams: StrategyEngineParams = {
        btcAmount: params.initialBtcAmount,
        initialBtcPrice: params.initialBtcPrice,
        monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
        annualInterestRate: params.annualInterestRate,
        loanOriginationFeePercent: params.originationFeePercent, // Updated field name for consistency
        loanTermMonths: params.loanTermMonths,
        simulationMonths: params.simulationMonths,
        maxLoanAmount: calculatedLoanAmount, // Use calculated amount instead of params.maxLoanAmount
        expectedAnnualInflation: 3.0, // Default 3% annual inflation
        btcAccumulation: (params as any).btcAccumulation ?? true, // Default to true if not set
        riskManagement: {
          targetLtv: params.riskManagement.targetLtv,
          liquidationLtv: params.riskManagement.liquidationLtv,
          maxLoanAmount: calculatedLoanAmount,
          liquidationFeePercent: params.liquidationFeePercent || 5,
          annualInterestRate: params.annualInterestRate,
        },
        investmentStrategy: params.investmentStrategy,
        athBasedParams: params.athBasedParams,
        movingAverageParams: params.movingAverageParams,
        athCollateralParams: params.athCollateralParams,
      }

      // Phase 3 Migration: Convert priceProjection to legacy chart format for strategy engine
      let strategyPriceData
      if (priceProjection) {
        console.log(`🎯 [Phase 3 Migration] Converting priceProjection to legacy format: ${priceProjection.modelName} (${priceProjection.projectionPoints.length} points)`)
        strategyPriceData = PriceProjectionAdapter.toLegacyFormat(priceProjection, historicalPriceData)
      } else {
        console.warn(`⚠️ [Phase 3 Migration] Falling back to legacy priceChartData (${priceChartData.length} points)`)
        strategyPriceData = priceChartData
      }

      console.log("🚀 Running strategy simulation with params:", {
        strategy: params.investmentStrategy,
        btcAmount: params.initialBtcAmount,
        simulationMonths: params.simulationMonths,
        priceDataPoints: strategyPriceData.length,
        usingNewFormat: !!priceProjection
      })

      // Run the strategy simulation
      const strategyResults = await runStrategySimulation(
        strategyParams,
        strategyPriceData,
        historicalPriceData
      )

      // Convert StrategyMonthlyResult to MonthlyResult
      const convertedResults: MonthlyResult[] = strategyResults.map(result => ({
        ...result,
        // Add any missing fields that exist in MonthlyResult but not in StrategyMonthlyResult
        liquidatedBtc: 0, // This field might exist in MonthlyResult but not in StrategyMonthlyResult
      }))

      console.log("✅ Strategy simulation completed:", {
        resultsCount: convertedResults.length,
        finalMonth: convertedResults[convertedResults.length - 1]?.month,
      })

      setResults(convertedResults)
    } catch (error) {
      console.error("❌ Strategy simulation failed:", error)
      addError("Strategy simulation failed. Please check your parameters and try again.")
    } finally {
      setIsLoading(false)
    }
  }, [
    params,
    priceProjection, // Phase 3 Migration: Use new format
    priceChartData, // Keep for backward compatibility
    historicalPriceData,
    setResults,
    setIsLoading,
    addError,
    clearErrors,
  ])

  /**
   * Check if simulation can be run
   *
   * Phase 3 Migration: Check priceProjection first, fallback to priceChartData
   */
  const canRunSimulation = useCallback(() => {
    const hasPriceData = priceProjection ? priceProjection.projectionPoints.length > 0 : priceChartData.length > 0
    return !hasPriceData || !params.initialBtcAmount || params.initialBtcAmount <= 0
  }, [priceProjection, priceChartData.length, params.initialBtcAmount])

  /**
   * Get simulation status
   *
   * Phase 3 Migration: Check priceProjection first, fallback to priceChartData
   */
  const getSimulationStatus = useCallback(() => {
    const hasPriceData = priceProjection ? priceProjection.projectionPoints.length > 0 : priceChartData.length > 0

    if (!hasPriceData) {
      return "waiting_for_data"
    }
    if (params.initialBtcAmount <= 0) {
      return "invalid_params"
    }
    return "ready"
  }, [priceProjection, priceChartData.length, params.initialBtcAmount])

  return {
    runSimulation,
    canRunSimulation,
    getSimulationStatus,
  }
}

/**
 * Hook for automatic simulation running
 *
 * Phase 3 Migration: Uses priceProjection instead of priceChartData
 *
 * Automatically runs simulation when parameters or price data changes.
 * Includes debouncing to prevent excessive simulation runs.
 */
export function useAutoSimulation() {
  const { runSimulation } = useSimulationRunner()
  const { params, priceProjection, priceChartData, isLoading } = useSimulation()

  // Auto-run simulation when key parameters change
  // This would typically use useEffect with dependencies, but we'll keep it simple for now
  const triggerAutoSimulation = useCallback(() => {
    // Phase 3 Migration: Check priceProjection first, fallback to priceChartData
    const hasPriceData = priceProjection ? priceProjection.projectionPoints.length > 0 : priceChartData.length > 0

    if (!isLoading && hasPriceData) {
      // Add a small delay to debounce rapid parameter changes
      const timeoutId = setTimeout(() => {
        runSimulation()
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [runSimulation, isLoading, priceProjection, priceChartData.length])

  return {
    triggerAutoSimulation,
  }
}
