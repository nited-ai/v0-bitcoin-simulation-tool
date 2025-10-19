# Dynamic Rolling Loan Strategy - New Implementation Specification

> Created: 2025-10-02
> Updated: 2025-10-02 (User Feedback Incorporated)
> Status: ✅ Ready for Implementation
> Estimated Effort: 6-9 days (reduced due to simplified approach)

## Quick Links

- **[Main Specification](./spec.md)** - Overview, user stories, scope, success criteria
- **[Technical Specification](./sub-specs/technical-spec.md)** - Architecture decisions, implementation details
- **[Tests Specification](./sub-specs/tests.md)** - Test coverage, scenarios, fixtures
- **[Tasks Breakdown](./tasks.md)** - 23 major tasks with 200+ subtasks
- **[Phase 1 Review Report](../../docs/PHASE1_SPECIFICATION_REVIEW_REPORT.md)** - Analysis of existing specifications

## What This Spec Addresses

This specification resolves **critical gaps and misalignments** identified in the Phase 1 review of existing Rolling Loan Strategy documentation. Based on user feedback, we've adopted a **create-new-strategy approach** instead of refactoring, which significantly simplifies implementation and eliminates technical debt.

### Key Problems Solved

1. **Architectural Mismatch** - Creates new strategy from scratch, avoiding conflicts with existing implementation
2. **Missing Features** - Implements Dynamic LTV (infinite loan term) and Fixed Term (specific loan term) modes with automatic selection
3. **Calculation Errors** - Fixes cash generation mode, interest accrual, and LTV reset logic
4. **Incomplete Interfaces** - Adds missing TypeScript fields for tracking strategy execution
5. **Results Tab Gaps** - Updates all results, components, cards and calculations to display accurate data

### User Feedback Incorporated

✅ **Create new strategy from scratch** - Safer, cleaner, better microservices architecture
✅ **Use loan term for mode selection** - Infinity = Dynamic LTV, Specific months = Fixed Term
✅ **Include calculation services** - Ensures complete results tab implementation

## Implementation Approach

### Phase 1: Create New Strategy (2-3 days)
- Create `DynamicRollingLoanStrategy.ts` from scratch
- Implement initial loan logic (HTML prototype formula)
- Implement Dynamic LTV mode (infinite loan term)
- Implement Fixed Term mode (specific loan term)
- Automatic mode selection based on `loanTermMonths`
- Register new strategy in StrategyRegistry

### Phase 2: Integrate Monthly Savings (1 day)
- Add monthly savings logic to StrategyExecutionService
- Apply before strategy decision
- Track in monthly results with annual compound increases

### Phase 3: Results Tab Updates (2-3 days)
- Update all results components and cards
- Update calculation services
- Add new data series to charts
- Update tables with new columns
- Enhance risk assessment metrics

### Phase 4: Testing & Validation (1-2 days)
- HTML prototype validation tests
- End-to-end integration tests
- Test automatic mode selection
- Manual testing of all scenarios
- Backward compatibility verification

## Key Technical Decisions

### 1. Create New Strategy (Not Refactor)
**Decision:** Build `DynamicRollingLoanStrategy.ts` from scratch
**Rationale:** Avoids technical debt, eliminates architectural conflicts, follows microservices principles

### 2. Automatic Mode Selection
**Decision:** Use existing `loanTermMonths` parameter (Infinity = Dynamic, Specific = Fixed Term)
**Rationale:** More intuitive for users, eliminates need for separate UI component, leverages existing parameter

### 3. Monthly Savings Integration
**Decision:** Apply in StrategyExecutionService before strategy decision
**Rationale:** Matches HTML prototype order, ensures correct BTC holdings

### 4. Interest Accrual
**Decision:** Monthly accrual for Dynamic LTV (Infinity), full term for Fixed Term (Specific months)
**Rationale:** Matches real-world loan mechanics, aligns with HTML prototype

### 5. Results Tab Calculations
**Decision:** Update calculation services in addition to components and cards
**Rationale:** Ensures complete and accurate data display across all results tab elements

## Success Metrics

- ✅ New `DynamicRollingLoanStrategy.ts` created as independent microservice
- ✅ Automatic mode selection based on `loanTermMonths` (Infinity vs Specific)
- ✅ All calculations match HTML prototype within 0.1%
- ✅ All tests pass with >90% code coverage
- ✅ Build and type checking succeed without errors
- ✅ No breaking changes to existing functionality
- ✅ All Results tab components, cards, and calculations display accurate data

## Getting Started

1. **Read the Specification Review & Updates** to understand user feedback and changes
2. **Read the Phase 1 Review Report** to understand what problems we're solving
3. **Review the Main Specification** for user stories and scope
4. **Study the Technical Specification** for implementation details
5. **Follow the Tasks Breakdown** in order, using TDD approach
6. **Run tests continuously** to catch issues early

## Important Notes

⚠️ **Create New Strategy:** Build `DynamicRollingLoanStrategy.ts` from scratch, do NOT modify existing `RollingLoanStrategy.ts`

⚠️ **Use Existing Parameter:** Strategy mode determined by `loanTermMonths` (Infinity = Dynamic, Specific = Fixed Term)

⚠️ **Follow TDD Approach:** Write tests first, then implement functionality

⚠️ **Incremental Implementation:** Complete tasks in order, verify tests pass after each task

⚠️ **HTML Prototype Reference:** Always compare calculations with HTML prototype

⚠️ **Microservices Principle:** New strategy should be independent and self-contained

⚠️ **Backward Compatibility:** Old `RollingLoanStrategy` remains available (can be deprecated later)

⚠️ **Code Review:** Request review after completing each major phase

## Questions or Issues?

If you encounter any ambiguities or issues during implementation:

1. Check the Specification Review & Updates for user feedback
2. Check the Phase 1 Review Report for context
3. Reference the HTML prototype for correct calculation logic
4. Review the Technical Specification for architecture decisions
5. Ask for clarification before making assumptions

## Version History

- **v1.0.0** (2025-10-02) - Initial specification created after Phase 1 review
- **v1.1.0** (2025-10-02) - Updated based on user feedback: create new strategy, use loan term for mode selection, include calculation services

