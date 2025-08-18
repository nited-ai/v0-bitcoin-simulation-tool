# Spec Requirements Document

> Spec: Centralized Calculations Service
> Created: 2025-08-18
> Status: Planning

## Overview

Create a centralized calculations service to consolidate all financial calculations currently scattered across parameter tab components, eliminating code duplication and creating a single source of truth for all financial computations. This service will enable future API exposure and improve maintainability through consistent calculation behavior across all components.

## User Stories

### Unified Financial Calculations

As a developer, I want all financial calculations centralized in a single service, so that I can maintain consistent calculation logic across all components without code duplication.

**Detailed Workflow:** The service will provide a reactive calculation engine that automatically recalculates all dependent values when any parameter changes. Components will subscribe to calculated values rather than implementing their own calculation logic, ensuring consistency and reducing maintenance overhead.

### Real-time Parameter Updates

As a user, I want all financial displays to update immediately when I change any parameter, so that I can see the real-time impact of my adjustments across all visualization components.

**Detailed Workflow:** When a user modifies any parameter (BTC amount, loan percentage, platform selection, risk level), the centralized service will automatically recalculate all dependent values and notify subscribed components to update their displays in real-time.

### Accurate Risk Assessment

As a user, I want consistent and accurate financial calculations across all risk assessment components, so that I can make informed decisions based on reliable data.

**Detailed Workflow:** The service will implement standardized formulas for liquidation prices, collateral ratios, and risk metrics, ensuring that all components display identical calculated values for the same input parameters.

## Spec Scope

1. **Calculation Service Architecture** - Create a centralized TypeScript service class that handles all financial calculations with reactive updates
2. **Liquidation Analysis Consolidation** - Extract and centralize all liquidation price calculations, price drop tolerances, and free collateral analysis from PriceDropToleranceCard
3. **Collateral Management Unification** - Consolidate collateral ratio calculations, locked/free collateral amounts, and utilization percentages from CollateralVisualizationCard and LoanUsageVisualizationCard
4. **Parameter Validation Centralization** - Move all parameter validation logic and derived value calculations from BasicParametersCard and LoanParametersCard to the service
5. **Platform Integration Standardization** - Centralize platform-specific calculations (Firefish, Strike, Custom) including LTV ratios, fees, and risk level preset applications

## Out of Scope

- UI/UX changes to existing parameter components (components will maintain their current appearance)
- Database schema modifications or data persistence changes
- API endpoint creation (foundation only, actual endpoints will be future work)
- Price projection or strategy calculation logic (focus only on parameter tab calculations)
- Historical data processing or chart generation logic

## Expected Deliverable

1. **Functional Calculations Service** - A working TypeScript service that provides all financial calculations with automatic recalculation when parameters change
2. **Component Integration** - All parameter tab components successfully refactored to use the centralized service instead of local calculation logic
3. **Comprehensive Test Coverage** - Unit tests covering all calculation methods with edge cases and validation scenarios, ensuring 100% accuracy compared to existing implementations

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-18-centralized-calculations-service/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-18-centralized-calculations-service/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-08-18-centralized-calculations-service/sub-specs/tests.md
