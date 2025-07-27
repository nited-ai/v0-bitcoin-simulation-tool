"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bitcoin } from "lucide-react"

/**
 * Simplified Simulation Page for Testing
 * 
 * This is a minimal version to test if the basic structure works
 * without complex state management or hooks that might cause infinite loops.
 */
export default function SimpleSimulationPage() {
  const [btcAmount, setBtcAmount] = useState(1)
  const [initialPrice, setInitialPrice] = useState(100000)

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Simple Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <Bitcoin className="w-8 h-8 text-orange-500" />
          Bitcoin Simulation Tool (Simple)
        </h1>
        <p className="text-muted-foreground">
          Simplified version to test the modular architecture
        </p>
      </div>

      {/* Simple Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Parameters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Parameters</CardTitle>
            <CardDescription>Configure basic simulation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="btcAmount">BTC Amount</Label>
              <Input
                id="btcAmount"
                type="number"
                value={btcAmount}
                onChange={(e) => setBtcAmount(Number(e.target.value))}
                min="0.001"
                step="0.001"
              />
            </div>
            
            <div>
              <Label htmlFor="initialPrice">Initial BTC Price (€)</Label>
              <Input
                id="initialPrice"
                type="number"
                value={initialPrice}
                onChange={(e) => setInitialPrice(Number(e.target.value))}
              />
            </div>
            
            <Button onClick={() => alert(`BTC: ${btcAmount}, Price: ${initialPrice}`)}>
              Test Values
            </Button>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Status</CardTitle>
            <CardDescription>Phase 1 Migration Progress</CardDescription>
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
                <span>State management with Context</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">🔧</span>
                <span>Fixing infinite loop issues</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Current Values:</strong></p>
            <p>BTC Amount: {btcAmount}</p>
            <p>Initial Price: €{initialPrice.toLocaleString()}</p>
            <p>Total Value: €{(btcAmount * initialPrice).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
