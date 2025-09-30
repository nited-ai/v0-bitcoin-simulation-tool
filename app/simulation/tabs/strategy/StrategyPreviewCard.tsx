"use client"

import { useMemo, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { BarChart3, Info, TrendingUp, DollarSign, Shield, AlertTriangle, Clock, Zap } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { LoanRolloverCalculationService } from "@/src/modules/strategies/services/LoanRolloverCalculationService"
import { PlatformFeeIntegrationService } from "@/src/modules/strategies/services/PlatformFeeIntegrationService"

/**
 * Strategy Preview Card Component
 * 
 * Provides real-time calculations and previews of strategy mechanics
 * with detailed breakdowns and risk analysis.
 */
function StrategyPreviewCard() {
  const { params, priceChartData } = useSimulation()

  // Initialize services
  const loanCalculationService = useMemo(() => new LoanRolloverCalculationService(), [])
  const platformFeeService = useMemo(() => new PlatformFeeIntegrationService(), [])

  // Calculate real-time preview values
  const previewData = useMemo(() => {
    const btcStackValue = params.initialBtcAmount * params.initialBtcPrice
    const initialLoanAmount = btcStackValue * (params.loanAmountPercent / 100)

    // Get platform fee configuration
    const platformFeeConfig = platformFeeService.getPlatformFeeConfig(params.platform || 'firefish')

    // Calculate annual interest cost
    const annualInterest = initialLoanAmount * (params.annualInterestRate / 100)

    // Calculate platform fees for the loan amount and term
    const platformFeeResult = platformFeeService.calculatePlatformFees(
      initialLoanAmount,
      params.platform || 'firefish',
      params.loanTermMonths
    )

    // Calculate total annual cost (interest + platform fees)
    const annualCost = annualInterest + platformFeeResult.amount

    // Calculate projected BTC price at loan maturity
    const loanMaturityMonth = params.loanTermMonths
    let projectedBtcPrice = params.initialBtcPrice // Fallback to current price

    if (priceChartData && priceChartData.length > loanMaturityMonth) {
      projectedBtcPrice = priceChartData[loanMaturityMonth - 1]?.simulationPath || params.initialBtcPrice
    }

    // Calculate projected BTC stack value at loan maturity
    const projectedBtcStackValue = params.initialBtcAmount * projectedBtcPrice

    // Calculate target loan amount based on loan percentage (NOT LTV percentage)
    const targetLoanAmount = projectedBtcStackValue * (params.loanAmountPercent / 100)

    // Calculate individual components for enhanced rollover analysis
    const principalRepayment = initialLoanAmount
    const interestCost = (initialLoanAmount * params.annualInterestRate / 100) * (params.loanTermMonths / 12)
    const platformFees = platformFeeResult.amount
    const totalRepaymentDue = principalRepayment + interestCost + platformFees

    // Calculate origination fee on new loan
    const originationFeePercent = platformFeeConfig.percent
    const originationFee = (totalRepaymentDue / (1 - originationFeePercent / 100)) - totalRepaymentDue
    const minimumLoanNeeded = totalRepaymentDue + originationFee

    // Calculate loan rollover details for rollover analysis
    const rolloverParams = {
      previousLoanPrincipal: initialLoanAmount,
      // FIXED: Calculate interest for full loan term, not just 1 month
      accruedInterest: interestCost,
      platformFeeConfig,
      // FIXED: Use actual platform origination fee, not liquidation fee
      loanOriginationFeePercent: platformFeeConfig.percent,
      loanTermMonths: params.loanTermMonths,
      btcStackValue: projectedBtcStackValue, // Use projected value
      targetLtvPercent: params.riskManagement.targetLtv,
      liquidationLtvPercent: params.riskManagement.liquidationLtv
    }

    const rolloverResult = loanCalculationService.calculateLoanRollover(rolloverParams)

    // Enhanced rollover analysis calculations
    const isExceedingConfiguredPercentage = targetLoanAmount < minimumLoanNeeded
    const actualLoanAmount = isExceedingConfiguredPercentage ? minimumLoanNeeded : targetLoanAmount
    const actualLoanPercentage = (actualLoanAmount / projectedBtcStackValue) * 100
    const excessProceeds = Math.max(0, actualLoanAmount - minimumLoanNeeded)

    // Calculate liquidation risk
    const liquidationBuffer = params.riskManagement.liquidationLtv - params.riskManagement.targetLtv
    const riskLevel = liquidationBuffer < 20 ? 'high' : liquidationBuffer < 40 ? 'medium' : 'low'

    return {
      btcStackValue,
      initialLoanAmount,
      rolloverResult,
      liquidationBuffer,
      riskLevel,
      platformFeeConfig,
      monthlyInterest: (initialLoanAmount * params.annualInterestRate / 100) / 12,
      annualInterest,
      platformFees: platformFeeResult.amount,
      annualCost,
      // Enhanced rollover analysis data
      projectedBtcPrice,
      projectedBtcStackValue,
      targetLoanAmount,
      principalRepayment,
      interestCost,
      originationFee,
      minimumLoanNeeded,
      actualLoanAmount,
      actualLoanPercentage,
      excessProceeds,
      isExceedingConfiguredPercentage
    }
  }, [params, priceChartData, loanCalculationService, platformFeeService])

  // Get risk color based on level
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-muted-foreground'
    }
  }

  // Get risk background color
  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
      case 'low': return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
      default: return 'bg-muted/50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Strategy Mechanics Preview
        </CardTitle>
        <CardDescription>
          Real-time calculations and risk analysis for your selected strategy
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Initial Loan */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium">Initial Loan</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              ${Math.round(previewData.initialLoanAmount).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {params.loanAmountPercent}% of stack
            </div>
          </div>

          {/* Monthly Interest */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium">Monthly Interest</span>
            </div>
            <div className="text-lg font-bold text-orange-600">
              ${Math.round(previewData.monthlyInterest).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {params.annualInterestRate}% annual
            </div>
          </div>

          {/* Annual Cost */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium">Annual Cost</span>
            </div>
            <div className="text-lg font-bold text-red-600">
              ${Math.round(previewData.annualCost).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Interest + fees
            </div>
          </div>

          {/* Liquidation Buffer */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium">Safety Buffer</span>
            </div>
            <div className={`text-lg font-bold ${getRiskColor(previewData.riskLevel)}`}>
              {previewData.liquidationBuffer}%
            </div>
            <div className="text-xs text-muted-foreground">
              To liquidation
            </div>
          </div>
        </div>

        {/* Next Loan Rollover Preview */}
        {params.investmentStrategy === 'rollingLoan' && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Next Loan Rollover Preview
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Minimum Loan Calculation */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Minimum loan required to pay back old loan</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Principal Repayment:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Original loan amount that must be repaid</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.principalRepayment).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Interest Cost:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Interest accumulated over {params.loanTermMonths} months at {params.annualInterestRate}% annual rate</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.interestCost).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Platform Fees:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>{previewData.platformFeeConfig.type === 'annual' ? `${previewData.platformFeeConfig.percent}% annually, prorated for loan term` : `${previewData.platformFeeConfig.percent}% ${previewData.platformFeeConfig.type} fee`}</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.platformFees).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Origination Fee:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>{previewData.platformFeeConfig.percent}% fee charged on new loan amount</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.originationFee).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Total Minimum:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Minimum new loan needed = (Principal + Interest + Platform Fees) ÷ (1 - Origination Fee %)</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span>${Math.round(previewData.minimumLoanNeeded).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Target Loan Amount & Excess Proceeds */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Target Loan Amount</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Bitcoin Price at Maturity (Month {params.loanTermMonths}):
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Projected Bitcoin price at the end of the current loan term based on selected price projection model</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.projectedBtcPrice).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Total Bitcoin Collateral:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Your total Bitcoin holdings that serve as collateral for the loan, valued at projected maturity price</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">
                      {params.initialBtcAmount >= 1
                        ? params.initialBtcAmount.toFixed(2)
                        : params.initialBtcAmount >= 0.01
                        ? params.initialBtcAmount.toFixed(4)
                        : params.initialBtcAmount.toFixed(8)
                      } BTC (${Math.round(previewData.projectedBtcStackValue).toLocaleString()})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Target Loan Amount:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>{params.loanAmountPercent}% of projected BTC stack value on loan maturity date</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.actualLoanAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Minimum Required:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Minimum amount needed from new loan to pay off old loan</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className="font-medium">${Math.round(previewData.minimumLoanNeeded).toLocaleString()}</span>
                  </div>

                  {previewData.isExceedingConfiguredPercentage && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-yellow-900 dark:text-yellow-100">⚠️ Exceeding configured loan percentage</p>
                          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                            Using {previewData.actualLoanPercentage.toFixed(1)}% instead of {params.loanAmountPercent}% due to BTC price decline
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-2 flex justify-between font-bold items-center">
                    <HybridTooltip>
                      <HybridTooltipTrigger asChild>
                        <span className="cursor-help flex items-center gap-1">
                          Excess Available:
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </span>
                      </HybridTooltipTrigger>
                      <HybridTooltipContent>
                        <p>Additional funds available for BTC accumulation or cash withdrawal</p>
                      </HybridTooltipContent>
                    </HybridTooltip>
                    <span className={previewData.excessProceeds > 0 ? "text-green-600" : "text-muted-foreground"}>
                      ${Math.round(previewData.excessProceeds).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {previewData.excessProceeds > 0
                      ? (params.btcAccumulation ? 'Reinvested in BTC' : 'Taken as cash')
                      : 'No excess funds available'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        <div className={`p-4 rounded-lg border ${getRiskBgColor(previewData.riskLevel)}`}>
          <div className="flex items-start gap-3">
            <Shield className={`w-5 h-5 mt-0.5 ${getRiskColor(previewData.riskLevel)}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className={`font-medium ${getRiskColor(previewData.riskLevel)}`}>
                  Risk Level: {previewData.riskLevel.toUpperCase()}
                </h4>
                <Badge variant={previewData.riskLevel === 'low' ? 'secondary' : 'destructive'}>
                  {previewData.liquidationBuffer}% buffer
                </Badge>
              </div>
              
              {/* Risk Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Target LTV: {params.riskManagement.targetLtv}%</span>
                  <span>Liquidation LTV: {params.riskManagement.liquidationLtv}%</span>
                </div>
                <Progress 
                  value={(params.riskManagement.targetLtv / params.riskManagement.liquidationLtv) * 100} 
                  className="h-2"
                />
              </div>
              
              <p className="text-sm mt-2">
                {previewData.riskLevel === 'high' && 
                  'High risk: Consider increasing your liquidation buffer or reducing loan amount.'
                }
                {previewData.riskLevel === 'medium' && 
                  'Moderate risk: Monitor Bitcoin price movements and maintain adequate collateral.'
                }
                {previewData.riskLevel === 'low' && 
                  'Low risk: Good safety margin, but continue monitoring market conditions.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Platform Fee Summary */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Platform Fee Structure</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Platform Fee:</strong> {previewData.platformFeeConfig.type === 'none' ? 'No fees' : `${previewData.platformFeeConfig.percent}% ${previewData.platformFeeConfig.type}`}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(StrategyPreviewCard)
