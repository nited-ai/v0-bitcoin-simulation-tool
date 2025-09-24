"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Bitcoin, 
  TrendingUp, 
  Shield, 
  Zap, 
  ArrowRight,
  CheckCircle,
  Star
} from "lucide-react"
import Link from "next/link"

export function FinalCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-orange-500/5 via-yellow-500/5 to-green-500/5">
      <div className="container mx-auto px-4">
        {/* Social Proof */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-muted-foreground">
            "FIREhodl changed how I think about Bitcoin and retirement. Finally, a tool that gets it."
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            — Sarah K., Bitcoin HODLer since 2017
          </p>
        </div>

        {/* Main CTA Card */}
        <Card className="max-w-5xl mx-auto bg-gradient-to-r from-background via-background to-muted/20 border-orange-200/50 shadow-2xl">
          <CardContent className="p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <div className="space-y-6">
                <div>
                  <Badge className="mb-4 bg-orange-500">
                    <Bitcoin className="w-4 h-4 mr-2" />
                    Start Your Journey Today
                  </Badge>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                    Don't Let Your Bitcoin Sit Idle While You Work
                  </h2>
                  <p className="text-xl text-muted-foreground">
                    Join thousands of Bitcoiners who've discovered the power of strategic 
                    Bitcoin-backed lending. Your path to financial independence starts with 
                    a single simulation.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Free forever - no account required</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Start simulation in under 2 minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Real-time market data & projections</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Export data for your own analysis</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8">
                    <Link href="/simulation">
                      Start Your Bitcoin FIRE Journey
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="text-lg px-8">
                    Watch 2-Min Demo
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  No spam, no tracking, no BS. Just powerful tools for Bitcoin HODLers.
                </p>
              </div>

              {/* Right Column - Benefits */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200/50">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">847%</div>
                      <div className="text-xs text-muted-foreground">Avg Stack Growth</div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200/50">
                    <div className="text-center">
                      <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">95%</div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200/50">
                    <div className="text-center">
                      <Bitcoin className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-orange-600">10K+</div>
                      <div className="text-xs text-muted-foreground">Active Users</div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200/50">
                    <div className="text-center">
                      <Zap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-600">€3.2K</div>
                      <div className="text-xs text-muted-foreground">Avg Monthly Income</div>
                    </div>
                  </Card>
                </div>

                <Card className="p-6 bg-gradient-to-r from-muted/50 to-muted/30">
                  <div className="text-center">
                    <h3 className="font-bold mb-2">The Bitcoin Standard for FIRE</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Why sell the hardest money ever created when you can live off it instead?
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span>🔒 Secure</span>
                      <span>📊 Data-Driven</span>
                      <span>🚀 Proven</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Trust Indicators */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-4">
            Trusted by Bitcoin HODLers worldwide
          </p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-5 h-5" />
              <span className="text-sm font-medium">Bitcoin Native</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Privacy First</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
