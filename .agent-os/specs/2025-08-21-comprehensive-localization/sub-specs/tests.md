# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-21-comprehensive-localization/spec.md

> Created: 2025-08-21
> Version: 1.0.0

## Test Coverage

### Unit Tests

**String Detection Service**
- Test hardcoded string pattern matching in various JSX contexts
- Validate exclusion patterns for technical strings and imports
- Test translation key generation with different component structures
- Verify duplicate key detection and prevention

**Translation Key Generator**
- Test consistent naming convention application
- Validate key generation for nested components
- Test handling of special characters and edge cases
- Verify key uniqueness across different components

**i18n Integration**
- Test useTranslation hook integration in components
- Validate safeT fallback function behavior
- Test translation loading and fallback mechanisms
- Verify language switching without state loss

### Integration Tests

**Component Localization**
- Test TabNavigation.tsx renders correctly in both languages
- Validate BasicParametersCard.tsx form labels and tooltips translation
- Test chart components display localized labels and legends
- Verify error messages appear in selected language

**Pre-commit Hook Validation**
- Test detection of hardcoded strings in modified files
- Validate commit blocking when untranslated strings are found
- Test automatic translation key generation during pre-commit
- Verify integration with existing git workflow

**Language Switching**
- Test seamless language switching in simulation interface
- Validate state preservation during language changes
- Test URL parameter handling for language selection
- Verify localStorage persistence of language preference

### Feature Tests

**End-to-End Localization Workflow**
- User can switch between English and German languages
- All interface elements update to selected language
- Financial calculations and results display with appropriate formatting
- Error messages and validation feedback appear in selected language

**Developer Workflow**
- Developer adds new component with hardcoded strings
- Pre-commit hook detects and prevents commit
- Developer updates component with translation keys
- Commit succeeds after proper localization implementation

### Mocking Requirements

**Translation Loading:** Mock i18next resource loading to test fallback behavior
**File System Access:** Mock file reading for string detection in pre-commit hooks
**Git Hooks:** Mock git pre-commit integration for testing validation workflow
**Language Detection:** Mock browser language detection for testing default language selection

## Test Data Requirements

### Sample Components
- Components with various hardcoded string patterns
- Nested component structures with complex translation needs
- Chart components with labels, legends, and tooltips
- Form components with validation messages

### Translation Files
- Complete English translation files for testing
- Partial German translation files to test fallback behavior
- Invalid translation files to test error handling
- Missing translation keys to test validation

### Git Scenarios
- Modified files with hardcoded strings
- Commits with proper translation implementation
- Mixed commits with both localized and non-localized changes
- Merge scenarios with translation conflicts

## Performance Testing

### Translation Loading Performance
- Test initial translation file loading time
- Validate memory usage with large translation files
- Test language switching performance impact
- Verify no performance regression in component rendering

### Pre-commit Hook Performance
- Test string detection speed on large files
- Validate acceptable delay for commit process
- Test performance with multiple modified files
- Ensure hook doesn't significantly slow development workflow
