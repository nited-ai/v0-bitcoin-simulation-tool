"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, Shield, Bitcoin, TrendingUp, AlertTriangle, Zap } from "lucide-react"

export function FAQ() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <HelpCircle className="w-4 h-4 mr-2" />
            Frequently Asked Questions
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Everything You Need to <span className="text-orange-500">Know</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get answers to the most common questions about Bitcoin-backed lending 
            and achieving financial independence with FIREhodl.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <Bitcoin className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold">Is it safe to use Bitcoin as collateral for loans?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Bitcoin-backed lending is a well-established practice used by institutions and individuals worldwide. 
                    The key is proper risk management and choosing reputable platforms.
                  </p>
                  <p>
                    FIREhodl helps you manage risk by:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Setting conservative LTV (Loan-to-Value) ratios</li>
                    <li>Monitoring liquidation thresholds in real-time</li>
                    <li>Integrating with trusted, regulated lending platforms</li>
                    <li>Providing historical backtesting for strategy validation</li>
                  </ul>
                  <p>
                    Remember: Never risk more than you can afford to lose, and always maintain adequate collateral buffers.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="font-semibold">How accurate are the Bitcoin price predictions?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    FIREhodl uses multiple sophisticated models including the Power Law model, which has shown 
                    remarkable accuracy in predicting Bitcoin's long-term price trajectory.
                  </p>
                  <p>
                    Our prediction models include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Power Law Model:</strong> Based on Bitcoin's mathematical growth patterns</li>
                    <li><strong>Historical Analysis:</strong> Using data from 2013 onwards</li>
                    <li><strong>Manual Growth Rates:</strong> Customizable conservative/optimistic scenarios</li>
                    <li><strong>Moving Averages:</strong> Technical analysis indicators</li>
                  </ul>
                  <p>
                    <strong>Important:</strong> No prediction model is 100% accurate. Always use conservative assumptions 
                    and stress-test your strategies with multiple scenarios.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">What happens if Bitcoin's price drops significantly?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    This is the most important risk to understand and manage. FIREhodl helps you prepare for 
                    Bitcoin volatility through comprehensive risk management tools.
                  </p>
                  <p>
                    Our risk management features include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Liquidation Monitoring:</strong> Real-time alerts when approaching danger zones</li>
                    <li><strong>Conservative LTV Ratios:</strong> Default 50% initial LTV with 95% liquidation threshold</li>
                    <li><strong>Historical Stress Testing:</strong> See how your strategy performs in past bear markets</li>
                    <li><strong>Multiple Scenarios:</strong> Plan for different market conditions</li>
                  </ul>
                  <p>
                    <strong>Example:</strong> With a 50% LTV ratio, Bitcoin would need to drop ~79% from your loan 
                    initiation price to trigger liquidation. Historical data shows this is rare but possible.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold">How much Bitcoin do I need to start?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    There's no minimum Bitcoin requirement to use FIREhodl's simulation tools. However, 
                    practical lending typically requires meaningful collateral amounts.
                  </p>
                  <p>
                    General guidelines:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Simulation:</strong> Any amount - start planning with whatever you have</li>
                    <li><strong>Small loans:</strong> 0.1+ BTC for loans of €5,000-€10,000</li>
                    <li><strong>Meaningful income:</strong> 1+ BTC for monthly income of €1,000+</li>
                    <li><strong>Full FIRE strategy:</strong> 2+ BTC for substantial monthly withdrawals</li>
                  </ul>
                  <p>
                    Remember: You can start small and accumulate more Bitcoin over time. FIREhodl supports 
                    both accumulation and withdrawal strategies.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-semibold">What are the tax implications of Bitcoin-backed loans?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    <strong>Disclaimer:</strong> This is not tax advice. Always consult with a qualified tax professional 
                    in your jurisdiction.
                  </p>
                  <p>
                    General principles (varies by jurisdiction):
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Loans are not taxable events:</strong> Borrowing against Bitcoin typically doesn't trigger capital gains</li>
                    <li><strong>Interest may be deductible:</strong> In some cases, loan interest can offset other income</li>
                    <li><strong>No disposal event:</strong> You retain ownership of your Bitcoin collateral</li>
                    <li><strong>Liquidation consequences:</strong> If liquidated, this may trigger capital gains tax</li>
                  </ul>
                  <p>
                    This tax efficiency is one of the key advantages of Bitcoin-backed lending over selling Bitcoin directly. 
                    However, tax laws are complex and vary significantly by country and individual circumstances.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold">Is FIREhodl free to use?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Yes! FIREhodl's simulation and planning tools are completely free to use. 
                    No account required, no hidden fees, no data harvesting.
                  </p>
                  <p>
                    What's included for free:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>All price prediction models and simulations</li>
                    <li>Strategy backtesting with historical data</li>
                    <li>Risk analysis and projections</li>
                    <li>CSV data export capabilities</li>
                    <li>Integration with lending platform parameters</li>
                  </ul>
                  <p>
                    Our mission is to help Bitcoiners achieve financial independence. The tools should be 
                    accessible to everyone, regardless of their current Bitcoin stack size.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-muted/50 to-muted/30 border-muted">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-4">
                Still Have Questions?
              </h3>
              <p className="text-muted-foreground mb-6">
                Join our community of Bitcoin HODLers or reach out directly. 
                We're here to help you succeed on your FIRE journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Badge variant="outline" className="px-4 py-2">
                  <span>📧 support@firehodl.com</span>
                </Badge>
                <Badge variant="outline" className="px-4 py-2">
                  <span>💬 Join Discord Community</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
