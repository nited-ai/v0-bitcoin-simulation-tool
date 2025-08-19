"use client"

import { useMemo } from "react"
import type { SimulationParams } from "../types/simulation"
import { getPlatformConfig } from "../constants/platformPresets"

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

    // Get platform configuration for validation
    const platformConfig = getPlatformConfig(params.platform)

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

    // Monthly Savings/Withdrawal Validation
    const calculatedLoanAmountForValidation = (params.loanAmountPercent / 100) * (params.btcAmount * params.initialBtcPrice)
    if (Math.abs(params.monthlyWithdrawalAmount) > calculatedLoanAmountForValidation) {
      warnings.push({
        field: "monthlyWithdrawalAmount",
        message: "Monthly savings/withdrawal amount exceeds loan amount",
        severity: "warning"
      })
    } else if (params.monthlyWithdrawalAmount < 0) {
      // Negative values are withdrawals
      const totalCollateralValue = params.btcAmount * params.initialBtcPrice
      const maxSafeWithdrawal = totalCollateralValue * 0.1 // 10% of collateral per month

      if (Math.abs(params.monthlyWithdrawalAmount) > maxSafeWithdrawal) {
        warnings.push({
          field: "monthlyWithdrawalAmount",
          message: "High withdrawal rate may increase liquidation risk",
          severity: "warning"
        })
      }
    } else if (params.monthlyWithdrawalAmount > 0) {
      // Positive values are savings - validate reasonable savings amounts
      const totalCollateralValue = params.btcAmount * params.initialBtcPrice
      const maxReasonableSavings = totalCollateralValue * 0.2 // 20% of collateral per month

      if (params.monthlyWithdrawalAmount > maxReasonableSavings) {
        warnings.push({
          field: "monthlyWithdrawalAmount",
          message: "Very high monthly savings rate - ensure this is sustainable",
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
    if (params.originationFeePercent < 0) {
      errors.push({
        field: "originationFeePercent",
        message: "Origination fee cannot be negative",
        severity: "error"
      })
    } else if (params.originationFeePercent > 10) {
      warnings.push({
        field: "originationFeePercent",
        message: "Very high origination fee - check if this is realistic",
        severity: "warning"
      })
    }

    // Loan Amount Percentage Validation
    if (params.loanAmountPercent <= 0) {
      errors.push({
        field: "loanAmountPercent",
        message: "Loan amount percentage must be greater than 0",
        severity: "error"
      })
    } else if (params.loanAmountPercent > 100) {
      errors.push({
        field: "loanAmountPercent",
        message: "Loan amount percentage cannot exceed 100%",
        severity: "error"
      })
    } else if (params.loanAmountPercent < 5) {
      warnings.push({
        field: "loanAmountPercent",
        message: "Very low loan amount percentage may limit strategy effectiveness",
        severity: "warning"
      })
    } else if (params.loanAmountPercent > 50) {
      warnings.push({
        field: "loanAmountPercent",
        message: "High loan amount percentage increases risk significantly",
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

    // Platform-specific LTV validation
    if (params.riskManagement.targetLtv > platformConfig.maxInitialLtv) {
      errors.push({
        field: "riskManagement.targetLtv",
        message: `Initial LTV cannot exceed ${platformConfig.maxInitialLtv}% for ${platformConfig.name} platform`,
        severity: "error"
      })
    }

    // Platform-specific loan term validation
    const currentLoanTerm = params.loanTermMonths === Infinity ? 'infinity' : params.loanTermMonths
    const isValidLoanTerm = platformConfig.availableLoanTerms.includes(currentLoanTerm)

    if (!isValidLoanTerm) {
      warnings.push({
        field: "loanTermMonths",
        message: `Selected loan term (${currentLoanTerm === 'infinity' ? 'Infinity' : currentLoanTerm + ' months'}) is not available for ${platformConfig.name} platform`,
        severity: "warning"
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
    const calculatedLoanAmount = (params.loanAmountPercent / 100) * totalCollateralValue

    if (calculatedLoanAmount > maxPossibleLoan * 2) {
      warnings.push({
        field: "loanAmountPercent",
        message: "Loan amount is much higher than collateral value allows at current LTV",
        severity: "warning"
      })
    }

    // Collateral Sufficiency Validation - FIXED to use totalLoanCost
    const currentLoanAmount = calculatedLoanAmount
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)

    // Calculate total interest over loan term
    const monthlyInterestRate = params.annualInterestRate / 100 / 12
    const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate
    const totalInterestPayment = params.loanTermMonths === Infinity
      ? monthlyInterestPayment * 12
      : monthlyInterestPayment * params.loanTermMonths

    // CORRECTED: Use total loan cost (principal + origination fee + total interest)
    const totalLoanCost = currentLoanAmount + originationFee + totalInterestPayment
    const btcLockedAsCollateral = totalLoanCost / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice

    if (btcLockedAsCollateral > params.btcAmount) {
      const shortfall = btcLockedAsCollateral - params.btcAmount
      errors.push({
        field: "collateralSufficiency",
        message: `Insufficient collateral: Need ${btcLockedAsCollateral.toFixed(4)} BTC but only have ${params.btcAmount.toFixed(4)} BTC available (shortfall: ${shortfall.toFixed(4)} BTC). Total loan cost: $${totalLoanCost.toLocaleString()} (includes $${totalInterestPayment.toFixed(0)} interest over ${params.loanTermMonths === Infinity ? 'infinite' : params.loanTermMonths} months)`,
        severity: "error"
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
