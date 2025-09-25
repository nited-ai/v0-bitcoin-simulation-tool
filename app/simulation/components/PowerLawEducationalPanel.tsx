'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from '@/components/ui/hybrid-tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Info, 
  Calculator, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  BookOpen,
  AlertTriangle
} from 'lucide-react'
import { getDaysSinceGenesis, getPowerLawPrice } from '@/src/modules/price-data/models/powerLaw'

interface PowerLawEducationalPanelProps {
  className?: string
}

export function PowerLawEducationalPanel({ className }: PowerLawEducationalPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [calculatorDate, setCalculatorDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Calculate price for selected date
  const calculatePrice = () => {
    if (!calculatorDate) return 0
    const date = new Date(calculatorDate)
    return getPowerLawPrice(date, 'fit')
  }

  const calculatedPrice = calculatePrice()

  // Key predictions for display
  const keyPredictions = [
    { date: '2024-12-01', label: 'Current (Dec 2024)' },
    { date: '2026-01-01', label: '2026 (Giovanni Target)' },
    { date: '2030-01-01', label: '2030 (Mid-term)' },
    { date: '2033-01-01', label: '2033 (Giovanni Target)' }
  ]

  return (
    <div className={className}>
      <Card className="border-blue-200 bg-blue-50/50">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-blue-100/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-blue-900">Bitcoin Power Law Guide</CardTitle>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                    Educational
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <CardDescription className="text-blue-700">
                Learn about the mathematical model behind Bitcoin's long-term price growth
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              
              {/* What is Power Law */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  What is the Bitcoin Power Law?
                </h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  The Bitcoin Power Law is a mathematical model that describes Bitcoin's long-term price growth. 
                  It suggests that Bitcoin's price follows a predictable trajectory when viewed on a logarithmic scale against time. 
                  The model defines a "corridor" with support and resistance lines between which the price has historically moved.
                </p>
              </div>

              {/* Formula Explanation */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  The Formula Explained
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Power Law Form</h4>
                    <code className="text-sm text-blue-800 block bg-blue-50 p-2 rounded">
                      Price = A × (days_since_genesis)^B
                    </code>
                    <p className="text-xs text-blue-600 mt-2">
                      Where A and B are constants derived from Bitcoin's historical data.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Logarithmic Form</h4>
                    <code className="text-sm text-blue-800 block bg-blue-50 p-2 rounded">
                      log(Price) = B × log(days) + log(A)
                    </code>
                    <p className="text-xs text-blue-600 mt-2">
                      This becomes a straight line on a log-log plot.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Calculator */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Interactive Price Calculator
                </h3>
                <p className="text-sm text-blue-700">
                  Select a date to calculate the theoretical "fair value" of Bitcoin according to the Power Law model.
                </p>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-full md:w-auto">
                    <Label htmlFor="power-law-date" className="text-sm font-medium text-blue-800">
                      Select Date:
                    </Label>
                    <Input
                      id="power-law-date"
                      type="date"
                      value={calculatorDate}
                      onChange={(e) => setCalculatorDate(e.target.value)}
                      className="w-full md:w-auto border-blue-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="text-center md:text-left md:ml-6 mt-4 md:mt-0 p-4 bg-white rounded-lg border border-blue-200 flex-grow">
                    <p className="text-sm text-blue-700">Predicted Fair Value:</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ${calculatedPrice.toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Predictions */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900">Key Predictions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {keyPredictions.map(({ date, label }) => {
                    const price = getPowerLawPrice(new Date(date), 'fit')
                    return (
                      <div key={date} className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                        <p className="text-xs text-blue-600 font-medium">{label}</p>
                        <p className="text-lg font-bold text-blue-900">
                          ${price.toLocaleString('en-US')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* How to Calculate */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900">How to Calculate It Yourself</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Constants</h4>
                      <p className="text-sm text-blue-700">Industry-standard parameters:</p>
                      <ul className="list-disc list-inside mt-1 text-sm text-blue-700">
                        <li>Slope (B): <code className="bg-blue-100 px-1 rounded">5.844</code></li>
                        <li>Intercept (log(A)): <code className="bg-blue-100 px-1 rounded">-17.01</code></li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Find Days Since Genesis</h4>
                      <p className="text-sm text-blue-700">
                        Calculate days between your date and Bitcoin's genesis (January 3, 2009).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Apply the Formula</h4>
                      <code className="block bg-blue-50 p-2 rounded mt-1 text-sm">
                        log10(Price) = 5.844 × log10(days) - 17.01
                      </code>
                      <code className="block bg-blue-50 p-2 rounded mt-1 text-sm">
                        Price = 10^(result)
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prognosis Lines Explanation */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900">Understanding Prognosis Lines</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800">Support Line</h4>
                    <p className="text-sm text-green-700 mb-2">
                      Calibrated to historical market bottoms. Represents the price floor during bear markets.
                    </p>
                    <p className="text-xs text-green-600 font-mono">
                      Intercept: -17.461735<br/>
                      Calibrated to: 2022 bottom ($15,500)
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800">Fit Line</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Industry-standard fair value line. Most commonly used for long-term planning.
                    </p>
                    <p className="text-xs text-blue-600 font-mono">
                      Intercept: -17.01<br/>
                      Source: HTML Power Law Explorer
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-800">Resistance Line</h4>
                    <p className="text-sm text-orange-700 mb-2">
                      Calibrated to historical market peaks. Represents the price ceiling during bull markets.
                    </p>
                    <p className="text-xs text-orange-600 font-mono">
                      Intercept: -15.941731<br/>
                      Calibrated to: 2013 peak ($1,177)
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-3">
                  <h4 className="font-semibold text-blue-800 mb-2">🎯 Dynamic Calibration</h4>
                  <p className="text-sm text-blue-700">
                    Unlike fixed mathematical offsets, our support and resistance lines are dynamically calibrated
                    to actual Bitcoin historical price extremes. This ensures the entire Bitcoin price history
                    falls within the Power Law channel, providing more accurate risk assessment.
                  </p>
                </div>
              </div>

              {/* Important Disclaimer */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800 mb-1">Important Disclaimer</h4>
                    <p className="text-sm text-red-700">
                      This model is a theoretical framework based on historical data. It is not financial advice 
                      and should not be used as the sole basis for investment decisions. Past performance is not 
                      indicative of future results, and all investments carry risk.
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
