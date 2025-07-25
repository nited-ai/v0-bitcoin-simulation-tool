// ATH-Collateral Strategy Optimization Analysis
// This file contains optimized logic and parameter testing

interface OptimizationParams {
  maxDrawdownPercent: number
  collateralMultiplier: number
  athLookbackMonths: number
  emergencyBuffer: number
  // New optimization parameters
  riskCurveExponent: number
  minInvestmentMultiplier: number
  maxInvestmentMultiplier: number
  debtUtilizationThreshold: number
  volatilityAdjustment: boolean
}

interface SimulationResult {
  finalBtcHoldings: number
  maxDebt: number
  liquidationEvents: number
  totalWithdrawn: number
  finalNetWorth: number
  riskAdjustedReturn: number
  parameters: OptimizationParams
}

class ATHStrategyOptimizer {
  
  /**
   * Optimized risk level calculation with volatility consideration
   */
  calculateOptimizedRiskLevel(
    currentPrice: number, 
    ath: number, 
    volatilityAdjustment: boolean = true,
    riskCurveExponent: number = 1.5
  ): number {
    if (ath === 0) return 1
    
    const drawdownFromATH = Math.max(0, (ath - currentPrice) / ath)
    
    // Use exponential curve instead of linear for more nuanced risk assessment
    // Lower exponent = more aggressive near ATH, higher exponent = more conservative
    const baseRisk = 1 - drawdownFromATH
    const adjustedRisk = Math.pow(baseRisk, riskCurveExponent)
    
    // Optional volatility adjustment based on recent price movements
    if (volatilityAdjustment) {
      // In high volatility periods, be more conservative
      // This would require historical volatility calculation
      // For now, use a simplified approach
      const volatilityFactor = 1.0 // Placeholder for actual volatility calculation
      return Math.min(1, adjustedRisk * volatilityFactor)
    }
    
    return Math.max(0, Math.min(1, adjustedRisk))
  }
  
  /**
   * Optimized investment multiplier calculation
   */
  calculateOptimizedInvestmentMultiplier(
    riskLevel: number,
    debtUtilization: number,
    availableCapacity: number,
    params: OptimizationParams
  ): number {
    const {
      minInvestmentMultiplier,
      maxInvestmentMultiplier,
      debtUtilizationThreshold
    } = params
    
    // Base multiplier using smooth curve instead of linear reduction
    const baseMultiplier = minInvestmentMultiplier + 
      (maxInvestmentMultiplier - minInvestmentMultiplier) * 
      Math.pow(1 - riskLevel, 2) // Quadratic curve for smoother transitions
    
    // Debt utilization adjustment - less punitive than current implementation
    let debtAdjustment = 1.0
    if (debtUtilization > debtUtilizationThreshold) {
      const excessUtilization = debtUtilization - debtUtilizationThreshold
      const maxExcess = 1.0 - debtUtilizationThreshold
      debtAdjustment = Math.max(0.2, 1 - (excessUtilization / maxExcess) * 0.6)
    }
    
    // Capacity-based adjustment - encourage using available capacity
    const capacityBonus = availableCapacity > 1000 ? 1.1 : 1.0
    
    return Math.max(
      minInvestmentMultiplier, 
      Math.min(maxInvestmentMultiplier, baseMultiplier * debtAdjustment * capacityBonus)
    )
  }
  
  /**
   * Test parameter combinations for optimization
   */
  getParameterTestSets(): OptimizationParams[] {
    const testSets: OptimizationParams[] = []
    
    // Current defaults
    testSets.push({
      maxDrawdownPercent: 80,
      collateralMultiplier: 2.0,
      athLookbackMonths: 36,
      emergencyBuffer: 1.2,
      riskCurveExponent: 1.0, // Linear (current)
      minInvestmentMultiplier: 0.1,
      maxInvestmentMultiplier: 1.0,
      debtUtilizationThreshold: 0.8,
      volatilityAdjustment: false
    })
    
    // More aggressive parameters
    testSets.push({
      maxDrawdownPercent: 85, // Allow higher drawdown
      collateralMultiplier: 1.8, // Lower safety margin
      athLookbackMonths: 24, // Shorter lookback
      emergencyBuffer: 1.1, // Lower buffer
      riskCurveExponent: 1.5, // Exponential curve
      minInvestmentMultiplier: 0.2,
      maxInvestmentMultiplier: 1.2,
      debtUtilizationThreshold: 0.85,
      volatilityAdjustment: true
    })
    
    // Balanced optimization
    testSets.push({
      maxDrawdownPercent: 82,
      collateralMultiplier: 1.9,
      athLookbackMonths: 30,
      emergencyBuffer: 1.15,
      riskCurveExponent: 1.3,
      minInvestmentMultiplier: 0.15,
      maxInvestmentMultiplier: 1.1,
      debtUtilizationThreshold: 0.82,
      volatilityAdjustment: true
    })
    
    // Conservative but optimized
    testSets.push({
      maxDrawdownPercent: 78,
      collateralMultiplier: 2.1,
      athLookbackMonths: 42,
      emergencyBuffer: 1.25,
      riskCurveExponent: 1.2,
      minInvestmentMultiplier: 0.12,
      maxInvestmentMultiplier: 0.95,
      debtUtilizationThreshold: 0.75,
      volatilityAdjustment: true
    })
    
    // Cycle-aware parameters
    testSets.push({
      maxDrawdownPercent: 83,
      collateralMultiplier: 1.85,
      athLookbackMonths: 18, // Shorter for faster adaptation
      emergencyBuffer: 1.12,
      riskCurveExponent: 1.4,
      minInvestmentMultiplier: 0.18,
      maxInvestmentMultiplier: 1.15,
      debtUtilizationThreshold: 0.83,
      volatilityAdjustment: true
    })
    
    return testSets
  }
  
  /**
   * Calculate risk-adjusted return metric
   */
  calculateRiskAdjustedReturn(result: Omit<SimulationResult, 'riskAdjustedReturn'>): number {
    const { finalBtcHoldings, liquidationEvents, maxDebt } = result
    
    // Penalize liquidation events heavily
    const liquidationPenalty = liquidationEvents * 0.1
    
    // Reward BTC accumulation
    const btcScore = finalBtcHoldings
    
    // Penalize excessive debt usage
    const debtPenalty = maxDebt > 100000 ? (maxDebt - 100000) / 1000000 : 0
    
    return Math.max(0, btcScore - liquidationPenalty - debtPenalty)
  }
  
  /**
   * Analyze market cycle performance
   */
  analyzeMarketCycles(results: SimulationResult[]): {
    bullMarketPerformance: number
    bearMarketPerformance: number
    sidewaysMarketPerformance: number
    overallStability: number
  } {
    // This would analyze performance across different market conditions
    // For now, return placeholder analysis
    return {
      bullMarketPerformance: 0,
      bearMarketPerformance: 0,
      sidewaysMarketPerformance: 0,
      overallStability: 0
    }
  }
}

export { ATHStrategyOptimizer, OptimizationParams, SimulationResult }
