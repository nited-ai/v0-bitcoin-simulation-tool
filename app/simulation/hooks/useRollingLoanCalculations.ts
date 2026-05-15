"use client"

import { useMemo } from "react"
import { useSimulation } from "../context/SimulationContext"
import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"
import {
  decideRolloverAction,
  computeCostFactor,
  defaultRolloverMaxLtv,
} from "@/src/modules/strategies/services/RolloverPolicyService"

// Table-aligned result structures
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
  // Rollover-targeting sale (distinct from liquidation)
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

// Per-month snapshot used to build continuous chart points
interface MonthlySnapshot {
  month: number
  totalBtc: number
  totalDebt: number
  isRollover: boolean
  // Collateral state
  lockedBtc?: number
  unlockedBtc?: number
  // Risk monitoring fields
  // Capacity (portfolio-level) metric for UI
  topUpLtv?: number           // after any risk action this month
  topUpLtvBefore?: number     // before risk action (if triggered)
  // Platform (collateral-level) risk metric
  initialLtvBefore?: number
  initialLtvAfter?: number
  // Events
  btcTopUpForCollateral?: number // +locked, -unlocked (no sale)
  liquidationTriggered?: boolean
  btcSoldForLiquidation?: number
  debtReducedByLiquidation?: number
  // Rollover-targeting sale (distinct from liquidation)
  btcSoldForRollover?: number
  debtReducedByRolloverSale?: number
  // Monthly excess (savings/withdrawal) processed this month
  monthlyExcessProceeds?: number
  // Monthly withdrawal status flags
  withdrawalSuspended?: boolean
}


// Strategy-agnostic chart point (pure presentation data)
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

export function useRollingLoanCalculations() {
  const { params, priceProjection, results } = useSimulation()

  const pts = priceProjection?.projectionPoints || []
  const isMonthly = useMemo(() => {
    if (pts.length < 2) return false
    const dt = Math.abs((pts[1]?.timestamp || 0) - (pts[0]?.timestamp || 0))
    return dt > 2 * 24 * 60 * 60 * 1000
  }, [pts])

  const idxFor = (m: number) => Math.max(0, Math.min(isMonthly ? m : m * 30, Math.max(pts.length - 1, 0)))
  const getBtcPriceForMonth = (m: number) => {
    if (!params) return 0
    if (m === 0) return params.initialBtcPrice
    const idx = idxFor(m)
    return pts[idx]?.price || 0
  }
  const getTimestampForMonth = (m: number) => {
    if (m === 0) return pts[0]?.timestamp ?? Date.now()
    const idx = idxFor(m)
    return pts[idx]?.timestamp ?? Date.now()
  }


  const calculated = useMemo(() => {
    if (!params) {
      return { rolloverResults: [] as RolloverResult[], monthlyResults: [] as MonthlyResultRow[], monthlySnapshots: [] as MonthlySnapshot[] }
    }

    const rolloverResults: RolloverResult[] = []
    const monthlyResults: MonthlyResultRow[] = []

    // Track active loan for rollover timing and repayment (table-aligned)
    const monthlySnapshots: MonthlySnapshot[] = []

    type Loan = { principal: number; repaymentAmount: number; maturityMonth: number }
    let activeLoans: Loan[] = []
    let currentBtc = params.initialBtcAmount

    // Month 0: Initial loan principal = `loanAmountPercent × pre-purchase
    // collateral`. The user-facing label is "Percentage of your total BTC
    // stack value to use as loan amount" — pre-purchase basis. The
    // resulting LTV (total stack) AFTER the loan proceeds buy BTC will be
    // lower than the configured percent (the collateral denominator grows);
    // that's a mechanical consequence, not a bug.
    //
    // When loanAmountPercent isn't set, fall back to the target-LTV cap
    // bounded by the user-supplied maxLoanAmount (dollar cap).
    const month0Price = getBtcPriceForMonth(0)
    const month0Collateral = currentBtc * month0Price

    const willUseLoanAmountPercent = params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
    const loanPercent = willUseLoanAmountPercent ? params.loanAmountPercent! : (params.riskManagement?.targetLtv ?? 50)

    const calculatedByPercent = Math.round(month0Collateral * (loanPercent / 100))
    const maxLoanParam = params.maxLoanAmount ?? Number.POSITIVE_INFINITY

    const minimumForTarget = Math.round((params.riskManagement?.targetLtv ?? 50) / 100 * month0Collateral)
    const calculatedByLtv = minimumForTarget

    // When the user explicitly configured a loan-size percentage, honor it
    // verbatim — do NOT clamp by `maxLoanAmount` (the legacy dollar cap that
    // defaults to a small value like $15,000 and would otherwise truncate
    // every realistic loan).
    const finalLoanAmount = willUseLoanAmountPercent
      ? calculatedByPercent
      : Math.min(maxLoanParam, calculatedByLtv)

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
      } as any
    )

    // Create first active loan (matures at term)
    activeLoans.push({

      principal: month0Loan.principal,
      repaymentAmount: month0Loan.totalRepayment,
      maturityMonth: (params.loanTermMonths || 12),
    })

    // Initial accumulation
    let month0BtcPurchased = 0
    // Initialize locked/unlocked collateral state after month 0 setup
    const targetLtv = params.riskManagement?.targetLtv ?? 50
    const requiredLocked0 = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(
      month0Loan.totalRepayment,
      month0Price,
      targetLtv
    )
    let lockedBtc = Math.min(currentBtc, requiredLocked0)
    let unlockedBtc = Math.max(0, currentBtc - lockedBtc)


    // Track current total debt outstanding (repayment amount of active loan)
    let currentTotalDebt = month0Loan.totalRepayment

    if (params.btcAccumulation && month0Price > 0) {
      month0BtcPurchased = month0Loan.principal / month0Price
      currentBtc += month0BtcPurchased
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

    // Apply monthly savings/withdrawal at month 0 (after initial loan)
    {
      const baseMonthly = params.monthlyWithdrawalAmount || 0
      const annualInc = params.annualSavingsIncrease || 0
      const adjustedMonthly = baseMonthly * Math.pow(1 + (annualInc / 100), 0)
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
          if (availableUnlocked0 <= BTC_ZERO_EPS || (availableUnlocked0 * month0Price) <= USD_ZERO_EPS) {
            withdrawalSuspended0 = true
            btcDelta0 = 0
          } else {
            const sellFromUnlocked0 = Math.min(availableUnlocked0, btcNeeded0)
            btcDelta0 = -sellFromUnlocked0
            currentBtc += btcDelta0
          }
        }
        // Keep unlocked in sync with (currentBtc - lockedBtc)
        if (typeof unlockedBtc === 'number') {
          unlockedBtc = Math.max(0, currentBtc - lockedBtc)
        }
        const executedMonthly0 = (adjustedMonthly < 0 && withdrawalSuspended0) ? 0 : adjustedMonthly
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
        // Update BTC after on month 0 rollover and align excess proceeds to uniform formula
        if (rolloverResults.length > 0 && rolloverResults[0].month === 0) {
          const prior = rolloverResults[0]
          const executed0 = executedMonthly0
          rolloverResults[0] = { ...prior, totalBtcAfter: currentBtc, excessProceeds: (prior.loanPrincipal - (prior.oldLoanRepayment || 0)) + executed0 }
        }
      }
    }

    // Full simulation
    // Snapshot for month 0 (treated as rollover state)
    {
      const platformMaxLtv = (params.riskManagement as any)?.initialLtv ?? (params as any)?.platformMaxLtv ?? 50
      const effColl0 = currentBtc * month0Price * (platformMaxLtv / 100)
      const topUpLtv0 = effColl0 > 0 ? (currentTotalDebt / effColl0) * 100 : 0
      const initialLtv0 = lockedBtc > 0 ? (currentTotalDebt / (lockedBtc * month0Price)) * 100 : 0
      // Include monthly excess (savings/withdrawal) for month 0 as well
      const baseMonthly0 = params.monthlyWithdrawalAmount || 0
      const annualInc0 = params.annualSavingsIncrease || 0
      const adjustedMonthly0 = baseMonthly0 * Math.pow(1 + (annualInc0 / 100), 0)
      monthlySnapshots.push({
        month: 0,
        totalBtc: currentBtc,
        totalDebt: currentTotalDebt,
        isRollover: true,
        lockedBtc,
        unlockedBtc,
        monthlyExcessProceeds: adjustedMonthly0,
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

      // Accrue monthly interest on infinite-term loans. Finite-term loans
      // already bake all term-interest into `repaymentAmount` at origination
      // (see CentralizedLoanCalculationService), so this only fires when the
      // loan has no fixed maturity. Simple interest on the ORIGINAL principal
      // (matches the simulator's existing simple-interest convention used in
      // computeCostFactor: 1 + fee + monthlyRate × term).
      if (isInfiniteTerm && monthlyInterestRate > 0 && activeLoans.length > 0) {
        for (const loan of activeLoans) {
          const interestThisMonth = loan.principal * monthlyInterestRate
          loan.repaymentAmount += interestThisMonth
          currentTotalDebt += interestThisMonth
        }
      }

      // Sync unlocked collateral to available BTC before applying monthly flows
      unlockedBtc = Math.max(0, currentBtc - lockedBtc)

      // Monthly savings/withdrawals
      const baseMonthly = params.monthlyWithdrawalAmount || 0
      const annualInc = params.annualSavingsIncrease || 0
      const yearsElapsed = Math.floor(m / 12)
      const adjustedMonthly = baseMonthly * Math.pow(1 + (annualInc / 100), yearsElapsed)

      if (adjustedMonthly !== 0 && btcPrice > 0) {
        const totalBtcBeforeMonthly = currentBtc
        let btcDelta = 0
        if (adjustedMonthly > 0) {
          btcDelta = adjustedMonthly / btcPrice
          currentBtc += btcDelta
          unlockedBtc += btcDelta
        } else {
          const btcNeeded = Math.abs(adjustedMonthly) / btcPrice
          // Recompute available unlocked defensively (avoid any drift)
          const availableUnlocked = Math.max(0, currentBtc - lockedBtc)
          const BTC_ZERO_EPS = 1e-5
          const USD_ZERO_EPS = 1
          if (availableUnlocked <= BTC_ZERO_EPS || (availableUnlocked * btcPrice) <= USD_ZERO_EPS) {
            // Suspension: no unlocked BTC available (or effectively zero) -> skip withdrawal entirely
            withdrawalSuspended = true
            btcDelta = 0
            // no changes to currentBtc or unlockedBtc
          } else {
            const sellFromUnlocked = Math.min(availableUnlocked, btcNeeded)
            // Do NOT sell from locked collateral for monthly withdrawals
            const btcSold = sellFromUnlocked
            btcDelta = -btcSold
            currentBtc += btcDelta
            // Keep unlocked in sync with (currentBtc - lockedBtc)
            unlockedBtc = Math.max(0, currentBtc - lockedBtc)
          }
        }
        const executedMonthly = (adjustedMonthly < 0 && withdrawalSuspended) ? 0 : adjustedMonthly
        monthlyResults.push({
          month: m,
          btcPrice,
          totalBtcBefore: totalBtcBeforeMonthly,
          totalBtcAfter: currentBtc,
          usdFlow: adjustedMonthly,
          btcDelta,
          excessProceeds: executedMonthly,
          interest: 0,
          fees: 0,
          isMonthly: true,
        })
      }

      // 1) Risk management based on Initial LTV (top-up first, then liquidation) BEFORE rollover
      {
        const platformMaxLtv = (params.riskManagement as any)?.initialLtv ?? (params as any)?.platformMaxLtv ?? 50
        const effCollBefore = currentBtc * btcPrice * (platformMaxLtv / 100)
        const topUpLtvBefore = effCollBefore > 0 ? (currentTotalDebt / effCollBefore) * 100 : 0

        const tier1Start = params.riskManagement?.topUpTriggerLtv ?? 70 // warning/top-up zone (configurable)
        const tier2Start = params.riskManagement?.liquidationLtv ?? 80 // forced action zone (platform threshold)
        const targetInitial = (params.riskManagement?.topUpTargetLtvRange?.min ?? 50) // target Initial LTV after action (use min of range)
        const feeFrac = Math.max(0, (params.riskManagement?.liquidationFeePercent ?? 0) / 100)
        const minEventFrac = 0.001 // 0.1%

        // Compute Initial LTV (platform metric)
        const initialLtvBefore = (lockedBtc > 0 && btcPrice > 0)
          ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100
          : 0

        let btcTopUpForCollateral = 0
        let liquidationTriggered = false
        let btcSoldForLiquidation = 0
        let debtReducedByLiquidation = 0

        // Tier 1: Top-up by moving unlocked -> locked when Initial LTV >= tier1Start
        // Note: We allow top-up even if already >= tier2Start to try avoiding liquidation.
        if (initialLtvBefore >= tier1Start && unlockedBtc > 0 && btcPrice > 0) {
          const requiredLocked = (currentTotalDebt / (btcPrice * (targetInitial / 100)))
          const needToLock = Math.max(0, requiredLocked - lockedBtc)
          const minBtcEvent = minEventFrac * Math.max(0, lockedBtc + unlockedBtc)
          const potentialLock = Math.min(unlockedBtc, needToLock)
          const mustPreventLiquidation = initialLtvBefore >= tier2Start
          const meetsThreshold = mustPreventLiquidation ? potentialLock > 0 : (potentialLock >= minBtcEvent && potentialLock > 0)
          if (meetsThreshold) {
            lockedBtc += potentialLock
            unlockedBtc -= potentialLock
            btcTopUpForCollateral = potentialLock
          }
        }

        // Recompute Initial LTV after potential top-up
        const initialLtvAfterTopUp = (lockedBtc > 0 && btcPrice > 0)
          ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100
          : 0

        // Tier 2: Only if still high risk AFTER top-up (>= tier2) -> sell BTC to reduce debt
        if (initialLtvAfterTopUp >= tier2Start && btcPrice > 0 && currentTotalDebt > 0) {
          const t = (targetInitial / 100)
          const minBtcEvent = minEventFrac * Math.max(0, lockedBtc + unlockedBtc)

          // Step A: try selling from unlocked first (does not reduce collateral denominator)
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

          // Step B: if still above target, sell from locked (reduces both numerator and denominator)
          {
            const D1 = currentTotalDebt
            const L = lockedBtc
            if (L > 0) {
              const t = (targetInitial / 100)
              const denom = (1 - feeFrac) - t
              if (denom > 0 && btcPrice > 0) {
                const numerator = (D1 / btcPrice) - (t * L)
                let x = Math.max(0, numerator / denom) // BTC to sell from locked
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
            // Reduce active loan's repayment so rollover uses reduced debt
            if (activeLoans.length > 0) {
              let idx = 0
              for (let i = 1; i < activeLoans.length; i++) {
                if (activeLoans[i].maturityMonth < activeLoans[idx].maturityMonth) idx = i
              }
              activeLoans[idx].repaymentAmount = Math.max(0, activeLoans[idx].repaymentAmount - debtReducedByLiquidation)
            }
          }
        }

        // Capture post-action Top-Up LTV and Initial LTV
        const effCollAfter = currentBtc * btcPrice * (platformMaxLtv / 100)
        const topUpLtvAfter = effCollAfter > 0 ? (currentTotalDebt / effCollAfter) * 100 : 0
        const initialLtvAfter = (lockedBtc > 0 && btcPrice > 0) ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100 : 0

        // Save locals for the snapshot at the end of the month
        var _preTopUpLtv = topUpLtvBefore
        var _postTopUpLtv = topUpLtvAfter
        var _liqTriggered = liquidationTriggered
        var _btcSold = btcSoldForLiquidation
        var _debtReduced = debtReducedByLiquidation
        var _btcTopUp = btcTopUpForCollateral
        var _initialBefore = initialLtvBefore
        var _initialAfter = initialLtvAfter
        // Track rollover-specific sale to enforce target Initial LTV
        var _rolloverBtcSold = 0
        var _rolloverDebtReduced = 0
      }

      // 2) Rollover at maturity
      if (m % (params.loanTermMonths || 12) === 0) {
        const maturingLoan = activeLoans.find(l => l.maturityMonth === m)
        if (maturingLoan) {
          let repaymentDue = maturingLoan.repaymentAmount
          const totalBtcBefore = currentBtc
          const targetLtv = params.riskManagement?.targetLtv ?? 50
          const liquidationLtv = params.riskManagement?.liquidationLtv ?? 80
          // rolloverMaxLtv: configurable cap for rollover refinance. Encodes the
          // project-owner principle "don't sell as long as a top-up is possible".
          // Defaults to ~68% with target=40/liquidation=80.
          const rolloverMaxLtv = (params.riskManagement as any)?.rolloverMaxLtv
            ?? defaultRolloverMaxLtv(targetLtv, liquidationLtv)
          const costFactor = computeCostFactor(
            params.originationFeePercent || 0,
            params.annualInterestRate || 0,
            params.loanTermMonths || 12
          )

          // Single decision point: refinance vs sell. The policy service owns
          // the math; we just apply its output.
          const policy = decideRolloverAction({
            repaymentDue,
            lockedBtc,
            unlockedBtc,
            btcPrice,
            costFactor,
            targetLtv,
            rolloverMaxLtv,
            liquidationLtv,
            loanAmountPercent: (params as any).loanAmountPercent,
          })

          // Apply forced sale (if any) — sell from unlocked first, then locked
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

          let collateral = currentBtc * btcPrice
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
            } as any
          )

          // BTC accumulation: only EXCESS (new principal - repayment) buys BTC on rollover
          if ((params as any).btcAccumulation && btcPrice > 0) {
            const rolloverExcessOnly = Math.max(0, newLoan.principal - repaymentDue)
            if (rolloverExcessOnly > 0) {
              const btcPurchased = rolloverExcessOnly / btcPrice
              currentBtc += btcPurchased
              // ensure purchased BTC are available as unlocked collateral before reallocation
              unlockedBtc += btcPurchased
            }
          }

          // Replace old with new loan
          activeLoans = activeLoans.filter(l => l.maturityMonth !== m)
          activeLoans.push({
            principal: newLoan.principal,
            repaymentAmount: newLoan.totalRepayment,
            maturityMonth: m + (params.loanTermMonths || 12),
          })

          // Record rollover (display excess uses uniform formula: (principal - previous debt) + monthly flow)
          const excessProceeds = (newLoan.principal - repaymentDue) + adjustedMonthly
          const btcPurchased = btcPrice > 0 ? (Math.max(0, newLoan.principal - repaymentDue) / btcPrice) : 0

          // Update current total debt and flag rollover for chart snapshots
          currentTotalDebt = newLoan.totalRepayment
          // Adjust locked/unlocked to meet required collateral for target LTV after new loan
          // IMPORTANT: At rollover we MUST reach the required locked collateral if available.
          // Do NOT apply minimal event thresholds here; simply reallocate between unlocked and locked.
          {
            const requiredLocked = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(
              currentTotalDebt,
              btcPrice,
              targetLtv
            )
            const beforeLocked = lockedBtc
            const beforeUnlocked = unlockedBtc
            const delta = requiredLocked - lockedBtc
            let lockNow = 0
            let unlockNow = 0
            if (delta > 0) {
              lockNow = Math.min(unlockedBtc, delta)
              if (lockNow > 0) {
                lockedBtc += lockNow
                unlockedBtc -= lockNow
              }
            } else if (delta < 0) {
              unlockNow = Math.min(lockedBtc, Math.abs(delta))
              if (unlockNow > 0) {
                lockedBtc -= unlockNow
                unlockedBtc += unlockNow
              }
            }
            if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' && wasRollover === false) {
              // Rollover adjustment debug
              console.log('Rollover adjust', m, { requiredLocked, beforeLocked, beforeUnlocked, delta, lockNow, unlockNow, afterLocked: lockedBtc, afterUnlocked: unlockedBtc })
            }
          }

            // Recompute Initial LTV AFTER rollover (post-sale, post-new-loan, post-collateral reallocation)
            _initialAfter = (lockedBtc > 0 && btcPrice > 0)
              ? (currentTotalDebt / (lockedBtc * btcPrice)) * 100
              : 0


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
            // Track rollover sale (distinct from liquidation)
            btcSoldForRollover: _rolloverBtcSold,
            debtReducedByRolloverSale: _rolloverDebtReduced,
            isInitial: false,
          })
        }

      }
      // Snapshot this month for chart continuity with risk fields
      {
        const platformMaxLtv = (params.riskManagement as any)?.initialLtv ?? (params as any)?.platformMaxLtv ?? 50
        // Use values computed before/after liquidation above (_preTopUpLtv/_postTopUpLtv)
        const topUpLtvAfter = typeof _postTopUpLtv === 'number' ? _postTopUpLtv : ((): number => {
          const effColl = currentBtc * btcPrice * (platformMaxLtv / 100)
          return effColl > 0 ? (currentTotalDebt / effColl) * 100 : 0
        })()
        const topUpLtvBefore = typeof _preTopUpLtv === 'number' ? _preTopUpLtv : topUpLtvAfter
        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' && wasRollover) {
          console.log('Snapshot rollover', m, { lockedBtc, unlockedBtc, totalDebt: currentTotalDebt })
        }
        monthlySnapshots.push({
          month: m,
          totalBtc: currentBtc,
          totalDebt: currentTotalDebt,
          isRollover: wasRollover,
          lockedBtc,
          unlockedBtc,
          monthlyExcessProceeds: (adjustedMonthly < 0 && withdrawalSuspended) ? 0 : adjustedMonthly,
          withdrawalSuspended,
          // Capacity metric (for display)
          topUpLtv: topUpLtvAfter,
          topUpLtvBefore,
          // Platform risk metric (for logic)
          initialLtvBefore: typeof _initialBefore === 'number' ? _initialBefore : 0,
          initialLtvAfter: typeof _initialAfter === 'number' ? _initialAfter : 0,
          // Events
          btcTopUpForCollateral: _btcTopUp || 0,
          liquidationTriggered: !!_liqTriggered,
          btcSoldForLiquidation: _btcSold || 0,
          debtReducedByLiquidation: _debtReduced || 0,
          // Rollover-targeting sale (distinct from liquidation)
          btcSoldForRollover: _rolloverBtcSold || 0,
          debtReducedByRolloverSale: _rolloverDebtReduced || 0,
        })
      }

    }

    return { rolloverResults, monthlyResults, monthlySnapshots }
  }, [params, isMonthly, pts])

  // Build chart points with the same granularity the table uses
  const chartPoints: StrategyChartPoint[] = useMemo(() => {
    if (!params) return []

    const includeMonthly = (params.monthlyWithdrawalAmount ?? 0) !== 0
    const targetLtv = params.riskManagement?.targetLtv ?? 50
    const liquidationLtv = params.riskManagement?.liquidationLtv ?? 80
    const liqF = Math.max(0.0001, liquidationLtv / 100)

    const points: StrategyChartPoint[] = []

    // Forward-fill holders for rollover-only values
    let lastTotalDebt: number | null = null
    let lastLockedBtc: number | null = null
    let lastImmediateLiq: number | null = null
    let lastTopUpLiq: number | null = null

    const totalMonths = params.simulationMonths || 0
    for (let m = 0; m <= totalMonths; m++) {
      const snapshot = calculated.monthlySnapshots.find(s => s.month === m)
      if (!snapshot) continue

      const ts = getTimestampForMonth(m)
      const btcPrice = getBtcPriceForMonth(m)
      const totalBtc = snapshot.totalBtc
      const totalDebt = snapshot.totalDebt
      const collateralValue = totalBtc * btcPrice
      const netBtc = totalDebt > 0 && btcPrice > 0 ? (totalBtc - (totalDebt / btcPrice)) : totalBtc

      if (snapshot.isRollover) {
        // Use the ACTUAL locked BTC from the monthly snapshot when available,
        // and always clamp to total BTC so we never display locked > available.
        const lockedRequired = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(totalDebt, btcPrice, targetLtv)
        const snapshotLocked = (snapshot.lockedBtc ?? null)
        const locked: number = Math.min(
          typeof snapshotLocked === 'number' ? (snapshotLocked as number) : lockedRequired,
          totalBtc
        )
        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.log('Chart rollover', m, { snapshotLocked: snapshot.lockedBtc, lockedRequired, usedLocked: locked, totalDebt, totalBtc })
        }
        const immediate = locked > 0 ? (totalDebt / (locked * liqF)) : null
        const topUp = totalBtc > 0 ? (totalDebt / (totalBtc * liqF)) : null

        // Update last-known (forward-fill) values
        lastTotalDebt = totalDebt
        lastLockedBtc = locked
        lastImmediateLiq = immediate
        lastTopUpLiq = topUp

        points.push({
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
        const locked: number | null = (snapshot.lockedBtc !== undefined && snapshot.lockedBtc !== null)
          ? (snapshot.lockedBtc as number)
          : lastLockedBtc
        const immediate = (locked && locked > 0) ? (snapshot.totalDebt / (locked * liqF)) : null
        const topUp = totalBtc > 0 ? (snapshot.totalDebt / (totalBtc * liqF)) : null
        lastTotalDebt = snapshot.totalDebt
        lastLockedBtc = locked
        lastImmediateLiq = immediate
        lastTopUpLiq = topUp
        points.push({
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

    return points
  }, [params, calculated, getTimestampForMonth, getBtcPriceForMonth])

  return {
    rolloverResults: calculated.rolloverResults,
    monthlyResults: calculated.monthlyResults,
    monthlySnapshots: calculated.monthlySnapshots,
    isMonthly,
    getBtcPriceForMonth,
    chartPoints,
  }
}

