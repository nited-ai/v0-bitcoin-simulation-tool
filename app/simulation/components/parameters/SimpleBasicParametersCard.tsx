"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSimpleSimulation } from "../../context/SimpleSimulationContext"

/**
 * Simple Basic Parameters Card
 * 
 * Simplified version without translations or complex interactions
 * to test the basic functionality without infinite loops.
 */
export function SimpleBasicParametersCard() {
  const { params, setParams } = useSimpleSimulation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Parameters</CardTitle>
        <CardDescription>Configure basic simulation parameters</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* BTC Amount and Initial Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="btcAmount">BTC Amount</Label>
            <Input
              id="btcAmount"
              type="number"
              value={params.btcAmount}
              onChange={(e) => setParams((p) => ({ ...p, btcAmount: Number(e.target.value) }))}
              min="0.001"
              step="0.001"
            />
          </div>
          
          <div>
            <Label htmlFor="initialBtcPrice">Initial BTC Price (€)</Label>
            <Input
              id="initialBtcPrice"
              type="number"
              value={params.initialBtcPrice}
              onChange={(e) => setParams((p) => ({ ...p, initialBtcPrice: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Loan Term and Simulation Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="loanTermMonths">Loan Term (Months)</Label>
            <Input
              id="loanTermMonths"
              type="number"
              value={params.loanTermMonths}
              onChange={(e) => setParams((p) => ({ ...p, loanTermMonths: Number(e.target.value) }))}
              min="1"
              max="60"
              step="1"
            />
          </div>
          
          <div>
            <Label htmlFor="simulationMonths">Simulation Duration (Months)</Label>
            <Input
              id="simulationMonths"
              type="number"
              value={params.simulationMonths}
              onChange={(e) => setParams((p) => ({ ...p, simulationMonths: Number(e.target.value) }))}
              min="12"
              max="600"
              step="1"
            />
          </div>
        </div>

        {/* Interest Rate and Monthly Withdrawal */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="annualInterestRate">Annual Interest Rate (%)</Label>
            <Input
              id="annualInterestRate"
              type="number"
              value={params.annualInterestRate}
              onChange={(e) => setParams((p) => ({ ...p, annualInterestRate: Number(e.target.value) }))}
              min="0"
              max="50"
              step="0.1"
            />
          </div>
          
          <div>
            <Label htmlFor="monthlyWithdrawalAmount">Monthly Withdrawal (€)</Label>
            <Input
              id="monthlyWithdrawalAmount"
              type="number"
              value={params.monthlyWithdrawalAmount}
              onChange={(e) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: Number(e.target.value) }))}
              min="0"
              step="100"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
