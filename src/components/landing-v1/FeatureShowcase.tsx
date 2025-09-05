"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Building2, 
  Target, 
  Download, 
  BarChart3, 
  Shield, 
  Zap,
  Bitcoin,
  LineChart,
  Settings
} from "lucide-react"

export function FeatureShowcase() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Powerful Features
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Everything You Need for <span className="text-orange-500">Bitcoin FIRE</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Sophisticated tools designed specifically for Bitcoin holders who want to achieve 
            financial independence without selling their stack.
          </p>
        </div>

        <Tabs defaultValue="price-engine" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            <TabsTrigger value="price-engine" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Price Engine</span>
            </TabsTrigger>
            <TabsTrigger value="lending" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Lending</span>
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Strategies</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="price-engine" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-orange-500" />
                    Bitcoin Price Prediction Engine
                  </CardTitle>
                  <CardDescription>
                    Multiple sophisticated price models for accurate Bitcoin projections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Power Law Model</span>
                      <Badge variant="secondary">Most Popular</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Manual Growth Rates</span>
                      <Badge variant="outline">Customizable</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Historical Analysis</span>
                      <Badge variant="outline">Data-Driven</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Historical data starting from 2013 with support for multiple projection scenarios
                    </p>
                    <Button variant="outline" size="sm">
                      Explore Price Models
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Bitcoin Price Projection</h3>
                      <Badge className="bg-orange-500">Live Preview</Badge>
                    </div>
                    
                    {/* Mock Price Chart */}
                    <div className="h-40 bg-gradient-to-t from-orange-500/20 to-orange-500/5 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 flex items-end">
                        <svg className="w-full h-full" viewBox="0 0 300 100">
                          <path
                            d="M 0 80 Q 50 70 100 60 T 200 30 T 300 10"
                            stroke="rgb(249 115 22)"
                            strokeWidth="3"
                            fill="none"
                            className="drop-shadow-sm"
                          />
                          <path
                            d="M 0 80 Q 50 70 100 60 T 200 30 T 300 10 L 300 100 L 0 100 Z"
                            fill="url(#gradient)"
                            opacity="0.3"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(249 115 22)" />
                              <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                      <div className="absolute top-2 left-2 text-xs font-medium">
                        Power Law Projection
                      </div>
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        2024 → 2034
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Current Price</div>
                        <div className="font-bold">€89,234</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">2030 Projection</div>
                        <div className="font-bold text-green-600">€847,000</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lending" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-500" />
                    Multi-Platform Lending Integration
                  </CardTitle>
                  <CardDescription>
                    Real lending platforms with accurate parameters and risk management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">F</div>
                        <span className="font-medium">Firefish</span>
                      </div>
                      <Badge variant="secondary">Integrated</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
                        <span className="font-medium">Strike</span>
                      </div>
                      <Badge variant="secondary">Integrated</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold">+</div>
                        <span className="font-medium">More Platforms</span>
                      </div>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Support for bullet loans, flexible loans, and platform-specific LTV ratios
                    </p>
                    <Button variant="outline" size="sm">
                      View Lending Options
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Loan Configuration</h3>
                      <Badge className="bg-blue-500">Risk Managed</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="text-sm font-medium">Max Loan Amount</span>
                        <span className="font-bold">€45,000</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="text-sm font-medium">Initial LTV</span>
                        <span className="font-bold text-green-600">50%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="text-sm font-medium">Liquidation LTV</span>
                        <span className="font-bold text-red-600">95%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="text-sm font-medium">Interest Rate</span>
                        <span className="font-bold">6.5%</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        <span>Liquidation at €18,947 (-79% from current price)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-green-500" />
                    ATH-Based Strategy
                  </CardTitle>
                  <CardDescription>
                    Loan against Bitcoin when it reaches all-time highs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Trigger</span>
                      <span className="font-medium">New ATH + 10%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loan Amount</span>
                      <span className="font-medium">25% of stack</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Level</span>
                      <Badge variant="outline" className="text-green-600">Conservative</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <LineChart className="w-5 h-5 text-blue-500" />
                    Moving Average Strategy
                  </CardTitle>
                  <CardDescription>
                    Use moving averages to time your lending decisions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Indicator</span>
                      <span className="font-medium">200-day MA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loan Amount</span>
                      <span className="font-medium">40% of stack</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Level</span>
                      <Badge variant="outline" className="text-blue-600">Moderate</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-orange-500" />
                    Custom Strategy
                  </CardTitle>
                  <CardDescription>
                    Build your own strategy with custom parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Flexibility</span>
                      <span className="font-medium">Full Control</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backtesting</span>
                      <span className="font-medium">Historical Data</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Level</span>
                      <Badge variant="outline" className="text-orange-600">Custom</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Advanced Analytics & Export
                  </CardTitle>
                  <CardDescription>
                    Comprehensive data analysis and export capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span className="font-medium">CSV Export</span>
                      </div>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        <span className="font-medium">Historical Analysis</span>
                      </div>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span className="font-medium">Strategy Backtesting</span>
                      </div>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Export your projections and integrate with external analysis tools
                    </p>
                    <Button variant="outline" size="sm">
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Performance Metrics</h3>
                      <Badge className="bg-purple-500">Real-time</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">+847%</div>
                        <div className="text-xs text-muted-foreground">Stack Growth</div>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">€3,200</div>
                        <div className="text-xs text-muted-foreground">Monthly Income</div>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">12%</div>
                        <div className="text-xs text-muted-foreground">Max Decline</div>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">95%</div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
