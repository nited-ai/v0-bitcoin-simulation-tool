---
description: Comprehensive Localization Rules for Bitcoin Simulation Application
globs: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"]
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Localization Rules for Bitcoin Simulation Application

<ai_meta>
  <parsing_rules>
    - Scan all modified files for hardcoded user-facing strings
    - Detect untranslated text in UI components
    - Validate translation key consistency
    - Ensure no hardcoded strings reach production
  </parsing_rules>
  <file_conventions>
    - encoding: UTF-8
    - line_endings: LF
    - translation_keys: camelCase with dot notation
    - locale_files: JSON format in public/locales/
  </file_conventions>
</ai_meta>

## Overview

<purpose>
  - Establish comprehensive localization for English and German languages
  - Create automated detection of hardcoded user-facing strings
  - Integrate with existing react-i18next infrastructure
  - Ensure consistent translation patterns across the application
</purpose>

<context>
  - Bitcoin simulation application with modular architecture
  - Existing i18n setup with react-i18next and i18next-browser-languagedetector
  - Components in app/simulation/components/ need localization
  - Current fallback translations exist in lib/i18n.ts
</context>

## Pre-Commit Localization Workflow

<workflow_steps>
  <step number="1" name="file_scanning">
    ### Step 1: Scan Modified Files
    
    <scan_targets>
      - All .tsx and .ts files in app/simulation/components/
      - Navigation components (TabNavigation.tsx)
      - Parameter cards (BasicParametersCard.tsx, LoanParametersCard.tsx, etc.)
      - Chart components (UnifiedPriceChart.tsx, PortfolioValueChart.tsx, etc.)
      - Layout components (SimulationHeader.tsx)
      - Landing page components
    </scan_targets>
    
    <detection_patterns>
      - Hardcoded strings in JSX: `<div>Hardcoded Text</div>`
      - Button labels: `<Button>Click Me</Button>`
      - Tooltip content: `<TooltipContent>Help text</TooltipContent>`
      - Error messages: `throw new Error("Hardcoded error")`
      - Chart labels and legends
      - Form labels and placeholders
      - Alert and notification messages
    </detection_patterns>
  </step>

  <step number="2" name="string_extraction">
    ### Step 2: Extract User-Facing Strings
    
    <extraction_rules>
      - Ignore technical strings (console.log, debug messages)
      - Focus on user-visible text in UI components
      - Extract tooltip content and help text
      - Include error messages and validation text
      - Capture chart labels, legends, and axis titles
      - Extract button labels and navigation text
    </extraction_rules>
    
    <exclusion_patterns>
      - console.log() messages
      - Technical error codes
      - CSS class names
      - API endpoint URLs
      - File paths and imports
      - Variable names and function names
    </exclusion_patterns>
  </step>

  <step number="3" name="key_generation">
    ### Step 3: Generate Translation Keys
    
    <naming_conventions>
      - Format: ComponentName.elementType.description
      - Examples:
        - BasicParametersCard.title
        - BasicParametersCard.btcAmount.label
        - BasicParametersCard.btcAmount.tooltip
        - TabNavigation.parameters.label
        - UnifiedPriceChart.loading.message
        - ValidationErrors.collateralSufficiency.message
    </naming_conventions>
    
    <key_structure>
      - Component level: ComponentName.*
      - Element level: ComponentName.elementName.*
      - Type suffixes: .label, .tooltip, .placeholder, .error, .description
      - Chart specific: .title, .legend, .axis, .tooltip
      - Navigation: .label, .shortLabel, .badge
    </key_structure>
  </step>
</workflow_steps>

## Integration with Existing i18n System

<current_infrastructure>
  - react-i18next with useTranslation hook
  - Fallback translations in lib/i18n.ts
  - Locale files in public/locales/en/ and public/locales/de/
  - SafeT function pattern for missing translations
  - Language detection disabled to prevent hydration issues
</current_infrastructure>

<integration_patterns>
  <pattern name="useTranslation_hook">
    ```typescript
    import { useTranslation } from "react-i18next"
    
    export function ComponentName() {
      const { t } = useTranslation()
      
      return (
        <div>
          <h1>{t('ComponentName.title')}</h1>
          <p>{t('ComponentName.description')}</p>
        </div>
      )
    }
    ```
  </pattern>
  
  <pattern name="safeT_function">
    ```typescript
    const safeT = (key: string, fallback?: string) => {
      try {
        return t(key) || fallback || key
      } catch {
        return fallback || key
      }
    }
    ```
  </pattern>
</integration_patterns>

## Validation Rules

<validation_checks>
  <check name="no_hardcoded_strings">
    - Scan for strings in JSX elements that don't use t() function
    - Flag button labels without translation
    - Detect tooltip content without i18n
    - Identify error messages not using translation keys
  </check>
  
  <check name="translation_key_consistency">
    - Verify all translation keys exist in both en/ and de/ locale files
    - Check for missing translations in fallback object
    - Validate key naming follows established conventions
    - Ensure no duplicate or conflicting keys
  </check>
  
  <check name="component_coverage">
    - Verify all user-facing components use useTranslation
    - Check that safeT fallback function is implemented
    - Ensure error boundaries have localized messages
    - Validate chart components have translated labels
  </check>
</validation_checks>

## Target Components for Localization

<priority_components>
  <high_priority>
    - app/simulation/components/navigation/TabNavigation.tsx
    - app/simulation/components/layout/SimulationHeader.tsx
    - app/simulation/components/parameters/BasicParametersCard.tsx
    - app/simulation/components/parameters/LoanParametersCard.tsx
    - app/simulation/components/charts/UnifiedPriceChart.tsx
    - app/simulation/components/results/ResultsPage.tsx
  </high_priority>
  
  <medium_priority>
    - app/simulation/components/parameters/CollateralVisualizationCard.tsx
    - app/simulation/components/parameters/PriceDropToleranceCard.tsx
    - app/simulation/components/charts/PortfolioValueChart.tsx
    - app/simulation/components/charts/DebtCollateralChart.tsx
    - components/landing/SimpleNavigation.tsx
  </medium_priority>
  
  <low_priority>
    - Error boundary components
    - Admin components (CsvUpdatePanel.tsx)
    - Test files and utilities
  </low_priority>
</priority_components>

## Automated Translation Key Management

<automation_rules>
  <rule name="key_generation">
    - Automatically generate translation keys for new hardcoded strings
    - Add keys to both English and German locale files
    - Use English text as default value for new keys
    - Mark German translations as "TODO" for manual translation
  </rule>
  
  <rule name="file_updates">
    - Update locale files: public/locales/en/translation.json
    - Update locale files: public/locales/de/translation.json
    - Update fallback translations in lib/i18n.ts
    - Replace hardcoded strings with t() function calls
  </rule>
  
  <rule name="validation_integration">
    - Run validation checks before allowing commits
    - Generate reports of missing translations
    - Flag components without proper i18n integration
    - Ensure all user-facing text is translatable
  </rule>
</automation_rules>

## Implementation Standards

<standards>
  <translation_patterns>
    - Use useTranslation hook in all UI components
    - Implement safeT fallback function for error handling
    - Follow established key naming conventions
    - Maintain consistency with existing translation structure
  </translation_patterns>

  <file_organization>
    - Group translations by component in locale files
    - Use nested objects for complex components
    - Maintain alphabetical order within sections
    - Keep fallback translations synchronized
  </file_organization>

  <quality_assurance>
    - All new strings must have translation keys
    - German translations marked for review
    - Consistent terminology across components
    - Context-appropriate translations for technical terms
  </quality_assurance>
</standards>

## Current State Analysis

<existing_infrastructure>
  <i18n_setup>
    - react-i18next configured with fallback system
    - English (en) and German (de, de-DE) locales supported
    - Spanish (es) locale partially implemented
    - Fallback translations defined in lib/i18n.ts
    - Language detection disabled for SSR compatibility
  </i18n_setup>

  <translation_coverage>
    - SimulationHeader.tsx: ✅ Fully localized with safeT fallback
    - HowItWorksContent.tsx: ✅ Uses useTranslation hook
    - TabNavigation.tsx: ❌ Hardcoded tab labels and badges
    - BasicParametersCard.tsx: ❌ Mixed - some labels hardcoded
    - Chart components: ❌ Mostly hardcoded labels and tooltips
    - Error messages: ❌ Hardcoded validation messages
  </translation_coverage>

  <identified_hardcoded_strings>
    - Navigation: "Parameters", "Price Projection", "Strategy", "Results"
    - Badges: "Coming Soon"
    - Button labels: "Back to Landing", "Start Simulation"
    - Form labels: "Initial BTC Price", "BTC Amount"
    - Tooltips: "Starting Bitcoin price in USD for the simulation"
    - Chart titles: "Bitcoin Price Forecast", "Portfolio Value Over Time"
    - Error states: "Loading chart data...", "Run a simulation to see chart"
    - Validation messages: Various field validation errors
  </identified_hardcoded_strings>
</existing_infrastructure>

## Pre-Commit Hook Implementation

<hook_specification>
  <trigger_conditions>
    - Any .tsx or .ts file modified in app/simulation/components/
    - Changes to navigation or layout components
    - Modifications to chart or visualization components
    - Updates to form components with user-facing text
  </trigger_conditions>

  <scanning_algorithm>
    ```typescript
    // Pseudo-code for string detection
    function scanForHardcodedStrings(filePath: string): HardcodedString[] {
      const content = readFile(filePath)
      const hardcodedStrings: HardcodedString[] = []

      // Scan for JSX text content
      const jsxTextRegex = />([^<>{]+)</g

      // Scan for string literals in specific contexts
      const buttonLabelRegex = /<Button[^>]*>([^<]+)</g
      const tooltipRegex = /<TooltipContent[^>]*>([^<]+)</g

      // Extract and validate each found string
      // Generate translation keys
      // Check against existing translations

      return hardcodedStrings
    }
    ```
  </scanning_algorithm>

  <validation_process>
    1. Scan modified files for hardcoded strings
    2. Generate appropriate translation keys
    3. Check if keys exist in locale files
    4. Validate German translations are present
    5. Ensure component uses useTranslation hook
    6. Block commit if validation fails
  </validation_process>
</hook_specification>

## Translation Key Mapping Strategy

<key_mapping_examples>
  <navigation_keys>
    - "Parameters" → "Navigation.parameters.label"
    - "Price Projection" → "Navigation.priceProjection.label"
    - "Strategy" → "Navigation.strategy.label"
    - "Results" → "Navigation.results.label"
    - "Coming Soon" → "Navigation.comingSoon.badge"
  </navigation_keys>

  <form_keys>
    - "Initial BTC Price" → "BasicParameters.initialBtcPrice.label"
    - "BTC Amount" → "BasicParameters.btcAmount.label"
    - "Starting Bitcoin price..." → "BasicParameters.initialBtcPrice.tooltip"
    - "Monthly Savings/Withdrawal" → "BasicParameters.monthlyAmount.label"
  </form_keys>

  <chart_keys>
    - "Bitcoin Price Forecast" → "Charts.priceProjection.title"
    - "Loading chart data..." → "Charts.common.loading"
    - "Portfolio Value Over Time" → "Charts.portfolioValue.title"
    - "Run a simulation to see chart" → "Charts.common.noData"
  </chart_keys>

  <error_keys>
    - Validation messages → "Validation.fieldName.message"
    - System errors → "Errors.system.message"
    - Network errors → "Errors.network.message"
  </error_keys>
</key_mapping_examples>

## German Translation Guidelines

<translation_principles>
  <financial_terminology>
    - "Loan" → "Kredit" or "Darlehen"
    - "Collateral" → "Sicherheit" or "Pfand"
    - "LTV (Loan-to-Value)" → "Beleihungsgrad" or "LTV"
    - "Interest Rate" → "Zinssatz"
    - "Portfolio" → "Portfolio" (commonly used in German)
    - "Simulation" → "Simulation"
  </financial_terminology>

  <ui_terminology>
    - "Parameters" → "Parameter"
    - "Results" → "Ergebnisse"
    - "Strategy" → "Strategie"
    - "Loading..." → "Wird geladen..."
    - "Coming Soon" → "Demnächst verfügbar"
    - "Back to Landing" → "Zurück zur Startseite"
  </ui_terminology>

  <context_considerations>
    - Use formal "Sie" form for user instructions
    - Maintain technical accuracy for financial terms
    - Consider Austrian/Swiss German variations where relevant
    - Keep Bitcoin-specific terms in English when commonly used
  </context_considerations>
</translation_principles>

## Implementation Checklist

<implementation_phases>
  <phase_1_planning>
    - [x] Create localization rule file
    - [ ] Analyze current codebase for hardcoded strings
    - [ ] Define comprehensive translation key structure
    - [ ] Plan pre-commit hook implementation
  </phase_1_planning>

  <phase_2_infrastructure>
    - [ ] Enhance existing i18n configuration
    - [ ] Create comprehensive English translation file
    - [ ] Generate German translation templates
    - [ ] Implement automated string detection
  </phase_2_infrastructure>

  <phase_3_component_updates>
    - [ ] Update TabNavigation.tsx with translations
    - [ ] Localize BasicParametersCard.tsx
    - [ ] Update chart components with i18n
    - [ ] Implement error message translations
    - [ ] Add validation message localization
  </phase_3_component_updates>

  <phase_4_validation>
    - [ ] Implement pre-commit validation hooks
    - [ ] Create translation coverage reports
    - [ ] Test language switching functionality
    - [ ] Validate German translations with native speakers
  </phase_4_validation>
</implementation_phases>
