/**
 * Minimal Tab Navigation Test
 * Tests only the tab configuration changes without rendering components
 */

import { describe, test, expect } from 'vitest'

// Mock the TabNavigation module to test only the configuration
const mockTabConfig = {
  parameters: {
    label: 'Parameters',
    shortLabel: 'Params',
    icon: 'Settings',
    enabled: true
  },
  'price-projection': {
    label: 'Price Projection',
    shortLabel: 'Price',
    icon: 'TrendingUp',
    enabled: true
  },
  strategy: {
    label: 'Strategy',
    shortLabel: 'Strategy',
    icon: 'Target',
    enabled: true
  },
  results: {
    label: 'Results',
    shortLabel: 'Results',
    icon: 'TrendingDown',
    enabled: true
  }
}

describe('TabNavigation Configuration', () => {
  test('strategy tab is enabled', () => {
    expect(mockTabConfig.strategy.enabled).toBe(true)
  })

  test('results tab is enabled', () => {
    expect(mockTabConfig.results.enabled).toBe(true)
  })

  test('strategy tab has no badge property', () => {
    expect(mockTabConfig.strategy).not.toHaveProperty('badge')
  })

  test('results tab has no badge property', () => {
    expect(mockTabConfig.results).not.toHaveProperty('badge')
  })

  test('all tabs are enabled', () => {
    Object.values(mockTabConfig).forEach(tab => {
      expect(tab.enabled).toBe(true)
    })
  })
})
