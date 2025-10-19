"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { HybridTooltip, HybridTooltipTrigger, HybridTooltipContent } from "@/components/ui/hybrid-tooltip"
import { Info, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { NumberInput } from "../../../../shared/ui/forms/NumberInput"
import { useSimulation } from "../../context/SimulationContext"

/**
 * Financial Flow Card Component
 * 
 * Handles monthly savings/withdrawal strategy parameters.
 * This component manages the financial flow aspect of the investment strategy,
 * determining whether the user is adding funds (savings) or withdrawing funds.
 * 
 * Moved from BasicParametersCard to Strategy tab as this is a strategy decision,
 * not a basic parameter.
 */
export function FinancialFlowCard() {
  const { params, setParams } = useSimulation()

  // Determine if user is saving or withdrawing
  const isSaving = params.monthlyWithdrawalAmount > 0
  const isWithdrawing = params.monthlyWithdrawalAmount < 0
  const isNeutral = params.monthlyWithdrawalAmount === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Monthly Financial Flow
        </CardTitle>
        <CardDescription>
          Configure your monthly savings or withdrawal strategy
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Monthly Savings/Withdrawal Amount */}
        <div className="space-y-2">
          <Label htmlFor="monthlyWithdrawalAmount" className="flex items-center gap-2">
            Monthly Savings/Withdrawal Amount
            <HybridTooltip>
              <HybridTooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </HybridTooltipTrigger>
              <HybridTooltipContent>
                <div className="space-y-2">
                  <p><strong>Positive values:</strong> Monthly savings added to your BTC stack</p>
                  <p><strong>Negative values:</strong> Monthly withdrawals from your BTC stack</p>
                  <p><strong>Zero:</strong> No monthly financial flow</p>
                </div>
              </HybridTooltipContent>
            </HybridTooltip>
          </Label>
          <NumberInput
            id="monthlyWithdrawalAmount"
            name="monthlyWithdrawalAmount"
            value={params.monthlyWithdrawalAmount}
            onChange={(value) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: value }))}
            min={-50000}
            max={50000}
            step={100}
            decimals={0}
            suffix="$"
            placeholder="150"
          />
        </div>

        {/* Annual Savings/Withdrawal Increase */}
        {params.monthlyWithdrawalAmount !== 0 && (
          <div className="space-y-2">
            <Label htmlFor="annualSavingsIncrease" className="flex items-center gap-2">
              Annual Increase Rate
              <HybridTooltip>
                <HybridTooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                </HybridTooltipTrigger>
                <HybridTooltipContent>
                  <div className="space-y-2">
                    <p><strong>Compound annual increase</strong> applied to your monthly amount</p>
                    <p><strong>Example:</strong> {params.annualSavingsIncrease || 0}% means your monthly amount {(params.annualSavingsIncrease || 0) >= 0 ? 'increases' : 'decreases'} by {Math.abs(params.annualSavingsIncrease || 0)}% each year</p>
                    <p><strong>Year 1:</strong> ${Math.abs(params.monthlyWithdrawalAmount).toLocaleString()}/month</p>
                    <p><strong>Year 2:</strong> ${Math.round(Math.abs(params.monthlyWithdrawalAmount) * (1 + (params.annualSavingsIncrease || 0) / 100)).toLocaleString()}/month</p>
                    <p><strong>Year 3:</strong> ${Math.round(Math.abs(params.monthlyWithdrawalAmount) * Math.pow(1 + (params.annualSavingsIncrease || 0) / 100, 2)).toLocaleString()}/month</p>
                  </div>
                </HybridTooltipContent>
              </HybridTooltip>
            </Label>
            <NumberInput
              id="annualSavingsIncrease"
              name="annualSavingsIncrease"
              value={params.annualSavingsIncrease || 0}
              onChange={(value) => setParams((p) => ({ ...p, annualSavingsIncrease: value }))}
              min={-50}
              max={50}
              step={1}
              decimals={0}
              suffix="%"
              placeholder="0"
            />
          </div>
        )}

        {/* Financial Flow Status Indicator */}
        <div className="p-4 rounded-lg border-2 transition-all">
          {isSaving && (
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  Savings Mode
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You're adding <strong>${Math.abs(params.monthlyWithdrawalAmount).toLocaleString()}</strong> per month to your investment. These funds will be used to purchase additional Bitcoin.
                  {params.annualSavingsIncrease && params.annualSavingsIncrease !== 0 && (
                    <span className={`block mt-1 ${params.annualSavingsIncrease > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {params.annualSavingsIncrease > 0 ? 'Growing' : 'Decreasing'} at <strong>{Math.abs(params.annualSavingsIncrease)}%</strong> annually (Year 10: ${Math.round(Math.abs(params.monthlyWithdrawalAmount) * Math.pow(1 + params.annualSavingsIncrease / 100, 9)).toLocaleString()}/month)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {isWithdrawing && (
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100">
                  Withdrawal Mode
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You're withdrawing <strong>${Math.abs(params.monthlyWithdrawalAmount).toLocaleString()}</strong> per month {params.btcAccumulation ? 'from your investment. This will reduce your investment in new BTC.' : 'using loans. This will accumulate debt over time and not adding any additional Bitcoin.'}
                  {params.annualSavingsIncrease && params.annualSavingsIncrease !== 0 && (
                    <span className={`block mt-1 ${params.annualSavingsIncrease > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}>
                      {params.annualSavingsIncrease > 0 ? 'Increasing' : 'Decreasing'} at <strong>{Math.abs(params.annualSavingsIncrease)}%</strong> annually (Year 10: ${Math.round(Math.abs(params.monthlyWithdrawalAmount) * Math.pow(1 + params.annualSavingsIncrease / 100, 9)).toLocaleString()}/month)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {isNeutral && (
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Neutral Mode
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  No monthly financial flow. Your investment will grow or shrink based solely on Bitcoin price movements and loan activity.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Strategy Impact Information */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Strategy Impact:</strong> This parameter works together with your BTC Accumulation mode.
              {params.btcAccumulation
                ? " In accumulation mode, positive values increase your BTC holdings, negative values decrease your reinvestment amount to buy additional BTC."
                : " In cash generation mode, savings add BTC to stack without taking loans. Withdrawals are funded by loans against your BTC collateral."}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

