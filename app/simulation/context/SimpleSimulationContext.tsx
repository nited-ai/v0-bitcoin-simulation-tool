"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

/**
 * Simplified Simulation Context
 * 
 * This is a minimal version without complex useEffect dependencies
 * that might cause infinite loops. We'll build up complexity gradually.
 */

// Basic types
interface BasicParams {
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  loanTermMonths: number
  simulationMonths: number
}

interface SimpleSimulationContextType {
  // Basic state
  params: BasicParams
  setParams: (params: BasicParams | ((prev: BasicParams) => BasicParams)) => void
  
  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  
  // Errors
  errors: string[]
  setErrors: (errors: string[]) => void
  addError: (error: string) => void
  clearErrors: () => void
}

const SimpleSimulationContext = createContext<SimpleSimulationContextType | undefined>(undefined)

export function useSimpleSimulation() {
  const context = useContext(SimpleSimulationContext)
  if (context === undefined) {
    throw new Error('useSimpleSimulation must be used within a SimpleSimulationProvider')
  }
  return context
}

const DEFAULT_PARAMS: BasicParams = {
  btcAmount: 1,
  initialBtcPrice: 100000,
  monthlyWithdrawalAmount: 0,
  annualInterestRate: 6.5,
  loanTermMonths: 6,
  simulationMonths: 144,
}

interface SimpleSimulationProviderProps {
  children: ReactNode
}

export function SimpleSimulationProvider({ children }: SimpleSimulationProviderProps) {
  // Basic state without complex initialization
  const [params, setParams] = useState<BasicParams>(DEFAULT_PARAMS)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Simple actions
  const addError = (error: string) => {
    setErrors(prev => [...prev, error])
  }

  const clearErrors = () => {
    setErrors([])
  }

  const contextValue: SimpleSimulationContextType = {
    params,
    setParams,
    isLoading,
    setIsLoading,
    errors,
    setErrors,
    addError,
    clearErrors,
  }

  return (
    <SimpleSimulationContext.Provider value={contextValue}>
      {children}
    </SimpleSimulationContext.Provider>
  )
}
