/**
 * Shared Utilities
 * 
 * Common utility functions used across all modules.
 * Provides data validation, transformation, and helper functions.
 */

import type { ValidationResult, ValidationError, HistoricalDataPoint } from '../types'

/**
 * Data validation utilities
 */
export class DataValidator {
  /**
   * Validate timestamp is valid Unix milliseconds
   */
  static isValidTimestamp(timestamp: number): boolean {
    return Number.isInteger(timestamp) && 
           timestamp > 0 && 
           timestamp < Date.now() + (365 * 24 * 60 * 60 * 1000) // Not more than 1 year in future
  }

  /**
   * Validate price is positive number
   */
  static isValidPrice(price: number): boolean {
    return typeof price === 'number' && 
           !isNaN(price) && 
           isFinite(price) && 
           price > 0
  }

  /**
   * Validate confidence is between 0 and 1
   */
  static isValidConfidence(confidence: number): boolean {
    return typeof confidence === 'number' && 
           !isNaN(confidence) && 
           confidence >= 0 && 
           confidence <= 1
  }

  /**
   * Validate percentage is between 0 and 100
   */
  static isValidPercentage(percentage: number): boolean {
    return typeof percentage === 'number' && 
           !isNaN(percentage) && 
           percentage >= 0 && 
           percentage <= 100
  }

  /**
   * Validate historical data point
   */
  static validateHistoricalDataPoint(point: HistoricalDataPoint): ValidationResult {
    const errors: ValidationError[] = []

    if (!this.isValidTimestamp(point.time)) {
      errors.push({
        field: 'time',
        message: 'Invalid timestamp',
        code: 'INVALID_TIMESTAMP',
        value: point.time
      })
    }

    if (!this.isValidPrice(point.close)) {
      errors.push({
        field: 'close',
        message: 'Invalid close price',
        code: 'INVALID_PRICE',
        value: point.close
      })
    }

    if (point.high !== undefined && !this.isValidPrice(point.high)) {
      errors.push({
        field: 'high',
        message: 'Invalid high price',
        code: 'INVALID_PRICE',
        value: point.high
      })
    }

    if (point.low !== undefined && !this.isValidPrice(point.low)) {
      errors.push({
        field: 'low',
        message: 'Invalid low price',
        code: 'INVALID_PRICE',
        value: point.low
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Data transformation utilities
 */
export class DataTransformer {
  /**
   * Convert timestamp to ISO date string
   */
  static timestampToISOString(timestamp: number): string {
    return new Date(timestamp).toISOString()
  }

  /**
   * Convert ISO date string to timestamp
   */
  static isoStringToTimestamp(isoString: string): number {
    return new Date(isoString).getTime()
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: string = 'EUR', decimals: number = 2): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(price)
  }

  /**
   * Format percentage for display
   */
  static formatPercentage(percentage: number, decimals: number = 1): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(percentage / 100)
  }

  /**
   * Format large numbers with K/M/B suffixes
   */
  static formatLargeNumber(num: number, decimals: number = 1): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(decimals) + 'B'
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(decimals) + 'M'
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(decimals) + 'K'
    }
    return num.toFixed(decimals)
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T
    }

    if (typeof obj === 'object') {
      const cloned = {} as T
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key])
        }
      }
      return cloned
    }

    return obj
  }
}

/**
 * Array utilities
 */
export class ArrayUtils {
  /**
   * Remove duplicates from array based on key function
   */
  static uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
    const seen = new Set()
    return array.filter(item => {
      const key = keyFn(item)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Group array items by key function
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }

  /**
   * Sort array by multiple criteria
   */
  static sortBy<T>(array: T[], ...sortFns: Array<(item: T) => any>): T[] {
    return [...array].sort((a, b) => {
      for (const sortFn of sortFns) {
        const aVal = sortFn(a)
        const bVal = sortFn(b)
        
        if (aVal < bVal) return -1
        if (aVal > bVal) return 1
      }
      return 0
    })
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * Math utilities
 */
export class MathUtils {
  /**
   * Calculate compound annual growth rate
   */
  static calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || endValue <= 0 || years <= 0) {
      return 0
    }
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
  }

  /**
   * Calculate standard deviation
   */
  static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length
    
    return Math.sqrt(variance)
  }

  /**
   * Calculate moving average
   */
  static movingAverage(values: number[], windowSize: number): number[] {
    if (windowSize <= 0 || windowSize > values.length) {
      return []
    }

    const result: number[] = []
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1)
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize
      result.push(average)
    }
    
    return result
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  /**
   * Linear interpolation
   */
  static lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor
  }
}

/**
 * Date utilities
 */
export class DateUtils {
  /**
   * Add months to a date
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  /**
   * Get start of month
   */
  static startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  /**
   * Get end of month
   */
  static endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, locale: string = 'de-DE'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  /**
   * Get months between two dates
   */
  static monthsBetween(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear()
    const monthDiff = endDate.getMonth() - startDate.getMonth()
    return yearDiff * 12 + monthDiff
  }
}

/**
 * Performance utilities
 */
export class PerformanceUtils {
  /**
   * Debounce function execution
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }

  /**
   * Throttle function execution
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0
    
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        func(...args)
      }
    }
  }

  /**
   * Measure execution time
   */
  static async measureTime<T>(
    operation: () => Promise<T> | T,
    label?: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await operation()
    const duration = performance.now() - start
    
    if (label) {
      console.log(`${label}: ${duration.toFixed(2)}ms`)
    }
    
    return { result, duration }
  }
}
