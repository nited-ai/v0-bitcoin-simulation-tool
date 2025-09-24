/**
 * Date Helper Utilities
 *
 * Utility functions for date manipulation and formatting in price data context.
 */

import { getDaysSinceGenesis } from '../models/powerLaw'

/**
 * Bitcoin genesis block date (January 3, 2009).
 */
export const BITCOIN_GENESIS_DATE = new Date('2009-01-03T00:00:00.000Z')

// Re-export getDaysSinceGenesis from powerLaw to avoid duplication
export { getDaysSinceGenesis }

/**
 * Get date from days since genesis.
 */
export function getDateFromGenesisDays(days: number): Date {
  const date = new Date(BITCOIN_GENESIS_DATE)
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Format date to YYYY-MM-DD string.
 */
export function formatDateToString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse date string to Date object.
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Get start of day for a given date.
 */
export function getStartOfDay(date: Date): Date {
  const startOfDay = new Date(date)
  startOfDay.setUTCHours(0, 0, 0, 0)
  return startOfDay
}

/**
 * Get end of day for a given date.
 */
export function getEndOfDay(date: Date): Date {
  const endOfDay = new Date(date)
  endOfDay.setUTCHours(23, 59, 59, 999)
  return endOfDay
}

/**
 * Get start of week (Monday) for a given date.
 */
export function getStartOfWeek(date: Date): Date {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getUTCDay()
  const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  startOfWeek.setUTCDate(diff)
  startOfWeek.setUTCHours(0, 0, 0, 0)
  return startOfWeek
}

/**
 * Get start of month for a given date.
 */
export function getStartOfMonth(date: Date): Date {
  const startOfMonth = new Date(date)
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)
  return startOfMonth
}

/**
 * Get start of year for a given date.
 */
export function getStartOfYear(date: Date): Date {
  const startOfYear = new Date(date)
  startOfYear.setUTCMonth(0, 1)
  startOfYear.setUTCHours(0, 0, 0, 0)
  return startOfYear
}

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

/**
 * Add months to a date.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
}

/**
 * Add years to a date.
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setUTCFullYear(result.getUTCFullYear() + years)
  return result
}

/**
 * Calculate difference in days between two dates.
 */
export function getDaysDifference(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate difference in months between two dates.
 */
export function getMonthsDifference(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getUTCFullYear() - startDate.getUTCFullYear()
  const monthDiff = endDate.getUTCMonth() - startDate.getUTCMonth()
  return yearDiff * 12 + monthDiff
}

/**
 * Check if a date is within a range.
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate
}

/**
 * Get the last day of a month.
 */
export function getLastDayOfMonth(date: Date): Date {
  const lastDay = new Date(date)
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0)
  lastDay.setUTCHours(23, 59, 59, 999)
  return lastDay
}

/**
 * Check if a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

/**
 * Get number of days in a month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Format date for display in different formats.
 */
export function formatDateForDisplay(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC'
  }

  switch (format) {
    case 'short':
      options.year = '2-digit'
      options.month = 'numeric'
      options.day = 'numeric'
      break
    case 'long':
      options.year = 'numeric'
      options.month = 'long'
      options.day = 'numeric'
      break
    case 'medium':
    default:
      options.year = 'numeric'
      options.month = 'short'
      options.day = 'numeric'
      break
  }

  return date.toLocaleDateString('en-US', options)
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 months").
 */
export function getRelativeTimeString(date: Date, baseDate: Date = new Date()): string {
  const diffMs = date.getTime() - baseDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (Math.abs(diffDays) === 0) {
    return 'today'
  } else if (Math.abs(diffDays) === 1) {
    return diffDays > 0 ? 'tomorrow' : 'yesterday'
  } else if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`
  } else if (Math.abs(diffDays) < 30) {
    const weeks = Math.floor(Math.abs(diffDays) / 7)
    return diffDays > 0 ? `in ${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (Math.abs(diffDays) < 365) {
    const months = Math.floor(Math.abs(diffDays) / 30)
    return diffDays > 0 ? `in ${months} month${months > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(Math.abs(diffDays) / 365)
    return diffDays > 0 ? `in ${years} year${years > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''} ago`
  }
}

/**
 * Generate date range array.
 */
export function generateDateRange(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month' = 'day'): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(new Date(current))

    switch (interval) {
      case 'day':
        current.setUTCDate(current.getUTCDate() + 1)
        break
      case 'week':
        current.setUTCDate(current.getUTCDate() + 7)
        break
      case 'month':
        current.setUTCMonth(current.getUTCMonth() + 1)
        break
    }
  }

  return dates
}

/**
 * Convert Unix timestamp to Date.
 */
export function timestampToDate(timestamp: number): Date {
  // Handle both seconds and milliseconds timestamps
  const ts = timestamp > 1e10 ? timestamp : timestamp * 1000
  return new Date(ts)
}

/**
 * Convert Date to Unix timestamp.
 */
export function dateToTimestamp(date: Date, inSeconds: boolean = true): number {
  const timestamp = date.getTime()
  return inSeconds ? Math.floor(timestamp / 1000) : timestamp
}

/**
 * Check if date is a valid Bitcoin trading date (after genesis).
 */
export function isValidBitcoinDate(date: Date): boolean {
  return date >= BITCOIN_GENESIS_DATE && date <= new Date()
}

/**
 * Get Bitcoin age in days, months, and years.
 */
export function getBitcoinAge(referenceDate: Date = new Date()): {
  days: number
  months: number
  years: number
} {
  const days = getDaysSinceGenesis(referenceDate)
  const months = getMonthsDifference(BITCOIN_GENESIS_DATE, referenceDate)
  const years = Math.floor(months / 12)

  return { days, months, years }
}

/**
 * Get next Bitcoin halving date (approximately every 4 years).
 */
export function getNextBitcoinHalving(referenceDate: Date = new Date()): Date {
  // Bitcoin halvings occur approximately every 4 years
  // Known halvings: 2012-11-28, 2016-07-09, 2020-05-11, 2024-04-20
  const halvingDates = [
    new Date('2012-11-28'),
    new Date('2016-07-09'),
    new Date('2020-05-11'),
    new Date('2024-04-20'),
    new Date('2028-04-20'), // Estimated
    new Date('2032-04-20'), // Estimated
    new Date('2036-04-20'), // Estimated
  ]

  return halvingDates.find(date => date > referenceDate) || halvingDates[halvingDates.length - 1]
}
