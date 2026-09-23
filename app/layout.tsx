import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TouchProvider, HybridTooltipProvider } from "@/components/ui/hybrid-tooltip"
import { cn } from "@/lib/utils"
import { fontSans } from "@/lib/fonts"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "FireHODL | Bitcoin Investment Simulator",
  description: "Bitcoin-Strategien mit gleichem Budget vergleichen: Sparplan, Entnahmen, Cashreserve und Kredite unter verschiedenen Marktszenarien.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)} suppressHydrationWarning>
        <TouchProvider>
          <HybridTooltipProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <Suspense fallback={<div className="w-full h-screen animate-pulse bg-secondary" />}>{children}</Suspense>
            </ThemeProvider>
          </HybridTooltipProvider>
        </TouchProvider>
        {/* Development testing script - temporarily disabled to fix server issues */}
        {/* {process.env.NODE_ENV === 'development' && (
          <script src="/test-price-switching.js" async />
        )} */}
      </body>
    </html>
  )
}
