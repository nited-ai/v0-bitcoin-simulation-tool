/**
 * Parameter Comparison Hook
 * 
 * Provides memoized parameter comparison to prevent unnecessary chart regeneration.
 * Uses React's useMemo to optimize expensive parameter comparisons.
 */

import { useMemo, useRef } from 'react'
import type { SimulationParams } from '../context/SimulationContext'

interface RelevantChartParams {
  priceModel: string
  initialBtcPrice: number
  simulationMonths: number
  powerLawPrognosisLine?: string
  annualGrowthRates?: number[]
  historicalDataLength: number
}

export function useParameterComparison(
  params: SimulationParams,
  historicalDataLength: number
) {
  const previousParams = useRef<RelevantChartParams | null>(null)
  
  // Extract only the parameters that affect chart generation
  const relevantParams = useMemo((): RelevantChartParams => {
    const relevant: RelevantChartParams = {
      priceModel: params.priceModel,
      initialBtcPrice: params.initialBtcPrice,
      simulationMonths: params.simulationMonths,
      historicalDataLength
    }
    
    // Add model-specific parameters
    if (params.priceModel === 'powerLaw') {
      relevant.powerLawPrognosisLine = params.powerLawSettings?.prognosisLine
    } else if (params.priceModel === 'manual') {
      relevant.annualGrowthRates = params.annualGrowthRates
    }
    
    return relevant
  }, [
    params.priceModel,
    params.initialBtcPrice,
    params.simulationMonths,
    params.powerLawSettings?.prognosisLine,
    params.annualGrowthRates,
    historicalDataLength
  ])
  
  // Check if parameters have changed
  const hasParametersChanged = useMemo(() => {
    if (!previousParams.current) {
      console.log(`🔄 Initial chart generation needed for ${params.priceModel} model`)
      previousParams.current = relevantParams
      return true
    }
    
    const prev = previousParams.current
    const current = relevantParams
    
    // Compare all relevant parameters
    const changed = (
      prev.priceModel !== current.priceModel ||
      prev.initialBtcPrice !== current.initialBtcPrice ||
      prev.simulationMonths !== current.simulationMonths ||
      prev.powerLawPrognosisLine !== current.powerLawPrognosisLine ||
      prev.historicalDataLength !== current.historicalDataLength ||
      JSON.stringify(prev.annualGrowthRates) !== JSON.stringify(current.annualGrowthRates)
    )
    
    if (changed) {
      console.log(`🔄 Chart regeneration needed: Parameters changed for ${params.priceModel} model`)
      if (prev.priceModel !== current.priceModel) {
        console.log(`   📊 Model changed: ${prev.priceModel} → ${current.priceModel}`)
      }
      if (prev.initialBtcPrice !== current.initialBtcPrice) {
        console.log(`   💰 Initial price changed: $${prev.initialBtcPrice} → $${current.initialBtcPrice}`)
      }
      if (prev.simulationMonths !== current.simulationMonths) {
        console.log(`   📅 Simulation length changed: ${prev.simulationMonths} → ${current.simulationMonths} months`)
      }
      previousParams.current = current
    } else {
      console.log(`⚡ Skipping chart generation: No relevant parameter changes for ${params.priceModel} model`)
    }
    
    return changed
  }, [relevantParams, params.priceModel])
  
  return {
    hasParametersChanged,
    relevantParams
  }
}
