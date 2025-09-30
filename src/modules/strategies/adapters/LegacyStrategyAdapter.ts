/**
 * Legacy Strategy Adapter
 * 
 * Adapter to integrate the new modular strategy system with the existing
 * simulation infrastructure. Provides backward compatibility.
 */

import type { 
  StrategyExecutionParams,
  StrategyExecutionResult,
  InvestmentStrategy
} from "../types"
import type { PriceProjectionResult } from "../../price-projection/types"
import { strategyRegistry } from "../services/StrategyRegistry"

// Legacy types from the existing system
interface LegacySimulationParams {
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  loanOriginationFeePercent: number
  loanTermMonths: number
  simulationMonths: number
  maxLoanAmount: number
  expectedAnnualInflation: number
  btcAccumulation?: boolean
  investmentStrategy: string
  
  // Risk management (may be nested or flat)
  riskManagement?: {
    targetLtv: number
    liquidationLtv: number
    maxLoanAmount: number
    liquidationFeePercent: number
    annualInterestRate: number
  }
  
  // Strategy-specific parameters
  athBasedParams?: {
    athThresholdPercent: number
    investmentMultiplier: number
  }
  movingAverageParams?: {
    shortPeriod: number
    longPeriod: number
    investmentMultiplier: number
  }
  athCollateralParams?: {
    athDrawdownTolerance: number
    collateralBuffer: number
    emergencyReserve: number
  }
}

/**
 * Legacy Strategy Adapter
 * 
 * Converts between legacy simulation parameters and new modular strategy system.
 */
export class LegacyStrategyAdapter {
  /**
   * Convert legacy parameters to new strategy execution parameters
   */
  static convertLegacyParams(legacyParams: LegacySimulationParams): StrategyExecutionParams {
    // Extract or create risk management parameters
    const riskManagement = legacyParams.riskManagement || {
      targetLtv: 50, // Default values
      liquidationLtv: 85,
      maxLoanAmount: legacyParams.maxLoanAmount || 100000,
      liquidationFeePercent: 5,
      annualInterestRate: legacyParams.annualInterestRate
    }

    return {
      btcAmount: legacyParams.btcAmount,
      initialBtcPrice: legacyParams.initialBtcPrice,
      monthlyWithdrawalAmount: legacyParams.monthlyWithdrawalAmount,
      annualInterestRate: legacyParams.annualInterestRate,
      loanOriginationFeePercent: legacyParams.loanOriginationFeePercent,
      loanTermMonths: legacyParams.loanTermMonths,
      simulationMonths: legacyParams.simulationMonths,
      maxLoanAmount: legacyParams.maxLoanAmount,
      expectedAnnualInflation: legacyParams.expectedAnnualInflation,
      btcAccumulation: legacyParams.btcAccumulation ?? true,
      loanAmountPercent: legacyParams.loanAmountPercent || 50, // Default to 50% if not provided
      investmentStrategy: legacyParams.investmentStrategy as InvestmentStrategy,
      riskManagement,
      athBasedParams: legacyParams.athBasedParams,
      movingAverageParams: legacyParams.movingAverageParams,
      athCollateralParams: legacyParams.athCollateralParams
    }
  }

  /**
   * Execute strategy using legacy parameters
   */
  static async executeLegacyStrategy(
    legacyParams: LegacySimulationParams,
    priceProjection: PriceProjectionResult
  ): Promise<StrategyExecutionResult | null> {
    try {
      // Convert legacy parameters
      const strategyParams = this.convertLegacyParams(legacyParams)
      
      // Execute strategy
      const result = await strategyRegistry.executeStrategy(
        strategyParams.investmentStrategy,
        strategyParams,
        priceProjection
      )
      
      return result
    } catch (error) {
      console.error('Legacy strategy execution failed:', error)
      return null
    }
  }

  /**
   * Get available strategies in legacy format
   */
  static getLegacyStrategyOptions(): Array<{ id: string; name: string; description: string }> {
    return strategyRegistry.getStrategyNames()
  }

  /**
   * Validate legacy parameters
   */
  static validateLegacyParams(legacyParams: LegacySimulationParams): boolean {
    try {
      const strategyParams = this.convertLegacyParams(legacyParams)
      
      // Basic validation
      if (strategyParams.btcAmount <= 0) return false
      if (strategyParams.initialBtcPrice <= 0) return false
      if (strategyParams.simulationMonths <= 0) return false
      if (strategyParams.annualInterestRate < 0) return false
      if (strategyParams.riskManagement.targetLtv <= 0 || strategyParams.riskManagement.targetLtv > 100) return false
      
      // Check if strategy exists
      const strategy = strategyRegistry.getStrategy(strategyParams.investmentStrategy)
      if (!strategy) return false
      
      return true
    } catch (error) {
      console.error('Legacy parameter validation failed:', error)
      return false
    }
  }

  /**
   * Get strategy metadata in legacy format
   */
  static getLegacyStrategyMetadata(strategyId: string) {
    const strategy = strategyRegistry.getStrategy(strategyId)
    const metadata = strategyRegistry.getStrategyMetadata(strategyId)
    
    if (!strategy || !metadata) return null
    
    return {
      id: strategyId,
      name: strategy.getName(),
      description: strategy.getDescription(),
      detailedDescription: strategy.getDetailedDescription(),
      functionality: strategy.getFunctionality(),
      suitability: strategy.getSuitability(),
      securityRating: metadata.securityRating,
      complexityRating: metadata.complexityRating,
      suitableFor: metadata.suitableFor,
      criteria: metadata.criteria
    }
  }

  /**
   * Convert strategy result to legacy format if needed
   */
  static convertResultToLegacy(result: StrategyExecutionResult): any {
    // For now, the new format is compatible with the legacy format
    // This method exists for future compatibility if needed
    return result
  }

  /**
   * Initialize strategies for legacy compatibility
   */
  static initializeLegacyCompatibility(): void {
    console.log('🔧 Initializing legacy strategy compatibility...')

    // Register default strategies if not already registered
    const stats = strategyRegistry.getStats()
    if (stats.total === 0) {
      console.log('📝 No strategies registered, initializing defaults...')
      // This would be handled by the strategy initialization system
    }

    console.log(`✅ Legacy compatibility initialized with ${stats.total} strategies`)
  }
}

// Legacy compatibility functions for direct import
export async function runStrategySimulation(
  params: any,
  priceChartData: any[],
  historicalPriceData: any[]
): Promise<any[]> {
  console.log('🔄 Running legacy strategy simulation via adapter...')

  // Convert price chart data to price projection format
  const priceProjection = {
    projectedPrices: priceChartData.map((point, index) => ({
      month: index,
      date: point.date || new Date().toISOString(),
      price: point.simulationPath || point.price || 0
    })),
    projectionPoints: priceChartData.map(point => ({
      timestamp: new Date(point.date || new Date()).getTime(),
      price: point.simulationPath || point.price || 0,
      date: point.date || new Date().toISOString()
    })),
    metadata: {
      model: 'legacy',
      version: '1.0.0',
      parameters: {},
      generatedAt: new Date().toISOString(),
      totalMonths: priceChartData.length,
      initialPrice: priceChartData[0]?.simulationPath || priceChartData[0]?.price || 0,
      finalPrice: priceChartData[priceChartData.length - 1]?.simulationPath || priceChartData[priceChartData.length - 1]?.price || 0
    }
  }

  // Execute using the adapter
  const result = await LegacyStrategyAdapter.executeLegacyStrategy(params, priceProjection)

  if (!result) {
    console.error('❌ Legacy strategy simulation failed')
    return []
  }

  // Convert result to legacy format
  return result.monthlyResults || []
}

// Cache for available strategies to prevent excessive logging and computation
let cachedStrategies: Array<{
  id: string
  name: string
  description: string
  metadata: any
  detailedDescription: string
  functionality: string
  suitability: string
}> | null = null

export function getAvailableStrategies(): Array<{
  id: string
  name: string
  description: string
  metadata: any
  detailedDescription: string
  functionality: string
  suitability: string
}> {
  // Return cached result if available to prevent excessive logging
  if (cachedStrategies) {
    return cachedStrategies
  }

  console.log('📋 Getting available strategies via legacy adapter...')

  const strategies = strategyRegistry.getStrategyNames()

  cachedStrategies = strategies.map(strategy => {
    const metadata = LegacyStrategyAdapter.getLegacyStrategyMetadata(strategy.id)
    return {
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      metadata: metadata || {},
      detailedDescription: metadata?.detailedDescription || strategy.description,
      functionality: metadata?.functionality || 'Standard investment strategy',
      suitability: metadata?.suitability || 'General purpose'
    }
  })

  return cachedStrategies
}

/**
 * Clear the cached strategies (useful when strategies are updated)
 */
export function clearStrategiesCache(): void {
  cachedStrategies = null
}
