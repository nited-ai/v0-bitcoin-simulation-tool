"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HybridTooltip, HybridTooltipTrigger, HybridTooltipContent } from "@/components/ui/hybrid-tooltip"
import { Shield, AlertTriangle, Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"

export function RollingLoanRiskManagementCard() {
  const { params, setParams } = useSimulation()

  if (params.investmentStrategy !== 'rollingLoan') return null

  const liquidationLtv = params.riskManagement?.liquidationLtv ?? 85
  const topUpTrigger = params.riskManagement?.topUpTriggerLtv ?? 70
  const targetRange = params.riskManagement?.topUpTargetLtvRange ?? { min: 50, max: 80 }

  const btcPrice = params.initialBtcPrice
  const btcStackValue = (params.initialBtcAmount ?? 0) * (btcPrice ?? 0)
  const loanAmountUsd = (params.loanAmountPercent ?? 0) / 100 * btcStackValue

  const initialLoanCalc = useMemo(() => {
    const targetMin = Math.max(0.0001, (targetRange.min ?? 50) / 100)
    const requiredLockedBtc = btcPrice > 0 ? (loanAmountUsd / (btcPrice * targetMin)) : 0
    const initialLtvPct = (requiredLockedBtc > 0 && btcPrice > 0)
      ? (loanAmountUsd / (requiredLockedBtc * btcPrice)) * 100
      : 0
    return { requiredLockedBtc, initialLtvPct }
  }, [btcPrice, loanAmountUsd, targetRange.min])

  const warnings: string[] = []
  if (topUpTrigger > liquidationLtv) warnings.push("Top-up Trigger must be ≤ Liquidation LTV")
  if (targetRange.min >= targetRange.max) warnings.push("Target LTV min must be less than max")
  if (targetRange.min > topUpTrigger) warnings.push("Target LTV min should be ≤ Top-up Trigger")

  const ltvColor = initialLoanCalc.initialLtvPct < 50 ? "text-green-600" : initialLoanCalc.initialLtvPct <= 70 ? "text-yellow-600" : "text-red-600"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Risk Management & Top-Up Settings
        </CardTitle>
        <CardDescription>
          Configure automatic top-up thresholds and target LTV range for the rolling loan strategy
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top-up Trigger LTV */}
          <div>
            <Label htmlFor="topUpTrigger">Auto Top-Up Trigger</Label>
            <div className="flex items-center gap-2">
              <Input
                id="topUpTrigger"
                type="number"
                min={10}
                max={95}
                step={1}
                value={topUpTrigger}
                onChange={(e) => setParams((p) => ({
                  ...p,
                  riskManagement: {
                    ...p.riskManagement,
                    topUpTriggerLtv: Number(e.target.value)
                  }
                }))}
              />
              <HybridTooltip>
                <HybridTooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </HybridTooltipTrigger>
                <HybridTooltipContent>
                  When Initial LTV reaches this threshold, the system automatically locks unlocked BTC to reduce LTV.
                </HybridTooltipContent>
              </HybridTooltip>
            </div>
          </div>

          {/* Target LTV Range */}
          <div>
            <Label>Target LTV After Top-Up</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Target LTV Min"
                type="number"
                min={10}
                max={90}
                step={1}
                value={targetRange.min}
                onChange={(e) => setParams((p) => ({
                  ...p,
                  riskManagement: {
                    ...p.riskManagement,
                    topUpTargetLtvRange: {
                      min: Number(e.target.value),
                      max: p.riskManagement.topUpTargetLtvRange?.max ?? 80
                    }
                  }
                }))}
              />
              <Input
                aria-label="Target LTV Max"
                type="number"
                min={10}
                max={95}
                step={1}
                value={targetRange.max}
                onChange={(e) => setParams((p) => ({
                  ...p,
                  riskManagement: {
                    ...p.riskManagement,
                    topUpTargetLtvRange: {
                      min: p.riskManagement.topUpTargetLtvRange?.min ?? 50,
                      max: Number(e.target.value)
                    }
                  }
                }))}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              The desired LTV range the system aims for after performing a top-up.
            </div>
          </div>
        </div>

        {/* Initial Loan LTV Display */}
        <div className="p-3 rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Initial Loan LTV:</span>
            <span className={`font-semibold ${ltvColor}`}>{initialLoanCalc.initialLtvPct.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <HybridTooltip>
              <HybridTooltipTrigger asChild>
                <span className="underline underline-offset-2 cursor-help">Formula</span>
              </HybridTooltipTrigger>
              <HybridTooltipContent>
                Initial LTV = Loan Amount / (Locked BTC × BTC Price)
              </HybridTooltipContent>
            </HybridTooltip>
          </div>
        </div>

        {/* Validation Warnings */}
        {warnings.length > 0 && (
          <div className="p-3 rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="space-y-1 text-sm">
                {warnings.map((w, i) => (
                  <p key={i} className="text-yellow-800 dark:text-yellow-200">{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Helper Text */}
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Two-Tier Liquidation System</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Tier-1: Automatic top-up by locking unlocked BTC when Initial LTV reaches the configured trigger.</li>
            <li>Tier-2: Forced liquidation if Initial LTV after top-up still exceeds the platform's maximum threshold.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

