/**
 * DEPRECATED: This hook has been replaced by useCentralizedData
 *
 * This file is kept for backward compatibility but should not be used in new code.
 * Use useCentralizedData, useHistoricalDataOnly, or useCurrentPriceOnly instead.
 *
 * @deprecated Use useCentralizedData from './useCentralizedData' instead
 */

import { useEffect } from "react"
import { useCentralizedData } from "./useCentralizedData"

/**
 * @deprecated Use useCentralizedData instead
 */
export function useHistoricalData() {
  console.warn('⚠️ useHistoricalData is deprecated. Use useCentralizedData instead.')

  // Delegate to the new centralized data hook
  const result = useCentralizedData()

  return {
    firstRun: { current: false }, // For backward compatibility
    ...result
  }
}


