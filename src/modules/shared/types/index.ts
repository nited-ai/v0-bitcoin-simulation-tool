/**
 * Shared Types
 * 
 * Common TypeScript type definitions used across all modules.
 * These types ensure consistency and type safety in cross-module communication.
 */

/**
 * Historical Bitcoin price data point
 */
export interface HistoricalDataPoint {
  time: number  // Unix timestamp in milliseconds
  close: number // Closing price in EUR
  high?: number // High price in EUR
  low?: number  // Low price in EUR
  open?: number // Opening price in EUR
  volume?: number // Trading volume
}

/**
 * Individual projection point from price models
 */
export interface ProjectionPoint {
  timestamp: number
  price: number
  support?: number
  resistance?: number
  confidence: number
  metadata?: Record<string, any>
}

/**
 * Complete price projection result from models
 */
export interface PriceProjectionResult {
  modelName: string
  modelVersion: string
  projectionPoints: ProjectionPoint[]
  metadata: {
    totalMonths: number
    totalGrowth: number
    averageMonthlyGrowth: number
    confidence: number
    generatedAt: string
    [key: string]: any
  }
}

/**
 * Parameters for price model generation
 */
export interface PriceModelParams {
  startPrice: number
  projectionMonths: number
  modelSpecificParams?: Record<string, any>
}

/**
 * Monthly simulation result
 */
export interface MonthlyResult {
  month: number
  dateString: string
  btcPrice: number
  collateralValue: number
  realCollateralValue: number
  totalDebt: number
  realTotalDebt: number
  withdrawalAmount: number
  newLoanPrincipal: number
  repaymentsDue: number
  reinvestment: number
  currentBtcAmount: number
  freeBtc: number
  lockedBtc: number
  loanCount: number
  highestLtv: number
  events: SimulationEvent[]
}

/**
 * Simulation event types
 */
export type EventType = 
  | 'loan_taken'
  | 'loan_repaid'
  | 'liquidation'
  | 'withdrawal'
  | 'reinvestment'
  | 'price_alert'
  | 'risk_warning'

/**
 * Individual simulation event
 */
export interface SimulationEvent {
  type: EventType
  description: string
  amount?: number
  btcAmount?: number
  timestamp: number
  severity?: 'info' | 'warning' | 'error'
  metadata?: Record<string, any>
}

/**
 * Loan configuration
 */
export interface LoanConfig {
  maxLoanAmount: number
  initialLtv: number
  interestRate: number
  termMonths: number
  liquidationFee: number
  platformName: string
}

/**
 * Platform configuration
 */
export interface PlatformConfig {
  id: string
  name: string
  displayName: string
  badge: string
  maxLoanAmount: number
  maxLoanAmountType: 'percentage' | 'fixed'
  initialLtv: number
  interestRate: number
  termMonths: number
  liquidationFee: number
  isCustom: boolean
  description?: string
  features?: string[]
}

/**
 * Risk management settings
 */
export interface RiskManagement {
  targetLtv: number
  liquidationLtv: number
  maxDrawdownPercent?: number
  emergencyBuffer?: number
  autoRebalance?: boolean
}

/**
 * User preferences
 */
export interface UserPreferences {
  currency: 'EUR' | 'USD' | 'BTC'
  language: 'en' | 'de'
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  riskTolerance: 'conservative' | 'moderate' | 'optimistic' | 'moonshots'
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  timestamp: number
  value: number
  label?: string
  color?: string
  metadata?: Record<string, any>
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  title: string
  xAxisLabel: string
  yAxisLabel: string
  showLegend: boolean
  showGrid: boolean
  colors: string[]
  dateFormat: string
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
  requestId?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: ValidationWarning[]
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string
  message: string
  code: string
  value?: any
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  expiresAt: number
  metadata?: Record<string, any>
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  executionTime: number
  memoryUsage: number
  cacheHitRate: number
  errorRate: number
  throughput: number
}

/**
 * Module metadata
 */
export interface ModuleMetadata {
  name: string
  version: string
  description: string
  author: string
  dependencies: string[]
  exports: string[]
}

/**
 * Feature flag
 */
export interface FeatureFlag {
  name: string
  enabled: boolean
  description: string
  rolloutPercentage?: number
  conditions?: Record<string, any>
}
