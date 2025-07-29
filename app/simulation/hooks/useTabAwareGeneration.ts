/**
 * Tab-Aware Chart Generation Hook
 * 
 * Prevents unnecessary chart generation when not on the price projection tab.
 * Optimizes performance by deferring expensive calculations until needed.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export function useTabAwareGeneration() {
  const searchParams = useSearchParams()
  const [currentTab, setCurrentTab] = useState<string>('parameters')
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const tab = tabParam || 'parameters'
    
    if (tab !== currentTab) {
      console.log(`🔄 Tab navigation: ${currentTab} → ${tab}`)
      setCurrentTab(tab)
    }
  }, [searchParams, currentTab])
  
  /**
   * Check if we should generate charts based on current tab
   */
  const shouldGenerateCharts = (): boolean => {
    const shouldGenerate = currentTab === 'price-projection'
    
    if (!shouldGenerate) {
      console.log(`⚡ Skipping chart generation: Not on price-projection tab (current: ${currentTab})`)
    }
    
    return shouldGenerate
  }
  
  /**
   * Check if we're on the price projection tab
   */
  const isPriceProjectionTab = (): boolean => {
    return currentTab === 'price-projection'
  }
  
  return {
    currentTab,
    shouldGenerateCharts,
    isPriceProjectionTab
  }
}
