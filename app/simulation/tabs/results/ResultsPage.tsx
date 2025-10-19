"use client"

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSimulation } from "../../context/SimulationContext"
import { useSimulationRunner } from "../../hooks/useSimulationRunner"
import { DetailedResultsTable } from "./DetailedResultsTable"
import { DebtCollateralChart } from "./charts/DebtCollateralChart"
import { LTVProgressionChart } from "./charts/LTVProgressionChart"
import { CashFlowChart } from "./charts/CashFlowChart"
import { StrategyResultsChart } from "./charts/StrategyResultsChart"
import { LoanActivityTable } from "./charts/LoanActivityTable"
import { useRollingLoanCalculations } from "../../hooks/useRollingLoanCalculations"
import { useResultsAnalysis } from "../../hooks/useResultsAnalysis"

import { RiskAssessment } from "./RiskAssessment"
import { EventsAnalysis } from "./EventsAnalysis"
import { ResultsExport } from "./ResultsExport"
import { AlertCircle, BarChart3, TrendingUp, DollarSign, Play, Loader2, Wallet, CreditCard, PiggyBank, Percent, Shield, Activity } from "lucide-react"

/**
 * Main Results Page Component
 *
 * This component serves as the main container for all results-related functionality.
 * It displays simulation results, analytics, and provides access to advanced features.
 */
export function ResultsPage() {
  const { t } = useTranslation()
  const { chartPoints, monthlyResults } = useRollingLoanCalculations()

  const { results, params, isLoading } = useSimulation()
  const { runSimulation, canRunSimulation, getSimulationStatus } = useSimulationRunner()

  // Use the same analysis as RiskAssessment to retrieve the canonical risk score
  const analysis = useResultsAnalysis(results, params)
  const riskScore = analysis?.riskScore ?? 0


  // Auto-run simulation when Results page mounts and is ready but results are empty
  useEffect(() => {
    const status = getSimulationStatus()
    if (results.length === 0 && status === 'ready') {
      runSimulation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t('Results.title', 'Results')}</h2>
          <p className="text-muted-foreground">{t('Results.loading', 'Loading simulation results...')}</p>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }


  // Get simulation status
  const simulationStatus = getSimulationStatus()
  const canRun = !canRunSimulation() // Note: canRunSimulation returns true when it CAN'T run (inverted logic)

  // Show empty state if no results
  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('Results.title', 'Results')}</h2>
            <p className="text-muted-foreground">{t('Results.description', 'View your simulation results and analysis.')}</p>


          </div>

          {/* Run Simulation Button */}
          <Button
            onClick={runSimulation}
            disabled={isLoading || !canRun}
            size="lg"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('Results.running', 'Running...')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t('Results.runSimulation', 'Run Simulation')}
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              {t('Results.noResultsTitle', 'No Results Available')}
            </CardTitle>
            <CardDescription>
              {simulationStatus === "waiting_for_data"
                ? t('Results.waitingForData', 'Waiting for price data to load...')
                : simulationStatus === "invalid_params"
                ? t('Results.invalidParams', 'Please configure valid parameters first')
                : t('Results.runToSeeResults', 'Run a simulation to see your results here')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mb-4">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
              </div>
              <p className="text-muted-foreground mb-6">
                {t('Results.configureAndRun', 'Configure your parameters and run a simulation to see detailed results, charts, and analysis.')}
              </p>

              {/* Run Simulation Button (duplicate for convenience) */}
              <Button
                onClick={runSimulation}
                disabled={isLoading || !canRun}
                size="lg"
                className="mb-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('Results.runningSimulation', 'Running Simulation...')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t('Results.runSimulation', 'Run Simulation')}
                  </>
                )}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {t('Results.portfolioPerformance', 'Portfolio Performance')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  {t('Results.financialAnalysis', 'Financial Analysis')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  {t('Results.riskAssessment', 'Risk Assessment')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show results when available
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />

      </div>

      {/* New 6-Card Summary Row (single source of truth via useRollingLoanCalculations/chartPoints) */}
      {(() => {
        const last = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : undefined
        const first = chartPoints.length > 0 ? chartPoints[0] : undefined
        const usd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        const btcFmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
        // Aliases for consistency with DetailedResultsTable helper names
        const formatUsd = usd
        const formatBtc = btcFmt

        const finalPrice = last?.btcPrice ?? 0
        const finalBtc = last?.totalBtc ?? 0
        const finalDebt = last?.totalDebt ?? 0
        const finalColl = last?.collateralValue ?? (finalBtc * finalPrice)
        const finalNetBtc = last?.netBtc ?? finalBtc
        const finalNetUsd = finalNetBtc * finalPrice

        const initialPrice = first?.btcPrice ?? 0
        const initialNetBtc = first?.netBtc ?? (first?.totalBtc ?? 0)
        const initialNetUsd = initialNetBtc * initialPrice

        const totalFlowUsd = (monthlyResults || []).reduce((acc, m) => acc + (m.usdFlow || 0), 0)
        const totalBtcDelta = (monthlyResults || []).reduce((acc, m) => acc + (m.btcDelta || 0), 0)

        const totalReturnPct = initialNetUsd > 0 ? ((finalNetUsd - initialNetUsd) / initialNetUsd) * 100 : 0
        const perfBadge = totalReturnPct > 200 ? 'High' : totalReturnPct > 50 ? 'Moderate' : 'Low'

        const perfColor = perfBadge === 'High' ? 'bg-green-100 text-green-800' : perfBadge === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
        // Risk score represents risk (higher = worse). Apply low risk (green) for <=30, moderate (yellow) for <=65, high (red) otherwise.
        const scoreColor = riskScore <= 30 ? 'bg-green-100 text-green-800' : riskScore <= 65 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'

        // BTC delta should be measured against initial total BTC (before any debt), not initial net BTC
        const initialBtcBaseline = (params?.initialBtcAmount ?? (first?.totalBtc ?? 0))
        const netBtcDelta = finalNetBtc - initialBtcBaseline
        const netBtcDeltaSign = netBtcDelta > 0 ? '+' : ''
        const netBtcDeltaClass = netBtcDelta > 0 ? 'text-green-600' : netBtcDelta < 0 ? 'text-red-600' : 'text-muted-foreground'

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Portfolio Value */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" title={`Portfolio Value = Total BTC × BTC Price = ${formatBtc(finalBtc)} BTC × ${formatUsd(finalPrice)} = ${formatUsd(finalColl)}`}>{usd(finalColl)}</div>
                <p className="text-xs text-green-600" title={`Total BTC Holdings = ${formatBtc(finalBtc)} BTC`}>{btcFmt(finalBtc)} BTC</p>
              </CardContent>
            </Card>

            {/* 2. Debt */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Debt</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" title={`Total Debt = ${formatUsd(finalDebt)}`}>{usd(finalDebt)}</div>
                <p className="text-xs text-red-600" title={`Debt in BTC = Total Debt / BTC Price = ${formatUsd(finalDebt)} / ${formatUsd(finalPrice)} = ${formatBtc(finalPrice > 0 ? (finalDebt / finalPrice) : 0)} BTC`}>-{btcFmt(finalPrice > 0 ? (finalDebt / finalPrice) : 0)} BTC</p>
              </CardContent>
            </Card>

            {/* 3. Net Worth */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" title={`Net Worth = Portfolio Value - Debt = ${formatUsd(finalColl)} - ${formatUsd(finalDebt)} = ${formatUsd(finalNetUsd)}`}>{usd(finalNetUsd)}</div>
                <p className="text-xs text-muted-foreground" title={`Net BTC = Total BTC - (Debt / BTC Price) = ${formatBtc(finalBtc)} - (${formatUsd(finalDebt)} / ${formatUsd(finalPrice)}) = ${formatBtc(finalNetBtc)} BTC`}>{btcFmt(finalNetBtc)} BTC</p>
              </CardContent>
            </Card>

            {/* 4. Savings / Withdrawals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Savings / Withdrawals</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalFlowUsd < 0 ? 'text-red-600' : ''}`} title={`Sum of Monthly USD Flows = Σ(monthly savings/withdrawals) = ${formatUsd(totalFlowUsd)}`}>{usd(totalFlowUsd)}</div>
                <p className={`text-xs ${totalBtcDelta < 0 ? 'text-red-600' : 'text-muted-foreground'}`} title={`Σ monthly BTC Δ = ${formatBtc(totalBtcDelta)} BTC`}>{totalBtcDelta < 0 ? '' : '+'}{btcFmt(totalBtcDelta)} BTC</p>
              </CardContent>
            </Card>

            {/* 5. Total Return */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" title={`Total Return % = (Final Net Worth - Initial Net Worth) / Initial Net Worth × 100% = (${formatUsd(finalNetUsd)} - ${formatUsd(initialNetUsd)}) / ${formatUsd(initialNetUsd)} × 100% = ${totalReturnPct.toFixed(1)}%`}>{totalReturnPct.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
                <p className={`text-xs ${netBtcDeltaClass}`} title={`BTC Δ = Final Net BTC - Initial BTC = ${formatBtc(finalNetBtc)} - ${formatBtc(initialBtcBaseline)} = ${formatBtc(netBtcDelta)} BTC`}>{netBtcDeltaSign}{btcFmt(netBtcDelta)} BTC</p>
              </CardContent>
            </Card>

            {/* 6. Risk / Performance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Risk / Performance</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 h-full">
                  <span className={`text-sm px-3 py-1 rounded-full ${scoreColor}`}>{riskScore}/100</span>
                  <span className={`text-sm px-3 py-1 rounded-full ${perfColor}`}>{perfBadge}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Strategy Results Chart - Full Width (shared calculations, pure presentation) */}
      <StrategyResultsChart data={chartPoints} />

      {/* Detailed Results Table (Rollover + Monthly) */}
      <DetailedResultsTable />



      {/* Core Charts (Portfolio Value Over Time removed; kept Debt/Collateral) */}
      <div className="grid grid-cols-1 gap-6">
        <DebtCollateralChart />
      </div>

      {/* Advanced Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LTVProgressionChart />
        <CashFlowChart />
      </div>

      {/* Loan Activity Table - Full Width (moved below analyses) */}
      <LoanActivityTable />

      {/* Risk and Events Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskAssessment />
        <EventsAnalysis />
      </div>

      {/* Export Functionality */}
      <ResultsExport />

      {/* Placeholder for Phase 5 features */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Results.advancedFeaturesTitle', '🚧 Advanced Features Coming Soon')}</CardTitle>
          <CardDescription>
            {t('Results.advancedFeaturesDescription', 'Phase 5 features will be added next')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">{t('Results.scenarioComparison', 'Scenario Comparison')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('Results.scenarioComparisonDescription', 'Compare different parameter sets side-by-side')}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">{t('Results.stressTesting', 'Stress Testing')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('Results.stressTestingDescription', 'Advanced stress testing and sensitivity analysis')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
