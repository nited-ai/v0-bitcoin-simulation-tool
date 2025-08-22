# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-21-comprehensive-localization/spec.md

> Created: 2025-08-21
> Version: 1.0.0

## Technical Requirements

### String Detection and Extraction
- Automated scanning of staged/changed .tsx and .ts files only (git diff --cached)
- Pattern matching for JSX text content, button labels, tooltips, and error messages
- Exclusion of technical strings (console.log, debug messages, CSS classes)
- Integration with git pre-commit hooks for real-time validation of only committed changes

### Translation Key Generation
- Consistent naming convention: ComponentName.elementType.description
- Automatic key generation for newly detected strings
- Validation against existing translation keys to prevent duplicates
- Support for nested component structures and complex UI elements

### i18n Integration Enhancement
- Extend existing react-i18next configuration
- Maintain compatibility with current fallback system in lib/i18n.ts
- Preserve SSR compatibility by keeping language detection disabled
- Implement safeT fallback pattern across all components

### Component Localization Updates
- Update TabNavigation.tsx with translation keys for all labels and badges
- Localize BasicParametersCard.tsx form labels, tooltips, and validation messages
- Implement i18n in chart components (UnifiedPriceChart, PortfolioValueChart, etc.)
- Add translation support to error boundaries and loading states

### Validation and Quality Assurance
- Pre-commit hooks to prevent hardcoded strings from being committed
- Automated checks for missing translations in both English and German
- Validation of translation key consistency across locale files
- Coverage reports for component localization status

## Approach Options

**Option A: Manual Component Updates with Basic Validation**
- Pros: Simple implementation, full control over translation keys
- Cons: Time-intensive, prone to human error, no automated detection

**Option B: Automated String Detection with Pre-commit Hooks** (Selected)
- Pros: Prevents hardcoded strings, automated key generation, consistent patterns
- Cons: More complex setup, requires careful pattern matching

**Option C: Build-time Translation Extraction**
- Pros: Comprehensive coverage, build-time validation
- Cons: Slower development cycle, complex integration with existing build process

**Rationale:** Option B provides the best balance of automation and control, preventing hardcoded strings while maintaining developer productivity and ensuring consistent localization patterns.

## External Dependencies

No new external dependencies required. The implementation leverages existing packages:

- **react-i18next** - Already installed and configured
- **i18next** - Core internationalization framework (existing)
- **i18next-browser-languagedetector** - Browser language detection (existing, currently disabled)

**Justification:** All required functionality can be implemented using the existing i18n infrastructure, ensuring compatibility and reducing bundle size.
