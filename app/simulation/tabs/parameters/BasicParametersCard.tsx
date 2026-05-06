"use client"

import React, { useMemo, useCallback, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { HybridTooltip, HybridTooltipTrigger, HybridTooltipContent } from "@/components/ui/hybrid-tooltip"
import { RefreshCw, Info, Bitcoin, DollarSign, Banknote, CreditCard } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { usePriceData } from "@/src/modules/price-data/hooks/usePriceData"
import { NumberInput } from "../../../../shared/ui/forms/NumberInput"
import { CollateralSummaryCard } from "./CollateralSummaryCard"
import { useLoanCalculations } from "../../hooks/useCalculationsIntegration"
import { CalculationsErrorBoundary } from "./CalculationsErrorBoundary"
import { useLocaleNumberFormat } from "@/shared/utils/localeNumberFormat"

/**
 * Basic Parameters Card Component
 *
 * Handles the core simulation parameters: BTC amount, initial price,
 * and monthly withdrawal with BTC accumulation options.
 */
export const BasicParametersCard = React.memo(function BasicParametersCard() {
  const { t } = useTranslation()
  const {
    params,
    setParams,
    loadingBtcPrice,
    setLoadingBtcPrice
  } = useSimulation()
  const { formatCurrency } = useLocaleNumberFormat()

  // Reads current price via PR3's usePriceData() SWR hook.
  const { currentPrice: currentPriceData, refresh: refreshPriceData } = usePriceData()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use centralized loan calculations through integration hook
  const loanData = useLoanCalculations()

  // Get max loan capacity from centralized calculations
  const maxLoanCapacity = useMemo(() => {
    return loanData?.initialMaxLoanCapacity || 0
  }, [loanData])

  // BTC accumulation state and handlers moved to Strategy tab

  // Current BTC price is loaded by PR3's usePriceData() SWR hook above; no
  // separate load is needed here.

  // Investment mode description function moved to Strategy tab

  /**
   * Refresh current BTC price.
   *
   * Hits /api/bitcoin-prices?refresh=force first to bypass the server-side
   * 5-minute cooldown and force an upstream re-fetch + DB upsert. Then calls
   * SWR refresh() to revalidate the cache so `currentPriceData` updates.
   * The effect below then syncs the new value into params (gated on
   * `isRefreshing` so unrelated SWR revalidations don't clobber user edits).
   */
  const handleLoadCurrentPrice = useCallback(async () => {
    setLoadingBtcPrice(true)
    setIsRefreshing(true)
    try {
      // Force server-side upstream refresh (bypasses 5-min cooldown)
      await fetch('/api/bitcoin-prices?refresh=force')
      // Then revalidate SWR cache so the new currentPrice arrives
      await refreshPriceData()
    } catch (error) {
      console.error("Failed to refresh current BTC price:", error)
    } finally {
      setLoadingBtcPrice(false)
    }
  }, [refreshPriceData, setLoadingBtcPrice])

  // After refresh completes and currentPriceData updates, sync the param
  useEffect(() => {
    if (isRefreshing && currentPriceData?.value) {
      setParams((p) => ({ ...p, initialBtcPrice: currentPriceData.value }))
      console.log(`💰 Refreshed BTC price: $${currentPriceData.value}`)
      setIsRefreshing(false)
    }
  }, [isRefreshing, currentPriceData?.value, setParams])

  return (
    <CalculationsErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-orange-500" />
            {t('BasicParameters.title')}
          </CardTitle>
        </CardHeader>

      <CardContent className="space-y-6">
        {/* Two-column layout: Input fields on left, Collateral value summary on right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Input Fields */}
          <div className="space-y-6">
            {/* Initial BTC Price (moved to top) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-500" />
                {t('BasicParameters.initialBtcPrice.label')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('BasicParameters.initialBtcPrice.tooltip')}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <div className="flex gap-2">
                <NumberInput
                  id="initialBtcPrice"
                  name="initialBtcPrice"
                  value={params.initialBtcPrice}
                  onChange={(value) => setParams((p) => ({ ...p, initialBtcPrice: value }))}
                  min={1000}
                  max={10000000}
                  step={100}
                  decimals={2}
                  suffix="$"
                  placeholder={t('BasicParameters.initialBtcPrice.placeholder')}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLoadCurrentPrice}
                  disabled={loadingBtcPrice}
                  title={t('BasicParameters.loadCurrentPrice.button', 'Load Current Price')}
                  className="shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBtcPrice ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* BTC Amount (moved below price) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bitcoin className="w-4 h-4 text-orange-500" />
                {t('BasicParameters.btcAmount.label')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('BasicParameters.btcAmount.tooltip')}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <NumberInput
                id="initialBtcAmount"
                name="initialBtcAmount"
                value={params.initialBtcAmount}
                onChange={(value) => setParams((p) => ({ ...p, initialBtcAmount: value }))}
                min={0.001}
                max={1000}
                step={0.001}
                decimals={4}
                suffix="BTC"
                placeholder="1.0000"
              />
            </div>
          </div>

          {/* Right Column: Total Fiat Value and Max Loan Amount */}
          <div className="space-y-6">
            {/* Total Fiat Value */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-orange-500" />
                {t('BasicParameters.totalFiatValue.label', 'Total Fiat Value')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('BasicParameters.totalFiatValue.tooltip', 'Total fiat value of your BTC stack available as collateral')}</p>
                    <p>{t('BasicParameters.totalFiatValue.formula', 'Formula: BTC Amount × Initial BTC Price')}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <CollateralSummaryCard
                btcAmount={params.initialBtcAmount}
                initialBtcPrice={params.initialBtcPrice}
                className="p-0 border-none bg-transparent"
              />
            </div>

            {/* Max Loan Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                {t('BasicParameters.maxLoanAmount.label', 'Max Loan Amount')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('BasicParameters.maxLoanAmount.tooltip', 'Maximum loan amount available on selected platform')}</p>
                    <p>{t('BasicParameters.maxLoanAmount.formula', 'Formula: (BTC Amount × Price) × Platform Max LTV')}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <div className="text-4xl font-bold text-orange-600" suppressHydrationWarning>
                {formatCurrency(maxLoanCapacity, 0)}
              </div>
            </div>
          </div>

        </div>

        {/* Monthly Savings/Withdrawal and BTC Accumulation moved to Strategy tab */}

      </CardContent>
    </Card>
    </CalculationsErrorBoundary>
  )
})
