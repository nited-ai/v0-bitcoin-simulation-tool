"use client"

import { useMemo } from "react"
import { useSimulation } from "../context/SimulationContext"
import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"

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
  isInitial: boolean
}

export interface MonthlyResultRow {
  month: number
  btcPrice: number
  totalBtcBefore: number
  totalBtcAfter: number
  usdFlow: number
  btcDelta: number
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

    // Month 0: Initial loan based on target (loanAmountPercent or target LTV)
    const month0Price = getBtcPriceForMonth(0)
    const month0Collateral = currentBtc * month0Price

    const willUseLoanAmountPercent = params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
    const loanPercent = willUseLoanAmountPercent ? params.loanAmountPercent! : (params.riskManagement?.targetLtv ?? 50)

    const calculatedByPercent = Math.round(month0Collateral * (loanPercent / 100))
    const maxLoanParam = params.maxLoanAmount ?? Number.POSITIVE_INFINITY

    const minimumForTarget = Math.round((params.riskManagement?.targetLtv ?? 50) / 100 * month0Collateral)
    const calculatedByLtv = minimumForTarget

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
        if (adjustedMonthly > 0) {
          btcDelta0 = adjustedMonthly / month0Price
          currentBtc += btcDelta0
        } else {
          const btcNeeded0 = Math.abs(adjustedMonthly) / month0Price
          const btcSold0 = Math.min(currentBtc, btcNeeded0)

          btcDelta0 = -btcSold0
          currentBtc += btcDelta0
        }
        monthlyResults.push({
          month: 0,
          btcPrice: month0Price,
          totalBtcBefore: totalBtcBeforeMonthly0,
          totalBtcAfter: currentBtc,
          usdFlow: adjustedMonthly,
          btcDelta: btcDelta0,
          interest: 0,
          fees: 0,
          isMonthly: true,
        })
        // Update BTC after on month 0 rollover
        if (rolloverResults.length > 0 && rolloverResults[0].month === 0) {
          rolloverResults[0] = { ...rolloverResults[0], totalBtcAfter: currentBtc }
        }
      }
    }

    // Full simulation
    // Snapshot for month 0 (treated as rollover state)
    monthlySnapshots.push({ month: 0, totalBtc: currentBtc, totalDebt: currentTotalDebt, isRollover: true })

    for (let m = 1; m <= (params.simulationMonths || 0); m++) {


      let wasRollover = false

      const btcPrice = getBtcPriceForMonth(m)

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
        } else {
          const btcNeeded = Math.abs(adjustedMonthly) / btcPrice
          const btcSold = Math.min(currentBtc, btcNeeded)
          btcDelta = -btcSold
          currentBtc += btcDelta
        }
        monthlyResults.push({
          month: m,
          btcPrice,
          totalBtcBefore: totalBtcBeforeMonthly,
          totalBtcAfter: currentBtc,
          usdFlow: adjustedMonthly,
          btcDelta,
          interest: 0,
          fees: 0,
          isMonthly: true,
        })
      }

      // Rollover at maturity
      if (m % (params.loanTermMonths || 12) === 0) {
        const maturingLoan = activeLoans.find(l => l.maturityMonth === m)
        if (maturingLoan) {
          const repaymentDue = maturingLoan.repaymentAmount
          const totalBtcBefore = currentBtc
          const collateral = currentBtc * btcPrice

          // Target principal by percent of collateral
          const targetPrincipal = Math.round(collateral * (loanPercent / 100))
          const minimumLoan = Math.round(repaymentDue / (1 - (params.originationFeePercent || 0) / 100))
          const actualPrincipal = Math.max(targetPrincipal, minimumLoan)

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
            const excess = Math.max(0, newLoan.principal - repaymentDue)
            if (excess > 0) {
              const btcPurchased = excess / btcPrice
              currentBtc += btcPurchased
            }
          }

          // Replace old with new loan
          activeLoans = activeLoans.filter(l => l.maturityMonth !== m)
          activeLoans.push({
            principal: newLoan.principal,
            repaymentAmount: newLoan.totalRepayment,
            maturityMonth: m + (params.loanTermMonths || 12),
          })

          // Record rollover
          const excessProceeds = Math.max(0, newLoan.principal - repaymentDue)
          const btcPurchased = btcPrice > 0 ? (excessProceeds / btcPrice) : 0

          // Update current total debt and flag rollover for chart snapshots
          currentTotalDebt = newLoan.totalRepayment
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
            isInitial: false,
          })
        }

      }
      // Snapshot this month for chart continuity
      monthlySnapshots.push({ month: m, totalBtc: currentBtc, totalDebt: currentTotalDebt, isRollover: wasRollover })

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
        const lockedBtc = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(totalDebt, btcPrice, targetLtv)
        const immediate = lockedBtc > 0 ? (totalDebt / (lockedBtc * liqF)) : null
        const topUp = totalBtc > 0 ? (totalDebt / (totalBtc * liqF)) : null

        // Update last-known (forward-fill) values
        lastTotalDebt = totalDebt
        lastLockedBtc = lockedBtc
        lastImmediateLiq = immediate
        lastTopUpLiq = topUp

        points.push({
          timestamp: ts,
          btcPrice,
          collateralValue,
          totalDebt,
          totalBtc,
          lockedBtc,
          netBtc,
          immediateLiquidationPrice: immediate,
          topUpLiquidationPrice: topUp,
        })
      } else {
        points.push({
          timestamp: ts,
          btcPrice,
          collateralValue,
          totalDebt: lastTotalDebt,
          totalBtc,
          lockedBtc: lastLockedBtc,
          netBtc,
          immediateLiquidationPrice: lastImmediateLiq,
          topUpLiquidationPrice: lastTopUpLiq,
        })
      }
    }

    return points
  }, [params, calculated, getTimestampForMonth, getBtcPriceForMonth])

  return {
    rolloverResults: calculated.rolloverResults,
    monthlyResults: calculated.monthlyResults,
    isMonthly,
    getBtcPriceForMonth,
    chartPoints,
  }
}

