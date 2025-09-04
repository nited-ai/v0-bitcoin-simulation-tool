/**
 * Platform-specific configuration presets
 * 
 * Defines default parameter values for each supported platform
 * including fees, LTV ratios, and available loan terms.
 */

import type { PlatformConfig, ValidationResult } from '../types'

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
  // Handle undefined or null platformId
  if (!platformId) {
    return PLATFORM_CONFIGS.firefish
  }

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

  // Fallback to firefish config for unknown platforms
  return PLATFORM_CONFIGS.firefish
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
export function getAvailablePlatforms(): PlatformConfig[] {
  const builtInPlatforms = Object.values(PLATFORM_CONFIGS)
  
  // Add custom platforms from localStorage
  try {
    const customPlatforms = JSON.parse(localStorage.getItem('customPlatformConfigs') || '{}')
    const customPlatformList = Object.values(customPlatforms) as PlatformConfig[]
    return [...builtInPlatforms, ...customPlatformList]
  } catch (error) {
    console.error('Failed to load custom platforms:', error)
    return builtInPlatforms
  }
}

/**
 * Platform validation rules
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
 * Validate platform configuration
 */
export function validatePlatformConfig(config: PlatformConfig): ValidationResult {
  const errors: string[] = []

  // Validate required fields
  if (!config.id) errors.push('Platform ID is required')
  if (!config.name) errors.push('Platform name is required')
  if (!config.description) errors.push('Platform description is required')

  // Validate origination fee
  if (config.originationFeePercent !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.originationFeePercent
    if (config.originationFeePercent < min || config.originationFeePercent > max) {
      errors.push(`originationFeePercent must be between ${min}% and ${max}%`)
    }
  }

  // Validate liquidation LTV
  if (config.liquidationLtv !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.liquidationLtv
    if (config.liquidationLtv < min || config.liquidationLtv > max) {
      errors.push(`liquidationLtv must be between ${min}% and ${max}%`)
    }
  }

  // Validate liquidation fee
  if (config.liquidationFeePercent !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.liquidationFeePercent
    if (config.liquidationFeePercent < min || config.liquidationFeePercent > max) {
      errors.push(`liquidationFeePercent must be between ${min}% and ${max}%`)
    }
  }

  // Validate max initial LTV
  if (config.maxInitialLtv !== undefined) {
    const { min, max } = PLATFORM_VALIDATION_RULES.maxInitialLtv
    if (config.maxInitialLtv < min || config.maxInitialLtv > max) {
      errors.push(`maxInitialLtv must be between ${min}% and ${max}%`)
    }
  }

  // Validate loan terms
  if (!config.availableLoanTerms || config.availableLoanTerms.length === 0) {
    errors.push('availableLoanTerms cannot be empty')
  }

  // Validate default loan term is in available terms
  if (config.defaultLoanTerm && config.availableLoanTerms) {
    if (!config.availableLoanTerms.includes(config.defaultLoanTerm)) {
      errors.push('defaultLoanTerm must be in available loan terms')
    }
  }

  // Validate origination fee type
  if (config.originationFeeType && !['one-time', 'annual'].includes(config.originationFeeType)) {
    errors.push('Origination fee type must be "one-time" or "annual"')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create a new custom platform configuration
 */
export function createCustomPlatformConfig(
  name: string,
  description: string,
  overrides: Partial<PlatformConfig> = {}
): PlatformConfig {
  const customId = `custom-${Date.now()}`
  
  return {
    id: customId,
    name,
    description,
    originationFeePercent: 1.0,
    originationFeeType: 'one-time',
    liquidationLtv: 90,
    liquidationFeePercent: 3.0,
    availableLoanTerms: [6, 12, 18, 24, 'infinity'],
    defaultLoanTerm: 12,
    maxInitialLtv: 60,
    ...overrides
  }
}

/**
 * Delete custom platform configuration
 */
export function deleteCustomPlatformConfig(platformId: string): void {
  if (!platformId.startsWith('custom-')) {
    throw new Error('Cannot delete built-in platform configurations')
  }

  try {
    const customPlatforms = JSON.parse(localStorage.getItem('customPlatformConfigs') || '{}')
    delete customPlatforms[platformId]
    localStorage.setItem('customPlatformConfigs', JSON.stringify(customPlatforms))
  } catch (error) {
    console.error('Failed to delete custom platform config:', error)
  }
}
