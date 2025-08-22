"use client"

import { useTranslation } from "react-i18next"
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"
import Link from "next/link"
import { Home, Menu, Globe, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { useState } from "react"

/**
 * Simulation Header Component
 * 
 * Displays the main title, description, and controls (theme toggle, language switcher)
 * Extracted from the monolithic simulation.tsx to improve maintainability.
 */
export function SimulationHeader() {
  const { t } = useTranslation()
  const { setTheme, theme } = useTheme()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Fallback for missing translations
  const safeT = (key: string, fallback?: string) => {
    try {
      return t(key) || fallback || key
    } catch {
      return fallback || key
    }
  }

  return (
    <div className="mb-8">
      {/* Desktop Layout - unchanged */}
      <div className="hidden md:flex justify-between items-center">
        {/* Left: Navigation */}
        <div className="flex-1">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              {safeT("Navigation.backToLanding.button", "Back to Landing")}
            </Link>
          </Button>
        </div>

        {/* Center: Title and Description */}
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold mb-2">
            {safeT("Page.title", "FIRE hodl Simulator")}
          </h1>
          <p className="text-muted-foreground">{safeT("Page.description", "Simulate savings, withdrawals and loans secured by Bitcoin")}</p>
        </div>

        {/* Right: Controls */}
        <div className="flex-1 flex justify-end gap-2">
          <LocaleSwitcher />
          <ModeToggle />
        </div>
      </div>

      {/* Mobile Layout - optimized */}
      <div className="md:hidden flex justify-end items-center">
        {/* Mobile Navigation Menu */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>{safeT("Navigation.title", "Navigation")}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              {/* Home Button */}
              <Button variant="ghost" asChild className="justify-start gap-3 h-12" onClick={() => setIsSheetOpen(false)}>
                <Link href="/">
                  <Home className="w-5 h-5" />
                  <span className="flex-1 text-left">{safeT("Navigation.backToLanding.button", "Back to Landing")}</span>
                </Link>
              </Button>

              {/* Language Selector */}
              <div className="flex items-center gap-3 px-3 py-2">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <LocaleSwitcher />
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                  <span className="flex-1 text-sm font-medium">Theme</span>
                </div>
                <div className="flex flex-col gap-1 ml-8">
                  <Button
                    variant={theme === "light" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => setTheme("light")}
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => setTheme("system")}
                  >
                    System
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
