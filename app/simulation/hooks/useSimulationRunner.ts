"use client"

import { useCallback } from "react"
import { runStrategySimulation } from "@/src/modules/strategies"
import type { StrategyEngineParams, MonthlyResult as StrategyMonthlyResult } from "@/src/modules/strategies/types"
import type { MonthlyResult } from "../types/simulation"
import { useSimulation } from "../context/SimulationContext"
import { usePriceGeneration } from "./usePriceGeneration"
import { useCentralizedData } from "./useCentralizedData"

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

  // Enable both historical data loading and price generation when simulation runner is used
  useCentralizedData(true)
  usePriceGeneration(true)

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
        loanAmountPercent: params.loanAmountPercent, // Target loan amount as percentage of BTC stack
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

      console.log("🚀 Running strategy simulation with params:", {
        strategy: params.investmentStrategy,
        btcAmount: params.initialBtcAmount,
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
      // CRITICAL FIX: Map property names between different MonthlyResult type definitions
      const convertedResults: MonthlyResult[] = strategyResults.map(result => ({
        // Core identification
        month: result.month,
        dateString: result.date, // ✅ CRITICAL: Map "date" → "dateString" for app compatibility

        // Price and BTC data
        btcPrice: result.btcPrice,
        currentBtcAmount: result.totalBtcAmount, // Map totalBtcAmount → currentBtcAmount

        // Portfolio values
        collateralValue: result.collateralValue,
        realCollateralValue: result.collateralValue, // Use same value for real collateral
        totalDebt: result.totalDebt,
        realTotalDebt: result.totalDebt, // Use same value for real debt

        // Loan and withdrawal data
        withdrawalAmount: result.monthlyWithdrawal,
        newLoanPrincipal: result.principalForNeeds + result.principalForReinvestment,
        repaymentsDue: result.repaymentDue,
        reinvestment: result.principalForReinvestment,

        // BTC breakdown
        freeBtc: result.totalBtcAmount - (result.activeLoans?.reduce((sum, loan) => sum + loan.lockedBtc, 0) || 0),
        lockedBtc: result.activeLoans?.reduce((sum, loan) => sum + loan.lockedBtc, 0) || 0,

        // Loan metrics
        loanCount: result.activeLoans?.length || 0,
        highestLtv: result.highestLtv,
        maxSafeDebt: result.maxSafeDebt,

        // Events
        events: result.events || [],

        // Add any missing fields that exist in MonthlyResult but not in StrategyMonthlyResult
        liquidatedBtc: 0, // This field might exist in MonthlyResult but not in StrategyMonthlyResult
      }))

      // Debug logging to verify Power Law price integration
      const firstResult = convertedResults[0]
      const lastResult = convertedResults[convertedResults.length - 1]

      console.log("✅ Strategy simulation completed:", {
        resultsCount: convertedResults.length,
        finalMonth: lastResult?.month,
        priceGrowth: {
          startPrice: firstResult?.btcPrice,
          endPrice: lastResult?.btcPrice,
          growthFactor: lastResult?.btcPrice && firstResult?.btcPrice
            ? (lastResult.btcPrice / firstResult.btcPrice).toFixed(2) + 'x'
            : 'N/A'
        },
        portfolioGrowth: {
          startValue: firstResult?.collateralValue,
          endValue: lastResult?.collateralValue,
          growthFactor: lastResult?.collateralValue && firstResult?.collateralValue
            ? (lastResult.collateralValue / firstResult.collateralValue).toFixed(2) + 'x'
            : 'N/A'
        },
        dateRange: {
          start: firstResult?.dateString,
          end: lastResult?.dateString
        }
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
    return priceChartData.length === 0 || !params.initialBtcAmount || params.initialBtcAmount <= 0
  }, [priceChartData.length, params.initialBtcAmount])

  /**
   * Get simulation status
   */
  const getSimulationStatus = useCallback(() => {
    if (priceChartData.length === 0) {
      return "waiting_for_data"
    }
    if (params.initialBtcAmount <= 0) {
      return "invalid_params"
    }
    return "ready"
  }, [priceChartData.length, params.initialBtcAmount])

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
