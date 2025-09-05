"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSimulation } from "../../context/SimulationContext"
import { useSimulationRunner } from "../../hooks/useSimulationRunner"
import { ResultsSummary } from "./ResultsSummary"
import { ResultsTable } from "./ResultsTable"
import { PortfolioValueChart } from "../charts/PortfolioValueChart"
import { DebtCollateralChart } from "../charts/DebtCollateralChart"
import { LTVProgressionChart } from "../charts/LTVProgressionChart"
import { CashFlowChart } from "../charts/CashFlowChart"
import { RiskAssessment } from "./RiskAssessment"
import { EventsAnalysis } from "./EventsAnalysis"
import { ResultsExport } from "./ResultsExport"
import { AlertCircle, BarChart3, TrendingUp, DollarSign, Play, Loader2 } from "lucide-react"

/**
 * Main Results Page Component
 * 
 * This component serves as the main container for all results-related functionality.
 * It displays simulation results, analytics, and provides access to advanced features.
 */
export function ResultsPage() {
  const { t } = useTranslation()
  const { results, params, isLoading } = useSimulation()
  const { runSimulation, canRunSimulation, getSimulationStatus } = useSimulationRunner()

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
        <div>
          <h2 className="text-2xl font-bold">{t('Results.title', 'Results')}</h2>
          <p className="text-muted-foreground">
            {t('Results.simulationSummary', 'Simulation results for {{months}} months with {{btc}} BTC', {
              months: results.length,
              btc: params.initialBtcAmount
            })}
          </p>
        </div>

        {/* Re-run Simulation Button */}
        <Button
          onClick={runSimulation}
          disabled={isLoading || !canRun}
          variant="outline"
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Results.rerunning', 'Re-running...')}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {t('Results.rerunSimulation', 'Re-run Simulation')}
            </>
          )}
        </Button>
      </div>

      {/* Results Summary Cards */}
      <ResultsSummary />

      {/* Core Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioValueChart />
        <DebtCollateralChart />
      </div>

      {/* Advanced Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LTVProgressionChart />
        <CashFlowChart />
      </div>

      {/* Risk and Events Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskAssessment />
        <EventsAnalysis />
      </div>

      {/* Export Functionality */}
      <ResultsExport />

      {/* Detailed Results Table */}
      <ResultsTable />

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
