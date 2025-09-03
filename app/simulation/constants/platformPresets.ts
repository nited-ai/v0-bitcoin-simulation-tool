/**
 * Platform-specific configuration presets
 * 
 * Defines default parameter values for each supported platform
 * including fees, LTV ratios, and available loan terms.
 */

export interface PlatformConfig {
  id: string
  name: string
  description: string
  originationFeePercent: number
  originationFeeType: 'one-time' | 'annual' // NEW: Specifies if fee is charged once or annually
  liquidationLtv: number
  liquidationFeePercent: number
  availableLoanTerms: (number | 'infinity')[]
  defaultLoanTerm: number | 'infinity'
  maxInitialLtv: number // Maximum allowed Initial LTV for this platform (used for both validation and capacity calculations)
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  firefish: {
    id: 'firefish',
    name: 'Firefish',
    description: 'Conservative lending platform with moderate fees',
    originationFeePercent: 1.5,
    originationFeeType: 'annual', // Firefish charges annual origination fee
    liquidationLtv: 95,
    liquidationFeePercent: 5.0,
    availableLoanTerms: [3, 6, 12, 18, 24],
    defaultLoanTerm: 24,
    maxInitialLtv: 50
  },
  strike: {
    id: 'strike',
    name: 'Strike',
    description: 'Flexible lending platform with competitive rates',
    originationFeePercent: 0,
    originationFeeType: 'one-time', // Strike has no origination fee, but type needed for consistency
    liquidationLtv: 85,
    liquidationFeePercent: 1.0,
    availableLoanTerms: [6, 12, 18, 24, 'infinity'],
    defaultLoanTerm: 'infinity',
    maxInitialLtv: 50
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Customizable platform settings',
    originationFeePercent: 1.0,
    originationFeeType: 'one-time', // Default to one-time for custom platforms
    liquidationLtv: 97,
    liquidationFeePercent: 3.0,
    availableLoanTerms: [3, 6, 12, 18, 24, 'infinity'],
    defaultLoanTerm: 12,
    maxInitialLtv: 75
  }
}

/**
 * Get platform configuration by ID
 */
export function getPlatformConfig(platformId: string): PlatformConfig {
  // Check built-in platforms first
  if (PLATFORM_CONFIGS[platformId]) {
    return PLATFORM_CONFIGS[platformId]
  }

  // Check custom platforms in localStorage
  if (platformId.startsWith('custom-')) {
    try {
      const customPlatforms = JSON.parse(localStorage.getItem('customPlatformConfigs') || '{}')
      if (customPlatforms[platformId]) {
        return customPlatforms[platformId]
      }
    } catch (error) {
      console.error('Failed to load custom platform config:', error)
    }
  }

  // Fallback to default custom config
  return PLATFORM_CONFIGS.custom
}

/**
 * Save custom platform configuration to localStorage
 */
export function saveCustomPlatformConfig(platformId: string, config: PlatformConfig): void {
  try {
    const customPlatforms = JSON.parse(localStorage.getItem('customPlatformConfigs') || '{}')
    customPlatforms[platformId] = config
    localStorage.setItem('customPlatformConfigs', JSON.stringify(customPlatforms))
  } catch (error) {
    console.error('Failed to save custom platform config:', error)
  }
}

/**
 * Get all available platform configurations
 */
export function getAllPlatformConfigs(): PlatformConfig[] {
  return Object.values(PLATFORM_CONFIGS)
}

/**
 * Validate platform-specific parameter ranges
 */
export interface PlatformValidationRules {
  originationFeePercent: { min: number; max: number }
  liquidationLtv: { min: number; max: number }
  liquidationFeePercent: { min: number; max: number }
  maxInitialLtv: { min: number; max: number }
}

export const PLATFORM_VALIDATION_RULES: PlatformValidationRules = {
  originationFeePercent: { min: 0, max: 10 },
  liquidationLtv: { min: 50, max: 100 },
  liquidationFeePercent: { min: 0, max: 20 },
  maxInitialLtv: { min: 10, max: 95 }
}

/**
 * Validate custom platform parameters
 */
export function validatePlatformConfig(config: Partial<PlatformConfig>): string[] {
  const errors: string[] = []
  
  if (config.originationFeePercent !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.originationFeePercent
    if (config.originationFeePercent < min || config.originationFeePercent > max) {
      errors.push(`Origination fee must be between ${min}% and ${max}%`)
    }
  }
  
  if (config.liquidationLtv !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.liquidationLtv
    if (config.liquidationLtv < min || config.liquidationLtv > max) {
      errors.push(`Liquidation LTV must be between ${min}% and ${max}%`)
    }
  }
  
  if (config.liquidationFeePercent !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.liquidationFeePercent
    if (config.liquidationFeePercent < min || config.liquidationFeePercent > max) {
      errors.push(`Liquidation fee must be between ${min}% and ${max}%`)
    }
  }

  if (config.maxInitialLtv !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.maxInitialLtv
    if (config.maxInitialLtv < min || config.maxInitialLtv > max) {
      errors.push(`Maximum Initial LTV must be between ${min}% and ${max}%`)
    }
  }

  return errors
}
