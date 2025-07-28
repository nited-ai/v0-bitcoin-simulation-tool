"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"
import type {
  SimulationParams,
  MonthlyResult,
  CacheStatus,
  RiskLevel,
  Platform,
  PlatformConfigState
} from "../types/simulation"
import { DEFAULT_PARAMS, PARAMS_STORAGE_KEY } from "../types/simulation"
import type { HistoricalDataPoint, PriceChartDataPoint } from "@/lib/price-engine/types"
import { applyRiskLevelPreset as applyRiskPresetToParams, type RiskLevel as RiskLevelType } from "../constants/riskLevelPresets"
import { getPlatformConfig, PLATFORM_CONFIGS } from "../constants/platformPresets"

/**
 * Simulation Context Type Definition
 */
interface SimulationContextType {
  // Core State
  params: SimulationParams
  setParams: (params: SimulationParams | ((prev: SimulationParams) => SimulationParams)) => void
  results: MonthlyResult[]
  setResults: (results: MonthlyResult[]) => void
  
  // Loading States
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  chartLoading: boolean
  setChartLoading: (loading: boolean) => void
  loadingBtcPrice: boolean
  setLoadingBtcPrice: (loading: boolean) => void
  initialDataLoaded: boolean
  setInitialDataLoaded: (loaded: boolean) => void
  
  // Data States
  historicalPriceData: HistoricalDataPoint[]
  setHistoricalPriceData: (data: HistoricalDataPoint[]) => void
  priceChartData: PriceChartDataPoint[]
  setPriceChartData: (data: PriceChartDataPoint[]) => void
  
  // UI States
  errors: string[]
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  cacheStatus: CacheStatus
  setCacheStatus: (status: CacheStatus) => void
  
  // Actions
  resetParams: () => void
  clearErrors: () => void
  addError: (error: string) => void

  // Preset Management
  applyRiskLevelPreset: (riskLevel: RiskLevel, confirmOverride?: boolean) => void
  applyPlatformConfig: (platform: Platform) => void
  updatePlatformConfig: (platform: Platform, config: Partial<any>) => void
  markParameterAsManual: (parameterKey: string) => void
}

/**
 * Simulation Context
 */
const SimulationContext = createContext<SimulationContextType | undefined>(undefined)

/**
 * Hook to use Simulation Context
 */
export function useSimulation() {
  const context = useContext(SimulationContext)
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider')
  }
  return context
}

/**
 * Simulation Provider Props
 */
interface SimulationProviderProps {
  children: ReactNode
}

/**
 * Load parameters from localStorage with error handling
 */
function loadParamsFromStorage(): SimulationParams {
  if (typeof window === "undefined") return DEFAULT_PARAMS
  
  try {
    const savedParams = localStorage.getItem(PARAMS_STORAGE_KEY)
    if (savedParams) {
      const parsed = JSON.parse(savedParams)
      // Merge with defaults to ensure all properties exist
      const riskManagement = { ...DEFAULT_PARAMS.riskManagement, ...parsed.riskManagement }
      const powerLawSettings = { ...DEFAULT_PARAMS.powerLawSettings, ...parsed.powerLawSettings }
      const athBasedParams = { ...DEFAULT_PARAMS.athBasedParams, ...parsed.athBasedParams }
      const movingAverageParams = { ...DEFAULT_PARAMS.movingAverageParams, ...parsed.movingAverageParams }
      const athCollateralParams = { ...DEFAULT_PARAMS.athCollateralParams, ...parsed.athCollateralParams }
      const parameterSources = { ...DEFAULT_PARAMS.parameterSources, ...parsed.parameterSources }
      const platformConfigs = { ...DEFAULT_PARAMS.platformConfigs, ...parsed.platformConfigs }

      return {
        ...DEFAULT_PARAMS,
        ...parsed,
        powerLawSettings,
        riskManagement,
        athBasedParams,
        movingAverageParams,
        athCollateralParams,
        parameterSources,
        platformConfigs
      }
    }
  } catch (error) {
    console.error("Error loading params from localStorage:", error)
  }
  
  return DEFAULT_PARAMS
}

/**
 * Save parameters to localStorage
 */
function saveParamsToStorage(params: SimulationParams) {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params))
  } catch (error) {
    console.error("Error saving params to localStorage:", error)
  }
}

/**
 * Simulation Provider Component
 * 
 * Provides centralized state management for the entire simulation application.
 * Replaces the scattered useState calls in the monolithic simulation.tsx.
 */
export function SimulationProvider({ children }: SimulationProviderProps) {
  // Core State - simplified initialization
  const [params, setParamsState] = useState<SimulationParams>(DEFAULT_PARAMS)
  const [results, setResults] = useState<MonthlyResult[]>([])

  // Loading States - start with false to avoid immediate effects
  const [isLoading, setIsLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [loadingBtcPrice, setLoadingBtcPrice] = useState(false)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Data States
  const [historicalPriceData, setHistoricalPriceData] = useState<HistoricalDataPoint[]>([])
  const [priceChartData, setPriceChartData] = useState<PriceChartDataPoint[]>([])

  // UI States
  const [errors, setErrors] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>('loading')
  
  // Enhanced setParams with localStorage persistence
  const setParams = useCallback((newParams: SimulationParams | ((prev: SimulationParams) => SimulationParams)) => {
    setParamsState(prev => {
      const updated = typeof newParams === 'function' ? newParams(prev) : newParams
      saveParamsToStorage(updated)
      return updated
    })
  }, [])
  
  // Action: Reset parameters to defaults
  const resetParams = useCallback(() => {
    setParams(DEFAULT_PARAMS)
    setErrors([])
  }, [setParams])
  
  // Action: Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])
  
  // Action: Add a single error
  const addError = useCallback((error: string) => {
    setErrors(prev => [...prev, error])
  }, [])

  // Stable setter functions with useCallback
  const stableSetErrors = useCallback((errors: string[] | ((prev: string[]) => string[])) => {
    setErrors(errors)
  }, [])

  const stableSetIsLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const stableSetCacheStatus = useCallback((status: CacheStatus) => {
    setCacheStatus(status)
  }, [])

  const stableSetHistoricalPriceData = useCallback((data: HistoricalDataPoint[]) => {
    setHistoricalPriceData(data)
  }, [])

  const stableSetInitialDataLoaded = useCallback((loaded: boolean) => {
    setInitialDataLoaded(loaded)
  }, [])

  const stableSetChartLoading = useCallback((loading: boolean) => {
    setChartLoading(loading)
  }, [])

  const stableSetPriceChartData = useCallback((data: PriceChartDataPoint[]) => {
    setPriceChartData(data)
  }, [])

  // Preset Management Methods
  const applyRiskLevelPreset = useCallback((riskLevel: RiskLevel, confirmOverride: boolean = false) => {
    setParams(currentParams => {
      // Check if any parameters were manually edited
      const hasManualEdits = Object.values(currentParams.parameterSources).some(source => source === 'manual')

      if (hasManualEdits && !confirmOverride) {
        // In a real implementation, this would trigger a confirmation dialog
        console.warn('Manual edits detected. Use confirmOverride=true to proceed.')
        return currentParams
      }

      // Apply the risk level preset
      const updatedParams = applyRiskPresetToParams(riskLevel, currentParams.platform, currentParams)

      // Update parameter sources to reflect preset application
      const updatedSources = { ...currentParams.parameterSources }
      updatedSources.maxLoanAmountPercent = 'preset'
      updatedSources.targetLtv = 'preset'
      updatedSources.annualInterestRate = 'preset'
      updatedSources.loanTermMonths = 'preset'

      return {
        ...updatedParams,
        selectedRiskLevel: riskLevel,
        parameterSources: updatedSources
      }
    })
  }, [setParams])

  const applyPlatformConfig = useCallback((platform: Platform) => {
    setParams(currentParams => {
      const platformConfig = getPlatformConfig(platform)

      // Apply platform-specific parameters
      const updatedParams = {
        ...currentParams,
        platform,
        loanOriginationFeePercent: platformConfig.originationFeePercent,
        liquidationFeePercent: platformConfig.liquidationFeePercent,
        loanTermMonths: platformConfig.availableLoanTerms.includes(currentParams.loanTermMonths === Infinity ? 'infinity' : currentParams.loanTermMonths)
          ? currentParams.loanTermMonths
          : platformConfig.defaultLoanTerm === 'infinity' ? Infinity : platformConfig.defaultLoanTerm,
        riskManagement: {
          ...currentParams.riskManagement,
          liquidationLtv: platformConfig.liquidationLtv,
          targetLtv: Math.min(currentParams.riskManagement.targetLtv, platformConfig.maxInitialLtv)
        }
      }

      // If a risk level is selected, reapply it with the new platform
      if (currentParams.selectedRiskLevel) {
        const riskPresetParams = applyRiskPresetToParams(currentParams.selectedRiskLevel, platform, updatedParams)
        return {
          ...riskPresetParams,
          parameterSources: {
            ...currentParams.parameterSources,
            originationFeePercent: 'platform',
            liquidationLtv: 'platform',
            liquidationFeePercent: 'platform',
            loanTermMonths: 'preset' // Risk level determines loan term
          }
        }
      }

      return {
        ...updatedParams,
        parameterSources: {
          ...currentParams.parameterSources,
          originationFeePercent: 'platform',
          liquidationLtv: 'platform',
          liquidationFeePercent: 'platform'
        }
      }
    })
  }, [setParams])

  const updatePlatformConfig = useCallback((platform: Platform, config: Partial<any>) => {
    setParams(currentParams => ({
      ...currentParams,
      platformConfigs: {
        ...currentParams.platformConfigs,
        [platform]: {
          ...getPlatformConfig(platform),
          ...config
        }
      }
    }))
  }, [setParams])

  const markParameterAsManual = useCallback((parameterKey: string) => {
    setParams(currentParams => ({
      ...currentParams,
      parameterSources: {
        ...currentParams.parameterSources,
        [parameterKey]: 'manual'
      }
    }))
  }, [setParams])

  const contextValue: SimulationContextType = {
    // Core State
    params,
    setParams,
    results,
    setResults,
    
    // Loading States
    isLoading,
    setIsLoading: stableSetIsLoading,
    chartLoading,
    setChartLoading: stableSetChartLoading,
    loadingBtcPrice,
    setLoadingBtcPrice,
    initialDataLoaded,
    setInitialDataLoaded: stableSetInitialDataLoaded,

    // Data States
    historicalPriceData,
    setHistoricalPriceData: stableSetHistoricalPriceData,
    priceChartData,
    setPriceChartData: stableSetPriceChartData,

    // UI States
    errors,
    setErrors: stableSetErrors,
    currentPage,
    setCurrentPage,
    cacheStatus,
    setCacheStatus: stableSetCacheStatus,
    
    // Actions
    resetParams,
    clearErrors,
    addError,

    // Preset Management
    applyRiskLevelPreset,
    applyPlatformConfig,
    updatePlatformConfig,
    markParameterAsManual,
  }
  
  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  )
}
