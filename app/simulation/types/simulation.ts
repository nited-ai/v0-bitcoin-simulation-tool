import type {
  HistoricalDataPoint,
  PriceModel,
  PowerLawLine,
  PriceChartDataPoint,
} from "@/lib/price-engine/types"
import type {
  InvestmentStrategy,
  AthBasedStrategyParams,
  MovingAverageStrategyParams,
  AthCollateralStrategyParams
} from "@/lib/strategy-engine/types"
import type { PlatformConfig } from "../constants/platformPresets"

/**
 * Type definitions
 */
export type RiskLevel = "conservative" | "moderate" | "optimistic" | "moonshots"
export type Platform = "firefish" | "strike" | "custom" | string

/**
 * Parameter source tracking for preset management
 */
export interface ParameterSource {
  loanAmountPercent: 'preset' | 'manual' | 'platform'
  targetLtv: 'preset' | 'manual' | 'platform'
  annualInterestRate: 'preset' | 'manual' | 'platform'
  loanTermMonths: 'preset' | 'manual' | 'platform'
  originationFeePercent: 'preset' | 'manual' | 'platform'
  liquidationLtv: 'preset' | 'manual' | 'platform'
  liquidationFeePercent: 'preset' | 'manual' | 'platform'
}

/**
 * Platform-specific configuration state
 */
export interface PlatformConfigState {
  [key: string]: PlatformConfig
}

/**
 * Loan interface for tracking individual loans
 */
export interface Loan {
  id: number
  month: number
  principal: number
  maturityMonth: number
  repaymentAmount: number
  lockedBtc: number
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
  maxSafeDebt?: number // Maximum safe debt limit (for ATH-based strategies)
  events: MonthlyEvent[]
}

/**
 * Events that can occur during a month
 */
export type MonthlyEvent =
  | { type: "withdrawal_skipped" }
  | { type: "deleveraged"; amount: number }
  | { type: "liquidated"; id: number }
  | { type: "collateral_topped_up"; loanId: number; amount: number }

/**
 * Main simulation parameters
 */
export interface SimulationParams {
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  originationFeePercent: number // Renamed from loanOriginationFeePercent for consistency with PlatformConfig
  liquidationFeePercent: number
  loanTermMonths: number
  simulationMonths: number
  maxLoanAmount: number
  annualGrowthRates: number[]
  priceModel: PriceModel
  powerLawSettings: {
    prognosisLine: PowerLawLine
  }
  riskManagement: {
    targetLtv: number
    liquidationLtv: number
  }
  // Additional parameters
  btcAccumulation: boolean
  riskLevel: RiskLevel
  platform: Platform
  loanAmountPercent: number // Percentage of BTC stack value
  // Strategy parameters
  investmentStrategy: InvestmentStrategy
  athBasedParams: AthBasedStrategyParams
  movingAverageParams: MovingAverageStrategyParams
  athCollateralParams: AthCollateralStrategyParams
  // Preset management
  parameterSources: ParameterSource
  platformConfigs: PlatformConfigState
  selectedRiskLevel?: RiskLevel
}

/**
 * Cache status for data loading
 */
export type CacheStatus = 'loading' | 'cached' | 'fresh' | 'error'

/**
 * Simulation state interface
 */
export interface SimulationState {
  params: SimulationParams
  results: MonthlyResult[]
  isLoading: boolean
  errors: string[]
  loadingBtcPrice: boolean
  currentPage: number
  historicalPriceData: HistoricalDataPoint[]
  priceChartData: PriceChartDataPoint[]
  cacheStatus: CacheStatus
  chartLoading: boolean
  initialDataLoaded: boolean
}

/**
 * Constants
 */
export const PLATFORM_LTV_NEW_LOANS = 50
export const PARAMS_STORAGE_KEY = "bitcoin-simulation-params"

/**
 * Default simulation parameters
 */
export const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 100000,
  monthlyWithdrawalAmount: 150,
  annualInterestRate: 6.5,
  originationFeePercent: 1.5, // Renamed from loanOriginationFeePercent for consistency
  liquidationFeePercent: 5.0, // Updated from 2.0 to 5.0
  loanTermMonths: 6,
  simulationMonths: 144,
  maxLoanAmount: 15000, // Updated from 100000 to 15000
  annualGrowthRates: [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110],
  priceModel: "manual",
  powerLawSettings: {
    prognosisLine: "fit",
  },
  riskManagement: {
    targetLtv: 40, // Updated to match "optimistic" risk level preset (40%)
    liquidationLtv: 95, // Updated from 80 to 95
  },
  // Add BTC accumulation default
  btcAccumulation: true,
  riskLevel: "optimistic",
  platform: "firefish",
  loanAmountPercent: 15, // 15% of BTC stack value
  investmentStrategy: "default",
  athBasedParams: {
    athThresholdPercent: 80,
    investmentMultiplier: 2.0,
  },
  movingAverageParams: {
    maPeriodDays: 200,
    investmentMultiplier: 1.5,
  },
  athCollateralParams: {
    maxDrawdownPercent: 80,
    collateralMultiplier: 2.0,
    athLookbackMonths: 36,
    emergencyCollateralBuffer: 1.2,
  },
  // Preset management defaults
  parameterSources: {
    loanAmountPercent: 'preset',
    targetLtv: 'preset',
    annualInterestRate: 'preset',
    loanTermMonths: 'preset',
    originationFeePercent: 'platform',
    liquidationLtv: 'platform',
    liquidationFeePercent: 'platform',
  },
  platformConfigs: {},
  selectedRiskLevel: 'optimistic',
}
