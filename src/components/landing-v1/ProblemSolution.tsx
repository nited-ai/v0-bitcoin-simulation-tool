"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, AlertTriangle, DollarSign, Bitcoin, Zap, Shield, TrendingUp } from "lucide-react"

export function ProblemSolution() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            The Problem with Traditional Finance
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Why Sell the <span className="text-orange-500">Hardest Money</span> Ever Created?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Traditional retirement advice tells you to sell your appreciating assets. 
            But what if there was a better way?
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Problem Side */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-4 text-red-600">
                The Traditional Finance Trap
              </h3>
              <p className="text-muted-foreground mb-6">
                Conventional wisdom forces you to sell your best assets when you need income most.
              </p>
            </div>

            <div className="space-y-4">
              <Card className="border-red-200/50 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="w-5 h-5 text-red-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400">Inflation Erosion</h4>
                      <p className="text-sm text-red-600/80 dark:text-red-300/80">
                        Fiat savings lose 8-15% purchasing power annually
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200/50 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400">Missing Bitcoin's Upside</h4>
                      <p className="text-sm text-red-600/80 dark:text-red-300/80">
                        Selling Bitcoin means missing future appreciation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200/50 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-red-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400">Tax Implications</h4>
                      <p className="text-sm text-red-600/80 dark:text-red-300/80">
                        Capital gains taxes reduce your available capital
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Solution Side */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-4 text-green-600">
                The FIREhodl Solution
              </h3>
              <p className="text-muted-foreground mb-6">
                Live off your Bitcoin without ever selling through strategic lending and accumulation.
              </p>
            </div>

            <div className="space-y-4">
              <Card className="border-green-200/50 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Bitcoin className="w-5 h-5 text-green-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">Maintain Bitcoin Exposure</h4>
                      <p className="text-sm text-green-600/80 dark:text-green-300/80">
                        Keep your Bitcoin stack intact while accessing its value
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200/50 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-green-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">Tax Efficiency</h4>
                      <p className="text-sm text-green-600/80 dark:text-green-300/80">
                        Loans aren't taxable events - keep more of your wealth
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200/50 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">Compound Growth</h4>
                      <p className="text-sm text-green-600/80 dark:text-green-300/80">
                        Your Bitcoin continues appreciating while you live off it
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-200/50">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">
                Ready to Break Free from Traditional Finance?
              </h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of Bitcoiners who've discovered the power of strategic Bitcoin-backed lending.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secure • Strategic • Sustainable</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
