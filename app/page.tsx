"use client"

import { Navigation } from "@/components/landing/Navigation"
import { HeroSection } from "@/components/landing/HeroSection"
import { ProblemSolution } from "@/components/landing/ProblemSolution"
import { FeatureShowcase } from "@/components/landing/FeatureShowcase"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { FAQ } from "@/components/landing/FAQ"
import { FinalCTA } from "@/components/landing/FinalCTA"

export default function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth">
      <Navigation />
      <main>
        <HeroSection />
        <ProblemSolution />
        <section id="features">
          <FeatureShowcase />
        </section>
        <HowItWorks />
        <section id="faq">
          <FAQ />
        </section>
        <FinalCTA />
      </main>
    </div>
  )
}
