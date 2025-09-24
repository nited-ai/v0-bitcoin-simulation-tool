/**
 * Data Validators
 * 
 * Utility functions for validating price data integrity and format compliance.
 */

import type { 
  HistoricalDataPoint, 
  PriceChartDataPoint, 
  PriceEngineParams,
  ValidationResult 
} from '../types'

/**
 * Validate historical data point structure and values.
 */
export function validateHistoricalDataPoint(point: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  if (!point) {
    errors.push('Data point is null or undefined')
    return { isValid: false, errors, warnings }
  }

  if (typeof point.time !== 'number') {
    errors.push('Missing or invalid time field (must be number)')
  } else if (point.time <= 0) {
    errors.push('Time must be positive')
  } else if (point.time < 1230940800) { // Before Bitcoin genesis
    warnings.push('Time is before Bitcoin genesis block (2009-01-03)')
  }

  if (typeof point.close !== 'number') {
    errors.push('Missing or invalid close price (must be number)')
  } else if (point.close <= 0) {
    errors.push('Close price must be positive')
  } else if (point.close > 10000000) { // Sanity check
    warnings.push('Close price seems unusually high')
  }

  if (typeof point.date !== 'string') {
    errors.push('Missing or invalid date field (must be string)')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    errors.push('Date must be in YYYY-MM-DD format')
  }

  // Optional fields validation
  if (point.open !== undefined) {
    if (typeof point.open !== 'number' || point.open <= 0) {
      warnings.push('Invalid open price')
    }
  }

  if (point.high !== undefined) {
    if (typeof point.high !== 'number' || point.high <= 0) {
      warnings.push('Invalid high price')
    } else if (point.close && point.high < point.close) {
      warnings.push('High price is lower than close price')
    }
  }

  if (point.low !== undefined) {
    if (typeof point.low !== 'number' || point.low <= 0) {
      warnings.push('Invalid low price')
    } else if (point.close && point.low > point.close) {
      warnings.push('Low price is higher than close price')
    }
  }

  if (point.volume !== undefined) {
    if (typeof point.volume !== 'number' || point.volume < 0) {
      warnings.push('Invalid volume (must be non-negative number)')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate array of historical data points.
 */
export function validateHistoricalDataArray(data: any[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(data)) {
    errors.push('Data must be an array')
    return { isValid: false, errors, warnings }
  }

  if (data.length === 0) {
    errors.push('Data array cannot be empty')
    return { isValid: false, errors, warnings }
  }

  // Validate each point
  data.forEach((point, index) => {
    const validation = validateHistoricalDataPoint(point)
    
    validation.errors.forEach(error => {
      errors.push(`Point ${index}: ${error}`)
    })
    
    validation.warnings.forEach(warning => {
      warnings.push(`Point ${index}: ${warning}`)
    })
  })

  // Check for chronological order
  for (let i = 1; i < data.length; i++) {
    if (data[i].time && data[i-1].time && data[i].time < data[i-1].time) {
      warnings.push(`Points ${i-1} and ${i}: Data is not in chronological order`)
    }
  }

  // Check for duplicates
  const timeSet = new Set()
  data.forEach((point, index) => {
    if (point.time) {
      if (timeSet.has(point.time)) {
        warnings.push(`Point ${index}: Duplicate timestamp ${point.time}`)
      }
      timeSet.add(point.time)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate price chart data point.
 */
export function validatePriceChartDataPoint(point: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!point) {
    errors.push('Chart data point is null or undefined')
    return { isValid: false, errors, warnings }
  }

  if (typeof point.date !== 'string') {
    errors.push('Missing or invalid date field')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    errors.push('Date must be in YYYY-MM-DD format')
  }

  if (typeof point.days !== 'number') {
    errors.push('Missing or invalid days field')
  } else if (point.days < 0) {
    errors.push('Days must be non-negative')
  }

  // Optional price fields
  if (point.historicalPrice !== undefined) {
    if (typeof point.historicalPrice !== 'number' || point.historicalPrice <= 0) {
      errors.push('Invalid historical price')
    }
  }

  if (point.simulationPath !== undefined) {
    if (typeof point.simulationPath !== 'number' || point.simulationPath <= 0) {
      errors.push('Invalid simulation path price')
    }
  }

  if (point.support !== undefined) {
    if (typeof point.support !== 'number' || point.support <= 0) {
      warnings.push('Invalid support price')
    }
  }

  if (point.resistance !== undefined) {
    if (typeof point.resistance !== 'number' || point.resistance <= 0) {
      warnings.push('Invalid resistance price')
    }
  }

  if (point.fit !== undefined) {
    if (typeof point.fit !== 'number' || point.fit <= 0) {
      warnings.push('Invalid fit price')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate price engine parameters.
 */
export function validatePriceEngineParams(params: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!params) {
    errors.push('Parameters object is null or undefined')
    return { isValid: false, errors, warnings }
  }

  // Validate price model
  const validModels = ['manual', 'powerLaw', 'cycleRepeat', 'enhancedCycleRepeat', 'cycleRepeatPowerLaw']
  if (!validModels.includes(params.priceModel)) {
    errors.push(`Invalid price model. Must be one of: ${validModels.join(', ')}`)
  }

  // Validate simulation months
  if (typeof params.simulationMonths !== 'number') {
    errors.push('simulationMonths must be a number')
  } else if (params.simulationMonths <= 0) {
    errors.push('simulationMonths must be positive')
  } else if (params.simulationMonths > 1200) { // 100 years
    warnings.push('simulationMonths is very large (>100 years)')
  }

  // Validate initial BTC price
  if (typeof params.initialBtcPrice !== 'number') {
    errors.push('initialBtcPrice must be a number')
  } else if (params.initialBtcPrice <= 0) {
    errors.push('initialBtcPrice must be positive')
  } else if (params.initialBtcPrice > 10000000) {
    warnings.push('initialBtcPrice seems unusually high')
  }

  // Validate annual growth rates
  if (!Array.isArray(params.annualGrowthRates)) {
    errors.push('annualGrowthRates must be an array')
  } else if (params.annualGrowthRates.length === 0) {
    errors.push('annualGrowthRates cannot be empty')
  } else {
    params.annualGrowthRates.forEach((rate: any, index: number) => {
      if (typeof rate !== 'number') {
        errors.push(`annualGrowthRates[${index}] must be a number`)
      } else if (rate < -100) {
        warnings.push(`annualGrowthRates[${index}] is very negative (${rate}%)`)
      } else if (rate > 1000) {
        warnings.push(`annualGrowthRates[${index}] is very high (${rate}%)`)
      }
    })
  }

  // Validate power law settings
  if (!params.powerLawSettings) {
    errors.push('powerLawSettings is required')
  } else {
    const validLines = ['fit', 'support', 'resistance']
    if (!validLines.includes(params.powerLawSettings.prognosisLine)) {
      errors.push(`powerLawSettings.prognosisLine must be one of: ${validLines.join(', ')}`)
    }
  }

  // Validate optional projection start date
  if (params.projectionStartDate !== undefined) {
    if (!(params.projectionStartDate instanceof Date) && typeof params.projectionStartDate !== 'string') {
      errors.push('projectionStartDate must be a Date object or ISO string')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate data consistency between historical and projection data.
 */
export function validateDataConsistency(
  historical: HistoricalDataPoint[],
  projection: PriceChartDataPoint[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if historical data exists
  if (historical.length === 0) {
    warnings.push('No historical data provided')
  }

  // Check if projection data exists
  if (projection.length === 0) {
    warnings.push('No projection data provided')
  }

  if (historical.length > 0 && projection.length > 0) {
    // Check date overlap
    const lastHistoricalDate = historical[historical.length - 1].date
    const firstProjectionDate = projection.find(p => p.simulationPath !== undefined)?.date

    if (firstProjectionDate && lastHistoricalDate > firstProjectionDate) {
      warnings.push('Historical data extends beyond projection start date')
    }

    // Check price continuity
    const lastHistoricalPrice = historical[historical.length - 1].close
    const firstProjectionPrice = projection.find(p => p.simulationPath !== undefined)?.simulationPath

    if (firstProjectionPrice && Math.abs(lastHistoricalPrice - firstProjectionPrice) / lastHistoricalPrice > 0.5) {
      warnings.push('Large price gap between historical and projection data')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate API response structure.
 */
export function validateApiResponse(response: any, expectedFields: string[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!response) {
    errors.push('API response is null or undefined')
    return { isValid: false, errors, warnings }
  }

  if (typeof response !== 'object') {
    errors.push('API response must be an object')
    return { isValid: false, errors, warnings }
  }

  // Check required fields
  expectedFields.forEach(field => {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`)
    }
  })

  // Check for error indicators
  if (response.error) {
    errors.push(`API error: ${response.error}`)
  }

  if (response.success === false) {
    errors.push('API response indicates failure')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Sanitize and normalize price data.
 */
export function sanitizePriceData(data: any[]): HistoricalDataPoint[] {
  return data
    .filter(point => point && typeof point === 'object')
    .map(point => {
      // Normalize field names
      const normalized: any = {}
      
      normalized.time = point.time || point.timestamp || (point.date ? new Date(point.date).getTime() / 1000 : 0)
      normalized.close = point.close || point.price || 0
      normalized.date = point.date || (point.time ? new Date(point.time * 1000).toISOString().split('T')[0] : '')
      normalized.open = point.open || normalized.close
      normalized.high = point.high || normalized.close
      normalized.low = point.low || normalized.close
      normalized.volume = point.volume || undefined
      normalized.source = point.source || 'unknown'

      return normalized
    })
    .filter(point => {
      const validation = validateHistoricalDataPoint(point)
      return validation.isValid
    })
    .sort((a, b) => a.time - b.time)
}

/**
 * Check if data needs refresh based on age.
 */
export function shouldRefreshData(lastUpdated: Date, maxAge: number): boolean {
  const now = new Date()
  const age = now.getTime() - lastUpdated.getTime()
  return age > maxAge
}

/**
 * Validate cache configuration.
 */
export function validateCacheConfig(config: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config) {
    errors.push('Cache configuration is required')
    return { isValid: false, errors, warnings }
  }

  if (typeof config.maxSize !== 'number' || config.maxSize <= 0) {
    errors.push('maxSize must be a positive number')
  }

  if (typeof config.maxAge !== 'number' || config.maxAge <= 0) {
    errors.push('maxAge must be a positive number')
  }

  if (typeof config.persistToLocalStorage !== 'boolean') {
    errors.push('persistToLocalStorage must be a boolean')
  }

  if (typeof config.compressionEnabled !== 'boolean') {
    errors.push('compressionEnabled must be a boolean')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
