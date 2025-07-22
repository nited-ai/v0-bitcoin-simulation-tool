"use client"

import BitcoinSimulator from "./simulation"
import { Suspense } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "@/lib/i18n"

export default function Page() {
  return (
    <Suspense fallback={<div className="w-full h-screen animate-pulse bg-secondary" />}>
      <I18nextProvider i18n={i18n}>
        <BitcoinSimulator />
      </I18nextProvider>
    </Suspense>
  )
}
