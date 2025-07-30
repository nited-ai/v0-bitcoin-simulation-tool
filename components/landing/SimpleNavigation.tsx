"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export function SimpleNavigation() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">FIRE hodl</span>
        </Link>

        {/* Simple Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#roadmap" className="text-muted-foreground hover:text-foreground transition-colors">
            Roadmap
          </Link>
          <Link href="#support" className="text-muted-foreground hover:text-foreground transition-colors">
            Donate
          </Link>
        </div>

        {/* Controls and CTA Button */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/simulation">
              Go to Simuator
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
