import { addCalendarMonths } from '../../../../app/simulation/price-models/models/cycleReplay'
/**
 * simulateRollingLoan — single source of truth for the Rolling Loan strategy.
 *
 * Pure function. Takes user params + a price projection, returns the full
 * simulation output: rollover events, monthly results, per-month snapshots,
 * chart points, plus a legacy-shaped `MonthlyResult[]` for backwards
 * compatibility with the older results-tab consumers.
 *
 * Both `useRollingLoanCalculations` (the React hook driving the new
 * DetailedResultsTable + HeadlineComparison + StrategyResultsChart) and
 * `useSimulationRunner` (the entry point for the "Run Simulation" button,
 * which writes `results: MonthlyResult[]` into SimulationContext) call this
 * function. Result: a single computation, no divergence between Summary
 * cards and the table.
 *
 * Logic moved verbatim from the prior `useRollingLoanCalculations`
 * `useMemo` body. No behavior change — only its location.
 */

import { centralizedLoanCalculationService } from "./CentralizedLoanCalculationService"
import {
  decideRolloverAction,
  computeCostFactor,
  defaultRolloverMaxLtv,
} from "./RolloverPolicyService"
import type { PriceProjectionResult } from "../../../../app/simulation/price-models/types"
import type {
  SimulationParams,
  MonthlyResult,
} from "../../../../app/simulation/types/simulation"

// ─── Output types (re-exported from the hook for back-compat) ─────────────

export interface RolloverResult {
  month: number
  btcPrice: number
  totalBtcBefore: number
  totalBtcAfter: number
  collateralValue: number
  loanPrincipal: number
  loanRepayment: number
  oldLoanRepayment?: number
  excessProceeds: number
  btcPurchased: number
  interest: number
  fees: number
  /** Rollover-targeting sale (distinct from liquidation) */
  btcSoldForRollover?: number
  debtReducedByRolloverSale?: number
  isInitial: boolean
}

export interface MonthlyResultRow {
  month: number
  btcPrice: number
  totalBtcBefore: number
  totalBtcAfter: number
  usdFlow: number
  btcDelta: number
  excessProceeds: number
  interest?: number
  fees?: number
  isMonthly: true
}

export interface MonthlySnapshot {
  month: number
  totalBtc: number
  totalDebt: number
  isRollover: boolean
  lockedBtc?: number
  unlockedBtc?: number
  topUpLtv?: number
  topUpLtvBefore?: number
  initialLtvBefore?: number
  initialLtvAfter?: number
  btcTopUpForCollateral?: number
  liquidationTriggered?: boolean
  btcSoldForLiquidation?: number
  debtReducedByLiquidation?: number
  btcSoldForRollover?: number
  debtReducedByRolloverSale?: number
  monthlyExcessProceeds?: number
  withdrawalSuspended?: boolean
  /**
   * Set in the month a fatal liquidation occurs: stack fully sold, residual
   * debt written off by the platform (Option A semantics, matches Firefish /
   * HodlHodl etc.: lender takes the collateral, no further recourse).
   */
  insolvencyWriteOff?: number
}

export interface StrategyChartPoint {
  timestamp: number
  btcPrice: number
  collateralValue?: number
  totalDebt?: number | null
  totalBtc?: number | null
  lockedBtc?: number | null
  netBtc?: number | null
  immediateLiquidationPrice?: number | null
  topUpLiquidationPrice?: number | null
}

export interface RollingLoanSimulationResult {
  rolloverResults: RolloverResult[]
  monthlyResults: MonthlyResultRow[]
  monthlySnapshots: MonthlySnapshot[]
  chartPoints: StrategyChartPoint[]
  /** True when the price projection is sampled monthly rather than daily */
  isMonthly: boolean
  /** Helper to look up BTC price for a given month index */
  getBtcPriceForMonth: (month: number) => number
  /** Helper to look up the timestamp for a given month index */
  getTimestampForMonth: (month: number) => number
}

const EMPTY_RESULT: RollingLoanSimulationResult = {
  rolloverResults: [],
  monthlyResults: [],
  monthlySnapshots: [],
  chartPoints: [],
  isMonthly: false,
  getBtcPriceForMonth: () => 0,
  getTimestampForMonth: () => Date.now(),
}

// ─── The simulation ───────────────────────────────────────────────────────

export function simulateRollingLoan(
  params: SimulationParams | null,
  priceProjection: PriceProjectionResult | null,
): RollingLoanSimulationResult {
  if (!params || !priceProjection?.projectionPoints.length) return EMPTY_RESULT

  const pts = priceProjection?.projectionPoints || []
  const isMonthly = pts.length >= 2
    ? Math.abs((pts[1]?.timestamp || 0) - (pts[0]?.timestamp || 0)) > 2 * 24 * 60 * 60 * 1000
    : false

  const start = pts[0].timestamp
  const getTimestampForMonth = (month: number) => addCalendarMonths(start, month)
  const getBtcPriceForMonth = (month: number): number => {
    if (month === 0) return params.initialBtcPrice
    const target = getTimestampForMonth(month)
    let low = 0, high = pts.length - 1
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (pts[middle].timestamp < target) low = middle + 1
      else high = middle
    }
    const right = pts[low], left = pts[Math.max(0, low - 1)]
    if (right.timestamp <= target || right.timestamp === left.timestamp) return right.price
    const fraction = Math.max(0, (target - left.timestamp) / (right.timestamp - left.timestamp))
    return left.price * Math.pow(right.price / left.price, fraction)
  }

  const rolloverResults: RolloverResult[] = []
  const monthlyResults: MonthlyResultRow[] = []
  const monthlySnapshots: MonthlySnapshot[] = []

  type Loan = { principal: number; repaymentAmount: number; maturityMonth: number }
  let activeLoans: Loan[] = []
  let currentBtc = params.initialBtcAmount
  // Once the platform has liquidated the stack and written off residual debt,
  // we don't open new loans or run monthly top-ups. Stack accumulates from
  // savings only, simulating "user is out of leverage after a bust" — matches
  // real-world Bitcoin loan platform behavior (no recourse on shortfall).
  let insolvent = false
  // BTC minimum below which we treat the stack as exhausted (floating-point
  // residue from sales can leave 1e-9 BTC even when "all sold").
  const INSOLVENCY_BTC_EPS = 1e-5

  // ── Month 0: initial loan ──
  const month0Price = getBtcPriceForMonth(0)
  const month0Collateral = currentBtc * month0Price

  const willUseLoanAmountPercent =
    params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
  const loanPercent = willUseLoanAmountPercent
    ? params.loanAmountPercent!
    : (params.riskManagement?.targetLtv ?? 50)

  const calculatedByPercent = Math.round(month0Collateral * (loanPercent / 100))
  const maxLoanParam = params.maxLoanAmount ?? Number.POSITIVE_INFINITY
  const minimumForTarget = Math.round(
    (params.riskManagement?.targetLtv ?? 50) / 100 * month0Collateral,
  )

  // When loanAmountPercent is set, honour it verbatim — don't clamp by the
  // legacy `maxLoanAmount` dollar cap (defaults to ~\$15k and would otherwise
  // truncate every realistic loan).
  const finalLoanAmount = willUseLoanAmountPercent
    ? calculatedByPercent
    : Math.min(maxLoanParam, minimumForTarget)

  const month0Loan = centralizedLoanCalculationService.calculateLoanDetails(
    finalLoanAmount,
    month0Collateral,
    {
      btcAmount: params.initialBtcAmount,
      initialBtcPrice: params.initialBtcPrice,
      monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
      annualInterestRate: params.annualInterestRate,
      loanOriginationFeePercent: params.originationFeePercent,
      loanTermMonths: params.loanTermMonths,
      simulationMonths: params.simulationMonths,
      maxLoanAmount: params.maxLoanAmount,
      expectedAnnualInflation: 3,
      btcAccumulation: (params as any).btcAccumulation ?? true,
      investmentStrategy: "rollingLoan",
      riskManagement: params.riskManagement,
      loanAmountPercent: params.loanAmountPercent,
    } as any,
  )

  activeLoans.push({
    principal: month0Loan.principal,
    repaymentAmount: month0Loan.totalRepayment,
    maturityMonth: params.loanTermMonths === Infinity
      ? Number.POSITIVE_INFINITY
      : (params.loanTermMonths || 12),
  })

  const targetLtv = params.riskManagement?.targetLtv ?? 50
  const requiredLocked0 = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(
    month0Loan.totalRepayment,
    month0Price,
    targetLtv,
  )
  let lockedBtc = Math.min(currentBtc, requiredLocked0)
  let unlockedBtc = Math.max(0, currentBtc - lockedBtc)
  let currentTotalDebt = month0Loan.totalRepayment

  let month0BtcPurchased = 0
  if (params.btcAccumulation && month0Price > 0) {
    month0BtcPurchased = month0Loan.principal / month0Price
    currentBtc += month0BtcPurchased
    // BTC bought with loan proceeds is unencumbered (not collateral).
    // Without this, the month-0 snapshot reports locked+unlocked < total
    // by exactly month0BtcPurchased — visible whenever no monthly cash-flow
    // block runs to recompute unlocked (i.e. monthlyWithdrawalAmount=0).
    unlockedBtc += month0BtcPurchased
  }

  rolloverResults.push({
    month: 0,
    btcPrice: month0Price,
    totalBtcBefore: params.initialBtcAmount,
    totalBtcAfter: currentBtc,
    collateralValue: month0Collateral,
    loanPrincipal: month0Loan.principal,
    loanRepayment: month0Loan.totalRepayment,
    excessProceeds: month0Loan.principal,
    btcPurchased: month0BtcPurchased,
    interest: month0Loan.totalInterest,
    fees: month0Loan.originationFee,
    isInitial: true,
  })

  // Month-0 monthly savings/withdrawal
  {
    const baseMonthly = params.monthlyWithdrawalAmount || 0
    const annualInc = params.annualSavingsIncrease || 0
    const adjustedMonthly = baseMonthly * Math.pow(1 + annualInc / 100, 0)
    if (adjustedMonthly !== 0 && month0Price > 0) {
      const totalBtcBeforeMonthly0 = currentBtc
      let btcDelta0 = 0
      let withdrawalSuspended0 = false
      if (adjustedMonthly > 0) {
        btcDelta0 = adjustedMonthly / month0Price
        currentBtc += btcDelta0
      } else {
        const btcNeeded0 = Math.abs(adjustedMonthly) / month0Price
        const availableUnlocked0 = Math.max(0, currentBtc - lockedBtc)
        const BTC_ZERO_EPS = 1e-5
        const USD_ZERO_EPS = 1
        if (
          availableUnlocked0 <= BTC_ZERO_EPS ||
          availableUnlocked0 * month0Price <= USD_ZERO_EPS
        ) {
          withdrawalSuspended0 = true
        } else {
          const sellFromUnlocked0 = Math.min(availableUnlocked0, btcNeeded0)
          btcDelta0 = -sellFromUnlocked0
          currentBtc += btcDelta0
        }
      }
      unlockedBtc = Math.max(0, currentBtc - lockedBtc)
      const executedMonthly0 = adjustedMonthly < 0 && withdrawalSuspended0 ? 0 : adjustedMonthly
      monthlyResults.push({
        month: 0,
        btcPrice: month0Price,
        totalBtcBefore: totalBtcBeforeMonthly0,
        totalBtcAfter: currentBtc,
        usdFlow: adjustedMonthly,
        btcDelta: btcDelta0,
        excessProceeds: executedMonthly0,
        interest: 0,
        fees: 0,
        isMonthly: true,
      })
      // Realign month-0 rollover's after-state with post-cashflow values
      if (rolloverResults.length > 0 && rolloverResults[0].month === 0) {
        const prior = rolloverResults[0]
        rolloverResults[0] = {
          ...prior,
          totalBtcAfter: currentBtc,
          excessProceeds:
            prior.loanPrincipal - (prior.oldLoanRepayment || 0) + executedMonthly0,
        }
      }
    }
  }

  // Month-0 snapshot (treated as a rollover row)
  {
    const platformMaxLtv =
      (params.riskManagement as any)?.initialLtv ??
      (params as any)?.platformMaxLtv ??
      50
    const effColl0 = currentBtc * month0Price * (platformMaxLtv / 100)
    const topUpLtv0 = effColl0 > 0 ? (currentTotalDebt / effColl0) * 100 : 0
    const initialLtv0 =
      lockedBtc > 0 ? (currentTotalDebt / (lockedBtc * month0Price)) * 100 : 0
    const baseMonthly0 = params.monthlyWithdrawalAmount || 0
    monthlySnapshots.push({
      month: 0,
      totalBtc: currentBtc,
      totalDebt: currentTotalDebt,
      isRollover: true,
      lockedBtc,
      unlockedBtc,
      monthlyExcessProceeds: baseMonthly0,
      topUpLtv: topUpLtv0,
      topUpLtvBefore: topUpLtv0,
      initialLtvBefore: initialLtv0,
      initialLtvAfter: initialLtv0,
      btcTopUpForCollateral: 0,
      liquidationTriggered: false,
      btcSoldForLiquidation: 0,
      debtReducedByLiquidation: 0,
    })
  }

  const isInfiniteTerm = params.loanTermMonths === Infinity
  const monthlyInterestRate = (params.annualInterestRate || 0) / 100 / 12

  for (let m = 1; m <= (params.simulationMonths || 0); m++) {
    let wasRollover = false
    let withdrawalSuspended = false

    const btcPrice = getBtcPriceForMonth(m)

    // Accrue monthly interest on infinite-term loans only
    if (isInfiniteTerm && monthlyInterestRate > 0 && activeLoans.length > 0) {
      for (const loan of activeLoans) {
        const interestThisMonth = loan.principal * monthlyInterestRate
        loan.repaymentAmount += interestThisMonth
        currentTotalDebt += interestThisMonth
      }
    }

    unlockedBtc = Math.max(0, currentBtc - lockedBtc)

    // Monthly savings / withdrawal
    const baseMonthly = params.monthlyWithdrawalAmount || 0
    const annualInc = params.annualSavingsIncrease || 0
    const yearsElapsed = Math.floor(m / 12)
    const adjustedMonthly = baseMonthly * Math.pow(1 + annualInc / 100, yearsElapsed)

    const totalBtcBeforeMonth = currentBtc
    let cashFlowBtcDelta = 0
    if (adjustedMonthly !== 0 && btcPrice > 0) {
      if (adjustedMonthly > 0) {
        cashFlowBtcDelta = adjustedMonthly / btcPrice
        currentBtc += cashFlowBtcDelta
        unlockedBtc += cashFlowBtcDelta
      } else {
        const btcNeeded = Math.abs(adjustedMonthly) / btcPrice
        const availableUnlocked = Math.max(0, currentBtc - lockedBtc)
        const BTC_ZERO_EPS = 1e-5
        const USD_ZERO_EPS = 1
        if (
          availableUnlocked <= BTC_ZERO_EPS ||
          availableUnlocked * btcPrice <= USD_ZERO_EPS
        ) {
          withdrawalSuspended = true
        } else {
          const sellFromUnlocked = Math.min(availableUnlocked, btcNeeded)
          cashFlowBtcDelta = -sellFromUnlocked
          currentBtc += cashFlowBtcDelta
          unlockedBtc = Math.max(0, currentBtc - lockedBtc)
        }
      }
    }
    const executedMonthly = adjustedMonthly < 0 && withdrawalSuspended ? 0 : adjustedMonthly

    // Monthly loan top-up: raise pre-purchase LTV back to loanAmountPercent
    const userLeverageTarget = (params as any).loanAmountPercent as number | undefined
    let topUpPrincipalUsd = 0
    let topUpBtcDelta = 0
    if (
      !insolvent &&
      userLeverageTarget !== undefined &&
      userLeverageTarget > 0 &&
      (params as any).btcAccumulation &&
      btcPrice > 0 &&
      activeLoans.length > 0
    ) {
      const collateralNow = currentBtc * btcPrice
      const targetDebt = (userLeverageTarget / 100) * collateralNow
      const debtGap = targetDebt - currentTotalDebt
      const MIN_TOP_UP_USD = 100

      if (debtGap > MIN_TOP_UP_USD) {
        const feeFrac = (params.originationFeePercent || 0) / 100
        const primaryLoan = activeLoans[0]
        let topUpCostFactor: number
        if (isInfiniteTerm) {
          topUpCostFactor = 1 + feeFrac
        } else {
          const monthsRemaining = Math.max(
            1,
            (primaryLoan?.maturityMonth ?? m + (params.loanTermMonths || 12)) - m,
          )
          topUpCostFactor = 1 + feeFrac + monthlyInterestRate * monthsRemaining
        }
        const additionalPrincipal = debtGap / topUpCostFactor
        if (additionalPrincipal > MIN_TOP_UP_USD) {
          const additionalRepayment = additionalPrincipal * topUpCostFactor
          primaryLoan.principal += additionalPrincipal
          primaryLoan.repaymentAmount += additionalRepayment
          currentTotalDebt += additionalRepayment
          const btcBought = additionalPrincipal / btcPrice
          currentBtc += btcBought
          unlockedBtc += btcBought
          topUpPrincipalUsd = additionalPrincipal
          topUpBtcDelta = btcBought
        }
      }
    }

    if (cashFlowBtcDelta !== 0 || topUpBtcDelta !== 0) {
      monthlyResults.push({
        month: m,
        btcPrice,
        totalBtcBefore: totalBtcBeforeMonth,
        totalBtcAfter: currentBtc,
        usdFlow: adjustedMonthly,
        btcDelta: cashFlowBtcDelta + topUpBtcDelta,
        excessProceeds: executedMonthly + topUpPrincipalUsd,
        interest: 0,
        fees: 0,
        isMonthly: true,
      })
    }

    // 1) Risk management (top-up then liquidation) BEFORE rollover
    let _preTopUpLtv: number | undefined
    let _postTopUpLtv: number | undefined
    let _liqTriggered = false
    let _btcSold = 0
    let _debtReduced = 0
    let _btcTopUp = 0
    let _initialBefore = 0
    let _initialAfter = 0
    let _rolloverBtcSold = 0
    let _rolloverDebtReduced = 0
    {
      const platformMaxLtv =
        (params.riskManagement as any)?.initialLtv ??
        (params as any)?.platformMaxLtv ??
        50
      const effCollBefore = currentBtc * btcPrice * (platformMaxLtv / 100)
      const topUpLtvBefore =
        effCollBefore > 0 ? (currentTotalDebt / effCollBefore) * 100 : 0

      const tier1Start = params.riskManagement?.topUpTriggerLtv ?? 70
      const tier2Start = params.riskManagement?.liquidationLtv ?? 80
      const targetInitial = params.riskManagement?.topUpTargetLtvRange?.min ?? 50
      const feeFrac = Math.max(0, (params.riskManagement?.liquidationFeePercent ?? 0) / 100)
      const minEventFrac = 0.001

      const initialLtvBefore =
        lockedBtc > 0 && btcPrice > 0 ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100 : 0

      let btcTopUpForCollateral = 0
      let liquidationTriggered = false
      let btcSoldForLiquidation = 0
      let debtReducedByLiquidation = 0

      if (initialLtvBefore >= tier1Start && unlockedBtc > 0 && btcPrice > 0) {
        const requiredLocked = currentTotalDebt / (btcPrice * (targetInitial / 100))
        const needToLock = Math.max(0, requiredLocked - lockedBtc)
        const minBtcEvent = minEventFrac * Math.max(0, lockedBtc + unlockedBtc)
        const potentialLock = Math.min(unlockedBtc, needToLock)
        const mustPreventLiquidation = initialLtvBefore >= tier2Start
        const meetsThreshold = mustPreventLiquidation
          ? potentialLock > 0
          : potentialLock >= minBtcEvent && potentialLock > 0
        if (meetsThreshold) {
          lockedBtc += potentialLock
          unlockedBtc -= potentialLock
          btcTopUpForCollateral = potentialLock
        }
      }

      const initialLtvAfterTopUp =
        lockedBtc > 0 && btcPrice > 0 ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100 : 0

      if (initialLtvAfterTopUp >= tier2Start && btcPrice > 0 && currentTotalDebt > 0) {
        const t = targetInitial / 100
        const minBtcEvent = minEventFrac * Math.max(0, lockedBtc + unlockedBtc)

        if (lockedBtc > 0) {
          const targetDebtGivenLocked = t * lockedBtc * btcPrice
          if (currentTotalDebt > targetDebtGivenLocked) {
            const needUsd = currentTotalDebt - targetDebtGivenLocked
            const reqBtcUnlocked = needUsd / (btcPrice * (1 - feeFrac))
            const sellUnlocked = Math.min(unlockedBtc, reqBtcUnlocked)
            if (sellUnlocked >= minBtcEvent && sellUnlocked > 0) {
              const netUsd = sellUnlocked * btcPrice * (1 - feeFrac)
              unlockedBtc -= sellUnlocked
              currentBtc -= sellUnlocked
              currentTotalDebt = Math.max(0, currentTotalDebt - netUsd)
              btcSoldForLiquidation += sellUnlocked
              debtReducedByLiquidation += netUsd
            }
          }
        }

        {
          const D1 = currentTotalDebt
          const L = lockedBtc
          if (L > 0) {
            const t2 = targetInitial / 100
            const denom = 1 - feeFrac - t2
            if (denom > 0 && btcPrice > 0) {
              const numerator = D1 / btcPrice - t2 * L
              let x = Math.max(0, numerator / denom)
              x = Math.min(L, x)
              if (x >= minBtcEvent && x > 0) {
                const netUsd2 = x * btcPrice * (1 - feeFrac)
                lockedBtc = Math.max(0, lockedBtc - x)
                currentBtc = Math.max(0, currentBtc - x)
                currentTotalDebt = Math.max(0, currentTotalDebt - netUsd2)
                btcSoldForLiquidation += x
                debtReducedByLiquidation += netUsd2
              }
            }
          }
        }

        if (btcSoldForLiquidation > 0 || debtReducedByLiquidation > 0) {
          liquidationTriggered = true
          if (activeLoans.length > 0) {
            let idx = 0
            for (let i = 1; i < activeLoans.length; i++) {
              if (activeLoans[i].maturityMonth < activeLoans[idx].maturityMonth) idx = i
            }
            activeLoans[idx].repaymentAmount = Math.max(
              0,
              activeLoans[idx].repaymentAmount - debtReducedByLiquidation,
            )
          }
        }

        // Option A: fatal liquidation = platform write-off. If the stack is
        // exhausted AND debt remains, the lender absorbs the shortfall. Clear
        // residual debt and freeze future loan activity for this sim.
        if (currentBtc < INSOLVENCY_BTC_EPS && currentTotalDebt > 0) {
          ;(monthlySnapshots as any)._pendingWriteOff = currentTotalDebt
          currentTotalDebt = 0
          activeLoans = []
          insolvent = true
        }
      }

      const effCollAfter = currentBtc * btcPrice * (platformMaxLtv / 100)
      const topUpLtvAfter = effCollAfter > 0 ? (currentTotalDebt / effCollAfter) * 100 : 0
      const initialLtvAfter =
        lockedBtc > 0 && btcPrice > 0 ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100 : 0

      _preTopUpLtv = topUpLtvBefore
      _postTopUpLtv = topUpLtvAfter
      _liqTriggered = liquidationTriggered
      _btcSold = btcSoldForLiquidation
      _debtReduced = debtReducedByLiquidation
      _btcTopUp = btcTopUpForCollateral
      _initialBefore = initialLtvBefore
      _initialAfter = initialLtvAfter
    }

    // 2) Rollover at maturity (skipped if insolvent — platform already wrote
    // off the debt and we don't open new loans against accumulated savings BTC)
    if (!insolvent && m % (params.loanTermMonths || 12) === 0) {
      const maturingLoan = activeLoans.find(l => l.maturityMonth === m)
      if (maturingLoan) {
        let repaymentDue = maturingLoan.repaymentAmount
        const totalBtcBefore = currentBtc
        const targetLtvNow = params.riskManagement?.targetLtv ?? 50
        const liquidationLtv = params.riskManagement?.liquidationLtv ?? 80
        const rolloverMaxLtv =
          (params.riskManagement as any)?.rolloverMaxLtv ??
          defaultRolloverMaxLtv(targetLtvNow, liquidationLtv)
        const costFactor = computeCostFactor(
          params.originationFeePercent || 0,
          params.annualInterestRate || 0,
          params.loanTermMonths || 12,
        )

        const policy = decideRolloverAction({
          repaymentDue,
          lockedBtc,
          unlockedBtc,
          btcPrice,
          costFactor,
          targetLtv: targetLtvNow,
          rolloverMaxLtv,
          liquidationLtv,
          loanAmountPercent: (params as any).loanAmountPercent,
        })

        if (policy.forcedSale && policy.btcSold > 0) {
          let btcToSell = policy.btcSold
          const sellFromUnlocked = Math.min(unlockedBtc, btcToSell)
          if (sellFromUnlocked > 0) {
            unlockedBtc -= sellFromUnlocked
            currentBtc -= sellFromUnlocked
            _rolloverBtcSold += sellFromUnlocked
            btcToSell -= sellFromUnlocked
          }
          if (btcToSell > 0) {
            const sellFromLocked = Math.min(lockedBtc, btcToSell)
            if (sellFromLocked > 0) {
              lockedBtc -= sellFromLocked
              currentBtc -= sellFromLocked
              _rolloverBtcSold += sellFromLocked
            }
          }
          _rolloverDebtReduced += policy.usdRecovered
          repaymentDue = policy.remainingDebt
        }

        // Option A: if the rollover force-sale exhausted the stack and debt
        // remains, the platform absorbs the residual (no recourse). Don't
        // issue a new loan against ~$0 collateral. Mark insolvent so future
        // months only accumulate savings BTC without new leverage.
        if (
          (policy.outcome === "liquidation-territory" ||
            currentBtc < INSOLVENCY_BTC_EPS) &&
          repaymentDue > 0
        ) {
          ;(monthlySnapshots as any)._pendingWriteOff = repaymentDue
          currentTotalDebt = 0
          activeLoans = activeLoans.filter(l => l.maturityMonth !== m)
          lockedBtc = 0
          unlockedBtc = currentBtc
          insolvent = true
          wasRollover = true
          _initialAfter = 0
          rolloverResults.push({
            month: m,
            btcPrice,
            totalBtcBefore,
            totalBtcAfter: currentBtc,
            collateralValue: currentBtc * btcPrice,
            loanPrincipal: 0,
            loanRepayment: 0,
            oldLoanRepayment: repaymentDue,
            excessProceeds: 0,
            btcPurchased: 0,
            interest: 0,
            fees: 0,
            btcSoldForRollover: _rolloverBtcSold,
            debtReducedByRolloverSale: _rolloverDebtReduced,
            isInitial: false,
          })
        } else {

        const collateral = currentBtc * btcPrice
        const actualPrincipal = Math.round(policy.newPrincipal)

        const newLoan = centralizedLoanCalculationService.calculateLoanDetails(
          actualPrincipal,
          collateral,
          {
            btcAmount: params.initialBtcAmount,
            initialBtcPrice: params.initialBtcPrice,
            monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
            annualInterestRate: params.annualInterestRate,
            loanOriginationFeePercent: params.originationFeePercent,
            loanTermMonths: params.loanTermMonths,
            simulationMonths: params.simulationMonths,
            maxLoanAmount: params.maxLoanAmount,
            expectedAnnualInflation: 3,
            btcAccumulation: (params as any).btcAccumulation ?? true,
            investmentStrategy: "rollingLoan",
            riskManagement: params.riskManagement,
            loanAmountPercent: params.loanAmountPercent,
          } as any,
        )

        if ((params as any).btcAccumulation && btcPrice > 0) {
          const rolloverExcessOnly = Math.max(0, newLoan.principal - repaymentDue)
          if (rolloverExcessOnly > 0) {
            const btcPurchased = rolloverExcessOnly / btcPrice
            currentBtc += btcPurchased
            unlockedBtc += btcPurchased
          }
        }

        activeLoans = activeLoans.filter(l => l.maturityMonth !== m)
        activeLoans.push({
          principal: newLoan.principal,
          repaymentAmount: newLoan.totalRepayment,
          maturityMonth: m + (params.loanTermMonths || 12),
        })

        const excessProceeds =
          newLoan.principal - repaymentDue + adjustedMonthly
        const btcPurchased =
          btcPrice > 0 ? Math.max(0, newLoan.principal - repaymentDue) / btcPrice : 0

        currentTotalDebt = newLoan.totalRepayment

        // Reallocate locked/unlocked to reach required locked for target LTV
        {
          const requiredLocked = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(
            currentTotalDebt,
            btcPrice,
            targetLtvNow,
          )
          const delta = requiredLocked - lockedBtc
          if (delta > 0) {
            const lockNow = Math.min(unlockedBtc, delta)
            if (lockNow > 0) {
              lockedBtc += lockNow
              unlockedBtc -= lockNow
            }
          } else if (delta < 0) {
            const unlockNow = Math.min(lockedBtc, Math.abs(delta))
            if (unlockNow > 0) {
              lockedBtc -= unlockNow
              unlockedBtc += unlockNow
            }
          }
        }

        _initialAfter =
          lockedBtc > 0 && btcPrice > 0 ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100 : 0

        wasRollover = true

        rolloverResults.push({
          month: m,
          btcPrice,
          totalBtcBefore,
          totalBtcAfter: currentBtc,
          collateralValue: collateral,
          loanPrincipal: newLoan.principal,
          loanRepayment: newLoan.totalRepayment,
          oldLoanRepayment: repaymentDue,
          excessProceeds,
          btcPurchased,
          interest: newLoan.totalInterest,
          fees: newLoan.originationFee,
          btcSoldForRollover: _rolloverBtcSold,
          debtReducedByRolloverSale: _rolloverDebtReduced,
          isInitial: false,
        })
        } // end else of insolvency branch
      }
    }

    // 3) Snapshot for chart continuity
    {
      const platformMaxLtv =
        (params.riskManagement as any)?.initialLtv ??
        (params as any)?.platformMaxLtv ??
        50
      const topUpLtvAfter =
        typeof _postTopUpLtv === "number"
          ? _postTopUpLtv
          : (() => {
              const effColl = currentBtc * btcPrice * (platformMaxLtv / 100)
              return effColl > 0 ? (currentTotalDebt / effColl) * 100 : 0
            })()
      const topUpLtvBefore = typeof _preTopUpLtv === "number" ? _preTopUpLtv : topUpLtvAfter
      const pendingWriteOff = (monthlySnapshots as any)._pendingWriteOff as
        | number
        | undefined
      if (pendingWriteOff !== undefined) {
        delete (monthlySnapshots as any)._pendingWriteOff
      }
      monthlySnapshots.push({
        month: m,
        totalBtc: currentBtc,
        totalDebt: currentTotalDebt,
        isRollover: wasRollover,
        lockedBtc,
        unlockedBtc,
        insolvencyWriteOff: pendingWriteOff,
        monthlyExcessProceeds:
          adjustedMonthly < 0 && withdrawalSuspended ? 0 : adjustedMonthly,
        withdrawalSuspended,
        topUpLtv: topUpLtvAfter,
        topUpLtvBefore,
        initialLtvBefore: _initialBefore,
        initialLtvAfter: _initialAfter,
        btcTopUpForCollateral: _btcTopUp,
        liquidationTriggered: _liqTriggered,
        btcSoldForLiquidation: _btcSold,
        debtReducedByLiquidation: _debtReduced,
        btcSoldForRollover: _rolloverBtcSold,
        debtReducedByRolloverSale: _rolloverDebtReduced,
      })
    }
  }

  // ── Build chart points from snapshots ──
  const chartPoints: StrategyChartPoint[] = []
  {
    const liquidationLtv = params.riskManagement?.liquidationLtv ?? 80
    const liqF = Math.max(0.0001, liquidationLtv / 100)
    let lastLockedBtc: number | null = null
    const totalMonths = params.simulationMonths || 0
    for (let m = 0; m <= totalMonths; m++) {
      const snapshot = monthlySnapshots.find(s => s.month === m)
      if (!snapshot) continue
      const ts = getTimestampForMonth(m)
      const btcPrice = getBtcPriceForMonth(m)
      const totalBtc = snapshot.totalBtc
      const totalDebt = snapshot.totalDebt
      const collateralValue = totalBtc * btcPrice
      const netBtc = totalDebt > 0 && btcPrice > 0 ? totalBtc - totalDebt / btcPrice : totalBtc

      if (snapshot.isRollover) {
        const lockedRequired = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(
          totalDebt,
          btcPrice,
          targetLtv,
        )
        const snapshotLocked = snapshot.lockedBtc ?? null
        const locked = Math.min(
          typeof snapshotLocked === "number" ? snapshotLocked : lockedRequired,
          totalBtc,
        )
        const immediate = locked > 0 ? totalDebt / (locked * liqF) : null
        const topUp = totalBtc > 0 ? totalDebt / (totalBtc * liqF) : null
        lastLockedBtc = locked
        chartPoints.push({
          timestamp: ts,
          btcPrice,
          collateralValue,
          totalDebt,
          totalBtc,
          lockedBtc: locked,
          netBtc,
          immediateLiquidationPrice: immediate,
          topUpLiquidationPrice: topUp,
        })
      } else {
        const locked: number | null =
          snapshot.lockedBtc !== undefined && snapshot.lockedBtc !== null
            ? (snapshot.lockedBtc as number)
            : lastLockedBtc
        const immediate = locked && locked > 0 ? snapshot.totalDebt / (locked * liqF) : null
        const topUp = totalBtc > 0 ? snapshot.totalDebt / (totalBtc * liqF) : null
        lastLockedBtc = locked
        chartPoints.push({
          timestamp: ts,
          btcPrice,
          collateralValue,
          totalDebt: snapshot.totalDebt,
          totalBtc,
          lockedBtc: locked,
          netBtc,
          immediateLiquidationPrice: immediate,
          topUpLiquidationPrice: topUp,
        })
      }
    }
  }

  return {
    rolloverResults,
    monthlyResults,
    monthlySnapshots,
    chartPoints,
    isMonthly,
    getBtcPriceForMonth,
    getTimestampForMonth,
  }
}

// ─── Legacy MonthlyResult[] conversion ────────────────────────────────────

/**
 * Convert the rich rolling-loan simulation result to the legacy
 * `MonthlyResult[]` shape consumed by useResultsAnalysis, ResultsSummary,
 * the per-aspect charts, RiskAssessment, EventsAnalysis, and ResultsExport.
 *
 * This is what makes the Summary cards and the DetailedResultsTable show
 * the same numbers — they both ultimately derive from `simulateRollingLoan`.
 */
export function toLegacyMonthlyResults(
  sim: RollingLoanSimulationResult,
  params: SimulationParams,
): MonthlyResult[] {
  const monthsByIndex = new Map<number, MonthlySnapshot>()
  sim.monthlySnapshots.forEach(s => monthsByIndex.set(s.month, s))

  const rolloversByMonth = new Map<number, RolloverResult>()
  sim.rolloverResults.forEach(r => rolloversByMonth.set(r.month, r))

  const monthlyRowsByMonth = new Map<number, MonthlyResultRow>()
  sim.monthlyResults.forEach(r => monthlyRowsByMonth.set(r.month, r))

  const totalMonths = params.simulationMonths || 0
  const results: MonthlyResult[] = []

  // Track running highest LTV (matches the legacy semantic of `highestLtv`
  // being a per-month max of current LTV)
  for (let m = 0; m <= totalMonths; m++) {
    const snap = monthsByIndex.get(m)
    if (!snap) continue
    const btcPrice = sim.getBtcPriceForMonth(m)
    const collateralValue = snap.totalBtc * btcPrice
    const ltv = collateralValue > 0 ? (snap.totalDebt / collateralValue) * 100 : 0
    const rollover = rolloversByMonth.get(m)
    const monthlyRow = monthlyRowsByMonth.get(m)

    const events: any[] = []
    if (snap.liquidationTriggered) {
      events.push({
        type: "liquidated",
        amount: snap.btcSoldForLiquidation || 0,
        debtReduced: snap.debtReducedByLiquidation || 0,
      })
    }
    if ((snap.btcTopUpForCollateral || 0) > 0) {
      events.push({
        type: "collateral_topped_up",
        amount: snap.btcTopUpForCollateral,
      })
    }
    if (snap.withdrawalSuspended) {
      events.push({ type: "withdrawal_skipped" })
    }

    // Principal taken this month: rollover principal at rollovers, top-up
    // principal at non-rollover months (derived from the monthlyResults row
    // which already aggregates cash flow + top-up principal).
    const principalForReinvestment = rollover
      ? Math.max(0, rollover.loanPrincipal - (rollover.oldLoanRepayment || 0))
      : monthlyRow
        ? Math.max(0, (monthlyRow.excessProceeds || 0) - (monthlyRow.usdFlow || 0))
        : 0

    const principalForNeeds = rollover ? (rollover.oldLoanRepayment || 0) : 0
    const totalPrincipalTaken = principalForReinvestment + principalForNeeds

    const btcPurchasedThisMonth = rollover
      ? rollover.btcPurchased || 0
      : monthlyRow && btcPrice > 0
        ? Math.max(0, monthlyRow.btcDelta - (monthlyRow.usdFlow || 0) / btcPrice)
        : 0

    const monthlyWithdrawal = monthlyRow?.usdFlow ?? 0
    const monthlySavingsApplied = monthlyRow?.usdFlow

    const repaymentsDue = rollover ? rollover.oldLoanRepayment || 0 : 0

    const dateMs = sim.getTimestampForMonth(m)
    const dateIso = new Date(dateMs).toISOString().split("T")[0]

    results.push({
      month: m,
      dateString: dateIso,
      date: dateIso,
      btcPrice,
      collateralValue,
      realCollateralValue: collateralValue,
      currentBtcAmount: snap.totalBtc,
      totalBtcAmount: snap.totalBtc,
      freeBtc: Math.max(0, snap.totalBtc - (snap.lockedBtc ?? 0)),
      lockedBtc: snap.lockedBtc ?? 0,
      totalDebt: snap.totalDebt,
      realTotalDebt: snap.totalDebt,
      withdrawalAmount: Math.max(0, -monthlyWithdrawal),
      newLoanPrincipal: totalPrincipalTaken,
      monthlyWithdrawal,
      monthlySavingsApplied,
      principalForNeeds,
      principalForReinvestment,
      totalPrincipal: totalPrincipalTaken,
      activeLoans: [],
      repaymentsDue,
      reinvestment: principalForReinvestment,
      loanCount: snap.totalDebt > 0 ? 1 : 0,
      highestLtv: ltv,
      ltv,
      maxSafeDebt: undefined,
      events,
      btcPurchased: btcPurchasedThisMonth,
      interestAccrued: undefined,
    } as MonthlyResult)
  }

  return results
}
