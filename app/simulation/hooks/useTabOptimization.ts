/**
 * Tab Navigation Optimization Hook
 * 
 * Prevents unnecessary chart regeneration when switching between tabs.
 * Tracks tab changes and optimizes component rendering.
 */

import { useEffect, useRef } from 'react'
import { smartChartCache } from '@/lib/price-engine/smart-chart-cache'

interface TabOptimizationOptions {
  currentTab: string
  onTabChange?: (tab: string) => void
}

export function useTabOptimization({ currentTab, onTabChange }: TabOptimizationOptions) {
  const previousTab = useRef<string>(currentTab)
  const isTabSwitching = useRef<boolean>(false)
  
  useEffect(() => {
    // Detect tab switching
    if (previousTab.current !== currentTab) {
      console.log(`🔄 Tab navigation: ${previousTab.current} → ${currentTab}`)
      isTabSwitching.current = true
      
      // Call optional callback
      onTabChange?.(currentTab)
      
      // Reset tab switching flag after a short delay
      const timer = setTimeout(() => {
        isTabSwitching.current = false
        console.log(`✅ Tab navigation complete: Now on ${currentTab}`)
      }, 100)
      
      previousTab.current = currentTab
      
      return () => clearTimeout(timer)
    }
  }, [currentTab, onTabChange])
  
  /**
   * Check if we're currently switching tabs
   */
  const isCurrentlyTabSwitching = (): boolean => {
    return isTabSwitching.current
  }
  
  /**
   * Get cache statistics for debugging
   */
  const getCacheStats = () => {
    return smartChartCache.getCacheStats()
  }
  
  /**
   * Clear cache if needed (for debugging)
   */
  const clearCache = () => {
    smartChartCache.clearCache()
  }
  
  return {
    isTabSwitching: isCurrentlyTabSwitching,
    getCacheStats,
    clearCache,
    previousTab: previousTab.current
  }
}
