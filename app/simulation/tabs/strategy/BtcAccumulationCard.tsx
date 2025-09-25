"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { TrendingUp, DollarSign, Info, ArrowRight, Coins, Banknote } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"

/**
 * BTC Accumulation Card Component
 * 
 * Provides clear explanations and controls for BTC accumulation mode
 * with visual comparisons between accumulation and cash generation modes.
 */
export function BtcAccumulationCard() {
  const { params, setParams } = useSimulation()

  // Handle BTC accumulation toggle
  const handleBtcAccumulationChange = (checked: boolean) => {
    setParams((prev) => ({ 
      ...prev, 
      btcAccumulation: checked 
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          BTC Accumulation Strategy
        </CardTitle>
        <CardDescription>
          Choose between accumulating more Bitcoin or generating cash income
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* BTC Accumulation Toggle */}
        <div className="flex items-center space-x-3">
          <Checkbox
            id="btcAccumulation"
            checked={params.btcAccumulation}
            onCheckedChange={handleBtcAccumulationChange}
          />
          <Label
            htmlFor="btcAccumulation"
            className="flex items-center gap-2 cursor-pointer text-base font-medium"
          >
            <TrendingUp className="w-4 h-4 text-green-500" />
            Enable BTC Accumulation
            <HybridTooltip>
              <HybridTooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </HybridTooltipTrigger>
              <HybridTooltipContent className="max-w-sm">
                <p>
                  Toggle between two distinct strategies:<br/>
                  <strong>ON:</strong> Maximize Bitcoin holdings through reinvestment<br/>
                  <strong>OFF:</strong> Generate cash income while maintaining leverage
                </p>
              </HybridTooltipContent>
            </HybridTooltip>
          </Label>
        </div>

        {/* Active Mode Display */}
        {params.btcAccumulation ? (
          /* BTC Accumulation Mode */
          <div className="p-4 rounded-lg border-2 bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900 dark:text-green-100">
                BTC Accumulation Mode
              </h4>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                ACTIVE
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-green-500" />
                <span>Reinvest all loan proceeds into Bitcoin</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-green-500" />
                <span>Maximize Bitcoin holdings over time</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-green-500" />
                <span>No immediate cash flow</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-green-500" />
                <span>Compound growth potential</span>
              </div>
            </div>

            <div className="mt-3 p-2 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
              <strong>Best for:</strong> Long-term Bitcoin maximalists who don't need immediate income
            </div>
          </div>
        ) : (
          /* Cash Generation Mode */
          <div className="p-4 rounded-lg border-2 bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Cash Generation Mode
              </h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                ACTIVE
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-blue-500" />
                <span>Take excess loan proceeds as cash</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-blue-500" />
                <span>Generate regular income stream</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-blue-500" />
                <span>Maintain target loan percentage</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-blue-500" />
                <span>Preserve Bitcoin stack size</span>
              </div>
            </div>

            <div className="mt-3 p-2 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              <strong>Best for:</strong> Income-focused investors who need cash flow from their Bitcoin
            </div>
          </div>
        )}

        {/* Strategy Impact */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Strategy Impact
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${params.btcAccumulation ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span><strong>Loan Proceeds:</strong> {params.btcAccumulation ? 'Reinvested in BTC' : 'Taken as cash'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${params.btcAccumulation ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span><strong>BTC Holdings:</strong> {params.btcAccumulation ? 'Increasing' : 'Stable'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${params.btcAccumulation ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span><strong>Cash Flow:</strong> {params.btcAccumulation ? 'None' : 'Regular income'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${params.btcAccumulation ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span><strong>Risk Profile:</strong> {params.btcAccumulation ? 'Higher leverage' : 'Stable leverage'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
