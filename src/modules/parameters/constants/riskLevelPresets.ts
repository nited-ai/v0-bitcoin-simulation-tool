/**
 * Risk level-based parameter presets
 * 
 * Defines parameter combinations for each risk level with platform-specific
 * loan term overrides.
 */

import type { RiskLevel, RiskLevelPreset, SimulationParams, ValidationResult } from '../types'

export const RISK_LEVEL_PRESETS: Record<RiskLevel, RiskLevelPreset> = {
  conservative: {
    id: 'conservative',
    name: 'Conservative',
    description: 'Low risk approach with minimal loan exposure',
    loanAmountPercent: 5,
    targetLtv: 20,
    annualInterestRate: 9.0,
    loanTermMonths: {
      firefish: 24,
      strike: 'infinity',
      custom: 24,
      default: 24
    }
  },
  moderate: {
    id: 'moderate',
    name: 'Moderate',
    description: 'Balanced risk with moderate loan exposure',
    loanAmountPercent: 10,
    targetLtv: 30,
    annualInterestRate: 9.0,
    loanTermMonths: {
      firefish: 24,
      strike: 'infinity',
      custom: 24,
      default: 24
    }
  },
  optimistic: {
    id: 'optimistic',
    name: 'Optimistic',
    description: 'Higher risk with increased loan exposure and better rates',
    loanAmountPercent: 15,
    targetLtv: 40,
    annualInterestRate: 6.5,
    loanTermMonths: {
      firefish: 12,
      strike: 12,
      custom: 12,
      default: 12
    }
  },
  moonshots: {
    id: 'moonshots',
    name: 'Moonshots',
    description: 'Maximum risk with aggressive loan exposure',
    loanAmountPercent: 30,
    targetLtv: 50,
    annualInterestRate: 6.5,
    loanTermMonths: {
      firefish: 6,
      strike: 6,
      custom: 6,
      default: 6
    }
  }
}

/**
 * Get risk level preset by ID
 */
export function getRiskLevelPreset(riskLevel: RiskLevel): RiskLevelPreset {
  return RISK_LEVEL_PRESETS[riskLevel] || RISK_LEVEL_PRESETS.moderate
}

/**
 * Get all available risk levels
 */
export function getAvailableRiskLevels(): RiskLevelPreset[] {
  return Object.values(RISK_LEVEL_PRESETS)
}

/**
 * Validate risk level preset configuration
 */
export function validateRiskLevelPreset(preset: RiskLevelPreset): ValidationResult {
  const errors: string[] = []

  // Validate required fields
  if (!preset.id) errors.push('Risk level ID is required')
  if (!preset.name) errors.push('Risk level name is required')
  if (!preset.description) errors.push('Risk level description is required')

  // Validate loan amount percentage
  if (preset.loanAmountPercent < 0 || preset.loanAmountPercent > 100) {
    errors.push('loanAmountPercent must be between 0 and 100')
  }

  // Validate target LTV
  if (preset.targetLtv < 0 || preset.targetLtv > 100) {
    errors.push('targetLtv must be between 0 and 100')
  }

  // Validate interest rate
  if (preset.annualInterestRate < 0 || preset.annualInterestRate > 50) {
    errors.push('annualInterestRate must be between 0 and 50')
  }

  // Validate loan term months structure
  if (!preset.loanTermMonths) {
    errors.push('loanTermMonths configuration is required')
  } else {
    const requiredPlatforms = ['firefish', 'strike', 'custom', 'default']
    for (const platform of requiredPlatforms) {
      if (!(platform in preset.loanTermMonths)) {
        errors.push(`loanTermMonths for platform '${platform}' is required`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Apply risk level preset to simulation parameters
 */
export function applyRiskLevelToParams(
  baseParams: SimulationParams,
  riskLevel: RiskLevel
): SimulationParams {
  const preset = getRiskLevelPreset(riskLevel)
  
  // Get platform-specific loan term
  const platformLoanTerm = preset.loanTermMonths[baseParams.platform as keyof typeof preset.loanTermMonths] 
    || preset.loanTermMonths.default
  
  // Convert 'infinity' string to Infinity number
  const loanTermMonths = platformLoanTerm === 'infinity' ? Infinity : platformLoanTerm

  return {
    ...baseParams,
    loanAmountPercent: preset.loanAmountPercent,
    annualInterestRate: preset.annualInterestRate,
    loanTermMonths,
    riskManagement: {
      ...baseParams.riskManagement,
      targetLtv: preset.targetLtv,
      annualInterestRate: preset.annualInterestRate,
      loanTermMonths
    }
  }
}

/**
 * Get risk level from current parameters
 */
export function getRiskLevelFromParams(params: SimulationParams): RiskLevel | null {
  // Find the risk level that best matches current parameters
  for (const [riskLevel, preset] of Object.entries(RISK_LEVEL_PRESETS)) {
    const platformLoanTerm = preset.loanTermMonths[params.platform as keyof typeof preset.loanTermMonths] 
      || preset.loanTermMonths.default
    const expectedLoanTerm = platformLoanTerm === 'infinity' ? Infinity : platformLoanTerm

    // Check if parameters match this risk level
    if (
      params.loanAmountPercent === preset.loanAmountPercent &&
      params.riskManagement.targetLtv === preset.targetLtv &&
      params.annualInterestRate === preset.annualInterestRate &&
      params.loanTermMonths === expectedLoanTerm
    ) {
      return riskLevel as RiskLevel
    }
  }

  return null // No matching risk level found
}

/**
 * Get risk level recommendations based on user profile
 */
export interface UserProfile {
  experience: 'beginner' | 'intermediate' | 'advanced'
  riskTolerance: 'low' | 'medium' | 'high'
  investmentHorizon: 'short' | 'medium' | 'long'
  btcHoldings: 'small' | 'medium' | 'large'
}

export function getRecommendedRiskLevel(profile: UserProfile): RiskLevel {
  // Conservative recommendations for beginners
  if (profile.experience === 'beginner') {
    return 'conservative'
  }

  // Risk tolerance based recommendations
  if (profile.riskTolerance === 'low') {
    return 'conservative'
  }

  if (profile.riskTolerance === 'high') {
    if (profile.experience === 'advanced' && profile.btcHoldings === 'large') {
      return 'moonshots'
    }
    return 'optimistic'
  }

  // Medium risk tolerance - consider other factors
  if (profile.investmentHorizon === 'long' && profile.btcHoldings !== 'small') {
    return 'optimistic'
  }

  return 'moderate'
}

/**
 * Calculate risk score for current parameters
 */
export function calculateRiskScore(params: SimulationParams): {
  score: number // 0-100
  level: 'low' | 'medium' | 'high' | 'extreme'
  factors: string[]
} {
  let score = 0
  const factors: string[] = []

  // Loan amount percentage (0-40 points)
  const loanScore = Math.min(40, (params.loanAmountPercent / 30) * 40)
  score += loanScore
  if (params.loanAmountPercent > 20) {
    factors.push(`High loan amount: ${params.loanAmountPercent}%`)
  }

  // Target LTV (0-30 points)
  const ltvScore = Math.min(30, (params.riskManagement.targetLtv / 50) * 30)
  score += ltvScore
  if (params.riskManagement.targetLtv > 40) {
    factors.push(`High target LTV: ${params.riskManagement.targetLtv}%`)
  }

  // Interest rate (inverse scoring, 0-20 points)
  const interestScore = Math.max(0, 20 - ((params.annualInterestRate - 5) / 5) * 20)
  score += interestScore
  if (params.annualInterestRate < 7) {
    factors.push(`Aggressive interest rate: ${params.annualInterestRate}%`)
  }

  // Loan term (0-10 points)
  let termScore = 0
  if (params.loanTermMonths === Infinity) {
    termScore = 10
    factors.push('Infinite loan term')
  } else if (params.loanTermMonths < 12) {
    termScore = 8
    factors.push(`Short loan term: ${params.loanTermMonths} months`)
  } else {
    termScore = Math.max(0, 10 - (params.loanTermMonths / 24) * 10)
  }
  score += termScore

  // Determine risk level
  let level: 'low' | 'medium' | 'high' | 'extreme'
  if (score < 25) level = 'low'
  else if (score < 50) level = 'medium'
  else if (score < 75) level = 'high'
  else level = 'extreme'

  return {
    score: Math.round(score),
    level,
    factors
  }
}
