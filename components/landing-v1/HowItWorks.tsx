"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Settings, 
  Target, 
  Play, 
  ArrowRight, 
  Bitcoin, 
  TrendingUp, 
  Shield,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Play className="w-4 h-4 mr-2" />
            How It Works
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Your Path to <span className="text-orange-500">Bitcoin FIRE</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Three simple steps to start living off your Bitcoin without ever selling. 
            Join thousands who've already started their journey.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <span className="font-medium">Set Parameters</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <span className="font-medium">Choose Strategy</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <span className="font-medium">Simulate & Execute</span>
            </div>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Step 1 */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-orange-500">Step 1</Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-orange-500" />
              </div>
              <CardTitle className="text-xl">Set Your Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configure your Bitcoin stack size, financial goals, and risk tolerance. 
                Our intelligent system adapts to your unique situation.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Bitcoin stack size & current price</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Monthly withdrawal requirements</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Risk level preferences</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Simulation timeframe</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-1">Example Configuration</div>
                  <div className="text-xs text-muted-foreground">
                    2.5 BTC stack • €3,200/month • Moderate risk • 10-year simulation
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-blue-500">Step 2</Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-xl">Choose Your Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Select from proven strategies or create your own. Each strategy is 
                backtested with historical data for maximum confidence.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>ATH-based lending strategies</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Moving average indicators</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Platform-specific loan types</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Custom strategy builder</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-1">Popular Choice</div>
                  <div className="text-xs text-muted-foreground">
                    ATH + 10% trigger • Firefish platform • 50% LTV • Conservative risk
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-green-500">Step 3</Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle className="text-xl">Simulate & Execute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Run comprehensive simulations to see your potential outcomes. 
                Export data and implement your strategy with confidence.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Real-time simulation results</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Risk analysis & projections</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>CSV export for analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Implementation guidance</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-1">Expected Outcome</div>
                  <div className="text-xs text-muted-foreground">
                    €3,200/month income • 847% stack growth • 95% success rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA Section */}
        <div className="text-center">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-green-500/10 border-orange-200/50">
            <CardContent className="p-8">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-4">
                    Ready to Start Your Bitcoin FIRE Journey?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Join thousands of Bitcoiners who've discovered the power of strategic 
                    Bitcoin-backed lending. Start your simulation in under 5 minutes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600">
                      <Link href="/simulation">
                        Start Free Simulation
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg">
                      Watch Demo Video
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Bitcoin className="w-5 h-5 text-orange-500" />
                    <span className="text-sm">No account required to start</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Your data stays private</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Real-time market data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">Trusted by 10,000+ users</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
