"use client"

import { useTranslation } from "react-i18next"
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"

/**
 * Simulation Header Component
 * 
 * Displays the main title, description, and controls (theme toggle, language switcher)
 * Extracted from the monolithic simulation.tsx to improve maintainability.
 */
export function SimulationHeader() {
  const { t } = useTranslation()

  // Fallback for missing translations
  const safeT = (key: string, fallback?: string) => {
    try {
      return t(key) || fallback || key
    } catch {
      return fallback || key
    }
  }

  return (
    <div className="flex justify-between items-center mb-8">
      {/* Left spacer */}
      <div className="flex-1"></div>
      
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
  )
}
