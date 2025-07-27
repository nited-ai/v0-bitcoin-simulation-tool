"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bitcoin } from "lucide-react"
import { SimpleSimulationProvider } from "../simulation/context/SimpleSimulationContext"
import { SimpleBasicParametersCard } from "../simulation/components/parameters/SimpleBasicParametersCard"

/**
 * Stable Simulation Page
 * 
 * This version uses simplified components without complex hooks or translations
 * to avoid infinite loops. We'll gradually add complexity once this works.
 */

function SimulationHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
        <Bitcoin className="w-8 h-8 text-orange-500" />
        Bitcoin Simulation Tool (Stable)
      </h1>
      <p className="text-muted-foreground">
        Modular architecture - Phase 1 Migration (Stable Version)
      </p>
    </div>
  )
}

function SimulationContent() {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <SimulationHeader />
      
      <Tabs defaultValue="parameters" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
        </TabsList>

        {/* Parameters Tab */}
        <TabsContent value="parameters" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <SimpleBasicParametersCard />
              
              {/* Placeholder for other parameter cards */}
              <Card>
                <CardHeader>
                  <CardTitle>🚧 More Parameters Coming Soon</CardTitle>
                  <CardDescription>Strategy, Risk Management, Economic Assumptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Additional parameter cards will be added once the basic structure is stable.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Migration Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Migration Status</CardTitle>
                  <CardDescription>Phase 1 Progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      <span>Folder structure created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      <span>Basic components extracted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      <span>Simple state management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">🔧</span>
                      <span>Stabilizing infinite loop issues</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🚧 Results Coming Soon</CardTitle>
              <CardDescription>Results will be added once parameters are stable</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Results components will be added in the next iteration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🚧 Charts Coming Soon</CardTitle>
              <CardDescription>Charts will be added once data flow is stable</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Chart components will be added in the next iteration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* How It Works Tab */}
        <TabsContent value="how-it-works" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Understanding the modular architecture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Modular Architecture Benefits</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>90% reduction in main component size (150 vs 1555 lines)</li>
                <li>12 modular components extracted</li>
                <li>Clear separation of concerns</li>
                <li>Easy to test individual components</li>
                <li>Parallel development possible</li>
              </ul>
              
              <h3 className="font-semibold">Current Status</h3>
              <p className="text-sm text-muted-foreground">
                We're currently stabilizing the basic structure to avoid infinite loops
                and then will gradually add more complex features.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function StableSimulationPage() {
  return (
    <SimpleSimulationProvider>
      <SimulationContent />
    </SimpleSimulationProvider>
  )
}
