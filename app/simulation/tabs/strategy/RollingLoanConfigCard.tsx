"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Info, Clock, Shield, AlertTriangle, DollarSign } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"

/**
 * Rolling Loan Configuration Card Component
 * 
 * Provides configuration options specific to the Rolling Loan Strategy
 * including BTC accumulation mode and real-time calculation previews.
 */
export function RollingLoanConfigCard() {
  const { params, setParams } = useSimulation()

  // Only render if rolling loan strategy is selected
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }



  // Calculate real-time preview values
  const previewCalculations = useMemo(() => {
    const btcStackValue = params.initialBtcAmount * params.initialBtcPrice
    const initialLoanAmount = btcStackValue * (params.loanAmountPercent / 100)
    const targetLtv = params.riskManagement.targetLtv
    const loanTerm = params.riskManagement.loanTermMonths
    const interestRate = params.riskManagement.annualInterestRate

    return {
      btcStackValue,
      initialLoanAmount,
      targetLtv,
      loanTerm,
      interestRate,
      monthlyInterest: (initialLoanAmount * interestRate / 100) / 12
    }
  }, [params])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Rolling Loan Configuration
        </CardTitle>
        <CardDescription>
          Configure your automated loan rollover strategy settings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">


        {/* Strategy Mechanics Preview */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Strategy Preview
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Initial Loan Calculation */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Initial Loan Amount</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                ${previewCalculations.initialLoanAmount.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {params.loanAmountPercent}% of ${previewCalculations.btcStackValue.toLocaleString()} BTC stack
              </div>
            </div>

            {/* Target LTV */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Target LTV</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {previewCalculations.targetLtv}%
              </div>
              <div className="text-xs text-muted-foreground">
                Loan-to-value ratio maintained
              </div>
            </div>

            {/* Loan Term */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Loan Term</span>
              </div>
              <div className="text-lg font-bold text-purple-600">
                {previewCalculations.loanTerm} months
              </div>
              <div className="text-xs text-muted-foreground">
                Consistent rollover period
              </div>
            </div>

            {/* Monthly Interest */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Monthly Interest</span>
              </div>
              <div className="text-lg font-bold text-orange-600">
                ${previewCalculations.monthlyInterest.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {previewCalculations.interestRate}% annual rate
              </div>
            </div>
          </div>
        </div>

        {/* How Rolling Loans Work */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            How Rolling Loans Work
          </h4>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <p><strong>Initial Loan:</strong> Take a loan for {params.loanAmountPercent}% of your BTC stack value</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <p><strong>Automatic Rollover:</strong> At maturity, take a new loan to pay off the previous one</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <p><strong>Dynamic Sizing:</strong> Loan amounts adjust based on Bitcoin price changes</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <p><strong>Risk Management:</strong> Liquidation protection and collateral monitoring</p>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">Risk Notice</p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                Rolling loans involve continuous leverage and interest costs. Monitor your liquidation risk and ensure sufficient collateral buffer.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
