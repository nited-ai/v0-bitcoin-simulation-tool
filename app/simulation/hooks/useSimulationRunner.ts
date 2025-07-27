"use client"

import { useCallback } from "react"
import { runStrategySimulation } from "@/lib/strategy-engine"
import type { StrategyEngineParams, MonthlyResult as StrategyMonthlyResult } from "@/lib/strategy-engine"
import type { MonthlyResult } from "../types/simulation"
import { useSimulation } from "../context/SimulationContext"

/**
 * Hook for running strategy simulations
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
    priceChartData,
    historicalPriceData,
  } = useSimulation()

  /**
   * Run the strategy simulation with current parameters
   */
  const runSimulation = useCallback(async () => {
    if (priceChartData.length === 0) {
      addError("Price chart data not available. Please wait for data to load.")
      return
    }

    setIsLoading(true)
    clearErrors()

    try {
      // Calculate actual max loan amount from percentage of BTC stack value
      const btcStackValue = params.btcAmount * params.initialBtcPrice
      const calculatedMaxLoanAmount = (params.maxLoanAmountPercent / 100) * btcStackValue

      // Prepare strategy parameters
      const strategyParams: StrategyEngineParams = {
        btcAmount: params.btcAmount,
        initialBtcPrice: params.initialBtcPrice,
        monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
        annualInterestRate: params.annualInterestRate,
        loanOriginationFeePercent: params.loanOriginationFeePercent,
        loanTermMonths: params.loanTermMonths,
        simulationMonths: params.simulationMonths,
        maxLoanAmount: calculatedMaxLoanAmount, // Use calculated amount instead of params.maxLoanAmount
        riskManagement: params.riskManagement,
        investmentStrategy: params.investmentStrategy,
        athBasedParams: params.athBasedParams,
        movingAverageParams: params.movingAverageParams,
        athCollateralParams: params.athCollateralParams,
      }

      console.log("🚀 Running strategy simulation with params:", {
        strategy: params.investmentStrategy,
        btcAmount: params.btcAmount,
        simulationMonths: params.simulationMonths,
        priceDataPoints: priceChartData.length,
      })

      // Run the strategy simulation
      const strategyResults = await runStrategySimulation(
        strategyParams,
        priceChartData,
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
    priceChartData,
    historicalPriceData,
    setResults,
    setIsLoading,
    addError,
    clearErrors,
  ])

  /**
   * Check if simulation can be run
   */
  const canRunSimulation = useCallback(() => {
    return priceChartData.length > 0 && !params.btcAmount || params.btcAmount <= 0
  }, [priceChartData.length, params.btcAmount])

  /**
   * Get simulation status
   */
  const getSimulationStatus = useCallback(() => {
    if (priceChartData.length === 0) {
      return "waiting_for_data"
    }
    if (params.btcAmount <= 0) {
      return "invalid_params"
    }
    return "ready"
  }, [priceChartData.length, params.btcAmount])

  return {
    runSimulation,
    canRunSimulation,
    getSimulationStatus,
  }
}

/**
 * Hook for automatic simulation running
 * 
 * Automatically runs simulation when parameters or price data changes.
 * Includes debouncing to prevent excessive simulation runs.
 */
export function useAutoSimulation() {
  const { runSimulation } = useSimulationRunner()
  const { params, priceChartData, isLoading } = useSimulation()

  // Auto-run simulation when key parameters change
  // This would typically use useEffect with dependencies, but we'll keep it simple for now
  const triggerAutoSimulation = useCallback(() => {
    if (!isLoading && priceChartData.length > 0) {
      // Add a small delay to debounce rapid parameter changes
      const timeoutId = setTimeout(() => {
        runSimulation()
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [runSimulation, isLoading, priceChartData.length])

  return {
    triggerAutoSimulation,
  }
}
