/**
 * Test Data Helpers
 * 
 * Utility functions and mock data for testing price data module.
 */

import type { 
  HistoricalDataPoint, 
  PriceChartDataPoint, 
  PriceEngineParams,
  ProjectionPathPoint 
} from '../../types'

/**
 * Generate mock historical data for testing.
 */
export function generateMockHistoricalData(
  count: number = 100,
  startDate: Date = new Date('2021-01-01'),
  basePrice: number = 30000
): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const price = basePrice + (Math.random() - 0.5) * 2000 + i * 10
    const volatility = price * 0.02 // 2% volatility
    
    const open = price + (Math.random() - 0.5) * volatility
    const close = price + (Math.random() - 0.5) * volatility
    const high = Math.max(open, close) + Math.random() * volatility
    const low = Math.min(open, close) - Math.random() * volatility
    
    data.push({
      time: Math.floor(date.getTime() / 1000),
      date: date.toISOString().split('T')[0],
      open: Math.max(0, open),
      high: Math.max(0, high),
      low: Math.max(0, low),
      close: Math.max(0, close),
      volume: Math.floor(Math.random() * 1000000) + 500000,
      source: 'mock'
    })
  }
  
  return data.sort((a, b) => a.time - b.time)
}

/**
 * Generate mock price chart data for testing.
 */
export function generateMockChartData(
  count: number = 100,
  startDate: Date = new Date('2021-01-01'),
  basePrice: number = 30000
): PriceChartDataPoint[] {
  const data: PriceChartDataPoint[] = []
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const price = basePrice + (Math.random() - 0.5) * 2000 + i * 10
    
    data.push({
      date: date.toISOString().split('T')[0],
      days: i,
      historicalPrice: i < count / 2 ? Math.max(0, price) : undefined,
      simulationPath: i >= count / 2 ? Math.max(0, price * 1.1) : undefined
    })
  }
  
  return data
}

/**
 * Generate mock projection path data for testing.
 */
export function generateMockProjectionPath(
  count: number = 50,
  startDate: Date = new Date('2021-06-01'),
  basePrice: number = 35000
): ProjectionPathPoint[] {
  const data: ProjectionPathPoint[] = []
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const price = basePrice * Math.pow(1.001, i) + (Math.random() - 0.5) * 1000
    
    data.push({
      date,
      price: Math.max(0, price)
    })
  }
  
  return data
}

/**
 * Generate mock price engine parameters for testing.
 */
export function generateMockPriceEngineParams(
  overrides: Partial<PriceEngineParams> = {}
): PriceEngineParams {
  return {
    priceModel: 'manual',
    simulationMonths: 12,
    initialBtcPrice: 50000,
    annualGrowthRates: [10, 15, 20],
    powerLawSettings: {
      prognosisLine: 'fit'
    },
    ...overrides
  }
}

/**
 * Create test data with specific patterns for validation testing.
 */
export function createTestDataWithPatterns(): {
  valid: HistoricalDataPoint[]
  invalid: any[]
  mixed: any[]
} {
  const valid: HistoricalDataPoint[] = [
    {
      time: 1609459200,
      date: '2021-01-01',
      open: 29000,
      high: 30000,
      low: 28000,
      close: 29500,
      volume: 1000000,
      source: 'test'
    },
    {
      time: 1609545600,
      date: '2021-01-02',
      open: 29500,
      high: 31000,
      low: 29000,
      close: 30500,
      volume: 1200000,
      source: 'test'
    }
  ]

  const invalid = [
    null,
    undefined,
    { time: 'invalid', close: 'invalid' },
    { time: -1, close: -100 },
    { close: 30000 }, // Missing time
    { time: 1609459200 }, // Missing close
    { time: 1609459200, close: 0 }, // Zero price
  ]

  const mixed = [...valid, ...invalid]

  return { valid, invalid, mixed }
}

/**
 * Create mock API responses for testing.
 */
export function createMockApiResponses() {
  return {
    successResponse: {
      success: true,
      data: {
        current: {
          close: 45000,
          timestamp: Date.now() / 1000,
          source: 'api'
        },
        isLive: true
      }
    },
    
    errorResponse: {
      success: false,
      error: 'API rate limit exceeded',
      data: null
    },
    
    invalidResponse: {
      success: true,
      data: {
        current: null
      }
    },
    
    historicalResponse: {
      success: true,
      data: generateMockHistoricalData(10)
    }
  }
}

/**
 * Create mock cache configurations for testing.
 */
export function createMockCacheConfigs() {
  return {
    default: {
      maxSize: 100,
      maxAge: 60000, // 1 minute
      persistToLocalStorage: true,
      compressionEnabled: false
    },
    
    small: {
      maxSize: 5,
      maxAge: 1000, // 1 second
      persistToLocalStorage: false,
      compressionEnabled: false
    },
    
    large: {
      maxSize: 1000,
      maxAge: 3600000, // 1 hour
      persistToLocalStorage: true,
      compressionEnabled: true
    }
  }
}

/**
 * Create test scenarios for different price models.
 */
export function createPriceModelTestScenarios(): Array<{
  name: string
  params: PriceEngineParams
  expectedProperties: string[]
}> {
  return [
    {
      name: 'Manual Growth Model',
      params: generateMockPriceEngineParams({
        priceModel: 'manual',
        annualGrowthRates: [10, 15, 20]
      }),
      expectedProperties: ['date', 'days', 'simulationPath']
    },
    
    {
      name: 'Power Law Model',
      params: generateMockPriceEngineParams({
        priceModel: 'powerLaw',
        powerLawSettings: { prognosisLine: 'fit' }
      }),
      expectedProperties: ['date', 'days', 'simulationPath', 'support', 'resistance', 'fit']
    },
    
    {
      name: 'Cycle Repeat Model',
      params: generateMockPriceEngineParams({
        priceModel: 'cycleRepeat'
      }),
      expectedProperties: ['date', 'days', 'simulationPath']
    },
    
    {
      name: 'Cycle Repeat Power Law Model',
      params: generateMockPriceEngineParams({
        priceModel: 'cycleRepeatPowerLaw'
      }),
      expectedProperties: ['date', 'days', 'simulationPath', 'support', 'resistance', 'fit']
    }
  ]
}

/**
 * Create performance test data sets.
 */
export function createPerformanceTestData() {
  return {
    small: generateMockHistoricalData(100),
    medium: generateMockHistoricalData(1000),
    large: generateMockHistoricalData(10000),
    extraLarge: generateMockHistoricalData(100000)
  }
}

/**
 * Create edge case test data.
 */
export function createEdgeCaseTestData() {
  return {
    emptyArray: [],
    singlePoint: generateMockHistoricalData(1),
    duplicateDates: [
      ...generateMockHistoricalData(5),
      ...generateMockHistoricalData(5) // Duplicate the same data
    ],
    unsortedData: generateMockHistoricalData(10).reverse(),
    extremePrices: [
      {
        time: 1609459200,
        date: '2021-01-01',
        open: 0.01,
        high: 0.01,
        low: 0.01,
        close: 0.01,
        source: 'test'
      },
      {
        time: 1609545600,
        date: '2021-01-02',
        open: 10000000,
        high: 10000000,
        low: 10000000,
        close: 10000000,
        source: 'test'
      }
    ]
  }
}

/**
 * Utility function to wait for async operations in tests.
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create mock localStorage for testing.
 */
export function createMockLocalStorage() {
  const storage: Record<string, string> = {}
  
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value },
    removeItem: (key: string) => { delete storage[key] },
    clear: () => { Object.keys(storage).forEach(key => delete storage[key]) },
    key: (index: number) => Object.keys(storage)[index] || null,
    get length() { return Object.keys(storage).length }
  }
}

/**
 * Assert that data matches expected structure.
 */
export function assertDataStructure<T>(
  data: T[],
  expectedProperties: (keyof T)[],
  allowUndefined: boolean = false
): void {
  expect(Array.isArray(data)).toBe(true)
  
  data.forEach((item, index) => {
    expectedProperties.forEach(prop => {
      if (!allowUndefined) {
        expect(item[prop]).toBeDefined()
      }
      expect(item).toHaveProperty(prop)
    })
  })
}

/**
 * Assert that prices are within reasonable bounds.
 */
export function assertReasonablePrices(
  data: Array<{ price?: number; close?: number; historicalPrice?: number; simulationPath?: number }>,
  minPrice: number = 0.01,
  maxPrice: number = 10000000
): void {
  data.forEach((item, index) => {
    const price = item.price || item.close || item.historicalPrice || item.simulationPath
    
    if (price !== undefined) {
      expect(price).toBeGreaterThan(minPrice)
      expect(price).toBeLessThan(maxPrice)
      expect(typeof price).toBe('number')
      expect(isNaN(price)).toBe(false)
      expect(isFinite(price)).toBe(true)
    }
  })
}
