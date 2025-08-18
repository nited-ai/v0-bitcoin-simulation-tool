# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-18-centralized-calculations-service/spec.md

> Created: 2025-08-18
> Status: Ready for Implementation

## Tasks

- [ ] 1. Create Core Calculations Service Architecture
  - [ ] 1.1 Write unit tests for CalculationsService class structure and basic methods
  - [ ] 1.2 Create TypeScript interfaces for all calculation inputs and outputs (SimulationParams, LiquidationMetrics, CollateralMetrics, LoanMetrics, PlatformMetrics, ValidationResult)
  - [ ] 1.3 Implement CalculationsService class with core calculation methods (calculateLiquidationMetrics, calculateCollateralMetrics, calculateLoanMetrics)
  - [ ] 1.4 Add comprehensive error handling and parameter validation
  - [ ] 1.5 Implement memoization strategy for expensive calculations
  - [ ] 1.6 Verify all unit tests pass for core service functionality

- [ ] 2. Extract and Centralize Liquidation Calculations
  - [ ] 2.1 Write tests for liquidation price calculations (immediate vs. true liquidation scenarios)
  - [ ] 2.2 Extract liquidation calculation logic from PriceDropToleranceCard component
  - [ ] 2.3 Implement centralized liquidation price calculations with free collateral analysis
  - [ ] 2.4 Add price drop percentage calculations for current price and ATH scenarios
  - [ ] 2.5 Integrate platform-specific liquidation LTV ratios (Firefish 95%, Strike 99%, Custom 97%)
  - [ ] 2.6 Verify liquidation calculations match existing component behavior exactly

- [ ] 3. Consolidate Collateral Management Calculations
  - [ ] 3.1 Write tests for collateral ratio calculations and utilization percentages
  - [ ] 3.2 Extract collateral calculation logic from CollateralVisualizationCard and LoanUsageVisualizationCard
  - [ ] 3.3 Implement centralized locked/free collateral amount calculations
  - [ ] 3.4 Add collateral utilization percentage calculations and validation logic
  - [ ] 3.5 Create collateral sufficiency validation methods
  - [ ] 3.6 Verify collateral calculations produce identical results to existing components

- [ ] 4. Implement React Integration Layer
  - [ ] 4.1 Write integration tests for useCalculations hook with parameter change scenarios
  - [ ] 4.2 Create useCalculations custom hook with reactive recalculation capabilities
  - [ ] 4.3 Implement automatic dependency tracking and memoization using React.useMemo and useCallback
  - [ ] 4.4 Add error boundary integration and graceful error handling
  - [ ] 4.5 Integrate with existing useSimulation context without breaking changes
  - [ ] 4.6 Verify hook provides real-time updates when parameters change

- [ ] 5. Refactor Parameter Components to Use Centralized Service
  - [ ] 5.1 Write integration tests for each component using the centralized service
  - [ ] 5.2 Refactor PriceDropToleranceCard to use centralized liquidation calculations
  - [ ] 5.3 Refactor CollateralVisualizationCard to use centralized collateral calculations
  - [ ] 5.4 Refactor LoanUsageVisualizationCard to use centralized loan metrics
  - [ ] 5.5 Refactor BasicParametersCard and LoanParametersCard to use centralized validation
  - [ ] 5.6 Remove duplicate calculation logic from all refactored components
  - [ ] 5.7 Verify all components display identical values to their original implementations
  - [ ] 5.8 Verify all existing functionality remains intact after refactoring
