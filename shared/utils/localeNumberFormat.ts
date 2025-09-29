"use client"

import { useTranslation } from "react-i18next"

/**
 * Locale-aware number formatting utilities
 * Provides consistent number formatting across the application based on current locale
 */

export interface LocaleNumberFormatOptions {
  decimals?: number
  style?: 'decimal' | 'currency' | 'percent'
  currency?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Get locale-specific formatting configuration
 */
export function getLocaleConfig(locale: string) {
  const isGerman = locale.startsWith('de')
  
  return {
    locale: isGerman ? 'de-DE' : 'en-US',
    decimalSeparator: isGerman ? ',' : '.',
    thousandsSeparator: isGerman ? '.' : ',',
    currency: 'USD', // Keep USD as base currency
    isGerman
  }
}

/**
 * Hook for locale-aware number formatting
 */
export function useLocaleNumberFormat() {
  const { i18n } = useTranslation()
  const currentLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  const config = getLocaleConfig(currentLocale)

  /**
   * Format number according to current locale
   */
  const formatNumber = (
    value: number,
    options: LocaleNumberFormatOptions = {}
  ): string => {
    if (isNaN(value)) return ""

    const {
      decimals,
      style = 'decimal',
      currency = config.currency,
      minimumFractionDigits,
      maximumFractionDigits
    } = options

    const formatOptions: Intl.NumberFormatOptions = {
      style,
      ...(style === 'currency' && { currency }),
      ...(decimals !== undefined && {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }),
      ...(minimumFractionDigits !== undefined && { minimumFractionDigits }),
      ...(maximumFractionDigits !== undefined && { maximumFractionDigits })
    }

    return new Intl.NumberFormat(config.locale, formatOptions).format(value)
  }

  /**
   * Format currency with locale-specific formatting
   */
  const formatCurrency = (
    value: number,
    decimals: number = 0
  ): string => {
    return formatNumber(value, {
      style: 'currency',
      currency: config.currency,
      decimals
    })
  }

  /**
   * Format percentage with locale-specific formatting
   */
  const formatPercentage = (
    value: number,
    decimals: number = 1
  ): string => {
    // Convert to percentage (multiply by 100) and format
    return formatNumber(value, {
      style: 'percent',
      decimals
    })
  }

  /**
   * Parse locale-formatted number string to number
   * Handles both German (1.234,56) and English (1,234.56) formats
   */
  const parseNumber = (str: string): number => {
    if (!str || typeof str !== 'string') return 0

    // Remove all whitespace
    let cleaned = str.trim()

    if (config.isGerman) {
      // German format: 1.234.567,89
      // Replace thousands separators (.) with empty string, then decimal separator (,) with .
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // English format: 1,234,567.89
      // Remove thousands separators (,), keep decimal separator (.)
      cleaned = cleaned.replace(/,/g, '')
    }

    // Remove any remaining non-numeric characters except decimal point and minus sign
    cleaned = cleaned.replace(/[^\d.-]/g, '')

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Format number for input display (without currency symbols)
   * Used in NumberInput component for clean editing experience
   */
  const formatForInput = (
    value: number,
    decimals: number = 2
  ): string => {
    if (isNaN(value)) return ""

    // For input formatting, we want clean numbers without currency symbols
    // but with proper decimal separators
    const formatted = formatNumber(value, { decimals })
    
    // Remove currency symbols and extra spaces for input display
    return formatted.replace(/[€$£¥]/g, '').trim()
  }

  /**
   * Get the appropriate decimal separator for the current locale
   */
  const getDecimalSeparator = (): string => {
    return config.decimalSeparator
  }

  /**
   * Get the appropriate thousands separator for the current locale
   */
  const getThousandsSeparator = (): string => {
    return config.thousandsSeparator
  }

  /**
   * Check if a character is a valid decimal separator for current locale
   */
  const isValidDecimalSeparator = (char: string): boolean => {
    return char === config.decimalSeparator
  }

  /**
   * Check if a character is a valid thousands separator for current locale
   */
  const isValidThousandsSeparator = (char: string): boolean => {
    return char === config.thousandsSeparator
  }

  return {
    formatNumber,
    formatCurrency,
    formatPercentage,
    parseNumber,
    formatForInput,
    getDecimalSeparator,
    getThousandsSeparator,
    isValidDecimalSeparator,
    isValidThousandsSeparator,
    config,
    currentLocale
  }
}

/**
 * Static utility functions for use outside of React components
 */
export const LocaleNumberUtils = {
  /**
   * Format number with explicit locale
   */
  formatNumber: (
    value: number,
    locale: string,
    options: LocaleNumberFormatOptions = {}
  ): string => {
    if (isNaN(value)) return ""
    
    const config = getLocaleConfig(locale)
    const {
      decimals,
      style = 'decimal',
      currency = config.currency,
      minimumFractionDigits,
      maximumFractionDigits
    } = options

    const formatOptions: Intl.NumberFormatOptions = {
      style,
      ...(style === 'currency' && { currency }),
      ...(decimals !== undefined && {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }),
      ...(minimumFractionDigits !== undefined && { minimumFractionDigits }),
      ...(maximumFractionDigits !== undefined && { maximumFractionDigits })
    }

    return new Intl.NumberFormat(config.locale, formatOptions).format(value)
  },

  /**
   * Parse number with explicit locale
   */
  parseNumber: (str: string, locale: string): number => {
    if (!str || typeof str !== 'string') return 0

    const config = getLocaleConfig(locale)
    let cleaned = str.trim()

    if (config.isGerman) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }

    cleaned = cleaned.replace(/[^\d.-]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }
}
