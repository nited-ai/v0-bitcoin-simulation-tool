import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { fontSans } from "@/lib/fonts"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "FIRE hodl Simulator",
  description: "Simulate savings, withdrawals and loans secured by Bitcoin.",
  generator: "v0.dev",
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
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Suspense fallback={<div className="w-full h-screen animate-pulse bg-secondary" />}>{children}</Suspense>
        </ThemeProvider>
        {/* Development testing script */}
        {process.env.NODE_ENV === 'development' && (
          <script src="/test-price-switching.js" async />
        )}
        <Analytics />
      </body>
    </html>
  )
}
