"use client"

import { SimpleNavigation } from "@/components/landing/SimpleNavigation"
import { PersonalLanding } from "@/components/landing/PersonalLanding"

export default function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth">
      <SimpleNavigation />
      <main>
        <PersonalLanding />
      </main>
    </div>
  )
}
