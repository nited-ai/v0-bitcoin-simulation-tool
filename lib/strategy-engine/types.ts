// lib/strategy-engine/types.ts

/**
 * Defines the available investment strategies.
 */
export type InvestmentStrategy = "default" | "athBased" | "movingAverage" | "athCollateral"

/**
 * Loan structure used in the simulation
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
 * Monthly events that can occur during simulation
 */
export type MonthlyEvent =
  | { type: "withdrawal_skipped" }
  | { type: "deleveraged"; amount: number }
  | { type: "liquidated"; id: number }
  | { type: "collateral_topped_up"; loanId: number; amount: number }

/**
 * Result data for a single month in the simulation
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
 * Historical price data point
 */
export interface HistoricalDataPoint {
  time: number // Unix timestamp in seconds
  close: number
}

/**
 * Price chart data point with simulation path
 */
export interface PriceChartDataPoint {
  date: string // YYYY-MM-DD format
  days: number
  historicalPrice?: number
  simulationPath?: number
  support?: number
  resistance?: number
  fit?: number
}

/**
 * Risk management parameters
 */
export interface RiskManagement {
  targetLtv: number
  liquidationLtv: number
}

/**
 * Strategy-specific parameters for ATH-based strategy
 */
export interface AthBasedStrategyParams {
  athThresholdPercent: number // Investment limit at X% of ATH (default: 80)
}

/**
 * Strategy-specific parameters for moving average strategy
 */
export interface MovingAverageStrategyParams {
  movingAveragePeriod: number // Period in weeks (default: 200)
  investmentMultiplier: number // Multiplier when above MA (default: 1.0)
}

/**
 * Strategy-specific parameters for ATH Collateral strategy
 */
export interface AthCollateralStrategyParams {
  maxDrawdownPercent: number // Maximum drawdown from ATH to tolerate (optimized default: 82)
  collateralMultiplier: number // Target collateral as multiple of debt (optimized default: 1.9)
  athLookbackMonths: number // How many months to look back for ATH calculation (optimized default: 30)
  emergencyCollateralBuffer: number // Additional buffer for emergency situations (optimized default: 1.15)
}

/**
 * Complete set of parameters required by the Strategy Engine
 */
export interface StrategyEngineParams {
  // Basic simulation parameters
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  loanOriginationFeePercent: number
  loanTermMonths: number
  simulationMonths: number
  maxLoanAmount: number
  expectedAnnualInflation: number

  // Risk management
  riskManagement: RiskManagement
  
  // Strategy selection and parameters
  investmentStrategy: InvestmentStrategy
  athBasedParams?: AthBasedStrategyParams
  movingAverageParams?: MovingAverageStrategyParams
  athCollateralParams?: AthCollateralStrategyParams
}

/**
 * Context data passed to each strategy during simulation
 */
export interface StrategyContext {
  month: number
  currentDate: Date
  btcPrice: number
  totalBtcAmount: number
  activeLoans: Loan[]
  collateralValue: number
  debtCapacity: number
  historicalPriceData: HistoricalDataPoint[]
  priceChartData: PriceChartDataPoint[]
  params: StrategyEngineParams
}

/**
 * Decision made by a strategy for a given month
 */
export interface StrategyDecision {
  // Investment decision
  allowInvestment: boolean
  investmentMultiplier: number // 0.0 to 1.0+ (can be > 1 for aggressive strategies)
  
  // Withdrawal decision
  allowWithdrawal: boolean
  withdrawalAmount: number
  
  // Risk management overrides
  targetLtvOverride?: number
  maxDebtOverride?: number // Absolute maximum debt amount (overrides LTV calculation)

  // Additional context for logging/debugging
  reasoning?: string
}

/**
 * Interface that all investment strategies must implement
 */
export interface InvestmentStrategyInterface {
  /**
   * Make investment and withdrawal decisions for a given month
   */
  makeDecision(context: StrategyContext): StrategyDecision
  
  /**
   * Get the display name of this strategy
   */
  getName(): string
  
  /**
   * Get a description of this strategy
   */
  getDescription(): string
}
