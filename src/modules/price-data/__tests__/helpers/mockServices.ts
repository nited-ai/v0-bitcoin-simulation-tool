/**
 * Mock Services for Testing
 * 
 * Mock implementations of external services for isolated testing.
 */

import { vi } from 'vitest'
import type { HistoricalDataPoint, CurrentPriceData } from '../../types'
import { generateMockHistoricalData, createMockApiResponses } from './testData'

/**
 * Mock Centralized Data Service
 */
export const mockCentralizedDataService = {
  loadHistoricalData: vi.fn<[], Promise<HistoricalDataPoint[]>>(),
  getCurrentPrice: vi.fn<[], Promise<CurrentPriceData>>(),
  isInitialized: vi.fn<[], boolean>(),
  initialize: vi.fn<[], Promise<void>>(),
  
  // Helper methods for test setup
  mockLoadHistoricalDataSuccess: (data?: HistoricalDataPoint[]) => {
    const mockData = data || generateMockHistoricalData(100)
    mockCentralizedDataService.loadHistoricalData.mockResolvedValue(mockData)
    return mockData
  },
  
  mockLoadHistoricalDataError: (error: Error = new Error('Failed to load historical data')) => {
    mockCentralizedDataService.loadHistoricalData.mockRejectedValue(error)
  },
  
  mockGetCurrentPriceSuccess: (price: number = 45000) => {
    const mockData: CurrentPriceData = {
      price,
      timestamp: Date.now() / 1000,
      source: 'mock-api',
      lastUpdated: new Date().toISOString()
    }
    mockCentralizedDataService.getCurrentPrice.mockResolvedValue(mockData)
    return mockData
  },
  
  mockGetCurrentPriceError: (error: Error = new Error('Failed to fetch current price')) => {
    mockCentralizedDataService.getCurrentPrice.mockRejectedValue(error)
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Mock Enhanced Bitcoin API Service
 */
export const mockEnhancedBitcoinApiService = {
  getCurrentPrice: vi.fn<[], Promise<number>>(),
  getHistoricalData: vi.fn<[Date, Date], Promise<HistoricalDataPoint[]>>(),
  isHealthy: vi.fn<[], Promise<boolean>>(),
  
  // Helper methods for test setup
  mockGetCurrentPriceSuccess: (price: number = 45000) => {
    mockEnhancedBitcoinApiService.getCurrentPrice.mockResolvedValue(price)
    return price
  },
  
  mockGetCurrentPriceError: (error: Error = new Error('API error')) => {
    mockEnhancedBitcoinApiService.getCurrentPrice.mockRejectedValue(error)
  },
  
  mockGetHistoricalDataSuccess: (data?: HistoricalDataPoint[]) => {
    const mockData = data || generateMockHistoricalData(50)
    mockEnhancedBitcoinApiService.getHistoricalData.mockResolvedValue(mockData)
    return mockData
  },
  
  mockGetHistoricalDataError: (error: Error = new Error('Historical data API error')) => {
    mockEnhancedBitcoinApiService.getHistoricalData.mockRejectedValue(error)
  },
  
  mockIsHealthySuccess: (healthy: boolean = true) => {
    mockEnhancedBitcoinApiService.isHealthy.mockResolvedValue(healthy)
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Mock Performance Monitor
 */
export const mockPerformanceMonitor = {
  recordOperation: vi.fn<[string, number, boolean, boolean?], void>(),
  recordLoadTime: vi.fn<[string, number], void>(),
  getAverageLoadTime: vi.fn<[string], number>(),
  getMetrics: vi.fn<[], Map<string, any>>(),
  getCacheEfficiency: vi.fn<[], { cacheHits: number; cacheMisses: number; hitRate: number }>(),
  getSuccessRate: vi.fn<[], number>(),
  logPerformanceReport: vi.fn<[], void>(),
  reset: vi.fn<[], void>(),
  
  // Helper methods for test setup
  mockGetMetrics: (metrics: Map<string, any> = new Map()) => {
    mockPerformanceMonitor.getMetrics.mockReturnValue(metrics)
    return metrics
  },
  
  mockGetCacheEfficiency: (efficiency = { cacheHits: 10, cacheMisses: 5, hitRate: 66.67 }) => {
    mockPerformanceMonitor.getCacheEfficiency.mockReturnValue(efficiency)
    return efficiency
  },
  
  mockGetSuccessRate: (rate: number = 95.5) => {
    mockPerformanceMonitor.getSuccessRate.mockReturnValue(rate)
    return rate
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Mock Data Cache
 */
export const mockDataCache = {
  get: vi.fn<[string], any>(),
  set: vi.fn<[string, any, number?], void>(),
  has: vi.fn<[string], boolean>(),
  delete: vi.fn<[string], boolean>(),
  clear: vi.fn<[], void>(),
  getStats: vi.fn<[], any>(),
  getCurrentSize: vi.fn<[], number>(),
  cleanup: vi.fn<[], number>(),
  
  // Helper methods for test setup
  mockGetSuccess: <T>(key: string, value: T) => {
    mockDataCache.get.mockImplementation((k) => k === key ? value : null)
    mockDataCache.has.mockImplementation((k) => k === key)
    return value
  },
  
  mockGetMiss: (key: string) => {
    mockDataCache.get.mockImplementation((k) => k === key ? null : undefined)
    mockDataCache.has.mockImplementation((k) => k !== key)
  },
  
  mockStats: (stats = {
    hitRate: 75,
    totalRequests: 100,
    cacheHits: 75,
    cacheMisses: 25,
    cacheSize: 50,
    lastUpdated: new Date()
  }) => {
    mockDataCache.getStats.mockReturnValue(stats)
    return stats
  },
  
  mockCurrentSize: (size: number = 1024) => {
    mockDataCache.getCurrentSize.mockReturnValue(size)
    return size
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Mock Projection Generator
 */
export const mockProjectionGenerator = {
  generateProjectionPath: vi.fn(),
  generateManualPath: vi.fn(),
  generatePowerLawPath: vi.fn(),
  generateCycleRepeatPath: vi.fn(),
  generateCycleRepeatPowerLawPath: vi.fn(),
  
  // Helper methods for test setup
  mockGenerateProjectionPathSuccess: (path: any[] = []) => {
    mockProjectionGenerator.generateProjectionPath.mockReturnValue(path)
    return path
  },
  
  mockGenerateProjectionPathError: (error: Error = new Error('Projection generation failed')) => {
    mockProjectionGenerator.generateProjectionPath.mockImplementation(() => {
      throw error
    })
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Mock Chart Merger
 */
export const mockChartMerger = {
  mergeHistoricalAndProjection: vi.fn(),
  addPowerLawLines: vi.fn(),
  convertHistoricalToChartData: vi.fn(),
  mergeMultipleSeries: vi.fn(),
  filterByDateRange: vi.fn(),
  resampleData: vi.fn(),
  validateChartData: vi.fn(),
  
  // Helper methods for test setup
  mockMergeSuccess: (mergedData: any[] = []) => {
    mockChartMerger.mergeHistoricalAndProjection.mockReturnValue(mergedData)
    return mergedData
  },
  
  mockValidateSuccess: (isValid: boolean = true, errors: string[] = []) => {
    mockChartMerger.validateChartData.mockReturnValue({ isValid, errors })
    return { isValid, errors }
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Mock Local Storage
 */
export const mockLocalStorage = {
  getItem: vi.fn<[string], string | null>(),
  setItem: vi.fn<[string, string], void>(),
  removeItem: vi.fn<[string], void>(),
  clear: vi.fn<[], void>(),
  key: vi.fn<[number], string | null>(),
  length: 0,
  
  // Helper methods for test setup
  mockGetItem: (key: string, value: string | null) => {
    mockLocalStorage.getItem.mockImplementation((k) => k === key ? value : null)
  },
  
  mockSetItemSuccess: () => {
    mockLocalStorage.setItem.mockImplementation(() => {})
  },
  
  mockSetItemError: (error: Error = new Error('localStorage error')) => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw error
    })
  },
  
  reset: () => {
    vi.clearAllMocks()
  }
}

/**
 * Setup all mocks for testing
 */
export function setupAllMocks() {
  // Mock external dependencies
  vi.mock('../../../lib/services/centralized-data-service', () => ({
    centralizedDataService: mockCentralizedDataService
  }))
  
  vi.mock('../../../lib/services/bitcoin-api-service', () => ({
    enhancedBitcoinApiService: mockEnhancedBitcoinApiService
  }))
  
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  })
  
  return {
    centralizedDataService: mockCentralizedDataService,
    enhancedBitcoinApiService: mockEnhancedBitcoinApiService,
    performanceMonitor: mockPerformanceMonitor,
    dataCache: mockDataCache,
    projectionGenerator: mockProjectionGenerator,
    chartMerger: mockChartMerger,
    localStorage: mockLocalStorage
  }
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  mockCentralizedDataService.reset()
  mockEnhancedBitcoinApiService.reset()
  mockPerformanceMonitor.reset()
  mockDataCache.reset()
  mockProjectionGenerator.reset()
  mockChartMerger.reset()
  mockLocalStorage.reset()
}

/**
 * Create test environment with all mocks configured
 */
export function createTestEnvironment() {
  const mocks = setupAllMocks()
  
  // Setup default successful responses
  mocks.centralizedDataService.mockLoadHistoricalDataSuccess()
  mocks.enhancedBitcoinApiService.mockGetCurrentPriceSuccess()
  mocks.performanceMonitor.mockGetMetrics()
  mocks.dataCache.mockStats()
  
  return {
    mocks,
    cleanup: resetAllMocks
  }
}
