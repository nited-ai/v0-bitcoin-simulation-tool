/**
 * Risk level-based parameter presets
 * 
 * Defines parameter combinations for each risk level with platform-specific
 * loan term overrides.
 */

export type RiskLevel = 'conservative' | 'moderate' | 'optimistic' | 'moonshots'

export interface RiskLevelPreset {
  id: RiskLevel
  name: string
  description: string
  loanAmountPercent: number
  targetLtv: number
  annualInterestRate: number
  loanTermMonths: {
    firefish: number | 'infinity'
    strike: number | 'infinity'
    coinbase: number | 'infinity'
    custom: number | 'infinity'
    default: number | 'infinity'
  }
}

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
      coinbase: 'infinity',
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
      coinbase: 'infinity',
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
      coinbase: 'infinity',
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
      coinbase: 'infinity',
      custom: 6,
      default: 6
    }
  }
}

/**
 * Get risk level preset by ID
 */
export function getRiskLevelPreset(riskLevel: RiskLevel): RiskLevelPreset {
  return RISK_LEVEL_PRESETS[riskLevel]
}

/**
 * Get all available risk level presets
 */
export function getAllRiskLevelPresets(): RiskLevelPreset[] {
  return Object.values(RISK_LEVEL_PRESETS)
}

/**
 * Get loan term for specific risk level and platform combination
 */
export function getLoanTermForPlatform(riskLevel: RiskLevel, platform: string): number | 'infinity' {
  const preset = getRiskLevelPreset(riskLevel)
  return preset.loanTermMonths[platform as keyof typeof preset.loanTermMonths] || preset.loanTermMonths.default
}

/**
 * Check if parameters match a specific risk level preset
 */
export function getMatchingRiskLevel(params: {
  loanAmountPercent: number
  targetLtv: number
  annualInterestRate: number
  loanTermMonths: number | 'infinity'
}, platform: string): RiskLevel | null {
  for (const [riskLevel, preset] of Object.entries(RISK_LEVEL_PRESETS)) {
    const expectedLoanTerm = getLoanTermForPlatform(riskLevel as RiskLevel, platform)

    if (
      params.loanAmountPercent === preset.loanAmountPercent &&
      params.targetLtv === preset.targetLtv &&
      params.annualInterestRate === preset.annualInterestRate &&
      params.loanTermMonths === expectedLoanTerm
    ) {
      return riskLevel as RiskLevel
    }
  }

  return null
}

/**
 * Apply risk level preset to parameters
 */
export function applyRiskLevelPreset(
  riskLevel: RiskLevel, 
  platform: string,
  currentParams: any
): Partial<any> {
  const preset = getRiskLevelPreset(riskLevel)
  const loanTerm = getLoanTermForPlatform(riskLevel, platform)
  
  return {
    ...currentParams,
    loanAmountPercent: preset.loanAmountPercent,
    riskManagement: {
      ...currentParams.riskManagement,
      targetLtv: preset.targetLtv
    },
    annualInterestRate: preset.annualInterestRate,
    loanTermMonths: loanTerm === 'infinity' ? Infinity : loanTerm
  }
}
