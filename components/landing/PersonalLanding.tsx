"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

export function PersonalLanding() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-16">

      {/* 1. Hero Section with Personal Introduction */}
      <section id="hero" className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold">
            FIRE hodl
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            The simulation tool for Bitcoin holders to achieve financial independence and retire early
          </p>
        </div>

        {/* Hero Image */}
        <div className="flex justify-center">
          <div className="w-64 h-128 relative">
            <Image
              src="/hero-bitcoin-beach.png"
              alt="Bitcoin character on tropical beach - representing financial freedom"
              width={256}
              height={512}
              className="rounded-lg"
              priority
            />
          </div>
        </div>

        <div className="space-y-4 text-lg">
          <p>
            Hi! I'm a developer who created this Bitcoin simulation tool because I believe in a simple truth:
            <br></br><strong> You shouldn't have to sell the hardest money ever created to achieve financial freedom.</strong>
          </p>
          <p>
            As Bitcoin matures, new opportunities are emerging to use BTC as collateral for loans while maintaining custody.
            This opens doors for Bitcoiners to either live off their Bitcoin or use loans for leveraging to accumulate more BTC.
          </p>
          <p className="text-orange-600 dark:text-orange-400 font-medium">
            Live off your Bitcoin without selling through strategic lending and accumulation.
          </p>
        </div>

        <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-3">
          <Link href="/simulation">
            Go to Simuator
          </Link>
        </Button>
      </section>

      {/* 2. Honest Problem Statement */}
      <section id="about" className="space-y-6">
        <h2 className="text-3xl font-bold">Let's Be Honest About the Risks</h2>
        <div className="space-y-4 text-lg">
          <p>
            <strong>Using BTC as collateral carries real risks - you could lose your Bitcoin if you're not careful.</strong>
          </p>
          <p>
            I created this simulator to help people understand what to expect and be aware of these risks before making any decisions.
            This isn't financial advice - it's a tool to help you think through scenarios and understand the mechanics.
          </p>
          <p>
            The traditional approach of "sell your assets to retire" never made sense to me when it comes to Bitcoin.
            Why sell the best performing asset in history when you might be able to use it as collateral instead?
          </p>
        </div>
      </section>

      {/* 3. Current Capabilities Section */}
      <section id="features" className="space-y-6">
        <h2 className="text-3xl font-bold">What the Tool Can Do Right Now</h2>
        <p className="text-lg text-muted-foreground">
          Functionality is currently limited but expanding. Here's what you can simulate today:
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Price Projections and CSV Download</h3>
              <ul className="space-y-2">
                <li>• Power Law model for long-term Bitcoin price forecasting</li>
                <li>• Manual growth rate scenarios</li>
                <li>• Historical data analysis from 2013</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Lending Strategies</h3>
              <ul className="space-y-2">
                <li>• Firefish and Strike platform integration</li>
                <li>• Custom loan parameters</li>
                <li>• Liquidation risk analysis</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Accumulation Strategies</h3>
              <ul className="space-y-2">
                <li>• DCA (Dollar Cost Averaging) simulation</li>
                <li>• ATH-based buying strategies</li>
                <li>• Moving average strategies</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Risk Analysis</h3>
              <ul className="space-y-2">
                <li>• Maximum decline calculations</li>
                <li>• Liquidation price tracking</li>
                <li>• Portfolio performance metrics</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Future Roadmap */}
      <section id="roadmap" className="space-y-6">
        <h2 className="text-3xl font-bold">What's Coming Next</h2>
        <div className="space-y-4 text-lg">
          <p>I'm actively working on expanding the tool's capabilities:</p>
          
          <div className="space-y-3">
            <div>
              <strong>Different Loan Strategies:</strong> More sophisticated approaches to when and how much to borrow
            </div>
            <div>
              <strong>Custom Strategy Builder:</strong> Create your own lending and accumulation strategies
            </div>
            <div>
              <strong>Comprehensive Result Overviews:</strong> Better visualization and analysis of simulation results
            </div>
            <div>
              <strong>Risk Management Features:</strong> Alerts for when to take loans and when liquidation risks become too high
            </div>
            <div>
              <strong>Historical Backtesting:</strong> Test strategies against real historical Bitcoin data
            </div>
          </div>
        </div>
      </section>

      {/* 5. Personal Mission Statement */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Why I Built This</h2>
        <div className="space-y-4 text-lg">
          <p>
            I developed this tool for my own use first - I wanted to understand the risks and opportunities
            of using Bitcoin as collateral before making any real-world decisions.
          </p>
          <p>
            But I believe everyone should have access to these kinds of analysis tools. Financial independence
            shouldn't be reserved for people with expensive financial advisors.
          </p>
          <p>
            <strong>I want everyone to benefit and achieve financial independence/early retirement.</strong>
            That's why I'm sharing this tool and why I want your feedback and feature requests.
          </p>
          <p>
            If you're a fellow Bitcoiner working on similar problems or have ideas for improvements,
            I'd love to connect and collaborate.
          </p>
        </div>
      </section>

      {/* 6. Transparent Donation Request */}
      <section id="support" className="space-y-6">
        <h2 className="text-3xl font-bold">Support This Project</h2>
        <div className="space-y-4 text-lg">
          <p>
            I'm working full-time on this project without any payment because I believe it can help the Bitcoin community.
          </p>
          <p>
            <strong>All features will remain free and accessible forever.</strong> No subscriptions, no premium tiers, no paywalls.
          </p>
          <p>
            If this tool helps you or you believe in the mission, Bitcoin donations help me continue development:
          </p>
        </div>

        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <p className="font-semibold">Bitcoin Donation Address:</p>
              <code className="text-sm bg-background px-3 py-2 rounded border break-all">
                bc1qkx00f29cck28qfz9m4y69y502fkqv2tw0cr2rw
              </code>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-white p-4 rounded-lg border">
                <Image
                  src="/bitcoin-qr-code.png"
                  alt="Bitcoin donation QR code for bc1qkx00f29cck28qfz9m4y69y502fkqv2tw0cr2rw"
                  width={176}
                  height={176}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Every satoshi helps keep this project alive and growing
            </p>
          </CardContent>
        </Card>

        <div className="text-lg">
          <p className="text-center">
            Any support, feedback or feature requests are appreciatively welcome!
            <br></br>Reach out on <a href="https://x.com/hodl_fire" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700">X</a> 
             &nbsp;or simply write to <a href="mailto:reachout@firehodl.com" className="text-orange-600 hover:text-orange-700">reachout@firehodl.com</a>.
          </p>
        </div>
      </section>

      {/* 7. Bitcoin Ethos Commitment */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Living the Bitcoin Ethos</h2>
        <div className="space-y-4 text-lg">
          <p>
            This tool embodies the principles that make Bitcoin special:
          </p>

          <div className="space-y-3">
            <div>
              <strong>Free Forever:</strong> The simulator will always be free. No rug pulls, no bait-and-switch.
            </div>
            <div>
              <strong>Privacy First:</strong> No accounts required, no private data collection, no KYC requirements.
            </div>
            <div>
              <strong>Open Development:</strong> Built in the open, with transparency about features and limitations.
            </div>
            <div>
              <strong>Community Driven:</strong> Your feedback shapes the roadmap. This is for Bitcoiners, by a Bitcoiner.
            </div>
          </div>

          <p>
            I'm committed to building tools that respect your privacy and freedom, just like Bitcoin itself.
          </p>
        </div>
      </section>

      {/* 8. Feature Summary & Call to Action */}
      <section className="space-y-8 text-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Ready to Explore?</h2>
          <p className="text-lg text-muted-foreground">
            Start simulating your path to financial independence without selling your Bitcoin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600">
            <Link href="/simulation">
              Go to Simuator
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="#about">
              Learn More
            </Link>
          </Button>
        </div>

        <div className="pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Built with ❤️ for the Bitcoin community • Always free • Privacy focused
          </p>
        </div>
      </section>

    </div>
  )
}
