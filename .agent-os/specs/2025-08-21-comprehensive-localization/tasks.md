# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-21-comprehensive-localization/spec.md

> Created: 2025-08-21
> Status: Ready for Implementation

## Tasks

- [ ] 1. Analyze Current Codebase and Create Translation Infrastructure
  - [ ] 1.1 Write tests for string detection service
  - [ ] 1.2 Audit all components in app/simulation/components/ for hardcoded strings
  - [ ] 1.3 Create comprehensive mapping of existing hardcoded text to translation keys
  - [ ] 1.4 Enhance existing English translation file with all identified strings
  - [ ] 1.5 Generate German translation template with TODO markers
  - [ ] 1.6 Update fallback translations in lib/i18n.ts
  - [ ] 1.7 Verify all translation infrastructure tests pass

- [ ] 2. Implement Automated String Detection System
  - [ ] 2.1 Write tests for hardcoded string pattern matching
  - [ ] 2.2 Create string detection service with configurable patterns
  - [ ] 2.3 Implement translation key generation with naming conventions
  - [ ] 2.4 Add validation for duplicate and conflicting keys
  - [ ] 2.5 Create reporting system for detected hardcoded strings
  - [ ] 2.6 Integrate with existing build and development workflow
  - [ ] 2.7 Verify all string detection tests pass

- [ ] 3. Update Navigation and Layout Components
  - [ ] 3.1 Write tests for TabNavigation.tsx localization
  - [ ] 3.2 Replace hardcoded tab labels with translation keys
  - [ ] 3.3 Localize tab badges and status messages
  - [ ] 3.4 Update SimulationHeader.tsx with missing translations
  - [ ] 3.5 Implement language switcher integration (if enabled)
  - [ ] 3.6 Test navigation components in both languages
  - [ ] 3.7 Verify all navigation localization tests pass

- [ ] 4. Localize Parameter and Form Components
  - [ ] 4.1 Write tests for BasicParametersCard.tsx localization
  - [ ] 4.2 Replace hardcoded form labels with translation keys
  - [ ] 4.3 Localize tooltips and help text
  - [ ] 4.4 Update LoanParametersCard.tsx with translations
  - [ ] 4.5 Implement validation message localization
  - [ ] 4.6 Add error state translations for all parameter cards
  - [ ] 4.7 Verify all parameter component tests pass

- [ ] 5. Implement Chart and Visualization Localization
  - [ ] 5.1 Write tests for chart component localization
  - [ ] 5.2 Update UnifiedPriceChart.tsx with translated labels
  - [ ] 5.3 Localize PortfolioValueChart.tsx titles and legends
  - [ ] 5.4 Add translations for chart loading and error states
  - [ ] 5.5 Update tooltip content in all chart components
  - [ ] 5.6 Implement axis labels and legend translations
  - [ ] 5.7 Verify all chart localization tests pass

- [ ] 6. Create Pre-commit Validation System
  - [ ] 6.1 Write tests for pre-commit hook integration
  - [ ] 6.2 Implement git pre-commit hook for string detection
  - [ ] 6.3 Create validation rules for translation completeness
  - [ ] 6.4 Add automated translation key generation for new strings
  - [ ] 6.5 Implement commit blocking for untranslated content
  - [ ] 6.6 Create developer-friendly error messages and guidance
  - [ ] 6.7 Verify all pre-commit validation tests pass

- [ ] 7. Complete German Translations and Quality Assurance
  - [ ] 7.1 Write tests for translation accuracy and completeness
  - [ ] 7.2 Translate all English strings to German with proper financial terminology
  - [ ] 7.3 Review and validate German translations for accuracy
  - [ ] 7.4 Test language switching functionality across all components
  - [ ] 7.5 Validate financial term consistency in German translations
  - [ ] 7.6 Create translation coverage report
  - [ ] 7.7 Verify all localization integration tests pass

- [ ] 8. Documentation and Developer Guidelines
  - [ ] 8.1 Write tests for documentation examples
  - [ ] 8.2 Create developer guide for adding new translatable content
  - [ ] 8.3 Document translation key naming conventions
  - [ ] 8.4 Add examples of proper i18n implementation patterns
  - [ ] 8.5 Create troubleshooting guide for common localization issues
  - [ ] 8.6 Update project README with localization information
  - [ ] 8.7 Verify all documentation is accurate and complete
