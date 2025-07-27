"use client"

import { useMemo } from "react"
import type { SimulationParams } from "../types/simulation"

export interface ValidationError {
  field: keyof SimulationParams | string
  message: string
  severity: "error" | "warning" | "info"
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  infos: ValidationError[]
}

/**
 * Hook for comprehensive parameter validation
 * 
 * Provides real-time validation of simulation parameters with detailed
 * error messages, warnings, and informational feedback.
 */
export function useParameterValidation(params: SimulationParams): ValidationResult {
  return useMemo(() => {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const infos: ValidationError[] = []

    // BTC Amount Validation
    if (params.btcAmount <= 0) {
      errors.push({
        field: "btcAmount",
        message: "BTC amount must be greater than 0",
        severity: "error"
      })
    } else if (params.btcAmount < 0.001) {
      errors.push({
        field: "btcAmount",
        message: "BTC amount must be at least 0.001 BTC",
        severity: "error"
      })
    } else if (params.btcAmount > 1000) {
      warnings.push({
        field: "btcAmount",
        message: "Very large BTC amount - ensure this is intentional",
        severity: "warning"
      })
    } else if (params.btcAmount < 0.1) {
      infos.push({
        field: "btcAmount",
        message: "Small BTC amount may limit loan opportunities",
        severity: "info"
      })
    }

    // Initial BTC Price Validation
    if (params.initialBtcPrice <= 0) {
      errors.push({
        field: "initialBtcPrice",
        message: "BTC price must be greater than 0",
        severity: "error"
      })
    } else if (params.initialBtcPrice < 1000) {
      errors.push({
        field: "initialBtcPrice",
        message: "BTC price seems unrealistically low (minimum €1,000)",
        severity: "error"
      })
    } else if (params.initialBtcPrice > 10000000) {
      warnings.push({
        field: "initialBtcPrice",
        message: "Very high BTC price - ensure this is realistic",
        severity: "warning"
      })
    } else if (params.initialBtcPrice < 10000) {
      warnings.push({
        field: "initialBtcPrice",
        message: "BTC price is below historical lows",
        severity: "warning"
      })
    }

    // Monthly Withdrawal Validation
    if (params.monthlyWithdrawalAmount < 0) {
      errors.push({
        field: "monthlyWithdrawalAmount",
        message: "Monthly withdrawal cannot be negative",
        severity: "error"
      })
    } else if (params.monthlyWithdrawalAmount > params.maxLoanAmount) {
      warnings.push({
        field: "monthlyWithdrawalAmount",
        message: "Monthly withdrawal exceeds max loan amount",
        severity: "warning"
      })
    } else if (params.monthlyWithdrawalAmount > 0) {
      const totalCollateralValue = params.btcAmount * params.initialBtcPrice
      const maxSafeWithdrawal = totalCollateralValue * 0.1 // 10% of collateral per month
      
      if (params.monthlyWithdrawalAmount > maxSafeWithdrawal) {
        warnings.push({
          field: "monthlyWithdrawalAmount",
          message: "High withdrawal rate may increase liquidation risk",
          severity: "warning"
        })
      }
    }

    // Loan Term Validation
    if (params.loanTermMonths <= 0) {
      errors.push({
        field: "loanTermMonths",
        message: "Loan term must be at least 1 month",
        severity: "error"
      })
    } else if (params.loanTermMonths > 60) {
      warnings.push({
        field: "loanTermMonths",
        message: "Very long loan terms may not be available",
        severity: "warning"
      })
    } else if (params.loanTermMonths < 3) {
      infos.push({
        field: "loanTermMonths",
        message: "Short loan terms require frequent refinancing",
        severity: "info"
      })
    }

    // Interest Rate Validation
    if (params.annualInterestRate < 0) {
      errors.push({
        field: "annualInterestRate",
        message: "Interest rate cannot be negative",
        severity: "error"
      })
    } else if (params.annualInterestRate > 50) {
      warnings.push({
        field: "annualInterestRate",
        message: "Very high interest rate - check if this is realistic",
        severity: "warning"
      })
    } else if (params.annualInterestRate < 1) {
      warnings.push({
        field: "annualInterestRate",
        message: "Very low interest rate - may not be available",
        severity: "warning"
      })
    } else if (params.annualInterestRate > 15) {
      warnings.push({
        field: "annualInterestRate",
        message: "High interest rate will increase costs significantly",
        severity: "warning"
      })
    }

    // Origination Fee Validation
    if (params.loanOriginationFeePercent < 0) {
      errors.push({
        field: "loanOriginationFeePercent",
        message: "Origination fee cannot be negative",
        severity: "error"
      })
    } else if (params.loanOriginationFeePercent > 10) {
      warnings.push({
        field: "loanOriginationFeePercent",
        message: "Very high origination fee - check if this is realistic",
        severity: "warning"
      })
    }

    // Max Loan Amount Percentage Validation
    if (params.maxLoanAmountPercent <= 0) {
      errors.push({
        field: "maxLoanAmountPercent",
        message: "Max loan amount percentage must be greater than 0",
        severity: "error"
      })
    } else if (params.maxLoanAmountPercent > 100) {
      errors.push({
        field: "maxLoanAmountPercent",
        message: "Max loan amount percentage cannot exceed 100%",
        severity: "error"
      })
    } else if (params.maxLoanAmountPercent < 5) {
      warnings.push({
        field: "maxLoanAmountPercent",
        message: "Very low max loan amount percentage may limit strategy effectiveness",
        severity: "warning"
      })
    } else if (params.maxLoanAmountPercent > 50) {
      warnings.push({
        field: "maxLoanAmountPercent",
        message: "High max loan amount percentage increases risk significantly",
        severity: "warning"
      })
    }

    // Risk Management Validation
    if (params.riskManagement.targetLtv <= 0 || params.riskManagement.targetLtv >= 100) {
      errors.push({
        field: "riskManagement.targetLtv",
        message: "Target LTV must be between 0% and 100%",
        severity: "error"
      })
    }

    if (params.riskManagement.liquidationLtv <= 0 || params.riskManagement.liquidationLtv > 100) {
      errors.push({
        field: "riskManagement.liquidationLtv",
        message: "Liquidation LTV must be between 0% and 100%",
        severity: "error"
      })
    }

    if (params.riskManagement.targetLtv >= params.riskManagement.liquidationLtv) {
      errors.push({
        field: "riskManagement",
        message: "Target LTV must be lower than liquidation LTV",
        severity: "error"
      })
    }

    // Cross-parameter validations
    const totalCollateralValue = params.btcAmount * params.initialBtcPrice
    const maxPossibleLoan = totalCollateralValue * (params.riskManagement.targetLtv / 100)
    const calculatedMaxLoanAmount = (params.maxLoanAmountPercent / 100) * totalCollateralValue

    if (calculatedMaxLoanAmount > maxPossibleLoan * 2) {
      warnings.push({
        field: "maxLoanAmountPercent",
        message: "Max loan amount is much higher than collateral value allows at current LTV",
        severity: "warning"
      })
    }

    // Simulation Duration Validation
    if (params.simulationMonths <= 0) {
      errors.push({
        field: "simulationMonths",
        message: "Simulation duration must be at least 1 month",
        severity: "error"
      })
    } else if (params.simulationMonths > 600) {
      warnings.push({
        field: "simulationMonths",
        message: "Very long simulation may be unrealistic",
        severity: "warning"
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
    }
  }, [params])
}

/**
 * Hook for getting validation summary
 */
export function useValidationSummary(params: SimulationParams) {
  const validation = useParameterValidation(params)
  
  return useMemo(() => ({
    hasErrors: validation.errors.length > 0,
    hasWarnings: validation.warnings.length > 0,
    hasInfos: validation.infos.length > 0,
    totalIssues: validation.errors.length + validation.warnings.length,
    canSimulate: validation.isValid,
    summary: validation.isValid 
      ? "Parameters are valid" 
      : `${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`,
  }), [validation])
}
