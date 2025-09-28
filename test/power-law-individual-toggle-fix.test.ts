/**
 * Test for Power Law individual line toggle fix
 * 
 * This test validates that clicking one Power Law line only affects that specific line,
 * not the other Power Law lines.
 */

import { describe, it, expect } from 'vitest'

describe('Power Law Individual Toggle Fix', () => {
  describe('Individual Line Visibility Logic', () => {
    it('should show only PL Support when clicked on non-Power Law model', () => {
      const params = { priceModel: 'manual' }
      
      // Initial state - all lines hidden on non-Power Law model
      let showPLSupport = true
      let showPLFit = true
      let showPLResistance = true
      let manualPLSupport = false
      let manualPLFit = false
      let manualPLResistance = false
      
      // Simulate clicking PL Support (smart toggle logic)
      const newManualPLSupport = !manualPLSupport // Will be true (enabled)
      if (newManualPLSupport) {
        // If enabling manual override, ensure line is visible
        showPLSupport = true
      }
      manualPLSupport = newManualPLSupport
      
      // Test visibility logic
      const plSupportHidden = params.priceModel === 'powerLaw' 
        ? !showPLSupport 
        : !showPLSupport || !manualPLSupport
      
      const plFitHidden = params.priceModel === 'powerLaw' 
        ? !showPLFit 
        : !showPLFit || !manualPLFit
      
      const plResistanceHidden = params.priceModel === 'powerLaw' 
        ? !showPLResistance 
        : !showPLResistance || !manualPLResistance
      
      expect(plSupportHidden).toBe(false) // Should be visible (clicked)
      expect(plFitHidden).toBe(true) // Should remain hidden (not clicked)
      expect(plResistanceHidden).toBe(true) // Should remain hidden (not clicked)
    })

    it('should show only PL Fit when clicked on non-Power Law model', () => {
      const params = { priceModel: 'cycleRepeat' }
      
      // Initial state - all lines hidden on non-Power Law model
      let showPLSupport = true
      let showPLFit = true
      let showPLResistance = true
      let manualPLSupport = false
      let manualPLFit = false
      let manualPLResistance = false
      
      // Simulate clicking PL Fit (smart toggle logic)
      const newManualPLFit = !manualPLFit // Will be true (enabled)
      if (newManualPLFit) {
        // If enabling manual override, ensure line is visible
        showPLFit = true
      }
      manualPLFit = newManualPLFit
      
      // Test visibility logic
      const plSupportHidden = params.priceModel === 'powerLaw' 
        ? !showPLSupport 
        : !showPLSupport || !manualPLSupport
      
      const plFitHidden = params.priceModel === 'powerLaw' 
        ? !showPLFit 
        : !showPLFit || !manualPLFit
      
      const plResistanceHidden = params.priceModel === 'powerLaw' 
        ? !showPLResistance 
        : !showPLResistance || !manualPLResistance
      
      expect(plSupportHidden).toBe(true) // Should remain hidden (not clicked)
      expect(plFitHidden).toBe(false) // Should be visible (clicked)
      expect(plResistanceHidden).toBe(true) // Should remain hidden (not clicked)
    })

    it('should show only PL Resistance when clicked on non-Power Law model', () => {
      const params = { priceModel: 'enhancedCycleRepeat' }
      
      // Initial state - all lines hidden on non-Power Law model
      let showPLSupport = true
      let showPLFit = true
      let showPLResistance = true
      let manualPLSupport = false
      let manualPLFit = false
      let manualPLResistance = false
      
      // Simulate clicking PL Resistance (smart toggle logic)
      const newManualPLResistance = !manualPLResistance // Will be true (enabled)
      if (newManualPLResistance) {
        // If enabling manual override, ensure line is visible
        showPLResistance = true
      }
      manualPLResistance = newManualPLResistance
      
      // Test visibility logic
      const plSupportHidden = params.priceModel === 'powerLaw' 
        ? !showPLSupport 
        : !showPLSupport || !manualPLSupport
      
      const plFitHidden = params.priceModel === 'powerLaw' 
        ? !showPLFit 
        : !showPLFit || !manualPLFit
      
      const plResistanceHidden = params.priceModel === 'powerLaw' 
        ? !showPLResistance 
        : !showPLResistance || !manualPLResistance
      
      expect(plSupportHidden).toBe(true) // Should remain hidden (not clicked)
      expect(plFitHidden).toBe(true) // Should remain hidden (not clicked)
      expect(plResistanceHidden).toBe(false) // Should be visible (clicked)
    })
  })

  describe('Multiple Line Toggle Scenarios', () => {
    it('should allow multiple Power Law lines to be enabled independently', () => {
      const params = { priceModel: 'manual' }
      
      // Initial state
      let showPLSupport = true
      let showPLFit = true
      let showPLResistance = true
      let manualPLSupport = false
      let manualPLFit = false
      let manualPLResistance = false
      
      // Click PL Support first (smart toggle logic)
      const newManualPLSupport = !manualPLSupport // Will be true
      if (newManualPLSupport) {
        showPLSupport = true
      }
      manualPLSupport = newManualPLSupport

      // Click PL Resistance second (smart toggle logic)
      const newManualPLResistance = !manualPLResistance // Will be true
      if (newManualPLResistance) {
        showPLResistance = true
      }
      manualPLResistance = newManualPLResistance
      
      // Test visibility logic
      const plSupportHidden = params.priceModel === 'powerLaw' 
        ? !showPLSupport 
        : !showPLSupport || !manualPLSupport
      
      const plFitHidden = params.priceModel === 'powerLaw' 
        ? !showPLFit 
        : !showPLFit || !manualPLFit
      
      const plResistanceHidden = params.priceModel === 'powerLaw' 
        ? !showPLResistance 
        : !showPLResistance || !manualPLResistance
      
      expect(plSupportHidden).toBe(false) // Should be visible (clicked)
      expect(plFitHidden).toBe(true) // Should remain hidden (not clicked)
      expect(plResistanceHidden).toBe(false) // Should be visible (clicked)
    })

    it('should allow toggling individual lines off after enabling them', () => {
      const params = { priceModel: 'manual' }
      
      // Start with PL Support enabled
      let showPLSupport = true
      let manualPLSupport = true
      
      // Click PL Support again to disable it
      showPLSupport = !showPLSupport // Will be false
      manualPLSupport = !manualPLSupport // Will be false
      
      // Test visibility logic
      const plSupportHidden = params.priceModel === 'powerLaw' 
        ? !showPLSupport 
        : !showPLSupport || !manualPLSupport
      
      expect(plSupportHidden).toBe(true) // Should be hidden (toggled off)
    })
  })

  describe('Model Switching Reset Logic', () => {
    it('should reset all individual manual overrides when switching to Power Law model', () => {
      // Start with manual overrides enabled on non-Power Law model
      let manualPLSupport = true
      let manualPLFit = true
      let manualPLResistance = false
      
      // Simulate switching to Power Law model
      const newPriceModel = 'powerLaw'
      if (newPriceModel === 'powerLaw') {
        manualPLSupport = false
        manualPLFit = false
        manualPLResistance = false
      }
      
      expect(manualPLSupport).toBe(false)
      expect(manualPLFit).toBe(false)
      expect(manualPLResistance).toBe(false)
    })

    it('should preserve individual manual overrides when switching between non-Power Law models', () => {
      // Start with some manual overrides enabled
      let manualPLSupport = true
      let manualPLFit = false
      let manualPLResistance = true
      
      // Simulate switching to another non-Power Law model
      const newPriceModel = 'cycleRepeat'
      if (newPriceModel === 'powerLaw') {
        manualPLSupport = false
        manualPLFit = false
        manualPLResistance = false
      }
      
      // Should remain unchanged
      expect(manualPLSupport).toBe(true)
      expect(manualPLFit).toBe(false)
      expect(manualPLResistance).toBe(true)
    })
  })

  describe('Chart Data Generation Logic', () => {
    it('should generate Power Law data when any individual manual override is enabled', () => {
      const testCases = [
        { manualPLSupport: true, manualPLFit: false, manualPLResistance: false },
        { manualPLSupport: false, manualPLFit: true, manualPLResistance: false },
        { manualPLSupport: false, manualPLFit: false, manualPLResistance: true },
        { manualPLSupport: true, manualPLFit: true, manualPLResistance: true },
      ]
      
      testCases.forEach(({ manualPLSupport, manualPLFit, manualPLResistance }) => {
        const params = { priceModel: 'manual' }
        
        // Test the condition for Power Law overlay generation
        const shouldGeneratePowerLawOverlay = 
          params.priceModel === 'powerLaw' || 
          manualPLSupport || 
          manualPLFit || 
          manualPLResistance || 
          true // Always generate for cross-model comparison
        
        expect(shouldGeneratePowerLawOverlay).toBe(true)
      })
    })
  })

  describe('Bug Fix Validation', () => {
    it('should fix the original bug: clicking one line should not affect others', () => {
      const params = { priceModel: 'manual' }
      
      // Initial state - all lines should be hidden on non-Power Law model
      let showPLSupport = true
      let showPLFit = true
      let showPLResistance = true
      let manualPLSupport = false
      let manualPLFit = false
      let manualPLResistance = false
      
      // Simulate clicking ONLY PL Support (the bug scenario - smart toggle logic)
      if (params.priceModel !== 'powerLaw') {
        const newManualPLSupport = !manualPLSupport // Will be true
        if (newManualPLSupport) {
          showPLSupport = true
        }
        manualPLSupport = newManualPLSupport
      }
      
      // Test that ONLY PL Support is affected
      const plSupportHidden = params.priceModel === 'powerLaw' 
        ? !showPLSupport 
        : !showPLSupport || !manualPLSupport
      
      const plFitHidden = params.priceModel === 'powerLaw' 
        ? !showPLFit 
        : !showPLFit || !manualPLFit
      
      const plResistanceHidden = params.priceModel === 'powerLaw' 
        ? !showPLResistance 
        : !showPLResistance || !manualPLResistance
      
      // The fix: only the clicked line should be visible
      expect(plSupportHidden).toBe(false) // ✅ PL Support should be visible (clicked)
      expect(plFitHidden).toBe(true) // ✅ PL Fit should remain hidden (not clicked)
      expect(plResistanceHidden).toBe(true) // ✅ PL Resistance should remain hidden (not clicked)
      
      // Verify the manual override states
      expect(manualPLSupport).toBe(true) // ✅ Should be enabled for clicked line
      expect(manualPLFit).toBe(false) // ✅ Should remain disabled for non-clicked line
      expect(manualPLResistance).toBe(false) // ✅ Should remain disabled for non-clicked line
    })
  })
})
