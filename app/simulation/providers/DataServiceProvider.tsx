"use client"

import React from 'react'

/**
 * @deprecated PR4 cut-over: this provider used to wrap children with the legacy
 * centralizedDataService context. SWR (used by usePriceData) handles caching
 * globally without a provider. PR5 deletes this file once nothing imports it.
 *
 * Kept as a thin pass-through so SimulationPage's <DataServiceProvider> JSX
 * doesn't need to change in this PR.
 */
export function DataServiceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
