"use client"

import { Bitcoin } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SimulationProvider } from "../simulation/context/SimulationContext"
import { TabNavigation } from "../simulation/components/navigation/TabNavigation"

/**
 * Tab-based Simulation Page
 * 
 * This version implements the new tab navigation structure as specified in:
 * @.agent-os/specs/2025-07-26-price-projection-tab-redesign/spec.md
 */

function SimulationHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
        <Bitcoin className="w-8 h-8 text-orange-500" />
        Bitcoin Simulation Tool (Tabs)
      </h1>
      <p className="text-muted-foreground">
        Modular architecture - Tab Navigation Implementation
      </p>
    </div>
  )
}

export default function SimulationTabsPage() {
  return (
    <TooltipProvider>
      <SimulationProvider>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <SimulationHeader />
            <TabNavigation />
          </div>
        </div>
      </SimulationProvider>
    </TooltipProvider>
  )
}
