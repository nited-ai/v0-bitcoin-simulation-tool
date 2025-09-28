"use client"

import { useMemo } from "react"
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
export function StrategyPreviewCard() {
  const { params } = useSimulation()

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

    // Calculate loan rollover details for rollover analysis
    const rolloverParams = {
      previousLoanPrincipal: initialLoanAmount,
      accruedInterest: (initialLoanAmount * params.annualInterestRate / 100) / 12,
      platformFeeConfig,
      loanOriginationFeePercent: params.liquidationFeePercent || 1.5,
      loanTermMonths: params.loanTermMonths,
      btcStackValue,
      targetLtvPercent: params.riskManagement.targetLtv,
      liquidationLtvPercent: params.riskManagement.liquidationLtv
    }

    const rolloverResult = loanCalculationService.calculateLoanRollover(rolloverParams)

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
      annualCost
    }
  }, [params, loanCalculationService, platformFeeService])

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

        {/* Loan Rollover Breakdown */}
        {params.investmentStrategy === 'rollingLoan' && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Loan Rollover Analysis
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Minimum Loan Calculation */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Minimum Loan Required</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Principal Repayment:</span>
                    <span className="font-medium">${Math.round(previewData.rolloverResult.totalRepaymentDue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest Cost:</span>
                    <span className="font-medium">${Math.round(previewData.rolloverResult.totalRepaymentDue * 0.8).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fees:</span>
                    <span className="font-medium">${Math.round(previewData.rolloverResult.platformFees).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Minimum:</span>
                    <span>${Math.round(previewData.rolloverResult.minimumLoanNeeded).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Excess Proceeds */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Excess Proceeds</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Target Loan Amount:</span>
                    <span className="font-medium">${Math.round(previewData.rolloverResult.actualLoanAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Required:</span>
                    <span className="font-medium">${Math.round(previewData.rolloverResult.minimumLoanNeeded).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Excess Available:</span>
                    <span className="text-green-600">${Math.round(previewData.rolloverResult.excessProceeds).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {params.btcAccumulation ? 'Reinvested in BTC' : 'Taken as cash'}
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
