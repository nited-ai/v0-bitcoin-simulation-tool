# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-26-price-projection-tab-redesign/spec.md

> Created: 2025-07-26
> Version: 1.0.0

## Technical Requirements

### Tab Navigation System
- Implement shadcn/ui Tabs component with four tabs: Parameters, Price Projection, Strategy, Results
- Use React state management to track active tab and preserve data across tab switches
- Ensure proper keyboard navigation and accessibility compliance
- Implement tab-specific URL routing for deep linking and browser back/forward support

### Price Model Interface
- Create dynamic dropdown using shadcn/ui Select component with model descriptions
- Implement conditional parameter forms that render based on selected model
- Use React Hook Form with Zod validation for all parameter inputs
- Ensure real-time chart updates when parameters change

### Unified Price Chart
- Extend existing Recharts implementation to show historical + projected data
- Implement proper data merging between historical CSV data and model projections
- Add visual separator line at current date (2025-07-26) between historical and projected data
- Ensure consistent Y-axis scaling across historical and projected sections

### Price Line Selection
- Add interactive legend with clickable line selection
- Implement visual highlighting of selected price line
- Store selected line in React context for strategy tab integration
- Provide clear visual feedback for active selection

### Model-Specific Configuration
- Manual Growth Rates: 12 annual percentage inputs with validation (-100% to +500%)
- Power Law Model: Prognosis line selector (fit/support/resistance)
- Cycle Repeat Model: Cycle length parameter and historical data range selector

## Approach Options

**Option A:** Refactor existing Chart tab into Price Projection tab
- Pros: Minimal structural changes, faster implementation
- Cons: Maintains existing technical debt, limited flexibility

**Option B:** Create new Price Projection tab with clean architecture (Selected)
- Pros: Clean separation of concerns, better maintainability, follows microservices pattern
- Cons: More initial development time, requires data migration

**Rationale:** Option B aligns with the product's microservices architecture and provides better long-term maintainability while creating proper separation between price projection and strategy functionality.

## External Dependencies

- **@radix-ui/react-tabs** - Already included in shadcn/ui for tab navigation
- **react-hook-form** - Already in tech stack for form management
- **zod** - Already in tech stack for validation
- **recharts** - Already in use for chart rendering

**Justification:** All required dependencies are already part of the established tech stack, ensuring consistency and avoiding additional bundle size.
