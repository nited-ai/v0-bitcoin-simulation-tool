// app/simulation/SimulationPage.tsx
"use client"

import { Suspense } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SimulationProvider } from "./context/SimulationContext"
import { StrategyProvider } from "../strategies/registry/StrategyProvider"
import { SimulationHeader } from "./components/layout/SimulationHeader"
import { SimulationTabs } from "./components/layout/SimulationTabs"
import { LoadingStates } from "./components/layout/LoadingStates"
import { ErrorBoundary } from "@/shared/ui/feedback/ErrorBoundary"

/**
 * Main Simulation Page Component
 * 
 * This is the new, clean main component that replaces the 1500+ line simulation.tsx
 * It focuses only on layout and composition, delegating all business logic to
 * specialized components and hooks.
 */
export default function SimulationPage() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <SimulationProvider>
          <StrategyProvider>
            <div className="w-full p-4">
              {/* Header with title and controls */}
              <SimulationHeader />
              
              {/* Main content with tabs */}
              <Suspense fallback={<LoadingStates.PageLoading />}>
                <SimulationTabs />
              </Suspense>
            </div>
          </StrategyProvider>
        </SimulationProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}

// Total: ~40 lines vs 1500+ lines! 🎉
