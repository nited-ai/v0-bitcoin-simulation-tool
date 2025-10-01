"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSimulation } from "../../context/SimulationContext"
import { Bug, Play, Copy, CheckCircle, XCircle, AlertTriangle, DollarSign } from "lucide-react"
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
}

export function RollingLoanDebugPage() {
  const { params, priceProjection } = useSimulation()
  const [debugInfo, setDebugInfo] = useState<MonthDebugInfo[]>([])
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

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

    return {
      btcStackValue,
      loanPercent,
      targetLtvPercent,
      calculatedByPercent,
      calculatedByLtv,
      maxLoanParam,
      willUseLoanAmountPercent,
      finalLoanAmount,
      month0Expected: calculatedByPercent,
      month12Expected: priceProjection?.projectionPoints?.[360]?.price
        ? params.initialBtcAmount * priceProjection.projectionPoints[360].price * (loanPercent / 100)
        : 0,
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

      // Store debug info
      debugResults.push({
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
      })

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

        if (params.btcAccumulation) {
          totalBtcAmount += loanDetailsForDebug.principal / btcPrice
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
      {debugInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Expected vs Actual Comparison</CardTitle>
            <CardDescription>Based on {params.loanAmountPercent || 10}% configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[0, 12].map(month => {
                const actual = debugInfo.find(d => d.month === month)
                const expected = month === 0 ? calculatedValues.month0Expected : calculatedValues.month12Expected
                const actualLoan = actual ? actual.loanAmountCalc.result : 0
                const isCorrect = Math.abs(actualLoan - expected) < 100
                
                return (
                  <div key={month} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">Month {month}</div>
                      <div className="text-sm text-muted-foreground">
                        Collateral: ${actual?.collateralValue.toLocaleString() || 'N/A'}
                      </div>
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


