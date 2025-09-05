"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bitcoin, TrendingUp, Shield, Zap } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit">
                <Bitcoin className="w-4 h-4 mr-2 text-orange-500" />
                Financial Independence, Retire Early
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                Achieve Financial Independence{" "}
                <span className="text-orange-500">Without Selling</span>{" "}
                Your Bitcoin
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl">
                Strategic Bitcoin-backed lending and accumulation strategies for true HODLers. 
                Live off your Bitcoin without ever selling the hardest money ever created.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Maintain Bitcoin Exposure</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Risk Management</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium">Tax Efficiency</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600">
                <Link href="/simulation">
                  Start Your Bitcoin FIRE Journey
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#how-it-works">
                  See How It Works
                </Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-background flex items-center justify-center text-white text-xs font-bold"
                  >
                    ₿
                  </div>
                ))}
              </div>
              <span>Trusted by Bitcoin HODLers worldwide</span>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <Card className="p-6 bg-gradient-to-br from-card to-muted/20 border-orange-200/20">
              <CardContent className="p-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Bitcoin Stack Growth</h3>
                    <Badge variant="secondary" className="text-green-600">
                      +847% over 10 years
                    </Badge>
                  </div>
                  
                  {/* Simplified Chart Preview */}
                  <div className="h-48 bg-gradient-to-t from-orange-500/10 to-orange-500/30 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 flex items-end justify-center">
                      <div className="w-full h-full relative">
                        {/* Mock chart bars */}
                        {[20, 35, 25, 45, 60, 40, 75, 90, 85, 100].map((height, i) => (
                          <div
                            key={i}
                            className="absolute bottom-0 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-sm"
                            style={{
                              left: `${i * 10}%`,
                              width: '8%',
                              height: `${height}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Chart overlay text */}
                    <div className="absolute top-4 left-4 text-sm font-medium">
                      Never Sell, Always Grow
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Current Stack</div>
                      <div className="font-bold">2.5 BTC</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Monthly Income</div>
                      <div className="font-bold text-green-600">€3,200</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
