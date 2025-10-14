"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSimulation } from "../../context/SimulationContext"
import { Bug, Play, Copy, CheckCircle, XCircle, AlertTriangle, DollarSign, TrendingUp } from "lucide-react"
import { RollingLoanStrategy } from "@/src/modules/strategies/implementations/RollingLoanStrategy"
import type { StrategyContext, Loan, StrategyExecutionParams } from "@/src/modules/strategies/types"
import { ParameterMetadataCard, type ParameterInfo } from "./ParameterMetadata"
import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"

interface MonthDebugInfo {
  month: number
  btcPrice: number
  totalBtcAmount: number
  collateralValue: number
  activeLoansCount: number
  maturingLoansCount: number
  totalRepaymentDue: number
  calculationPath: 'initial' | 'rollover' | 'none'
  loanAmountCalc: {
    usedLoanAmountPercent: boolean
    loanAmountPercent?: number
    maxLoanAmountParam?: number
    targetLtv?: number
    calculation: string
    result: number
  }
  decision: {
    allowInvestment: boolean
    investmentMultiplier: number
    allowWithdrawal: boolean
    withdrawalAmount: number
    reasoning?: string
  }
  loanDetails?: {
    principal: number
    totalRepayment: number
    originationFee: number
    totalInterest: number
  }
  rolloverDetails?: {
    previousPrincipal: number
    accruedInterest: number
    totalRepaymentDue: number
    minimumLoanNeeded: number
    maximumLoanAllowed: number
    actualLoanAmount: number
    excessProceeds: number
    conflictResolution: string
  }
  btcAccumulationDetails?: {
    excessProceeds: number
    btcPurchased: number
    previousTotalBtc: number
    newTotalBtc: number
  }
}

export function RollingLoanDebugPage() {
  const { params, priceProjection } = useSimulation()
  const [debugInfo, setDebugInfo] = useState<MonthDebugInfo[]>([])
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const toggleExpanded = (m: number) => setExpanded(prev => ({ ...prev, [m]: !prev[m] }))


  /**
   * Generate parameter metadata for Parameters Tab
   */
  const parametersTabParams: ParameterInfo[] = useMemo(() => [
    {
      name: "Initial BTC Amount",
      value: params.initialBtcAmount,
      type: "params.initialBtcAmount",
      controlledBy: "BasicParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Starting Bitcoin stack size for the simulation"
    },
    {
      name: "Initial BTC Price",
      value: params.initialBtcPrice,
      type: "params.initialBtcPrice",
      controlledBy: "BasicParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Current Bitcoin price at simulation start"
    },
    {
      name: "Loan Amount Percent",
      value: params.loanAmountPercent || 0,
      type: "params.loanAmountPercent",
      controlledBy: "LoanParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Percentage of collateral value to borrow"
    },
    {
      name: "Annual Interest Rate",
      value: params.annualInterestRate,
      type: "params.annualInterestRate",
      controlledBy: "LoanParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Yearly interest rate charged on loans"
    },
    {
      name: "Loan Origination Fee",
      value: params.originationFeePercent,
      type: "params.originationFeePercent",
      controlledBy: "LoanParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "One-time fee charged when taking out a loan"
    },
    {
      name: "Loan Term",
      value: params.loanTermMonths,
      type: "params.loanTermMonths",
      controlledBy: "LoanParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Duration of each loan in months"
    },
    {
      name: "Target LTV",
      value: params.riskManagement.targetLtv,
      type: "params.riskManagement.targetLtv",
      controlledBy: "LoanParametersCard.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Desired loan-to-value ratio"
    },
    {
      name: "Liquidation LTV",
      value: params.riskManagement.liquidationLtv,
      type: "params.riskManagement.liquidationLtv",
      controlledBy: "PlatformSelector.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "LTV threshold at which liquidation occurs"
    },
    {
      name: "Liquidation Fee",
      value: params.riskManagement.liquidationFeePercent,
      type: "params.riskManagement.liquidationFeePercent",
      controlledBy: "PlatformSelector.tsx",
      origin: "app/simulation/tabs/parameters/",
      description: "Fee charged during liquidation"
    }
  ], [params])

  /**
   * Generate parameter metadata for Price Projection Tab
   */
  const priceProjectionTabParams: ParameterInfo[] = useMemo(() => [
    {
      name: "Simulation Length",
      value: params.simulationMonths,
      type: "params.simulationMonths",
      controlledBy: "SimulationLengthControl.tsx",
      origin: "app/simulation/tabs/price-projection/",
      description: "Total duration of the simulation in months"
    },
    {
      name: "Selected Price Model",
      value: priceProjection?.metadata?.modelName || params.priceModel || 'Not Set',
      type: "priceProjection.metadata.modelName",
      controlledBy: "PriceModelSelector.tsx",
      origin: "app/simulation/tabs/price-projection/",
      description: "Bitcoin price forecasting model being used"
    },
    {
      name: "Projection Available",
      value: !!priceProjection,
      type: "priceProjection !== null",
      controlledBy: "UnifiedPriceChart.tsx",
      origin: "app/simulation/tabs/price-projection/",
      description: "Whether price projection data has been generated"
    },
    {
      name: "Projection Points Count",
      value: priceProjection?.projectionPoints?.length || 0,
      type: "priceProjection.projectionPoints.length",
      controlledBy: "UnifiedPriceChart.tsx",
      origin: "app/simulation/tabs/price-projection/",
      description: "Number of daily price data points in projection"
    }
  ], [params, priceProjection])

  /**
   * Generate parameter metadata for Strategy Tab
   */
  const strategyTabParams: ParameterInfo[] = useMemo(() => [
    {
      name: "Investment Strategy",
      value: "Rolling Loan Strategy",
      type: "params.strategy",
      controlledBy: "StrategySelectionCard.tsx",
      origin: "app/simulation/tabs/strategy/",
      description: "Selected investment strategy type"
    },
    {
      name: "BTC Accumulation Mode",
      value: (params as any).btcAccumulation ?? true,
      type: "params.btcAccumulation",
      controlledBy: "BtcAccumulationCard.tsx",
      origin: "app/simulation/tabs/strategy/",
      description: "Whether to reinvest loan proceeds into Bitcoin"
    },
    {
      name: "Monthly Financial Flow",
      value: params.monthlyWithdrawalAmount,
      type: "params.monthlyWithdrawalAmount",
      controlledBy: "FinancialFlowCard.tsx",
      origin: "app/simulation/tabs/strategy/",
      description: "Monthly savings (positive) or withdrawals (negative)"
    }
  ], [params])

  // Debug: Log priceProjection on mount and when it changes
  useEffect(() => {
    console.log('🔍 Debug Page - priceProjection:', priceProjection)
    console.log('🔍 Debug Page - priceProjection exists:', !!priceProjection)
    console.log('🔍 Debug Page - projectionPoints length:', priceProjection?.projectionPoints?.length || 0)
    console.log('🔍 Debug Page - params:', params)
  }, [priceProjection, params])

  // Calculate expected loan amounts and other values
  const calculatedValues = useMemo(() => {
    const btcStackValue = params.initialBtcAmount * params.initialBtcPrice
    const loanPercent = params.loanAmountPercent || 10
    const targetLtvPercent = params.riskManagement.targetLtv

    const calculatedByPercent = btcStackValue * (loanPercent / 100)
    const calculatedByLtv = btcStackValue * (targetLtvPercent / 100)
    const maxLoanParam = params.maxLoanAmount

    // Determine which value will be used (mimics strategy logic)
    const willUseLoanAmountPercent = params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
    const finalLoanAmount = willUseLoanAmountPercent
      ? calculatedByPercent
      : Math.min(maxLoanParam, calculatedByLtv)

    // Calculate loan costs using centralized service
    const strategyParams: StrategyExecutionParams = {
      btcAmount: params.initialBtcAmount,
      initialBtcPrice: params.initialBtcPrice,
      monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
      annualInterestRate: params.annualInterestRate,
      loanOriginationFeePercent: params.originationFeePercent,
      loanTermMonths: params.loanTermMonths,
      simulationMonths: params.simulationMonths,
      maxLoanAmount: params.maxLoanAmount,
      expectedAnnualInflation: 3, // Default inflation rate
      btcAccumulation: (params as any).btcAccumulation ?? true,
      investmentStrategy: 'rollingLoan',
      riskManagement: params.riskManagement,
      loanAmountPercent: params.loanAmountPercent
    }

    const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
      finalLoanAmount,
      btcStackValue,
      strategyParams
    )

    const formatted = centralizedLoanCalculationService.formatLoanCalculation(loanDetails)

    // ═══════════════════════════════════════════════════════════════════════════
    // SIMULATE FULL ROLLOVER CHAIN TO CALCULATE EXPECTED VALUES
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // ⚠️ CRITICAL: We must simulate AT LEAST 3 ROLLOVERS to verify the chain works!
    //
    // Month 0:  Initial loan → Buy BTC → Total BTC increases
    // Month 18: Rollover #1 → Excess proceeds → Buy MORE BTC → Total BTC increases
    // Month 36: Rollover #2 → Excess proceeds → Buy MORE BTC → Total BTC increases
    // Month 54: Rollover #3 → Excess proceeds → Buy MORE BTC → Total BTC increases
    //
    // Each rollover compounds the BTC stack, leading to progressively larger loans.
    // ═══════════════════════════════════════════════════════════════════════════

    interface RolloverResult {
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
      isInitial: boolean
    }

    interface MonthlyResult {
      month: number
      btcPrice: number
      totalBtcBefore: number
      totalBtcAfter: number
      usdFlow: number // positive = savings (buy), negative = withdrawal (sell)
      btcDelta: number // positive buy, negative sell
      isMonthly: true
    }


    const rolloverResults: RolloverResult[] = []
    const monthlyResults: MonthlyResult[] = []


    // Helper function to calculate loan details
    const calculateLoanForSimulation = (principal: number, collateralValue: number) => {
      const strategyParams: StrategyExecutionParams = {
        btcAmount: params.initialBtcAmount,
        initialBtcPrice: params.initialBtcPrice,
        monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
        annualInterestRate: params.annualInterestRate,
        loanOriginationFeePercent: params.originationFeePercent,
        loanTermMonths: params.loanTermMonths,
        simulationMonths: params.simulationMonths,
        maxLoanAmount: params.maxLoanAmount,
        expectedAnnualInflation: 3,
        btcAccumulation: params.btcAccumulation ?? true,
        investmentStrategy: 'rollingLoan',
        riskManagement: params.riskManagement,
        loanAmountPercent: params.loanAmountPercent
      }
      return centralizedLoanCalculationService.calculateLoanDetails(principal, collateralValue, strategyParams)
    }

    // Initialize simulation state
    let currentBtc = params.initialBtcAmount
    let activeLoans: Array<{ principal: number; repaymentAmount: number; maturityMonth: number }> = []

    // ═══════════════════════════════════════════════════════════════════════════
    // MONTH 0: INITIAL LOAN
    // ═══════════════════════════════════════════════════════════════════════════
    const month0Price = params.initialBtcPrice
    const month0Collateral = currentBtc * month0Price
    const month0Principal = Math.round(month0Collateral * (loanPercent / 100))
    const month0LoanDetails = calculateLoanForSimulation(month0Principal, month0Collateral)

    const totalBtcBeforeMonth0 = currentBtc

    // Add loan to active loans
    activeLoans.push({
      principal: month0LoanDetails.principal,
      repaymentAmount: month0LoanDetails.totalRepayment,
      maturityMonth: params.loanTermMonths
    })

    // For initial loan, ENTIRE principal is used to buy BTC (no debt to pay off)
    let month0BtcPurchased = 0
    if (params.btcAccumulation) {
      month0BtcPurchased = month0LoanDetails.principal / month0Price
      currentBtc += month0BtcPurchased
    }

    rolloverResults.push({
      month: 0,
      btcPrice: month0Price,
      totalBtcBefore: totalBtcBeforeMonth0,
      totalBtcAfter: currentBtc,
      collateralValue: month0Collateral,
      loanPrincipal: month0LoanDetails.principal,
      loanRepayment: month0LoanDetails.totalRepayment,
      excessProceeds: month0LoanDetails.principal, // Entire principal for initial loan
      btcPurchased: month0BtcPurchased,
      isInitial: true
    })

    // Apply monthly savings/withdrawal at month 0 (after initial loan purchase)
    {
      const baseMonthly = params.monthlyWithdrawalAmount || 0
      const annualInc = params.annualSavingsIncrease || 0
      const adjustedMonthly = baseMonthly * Math.pow(1 + (annualInc / 100), 0) // month 0 → year 0
      if (adjustedMonthly !== 0 && month0Price > 0) {
        const totalBtcBeforeMonthly0 = currentBtc
        let btcDelta0 = 0
        if (adjustedMonthly > 0) {
          // Savings → buy BTC
          btcDelta0 = adjustedMonthly / month0Price
          currentBtc += btcDelta0
        } else {
          // Withdrawal → sell BTC
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
          isMonthly: true
        })
        // Update month 0 rollover's totalBtcAfter to include monthly flow
        if (rolloverResults.length > 0 && rolloverResults[0].month === 0) {
          rolloverResults[0] = { ...rolloverResults[0], totalBtcAfter: currentBtc }
        }
      }
    }

    console.log(`📊 Month 0: Price=$${month0Price.toLocaleString()}, Collateral=$${month0Collateral.toLocaleString()}, Principal=$${month0LoanDetails.principal.toLocaleString()}, BTC Purchased=${month0BtcPurchased.toFixed(4)}, Total BTC=${currentBtc.toFixed(4)}`)

    // ═══════════════════════════════════════════════════════════════════════════
    // FULL SIMULATION: Monthly flows + rollovers up to simulationMonths
    // ═══════════════════════════════════════════════════════════════════════════
    const pts = priceProjection?.projectionPoints || []
    const isMonthly = (() => {
      if (pts.length < 2) return false
      const dt = Math.abs((pts[1]?.timestamp || 0) - (pts[0]?.timestamp || 0))
      return dt > 2 * 24 * 60 * 60 * 1000
    })()
    const getBtcPriceForMonth = (m: number) => {
      if (m === 0) return params.initialBtcPrice
      const rawIndex = isMonthly ? m : m * 30
      const idx = Math.max(0, Math.min(rawIndex, Math.max(pts.length - 1, 0)))
      return pts[idx]?.price || 0
    }

    for (let m = 1; m <= (params.simulationMonths || 0); m++) {
      const btcPrice = getBtcPriceForMonth(m)
      if (btcPrice === 0) {
        console.log(`⚠️ Month ${m}: No price data; skipping month entry`)
      }

      // Monthly savings/withdrawals with annual increase
      const baseMonthly = params.monthlyWithdrawalAmount || 0
      const annualInc = params.annualSavingsIncrease || 0
      const yearsElapsed = Math.floor(m / 12)
      const adjustedMonthly = baseMonthly * Math.pow(1 + (annualInc / 100), yearsElapsed)

      if (adjustedMonthly !== 0 && btcPrice > 0) {
        const totalBtcBeforeMonthly = currentBtc
        let btcDelta = 0
        if (adjustedMonthly > 0) {
          // Savings → buy BTC
          btcDelta = adjustedMonthly / btcPrice
          currentBtc += btcDelta
        } else {
          // Withdrawal → sell BTC
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
          isMonthly: true
        })
      }

      // Rollover at maturity months
      if (m % (params.loanTermMonths || 12) === 0) {
        const maturingLoan = activeLoans.find(l => l.maturityMonth === m)
        if (!maturingLoan) {
          console.log(`⚠️ Month ${m}: No maturing loan found; skipping rollover`)
        } else {
          const repaymentDue = maturingLoan.repaymentAmount
          const totalBtcBefore = currentBtc
          const collateral = currentBtc * btcPrice
          const targetPrincipal = Math.round(collateral * (loanPercent / 100))
          const minimumLoan = Math.round(repaymentDue / (1 - params.originationFeePercent / 100))
          const actualPrincipal = Math.max(targetPrincipal, minimumLoan)
          const newLoanDetails = calculateLoanForSimulation(actualPrincipal, collateral)
          const excessProceeds = newLoanDetails.principal - repaymentDue

          let btcPurchased = 0
          if ((params.btcAccumulation ?? true) && excessProceeds > 0 && btcPrice > 0) {
            btcPurchased = excessProceeds / btcPrice
            currentBtc += btcPurchased
          }

          // Replace old loan with new one
          activeLoans = activeLoans.filter(l => l.maturityMonth !== m)
          activeLoans.push({
            principal: newLoanDetails.principal,
            repaymentAmount: newLoanDetails.totalRepayment,
            maturityMonth: m + (params.loanTermMonths || 12)
          })

          rolloverResults.push({
            month: m,
            btcPrice,
            totalBtcBefore,
            totalBtcAfter: currentBtc,
            collateralValue: collateral,
            loanPrincipal: newLoanDetails.principal,
            loanRepayment: newLoanDetails.totalRepayment,
            oldLoanRepayment: repaymentDue,
            excessProceeds,
            btcPurchased,
            isInitial: false
          })

          console.log(`📊 Month ${m}: Price=$${btcPrice.toLocaleString()}, Collateral=$${collateral.toLocaleString()}, Target=$${targetPrincipal.toLocaleString()}, Minimum=$${minimumLoan.toLocaleString()}, Actual=$${newLoanDetails.principal.toLocaleString()}, Old Repayment=$${repaymentDue.toLocaleString()}, Excess=$${excessProceeds.toLocaleString()}, BTC Purchased=${btcPurchased.toFixed(4)}, Total BTC=${currentBtc.toFixed(4)}`)
        }
      }
    }

    return {
      btcStackValue,
      loanPercent,
      targetLtvPercent,
      calculatedByPercent,
      calculatedByLtv,
      maxLoanParam,
      willUseLoanAmountPercent,
      finalLoanAmount,
      rolloverResults, // Array of all rollovers
      monthlyResults,  // Array of monthly savings/withdrawals
      loanDetails,
      formatted
    }
  }, [params, priceProjection])

  const runDebugSimulation = () => {
    console.log('🚀 Running debug simulation...')
    console.log('🔍 priceProjection:', priceProjection)
    console.log('🔍 priceProjection?.projectionPoints:', priceProjection?.projectionPoints)
    console.log('🔍 projectionPoints length:', priceProjection?.projectionPoints?.length)

    if (!priceProjection || !priceProjection.projectionPoints || priceProjection.projectionPoints.length === 0) {
      const errorMsg = `Price projection not available. Please generate price projection first.

Debug Info:
- priceProjection exists: ${!!priceProjection}
- projectionPoints exists: ${!!priceProjection?.projectionPoints}
- projectionPoints length: ${priceProjection?.projectionPoints?.length || 0}

Please go to the Price Projection tab and generate a projection.`
      alert(errorMsg)
      console.error('❌ Price projection check failed:', {
        priceProjection,
        hasProjection: !!priceProjection,
        hasPoints: !!priceProjection?.projectionPoints,
        pointsLength: priceProjection?.projectionPoints?.length
      })
      return
    }

    console.log('✅ Price projection available, starting simulation...')

    setIsRunning(true)
    const strategy = new RollingLoanStrategy()
    const debugResults: MonthDebugInfo[] = []

    let totalBtcAmount = params.initialBtcAmount
    let activeLoans: Loan[] = []
    let loanIdCounter = 1

    // Create strategy params for loan calculations
    const strategyParams: StrategyExecutionParams = {
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
      investmentStrategy: 'rollingLoan',
      riskManagement: params.riskManagement,
      loanAmountPercent: params.loanAmountPercent
    }

    // Simulate key months
    const monthsToSimulate = showAllMonths
      ? Array.from({ length: Math.min(params.simulationMonths, 24) }, (_, i) => i)
      : [0, 6, 12, 18]

    for (const month of monthsToSimulate) {
      if (month >= priceProjection.projectionPoints.length / 30) break

      const dailyIndex = Math.min(month * 30, priceProjection.projectionPoints.length - 1)
      const pricePoint = priceProjection.projectionPoints[dailyIndex]

      // CRITICAL FIX: Use initialBtcPrice for Month 0, projected price for subsequent months
      const btcPrice = month === 0 ? params.initialBtcPrice : pricePoint.price

      const collateralValue = totalBtcAmount * btcPrice
      const maturingLoans = activeLoans.filter(l => l.maturityMonth === month)
      const totalRepaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)

      // Create strategy context
      const context: StrategyContext = {
        month,
        currentDate: new Date(pricePoint.timestamp),
        btcPrice,
        totalBtcAmount,
        activeLoans: [...activeLoans],
        collateralValue,
        debtCapacity: 0,
        historicalPriceData: [],
        priceProjectionData: priceProjection,
        params: {
          btcAmount: params.initialBtcAmount,
          initialBtcPrice: params.initialBtcPrice,
          monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
          annualInterestRate: params.annualInterestRate,
          loanOriginationFeePercent: params.originationFeePercent,
          loanTermMonths: params.loanTermMonths,
          simulationMonths: params.simulationMonths,
          maxLoanAmount: params.maxLoanAmount,
          loanAmountPercent: params.loanAmountPercent,
          expectedAnnualInflation: 3.0,
          btcAccumulation: (params as any).btcAccumulation ?? true,
          riskManagement: params.riskManagement,
          investmentStrategy: 'rollingLoan'
        }
      }

      // Get strategy decision
      const decision = strategy.makeDecision(context)

      // Determine calculation path
      const isInitialLoan = activeLoans.length === 0
      const isRollover = maturingLoans.length > 0
      const calculationPath = isInitialLoan ? 'initial' : isRollover ? 'rollover' : 'none'

      // Calculate loan amount details
      const loanAmountCalc = {
        usedLoanAmountPercent: params.loanAmountPercent !== undefined && params.loanAmountPercent > 0,
        loanAmountPercent: params.loanAmountPercent,
        maxLoanAmountParam: params.maxLoanAmount,
        targetLtv: params.riskManagement.targetLtv,
        calculation: '',
        result: 0
      }

      if (loanAmountCalc.usedLoanAmountPercent) {
        loanAmountCalc.calculation = `${collateralValue.toFixed(2)} × (${params.loanAmountPercent} / 100) = ${(collateralValue * (params.loanAmountPercent / 100)).toFixed(2)}`
        loanAmountCalc.result = collateralValue * (params.loanAmountPercent / 100)
      } else {
        const targetLtvAmount = collateralValue * (params.riskManagement.targetLtv / 100)
        loanAmountCalc.calculation = `Math.min(${params.maxLoanAmount.toFixed(2)}, ${targetLtvAmount.toFixed(2)}) = ${Math.min(params.maxLoanAmount, targetLtvAmount).toFixed(2)}`
        loanAmountCalc.result = Math.min(params.maxLoanAmount, targetLtvAmount)
      }

      // Calculate loan details if investment is allowed
      let loanDetailsForDebug: { principal: number; totalRepayment: number; originationFee: number; totalInterest: number } | undefined
      if (decision.allowInvestment && decision.investmentMultiplier > 0) {
        const principal = Math.round(collateralValue * decision.investmentMultiplier)
        const loanDetails = centralizedLoanCalculationService.calculateLoanDetails(
          principal,
          collateralValue,
          strategyParams
        )
        loanDetailsForDebug = {
          principal: loanDetails.principal,
          totalRepayment: loanDetails.totalRepayment,
          originationFee: loanDetails.originationFee,
          totalInterest: loanDetails.totalInterest
        }
      }

      // Prepare BTC accumulation details (will be populated after loan creation)
      let btcAccumulationDetails: MonthDebugInfo['btcAccumulationDetails'] | undefined

      // Store debug info (will update with BTC accumulation details later)
      const debugEntry: MonthDebugInfo = {
        month,
        btcPrice,
        totalBtcAmount,
        collateralValue,
        activeLoansCount: activeLoans.length,
        maturingLoansCount: maturingLoans.length,
        totalRepaymentDue,
        calculationPath,
        loanAmountCalc,
        decision,
        loanDetails: loanDetailsForDebug
      }
      debugResults.push(debugEntry)

      // Update simulation state based on decision
      if (decision.allowInvestment && decision.investmentMultiplier > 0 && loanDetailsForDebug) {
        const newLoan: Loan = {
          id: loanIdCounter++,
          month,
          principal: loanDetailsForDebug.principal,
          maturityMonth: month + params.loanTermMonths,
          repaymentAmount: loanDetailsForDebug.totalRepayment,  // Now includes fees + interest
          lockedBtc: loanDetailsForDebug.principal / btcPrice
        }
        activeLoans.push(newLoan)

        // ═══════════════════════════════════════════════════════════════════════════
        // BTC ACCUMULATION LOGIC
        // ═══════════════════════════════════════════════════════════════════════════
        //
        // ⚠️ CRITICAL: Different logic for initial loan vs rollover!
        //
        // INITIAL LOAN (Month 0):
        //   - No existing debt to pay off
        //   - ENTIRE principal is used to buy BTC
        //   - Example: $11,724 principal → Buy 0.1 BTC
        //
        // ROLLOVER LOAN (Month 18+):
        //   - Must pay off maturing loan first
        //   - Only EXCESS proceeds are used to buy BTC
        //   - Example: $16,500 new loan - $13,659 repayment = $2,841 excess → Buy BTC
        //
        // The previous code incorrectly added the ENTIRE principal for rollovers,
        // which caused the BTC stack to grow exponentially and produce wrong results.
        // ═══════════════════════════════════════════════════════════════════════════

        if (params.btcAccumulation) {
          const previousTotalBtc = totalBtcAmount

          if (isInitialLoan) {
            // Initial loan: ENTIRE principal buys BTC
            const btcPurchased = loanDetailsForDebug.principal / btcPrice
            totalBtcAmount += btcPurchased

            // Store accumulation details
            debugEntry.btcAccumulationDetails = {
              excessProceeds: loanDetailsForDebug.principal, // For initial loan, entire principal is "excess"
              btcPurchased,
              previousTotalBtc,
              newTotalBtc: totalBtcAmount
            }

            console.log(`🟢 Month ${month} (Initial): Principal=${loanDetailsForDebug.principal}, BTC Purchased=${btcPurchased.toFixed(4)}, Total BTC=${totalBtcAmount.toFixed(4)}`)
          } else if (isRollover) {
            // Rollover: Only EXCESS proceeds buy BTC
            const excessProceeds = loanDetailsForDebug.principal - totalRepaymentDue
            if (excessProceeds > 0) {
              const btcPurchased = excessProceeds / btcPrice
              totalBtcAmount += btcPurchased

              // Store accumulation details
              debugEntry.btcAccumulationDetails = {
                excessProceeds,
                btcPurchased,
                previousTotalBtc,
                newTotalBtc: totalBtcAmount
              }

              console.log(`🔄 Month ${month} (Rollover): New Loan=${loanDetailsForDebug.principal}, Repayment=${totalRepaymentDue}, Excess=${excessProceeds}, BTC Purchased=${btcPurchased.toFixed(4)}, Total BTC=${totalBtcAmount.toFixed(4)}`)
            } else {
              console.log(`⚠️ Month ${month} (Rollover): No excess proceeds (New Loan=${loanDetailsForDebug.principal}, Repayment=${totalRepaymentDue})`)
            }
          }
        }
      }

      // Remove matured loans
      activeLoans = activeLoans.filter(l => l.maturityMonth !== month)
    }

    setDebugInfo(debugResults)
    setIsRunning(false)
  }

  const copyDebugOutput = () => {
    const output = JSON.stringify(debugInfo, null, 2)
    navigator.clipboard.writeText(output)
    alert("Debug output copied to clipboard!")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="h-6 w-6 text-orange-500" />
          Rolling Loan Strategy Debug
        </h2>
        <p className="text-muted-foreground">
          Trace the complete execution flow to identify calculation issues
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={runDebugSimulation} disabled={isRunning} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              {isRunning ? "Running..." : "Run Debug Simulation"}
            </Button>
            <Button onClick={copyDebugOutput} variant="outline" disabled={debugInfo.length === 0} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Debug Output
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="show-all" checked={showAllMonths} onCheckedChange={(checked) => setShowAllMonths(checked as boolean)} />
            <Label htmlFor="show-all">Show all months (0-24) instead of key months only (0, 6, 12, 18)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Input Parameters - Enhanced with Metadata */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">1. Input Parameters</h2>
          <Badge variant="outline">Enhanced Metadata View</Badge>
        </div>

        {/* Parameters Tab Parameters */}
        <ParameterMetadataCard
          title="FROM PARAMETERS TAB"
          description="Loan configuration and risk management parameters"
          parameters={parametersTabParams}
          badgeColor="default"
        />

        {/* Price Projection Tab Parameters */}
        <ParameterMetadataCard
          title="FROM PRICE PROJECTION TAB"
          description="Bitcoin price forecasting and simulation timeline"
          parameters={priceProjectionTabParams}
          badgeColor="secondary"
        />

        {/* Strategy Tab Parameters */}
        <ParameterMetadataCard
          title="FROM STRATEGY TAB"
          description="Investment strategy and financial flow configuration"
          parameters={strategyTabParams}
          badgeColor="default"
        />
      </div>

      {/* Calculated Values */}
      <Card>
        <CardHeader>
          <CardTitle>Calculated Values</CardTitle>
          <CardDescription>Derived values from input parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Initial BTC Stack Value</div>
              <div className="font-semibold">${calculatedValues.btcStackValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{params.initialBtcAmount} BTC × ${params.initialBtcPrice.toLocaleString()}</div>
              <div className="text-xs text-blue-600">calculatedValues.btcStackValue</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Calculated by Loan %</div>
              <div className="font-semibold text-blue-600">${calculatedValues.calculatedByPercent.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">${calculatedValues.btcStackValue.toLocaleString()} × {calculatedValues.loanPercent}%</div>
              <div className="text-xs text-blue-600">calculatedValues.calculatedByPercent</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Calculated by Target LTV</div>
              <div className="font-semibold">${calculatedValues.calculatedByLtv.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">${calculatedValues.btcStackValue.toLocaleString()} × {calculatedValues.targetLtvPercent}%</div>
              <div className="text-xs text-blue-600">calculatedValues.calculatedByLtv</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Max Loan Amount (param)</div>
              <div className="font-semibold">${calculatedValues.maxLoanParam.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">From parameters tab</div>
              <div className="text-xs text-blue-600">params.maxLoanAmount</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground">Which Value Will Be Used?</div>
              <div className={`font-bold text-lg ${calculatedValues.willUseLoanAmountPercent ? 'text-green-600' : 'text-orange-600'}`}>
                ${calculatedValues.finalLoanAmount.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {calculatedValues.willUseLoanAmountPercent
                  ? `✓ Using loanAmountPercent (${calculatedValues.loanPercent}% of stack)`
                  : `⚠ Using legacy logic: min($${calculatedValues.maxLoanParam.toLocaleString()}, $${calculatedValues.calculatedByLtv.toLocaleString()})`
                }
              </div>
              <div className="text-xs text-blue-600">calculatedValues.finalLoanAmount</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Cost Breakdown - NEW */}
      <Card className="border-2 border-green-200 dark:border-green-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Loan Cost Breakdown (Month 0)
          </CardTitle>
          <CardDescription>
            Complete loan calculation including principal, fees, and interest using centralized calculation service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Principal */}
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="font-semibold">Principal Loan Amount</div>
                <div className="text-xs text-muted-foreground">The actual loan proceeds you receive</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{calculatedValues.formatted.principalFormatted}</div>
                <div className="text-xs text-blue-600">loanDetails.principal</div>
              </div>
            </div>

            {/* Origination Fee */}
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="font-semibold">Origination Fee</div>
                <div className="text-xs text-muted-foreground">
                  {calculatedValues.loanDetails.originationFeePercent}% {calculatedValues.loanDetails.originationFeeType} fee
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Formula: {calculatedValues.formatted.principalFormatted} × {calculatedValues.loanDetails.originationFeePercent}%
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-orange-600">{calculatedValues.formatted.originationFeeFormatted}</div>
                <div className="text-xs text-blue-600">loanDetails.originationFee</div>
              </div>
            </div>

            {/* Interest */}
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="font-semibold">Total Interest</div>
                <div className="text-xs text-muted-foreground">
                  {calculatedValues.loanDetails.annualInterestRate}% annual rate over {calculatedValues.loanDetails.loanTermMonths} months
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Formula: {calculatedValues.formatted.principalFormatted} × {calculatedValues.loanDetails.annualInterestRate}% ÷ 12 × {calculatedValues.loanDetails.loanTermMonths}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-orange-600">{calculatedValues.formatted.totalInterestFormatted}</div>
                <div className="text-xs text-blue-600">loanDetails.totalInterest</div>
              </div>
            </div>

            {/* Total Repayment */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-green-600">
              <div>
                <div className="font-semibold text-lg">Total Repayment Amount</div>
                <div className="text-xs text-muted-foreground">
                  Principal + Origination Fee + Interest
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Formula: {calculatedValues.formatted.principalFormatted} + {calculatedValues.formatted.originationFeeFormatted} + {calculatedValues.formatted.totalInterestFormatted}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-2xl text-green-600">{calculatedValues.formatted.totalRepaymentFormatted}</div>
                <div className="text-xs text-blue-600">loanDetails.totalRepayment</div>
              </div>
            </div>

            {/* Effective Cost */}
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">Effective Cost</div>
                  <div className="text-xs text-muted-foreground">
                    Total fees and interest (excluding principal)
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-amber-600">{calculatedValues.formatted.effectiveCostFormatted}</div>
                  <div className="text-sm text-amber-600">{calculatedValues.formatted.effectiveCostPercentFormatted} of principal</div>
                </div>
              </div>
            </div>

            {/* LTV */}
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">Loan-to-Value Ratio</div>
                <div className="text-xs text-muted-foreground">
                  Principal as percentage of collateral value
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{calculatedValues.formatted.ltvFormatted}</div>
                <div className="text-xs text-blue-600">loanDetails.ltv</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expected vs Actual */}
      {debugInfo.length > 0 && calculatedValues.rolloverResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Expected vs Actual Comparison</CardTitle>
            <CardDescription>
              Showing {calculatedValues.rolloverResults.length} rollover{calculatedValues.rolloverResults.length > 1 ? 's' : ''} (Month 0 and subsequent rollovers)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculatedValues.rolloverResults.map((rollover, index) => {
                const actual = debugInfo.find(d => d.month === rollover.month)
                const expected = rollover.loanPrincipal
                const actualLoan = actual ? actual.loanAmountCalc.result : 0
                const isCorrect = Math.abs(actualLoan - expected) < 100

                // Get label for the month
                const monthLabel = rollover.isInitial
                  ? 'Initial Loan'
                  : `Rollover #${index} (${params.loanTermMonths}-month term)`

                return (
                  <div key={rollover.month} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold">Month {rollover.month}</div>
                      <div className="text-xs text-blue-600 mb-1">{monthLabel}</div>
                      <div className="text-sm text-muted-foreground">
                        BTC Price: ${rollover.btcPrice.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Collateral: ${rollover.collateralValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Total BTC: {rollover.totalBtcAfter.toFixed(4)} BTC
                        {params.btcAccumulation && !rollover.isInitial && (
                          <span className="text-green-600"> (+{rollover.btcPurchased.toFixed(4)} BTC)</span>

                        )}
                      </div>
                      {!rollover.isInitial && rollover.oldLoanRepayment && (
                        <div className="text-xs text-amber-600 mt-1">
                          Old Loan Repayment: ${rollover.oldLoanRepayment.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Expected</div>
                      <div className="font-semibold text-green-600">${expected.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Actual</div>
                      <div className={`font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        ${actualLoan.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      {isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Ergebnistabelle (Summary Table) */}
      {calculatedValues.rolloverResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Results Table</CardTitle>
            <CardDescription>
              Summary of key values per (Start/Rollover) with formulas in tooltips; expandable monthly rows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4" title="Month n of simulation (0-based). Label derived from priceProjection[n].">Month</th>
                    <th className="py-2 pr-4" title="BTC holdings before taking the new loan at month n.">BTC before loan</th>
                    <th className="py-2 pr-4" title="BTC price at month n: btcPrice_n = priceProjection[n] (or [n×30] if daily).">BTC Price</th>
                    <th className="py-2 pr-4" title="Collateral (before loan) at month n: BTC_before × BTC Price.">Collateral (before loan)</th>
                    <th className="py-2 pr-4" title="Loan principal at month n. Typically: Collateral_before × loanAmountPercent.">Loan Principal</th>
                    <th className="py-2 pr-4" title="Excess proceeds at month n: Loan_Principal_n − Previous_Total_Debt_(n-1).">Excess Proceeds</th>
                    <th className="py-2 pr-4" title="LTV at month n: Loan_Principal_n / Collateral_before_n × 100.">LTV</th>
                    <th className="py-2 pr-4" title="ΔBTC at month n: only excess is invested → ΔBTC_n = Excess_n / Price_n (initial: principal/price).">Δ BTC</th>
                    <th className="py-2 pr-4" title="BTC after loan at month n: BTC_after = BTC_before + ΔBTC.">BTC after loan</th>
                    <th className="py-2 pr-4" title="Collateral (after loan) at month n: BTC_after × BTC Price.">Collateral (after loan)</th>
                    <th className="py-2 pr-4" title="Savings/withdrawal sum since last rollover.">Savings / Withdrawal</th>
                    <th className="py-2 pr-4" title="Total debt for next rollover: Principal + Interest + Fees.">Total Debt</th>
                    <th className="py-2 pr-4" title="Locked BTC at month n: (Total_Debt_n / (targetLtv / 100)) / BTC Price. Accounts for platform's maximum LTV constraint.">Locked BTC</th>
                    <th className="py-2 pr-4" title="Net BTC if repaid now: BTC_after − (Total_Debt / Price).">Net BTC (after payoff)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedValues.rolloverResults.map((row, idx) => {
                    // Detect interval (daily vs monthly) and compute correct price index
                    const pts = priceProjection?.projectionPoints || []
                    const isMonthly = (() => {
                      if (pts.length < 2) return false
                      const dt = Math.abs((pts[1]?.timestamp || 0) - (pts[0]?.timestamp || 0))
                      return dt > 2 * 24 * 60 * 60 * 1000
                    })()
                    const rawIndex = isMonthly ? row.month : row.month * 30
                    const idxClamped = Math.max(0, Math.min(rawIndex, Math.max(pts.length - 1, 0)))

                    const pricePoint = row.month === 0
                      ? { price: params.initialBtcPrice, timestamp: pts[0]?.timestamp ?? Date.now() }
                      : pts[idxClamped]

                    const ts = pricePoint?.timestamp
                    const label = ts
                      ? new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : `Month ${row.month}`
                    const monthLabel = row.month === 0 ? `${label} (Start)` : label

                    // Calculations with correct price
                    const btcPrice = pricePoint?.price ?? 0
                    const totalBtcBefore = row.month === 0 ? params.initialBtcAmount : (row.totalBtcBefore ?? row.totalBtcAfter)
                    const totalBtcAfter = row.totalBtcAfter

                    const collateralBefore = totalBtcBefore * btcPrice
                    const collateralAfter = totalBtcAfter * btcPrice
                    const ltvBaseCollateral = collateralBefore
                    const ltv = ltvBaseCollateral > 0 ? (row.loanPrincipal / ltvBaseCollateral) * 100 : 0

                    // Debts and BTC locks (respect target LTV constraint)
                    const debt = row.loanRepayment
                    const targetLtv = params.riskManagement?.targetLtv ?? 50
                    const lockedBtc = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(debt, btcPrice, targetLtv)
                    const netBtc = centralizedLoanCalculationService.netBtcAfterPayoff(totalBtcAfter, debt, btcPrice)

                    // Sum of monthly USD flows since previous rollover up to and INCLUDING this rollover month
                    const prevRolloverMonth = idx === 0 ? 0 : calculatedValues.rolloverResults[idx - 1].month
                    const sumSincePrev = (calculatedValues.monthlyResults || [])
                      .filter(m => idx === 0 ? m.month === 0 : (m.month >= (prevRolloverMonth + 1) && m.month <= row.month))
                      .reduce((acc, m) => acc + m.usdFlow, 0)

                    const formatUsd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
                    const formatBtc = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 })

                    // Tooltips with formulas and values
                    const ttBtcBefore = `BTC_before_loan_n = ${formatBtc(totalBtcBefore)}`
                    const ttPrice = isMonthly
                      ? `btcPrice_n = priceProjection[${row.month}] → ${formatUsd(btcPrice)}`
                      : `btcPrice_n = priceProjection[${row.month} × 30] → priceProjection[${row.month * 30}] → ${formatUsd(btcPrice)}`
                    const ttCollBefore = `Collateral_before_n = ${formatBtc(totalBtcBefore)} × ${formatUsd(btcPrice)} = ${formatUsd(collateralBefore)}`
                    const ttPrincipal = `Loan_Principal_n = ${formatUsd(row.loanPrincipal)}`
                    const ttExcess = `Excess_n = Loan_Principal_n − Previous_Debt = ${formatUsd(row.loanPrincipal)} − ${formatUsd(row.oldLoanRepayment || 0)} = ${formatUsd(row.excessProceeds)}`
                    const purchased = btcPrice > 0 ? (row.isInitial ? (row.loanPrincipal / btcPrice) : (row.excessProceeds > 0 ? row.excessProceeds / btcPrice : 0)) : 0
                    const ttLtv = `LTV_n = Loan_Principal_n / Collateral_before_n × 100 = ${formatUsd(row.loanPrincipal)} / ${formatUsd(collateralBefore)} × 100 = ${ltv.toFixed(2)}%`
                    const ttDelta = row.isInitial
                      ? `ΔBTC_0 = principal_0 / price_0 = ${formatUsd(row.loanPrincipal)} / ${formatUsd(btcPrice)} = ${formatBtc(purchased)}`
                      : `ΔBTC_n = Excess_n / price_n = ${formatUsd(row.excessProceeds)} / ${formatUsd(btcPrice)} = ${formatBtc(purchased)}`
                    const ttBtcAfter = `BTC_after_loan_n = ${formatBtc(totalBtcBefore)} + ${formatBtc(purchased)} = ${formatBtc(totalBtcAfter)}`
                    const ttCollAfter = `Collateral_after_n = ${formatBtc(totalBtcAfter)} × ${formatUsd(btcPrice)} = ${formatUsd(collateralAfter)}`
                    const ttSavings = `Σ monthly flow since last rollover (incl. this month) = ${formatUsd(sumSincePrev)}`
                    const ttDebt = `Total_Debt_n = Principal + Interest + Fees = ${formatUsd(debt)}`
                    const ttLocked = `Locked_BTC_n = (Total_Debt_n / (targetLtv / 100)) / price_n = (${formatUsd(debt)} / (${targetLtv}% / 100)) / ${formatUsd(btcPrice)} = ${formatBtc(lockedBtc)}`
                    const ttNet = `Net_BTC_n = BTC_after_loan_n − (Total_Debt_n / price_n) = ${formatBtc(totalBtcAfter)} − (${formatUsd(debt)} / ${formatUsd(btcPrice)}) = ${formatBtc(netBtc)}`

                    // Determine monthly rows belonging to this rollover period (after this rollover, before next)
                    const nextRolloverMonth = calculatedValues.rolloverResults[idx + 1]?.month
                    const periodStart = row.month === 0 ? 0 : row.month + 1
                    const periodEnd = nextRolloverMonth ? nextRolloverMonth - 1 : (params.simulationMonths || 0)
                    const monthlyRows = (calculatedValues.monthlyResults || []).filter(m => m.month >= periodStart && m.month <= periodEnd)

                    const hasMonthly = monthlyRows.length > 0
                    const isExpanded = !!expanded[row.month]

                    return (
                      <>
                        <tr className="border-t">
                          <td className="py-2 pr-4">
                            {hasMonthly && (
                              <button onClick={() => toggleExpanded(row.month)} className="mr-2 text-xs text-blue-600">
                                {isExpanded ? '\u25bc' : '\u25b6'}
                              </button>
                            )}
                            {monthLabel}
                          </td>
                          <td className="py-2 pr-4" title={ttBtcBefore}>{formatBtc(totalBtcBefore)}</td>
                          <td className="py-2 pr-4" title={ttPrice}>{formatUsd(btcPrice)}</td>
                          <td className="py-2 pr-4" title={ttCollBefore}>{formatUsd(collateralBefore)}</td>
                          <td className="py-2 pr-4" title={ttPrincipal}>{formatUsd(row.loanPrincipal)}</td>
                          <td className="py-2 pr-4" title={ttExcess}>{formatUsd(row.excessProceeds)}</td>
                          <td className="py-2 pr-4" title={ttLtv}>{ltv.toFixed(2)}%</td>
                          <td className="py-2 pr-4" title={ttDelta}>{purchased > 0 ? `+${formatBtc(purchased)}` : formatBtc(0)}</td>
                          <td className="py-2 pr-4" title={ttBtcAfter}>{formatBtc(totalBtcAfter)}</td>
                          <td className="py-2 pr-4" title={ttCollAfter}>{formatUsd(collateralAfter)}</td>
                          <td className="py-2 pr-4" title={ttSavings}>{formatUsd(sumSincePrev)}</td>
                          <td className="py-2 pr-4" title={ttDebt}>{formatUsd(debt)}</td>
                          <td className="py-2 pr-4" title={ttLocked}>{formatBtc(lockedBtc)}</td>
                          <td className="py-2 pr-4" title={ttNet}>{formatBtc(netBtc)}</td>
                        </tr>

                        {isExpanded && monthlyRows.map((m) => {
                          const mIdx = isMonthly ? m.month : Math.max(0, Math.min(m.month * 30, Math.max(pts.length - 1, 0)))
                          const mLabelTs = pts[mIdx]?.timestamp
                          const mLabel = mLabelTs
                            ? new Date(mLabelTs).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : `Month ${m.month}`
                          const mCollateralBefore = m.totalBtcBefore * m.btcPrice
                          const mCollateralAfter = m.totalBtcAfter * m.btcPrice
                          const flowTitle = m.usdFlow >= 0 ? 'Savings (buy BTC)' : 'Withdrawal (sell BTC)'
                          const ttMonthlyPrice = isMonthly
                            ? `btcPrice_n = priceProjection[${m.month}] → ${formatUsd(m.btcPrice)}`
                            : `btcPrice_n = priceProjection[${m.month} × 30] → ${formatUsd(m.btcPrice)}`
                          const ttMonthlyFlow = `${flowTitle}: ${formatUsd(m.usdFlow)}`
                          const ttMonthlyDelta = `BTC Δ = ${formatUsd(m.usdFlow)} / ${formatUsd(m.btcPrice)} = ${formatBtc(m.btcDelta)}`

                          return (
                            <tr key={`monthly-${m.month}`} className="border-t text-muted-foreground">
                              <td className="py-2 pr-4 pl-6">{mLabel} (Monthly)</td>
                              <td className="py-2 pr-4" title={`BTC before monthly flow`}>{formatBtc(m.totalBtcBefore)}</td>
                              <td className="py-2 pr-4" title={ttMonthlyPrice}>{formatUsd(m.btcPrice)}</td>
                              <td className="py-2 pr-4" title={`Collateral before = BTC × Price`}>{formatUsd(mCollateralBefore)}</td>
                              <td className="py-2 pr-4" title="No loan this month">-</td>
                              <td className="py-2 pr-4" title="No excess proceeds this month">-</td>
                              <td className="py-2 pr-4" title="No loan this month">-</td>
                              <td className="py-2 pr-4" title={ttMonthlyDelta}>{m.btcDelta >= 0 ? `+${formatBtc(m.btcDelta)}` : formatBtc(m.btcDelta)}</td>
                              <td className="py-2 pr-4" title={`BTC after monthly flow`}>{formatBtc(m.totalBtcAfter)}</td>
                              <td className="py-2 pr-4" title={`Collateral after = BTC × Price`}>{formatUsd(mCollateralAfter)}</td>
                              <td className="py-2 pr-4" title={ttMonthlyFlow}>{formatUsd(m.usdFlow)}</td>
                              <td className="py-2 pr-4" title="No debt this month">-</td>
                              <td className="py-2 pr-4" title="No locked collateral this month">-</td>
                              <td className="py-2 pr-4" title="Net BTC unchanged by debt this month">{formatBtc(m.totalBtcAfter)}</td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month-by-Month Trace */}
      {debugInfo.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">3. Month-by-Month Execution Trace</h3>
          {debugInfo.map((info) => (
            <Card key={info.month} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Month {info.month}</span>
                  <Badge variant={info.calculationPath === 'initial' ? 'default' : info.calculationPath === 'rollover' ? 'secondary' : 'outline'}>
                    {info.calculationPath === 'initial' ? 'Initial Loan' : info.calculationPath === 'rollover' ? 'Rollover' : 'No Action'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Market State */}
                <div>
                  <h4 className="font-semibold mb-2">Market State</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">BTC Price</div>
                      <div className="font-medium">${info.btcPrice.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">BTC Amount</div>
                      <div className="font-medium">{info.totalBtcAmount.toFixed(4)} BTC</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Collateral Value</div>
                      <div className="font-medium">${info.collateralValue.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Active Loans</div>
                      <div className="font-medium">{info.activeLoansCount}</div>
                    </div>
                  </div>
                </div>

                {/* Loan Amount Calculation */}
                {info.calculationPath !== 'none' && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      Loan Amount Calculation
                      {info.loanAmountCalc.usedLoanAmountPercent ? (
                        <Badge variant="default" className="bg-green-600">Using loanAmountPercent</Badge>
                      ) : (
                        <Badge variant="destructive">Using Legacy Logic</Badge>
                      )}
                    </h4>
                    <div className="space-y-2 text-sm">
                      {info.loanAmountCalc.usedLoanAmountPercent ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Loan Amount Percent:</span>
                            <span className="font-mono font-semibold text-blue-600">{info.loanAmountCalc.loanAmountPercent}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Calculation:</span>
                            <span className="font-mono">{info.loanAmountCalc.calculation}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Loan Amount (param):</span>
                            <span className="font-mono">${info.loanAmountCalc.maxLoanAmountParam?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Target LTV:</span>
                            <span className="font-mono">{info.loanAmountCalc.targetLtv}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Calculation:</span>
                            <span className="font-mono text-xs">{info.loanAmountCalc.calculation}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Result (maxLoanAmount):</span>
                        <span className="font-mono font-bold text-lg">${info.loanAmountCalc.result.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">As % of Collateral:</span>
                        <span className="font-mono">{((info.loanAmountCalc.result / info.collateralValue) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strategy Decision */}
                <div>
                  <h4 className="font-semibold mb-2">Strategy Decision</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allow Investment:</span>
                      <span className={info.decision.allowInvestment ? 'text-green-600' : 'text-red-600'}>
                        {info.decision.allowInvestment ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Investment Multiplier:</span>
                      <span className="font-mono">{info.decision.investmentMultiplier.toFixed(4)} ({(info.decision.investmentMultiplier * 100).toFixed(2)}%)</span>
                    </div>
                    {info.loanDetails && (
                      <>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Principal (received):</span>
                          <span className="font-mono font-semibold">${info.loanDetails.principal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">+ Origination Fee:</span>
                          <span className="font-mono text-orange-600">${info.loanDetails.originationFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">+ Total Interest:</span>
                          <span className="font-mono text-orange-600">${info.loanDetails.totalInterest.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Total Repayment (owed):</span>
                          <span className="font-mono font-bold text-lg text-green-600">${info.loanDetails.totalRepayment.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t">
                      <div className="text-muted-foreground mb-1">Reasoning:</div>
                      <div className="italic text-sm bg-muted p-2 rounded">{info.decision.reasoning || 'No reasoning provided'}</div>
                    </div>
                  </div>
                </div>

                {/* BTC Accumulation Details */}
                {info.btcAccumulationDetails && (
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                      <TrendingUp className="h-4 w-4" />
                      BTC Accumulation
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">
                          {info.calculationPath === 'initial' ? 'Loan Principal:' : 'Excess Proceeds:'}
                        </div>
                        <div className="font-medium text-green-600">
                          ${info.btcAccumulationDetails.excessProceeds.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">BTC Purchased:</div>
                        <div className="font-medium text-green-600">
                          {info.btcAccumulationDetails.btcPurchased.toFixed(4)} BTC
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Previous Total BTC:</div>
                        <div className="font-medium">
                          {info.btcAccumulationDetails.previousTotalBtc.toFixed(4)} BTC
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">New Total BTC:</div>
                        <div className="font-bold text-green-600">
                          {info.btcAccumulationDetails.newTotalBtc.toFixed(4)} BTC
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <div className="text-xs text-muted-foreground">
                        {info.calculationPath === 'initial'
                          ? '💡 Initial loan: Entire principal is used to purchase BTC'
                          : '💡 Rollover: Only excess proceeds (new loan - repayment) are used to purchase BTC'
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Rollover Details */}
                {info.maturingLoansCount > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Rollover Event
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Maturing Loans:</div>
                        <div className="font-medium">{info.maturingLoansCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Repayment Due:</div>
                        <div className="font-medium">${info.totalRepaymentDue.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


