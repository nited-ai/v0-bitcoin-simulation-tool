/**
 * Platform Fee Integration Service
 * 
 * Provides comprehensive platform fee integration with the existing platform preset system.
 * Handles fee calculations for all supported platforms (Firefish, Strike, Custom) and
 * integrates seamlessly with the existing platform configuration system.
 */

import { getPlatformConfig } from '../../../../app/simulation/constants/platformPresets'
import type { PlatformFeeConfig, PlatformFeeResult } from './types'

export class PlatformFeeIntegrationService {
  
  /**
   * Get platform fee configuration from platform ID
   */
  getPlatformFeeConfig(platformId: string): PlatformFeeConfig {
    const platformConfig = getPlatformConfig(platformId)
    
    // Map platform configuration to fee configuration
    switch (platformConfig.id) {
      case 'firefish':
        return {
          type: 'annual',
          percent: platformConfig.originationFeePercent
        }
      
      case 'strike':
        return {
          type: 'none',
          percent: 0
        }
      
      default:
        // Custom platforms and fallback
        return {
          type: platformConfig.originationFeeType === 'annual' ? 'annual' : 'one-time',
          percent: platformConfig.originationFeePercent
        }
    }
  }
  
  /**
   * Calculate platform fees for a given loan amount
   */
  calculatePlatformFees(
    loanAmount: number,
    platformId: string,
    loanTermMonths?: number
  ): PlatformFeeResult {
    const feeConfig = this.getPlatformFeeConfig(platformId)
    return this.calculateFeesFromConfig(loanAmount, feeConfig, loanTermMonths)
  }
  
  /**
   * Calculate fees from platform fee configuration
   */
  private calculateFeesFromConfig(
    loanAmount: number,
    feeConfig: PlatformFeeConfig,
    loanTermMonths?: number
  ): PlatformFeeResult {
    switch (feeConfig.type) {
      case 'none':
        return {
          amount: 0,
          type: 'none',
          description: 'No platform fees'
        }
      
      case 'one-time':
        return {
          amount: loanAmount * (feeConfig.percent / 100),
          type: 'one-time',
          description: `One-time platform fee: ${feeConfig.percent}%`
        }
      
      case 'annual':
        if (!loanTermMonths) {
          throw new Error('Loan term months required for annual fee calculation')
        }
        const annualFee = loanAmount * (feeConfig.percent / 100)
        const loanTermYears = loanTermMonths === Infinity ? 1 : loanTermMonths / 12
        return {
          amount: annualFee * loanTermYears,
          type: 'annual',
          description: `Annual platform fee: ${feeConfig.percent}% for ${loanTermYears} years`
        }
      
      default:
        throw new Error(`Unsupported platform fee type: ${feeConfig.type}`)
    }
  }
  
  /**
   * Get platform fee summary for display purposes
   */
  getPlatformFeeSummary(platformId: string): {
    platformName: string
    feeType: string
    feePercent: number
    description: string
  } {
    const platformConfig = getPlatformConfig(platformId)
    const feeConfig = this.getPlatformFeeConfig(platformId)
    
    let feeTypeDescription: string
    switch (feeConfig.type) {
      case 'none':
        feeTypeDescription = 'No fees'
        break
      case 'one-time':
        feeTypeDescription = 'One-time fee'
        break
      case 'annual':
        feeTypeDescription = 'Annual recurring fee'
        break
      default:
        feeTypeDescription = 'Unknown fee type'
    }
    
    return {
      platformName: platformConfig.name,
      feeType: feeTypeDescription,
      feePercent: feeConfig.percent,
      description: `${platformConfig.name}: ${feeTypeDescription}${feeConfig.percent > 0 ? ` (${feeConfig.percent}%)` : ''}`
    }
  }
  
  /**
   * Validate platform fee configuration
   */
  validatePlatformFeeConfig(platformId: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    try {
      const platformConfig = getPlatformConfig(platformId)
      const feeConfig = this.getPlatformFeeConfig(platformId)
      
      // Validate fee percentage
      if (feeConfig.percent < 0) {
        errors.push('Fee percentage cannot be negative')
      }
      
      if (feeConfig.percent > 100) {
        errors.push('Fee percentage cannot exceed 100%')
      }
      
      // Validate fee type consistency
      if (platformConfig.id === 'firefish' && feeConfig.type !== 'annual') {
        errors.push('Firefish platform must use annual fee type')
      }
      
      if (platformConfig.id === 'strike' && feeConfig.type !== 'none') {
        errors.push('Strike platform must use no fees')
      }
      
      // Validate Strike fee amount
      if (platformConfig.id === 'strike' && feeConfig.percent !== 0) {
        errors.push('Strike platform must have 0% fees')
      }
      
    } catch (error) {
      errors.push(`Platform configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Get all supported platforms with their fee configurations
   */
  getAllPlatformFeeConfigurations(): Array<{
    platformId: string
    platformName: string
    feeConfig: PlatformFeeConfig
    summary: PlatformFeeResult
  }> {
    const platforms = ['firefish', 'strike', 'custom']
    
    return platforms.map(platformId => ({
      platformId,
      platformName: getPlatformConfig(platformId).name,
      feeConfig: this.getPlatformFeeConfig(platformId),
      summary: this.getPlatformFeeSummary(platformId)
    }))
  }
}
