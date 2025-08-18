"use client"

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
  const { results, params, isLoading } = useSimulation()
  const { runSimulation, canRunSimulation, getSimulationStatus } = useSimulationRunner()

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Results</h2>
          <p className="text-muted-foreground">Loading simulation results...</p>
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
            <h2 className="text-2xl font-bold">Results</h2>
            <p className="text-muted-foreground">View your simulation results and analysis.</p>
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
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Simulation
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              No Results Available
            </CardTitle>
            <CardDescription>
              {simulationStatus === "waiting_for_data"
                ? "Waiting for price data to load..."
                : simulationStatus === "invalid_params"
                ? "Please configure valid parameters first"
                : "Run a simulation to see your results here"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mb-4">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
              </div>
              <p className="text-muted-foreground mb-6">
                Configure your parameters and run a simulation to see detailed results, charts, and analysis.
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
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Portfolio Performance
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Financial Analysis
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Risk Assessment
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
          <h2 className="text-2xl font-bold">Results</h2>
          <p className="text-muted-foreground">
            Simulation results for {results.length} months with {params.btcAmount} BTC
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
              Re-running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Re-run Simulation
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
          <CardTitle>🚧 Advanced Features Coming Soon</CardTitle>
          <CardDescription>
            Phase 5 features will be added next
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Scenario Comparison</h4>
              <p className="text-sm text-muted-foreground">
                Compare different parameter sets side-by-side
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Stress Testing</h4>
              <p className="text-sm text-muted-foreground">
                Advanced stress testing and sensitivity analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
