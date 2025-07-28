"use client"

import { Button } from "@/components/ui/button"
import { Bitcoin } from "lucide-react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Bitcoin className="w-8 h-8 text-orange-500" />
            <span className="text-xl font-bold">FIREhodl</span>
          </div>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="#how-it-works" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link 
              href="#features" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link 
              href="#faq" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/simulation">
                Start Simulation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
