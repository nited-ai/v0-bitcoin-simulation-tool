# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-27-mobile-tooltip-behavior/spec.md

> Created: 2025-01-27
> Version: 1.0.0

## Test Coverage

### Unit Tests

**TouchProvider Component**
- Correctly detects touch devices using CSS media query `(pointer: coarse)`
- Correctly detects non-touch devices
- Updates touch detection when device capabilities change
- Provides touch context to child components
- Handles undefined state during initial render

**HybridTooltip Component**
- Renders Popover component on touch devices
- Renders Tooltip component on non-touch devices
- Passes props correctly to underlying components
- Handles component switching when touch detection changes

**HybridTooltipTrigger Component**
- Renders PopoverTrigger on touch devices
- Renders EnhancedTooltipTrigger on non-touch devices
- Maintains consistent trigger behavior across device types
- Handles keyboard navigation (Enter, Space, Escape)

**EnhancedTooltipTrigger Component**
- Supports both hover and click interactions simultaneously
- Hover interaction works for temporary tooltip display
- Click interaction works for persistent tooltip display
- Properly coordinates between hover and click states
- Handles click-outside dismissal for persistent tooltips

**HybridTooltipContent Component**
- Renders PopoverContent on touch devices
- Renders TooltipContent on non-touch devices
- Maintains consistent styling across device types
- Handles ARIA attributes correctly for both content types

### Integration Tests

**Component Integration**
- BasicParametersCard tooltips work with HybridTooltip components
- LoanParametersCard tooltips work with HybridTooltip components
- RiskLevelSelector tooltips work with HybridTooltip components
- PlatformSelector tooltips work with HybridTooltip components
- All migrated tooltip instances maintain functionality

**Touch Detection Integration**
- TouchProvider correctly provides context to all HybridTooltip instances
- Touch detection works consistently across all components
- Component behavior switches correctly based on touch detection
- No conflicts between different HybridTooltip instances

**Cross-Device Behavior**
- Popover behavior activates correctly on touch devices
- Tooltip behavior activates correctly on non-touch devices
- Behavior switches correctly when device capabilities change
- No conflicts between popover and tooltip interaction modes

**Accessibility Integration**
- Screen readers announce popover content correctly on mobile
- Screen readers announce tooltip content correctly on desktop
- Keyboard navigation works across all HybridTooltip instances
- Focus management maintains logical tab order for both popovers and tooltips
- ARIA attributes are properly set for both interaction modes

### Feature Tests

**End-to-End Mobile Workflow**
- User can navigate to Parameters tab on mobile device
- User can tap info icons to view tooltip content
- User can dismiss tooltips by tapping outside
- User can access all tooltip content throughout the application
- Only one tooltip is visible at a time

**End-to-End Desktop Workflow**
- User can hover over info icons to view tooltip content (temporary)
- User can click on info icons to view persistent tooltip content
- User can move mouse away to dismiss hover tooltips
- User can click outside or click trigger again to dismiss persistent tooltips
- Hover and click interactions work simultaneously without conflicts
- Multiple hover tooltips can be visible, only one persistent tooltip at a time

**Cross-Platform Consistency**
- Same tooltip content is accessible on both mobile and desktop
- Visual appearance is consistent across devices
- Information hierarchy is maintained across interaction methods

### Mocking Requirements

**Touch Detection Mocking**
- Mock `window.matchMedia('(pointer: coarse)')` to return true for touch device tests
- Mock `window.matchMedia('(pointer: coarse)')` to return false for non-touch device tests
- Mock media query change events for device capability testing

**Component Mocking**
- Mock Popover components for touch device testing
- Mock Tooltip components for non-touch device testing
- Mock component prop passing for integration testing

**Event Mocking**
- Mock click events for popover interaction testing
- Mock hover events for tooltip interaction testing
- Mock keyboard events for accessibility testing
- Mock focus events for focus management testing

**Context Mocking**
- Mock TouchProvider context for component testing
- Mock touch detection state changes
- Mock context provider rendering for integration tests

## Test Implementation Strategy

### Test-Driven Development Approach

**Red Phase: Write Failing Tests**
1. Write tests for mobile click behavior (should fail initially)
2. Write tests for desktop hover preservation (should pass with existing code)
3. Write tests for accessibility features (should fail initially)
4. Write tests for component integration (should fail initially)

**Green Phase: Implement Minimum Code**
1. Implement basic MobileTooltip component to pass mobile tests
2. Implement click-outside detection to pass dismissal tests
3. Implement keyboard navigation to pass accessibility tests
4. Integrate with existing components to pass integration tests

**Refactor Phase: Optimize Implementation**
1. Optimize performance and memory usage
2. Improve code organization and maintainability
3. Ensure all tests continue to pass
4. Add edge case handling and error boundaries

### Testing Tools and Framework

**Unit Testing**
- **Framework**: Vitest (already configured in project)
- **Utilities**: @testing-library/react for component testing
- **Mocking**: vi.mock() for hook and event mocking

**Integration Testing**
- **Framework**: @testing-library/react with user-event
- **Approach**: Test component interactions and state changes
- **Coverage**: All tooltip-containing components

**E2E Testing**
- **Framework**: Playwright (if needed for complex scenarios)
- **Scope**: Critical user workflows across device types
- **Focus**: Mobile and desktop interaction patterns

### Test Organization

**File Structure**
```
tests/
├── unit/
│   ├── MobileTooltip.test.tsx
│   ├── useIsMobile.test.tsx
│   └── tooltip-state.test.tsx
├── integration/
│   ├── tooltip-components.test.tsx
│   ├── responsive-behavior.test.tsx
│   └── accessibility.test.tsx
└── e2e/
    ├── mobile-tooltip-workflow.spec.ts
    └── desktop-tooltip-workflow.spec.ts
```

**Test Naming Convention**
- Unit tests: `ComponentName.test.tsx`
- Integration tests: `feature-name.test.tsx`
- E2E tests: `workflow-name.spec.ts`

### Coverage Requirements

**Minimum Coverage Targets**
- Unit tests: 95% code coverage for new components
- Integration tests: 100% coverage of tooltip-containing components
- E2E tests: 100% coverage of critical user workflows

**Quality Gates**
- All tests must pass before merge
- No reduction in overall test coverage
- Performance tests must show no significant regression
- Accessibility tests must pass WCAG 2.1 AA standards
