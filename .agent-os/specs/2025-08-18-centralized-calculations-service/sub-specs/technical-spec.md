# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-18-centralized-calculations-service/spec.md

> Created: 2025-08-18
> Version: 1.0.0

## Technical Requirements

### Service Architecture
- **Reactive Calculation Engine**: Implement automatic recalculation when any parameter changes using React hooks pattern
- **TypeScript Interfaces**: Define comprehensive interfaces for all calculation inputs and outputs with strict typing
- **Memoization Strategy**: Use React.useMemo and useCallback for expensive calculations to prevent unnecessary recalculations
- **Error Handling**: Implement robust error handling for edge cases (zero values, invalid parameters, platform misconfigurations)
- **Platform Agnostic Design**: Support all lending platforms (Firefish, Strike, Custom) through configuration-driven calculations

### Performance Criteria
- **Real-time Updates**: All calculations must complete within 16ms to maintain 60fps UI responsiveness
- **Memory Efficiency**: Memoized calculations should not exceed 10MB memory footprint
- **Calculation Accuracy**: All financial calculations must maintain precision to 8 decimal places for BTC amounts and 2 decimal places for fiat currencies

### Integration Requirements
- **Context Integration**: Seamlessly integrate with existing useSimulation context without breaking changes
- **Component Compatibility**: Maintain backward compatibility with all existing parameter component interfaces
- **Subscription Pattern**: Implement observer pattern for components to subscribe to specific calculation results

## Approach Options

**Option A: Hook-based Service**
- Pros: Natural React integration, automatic dependency tracking, built-in memoization
- Cons: Tightly coupled to React, harder to test in isolation, potential for hook rule violations

**Option B: Class-based Service with React Integration** (Selected)
- Pros: Testable in isolation, clear separation of concerns, future API-ready, flexible subscription model
- Cons: Requires additional React integration layer, slightly more complex setup

**Option C: Pure Functional Service**
- Pros: Highly testable, no side effects, easy to reason about
- Cons: No built-in reactivity, requires manual dependency management, performance concerns

**Rationale:** Option B provides the best balance of testability, maintainability, and React integration. The class-based approach allows for clear method organization while the React integration layer provides the reactivity needed for real-time updates.

## External Dependencies

**No new external dependencies required** - The implementation will use existing project dependencies:
- **React**: For hooks and context integration
- **TypeScript**: For type safety and interfaces
- **Existing Platform Configs**: Leverage current platformPresets.ts and riskPresets.ts

**Justification:** Avoiding new dependencies reduces bundle size and maintains consistency with existing project architecture. All required functionality can be implemented using current project dependencies.

## Implementation Architecture

### Core Service Structure
```typescript
class CalculationsService {
  // Core calculation methods
  calculateLiquidationMetrics(params: SimulationParams): LiquidationMetrics
  calculateCollateralMetrics(params: SimulationParams): CollateralMetrics  
  calculateLoanMetrics(params: SimulationParams): LoanMetrics
  
  // Platform-specific calculations
  applyPlatformConfig(params: SimulationParams, platform: Platform): PlatformMetrics
  applyRiskPresets(params: SimulationParams, riskLevel: RiskLevel): SimulationParams
  
  // Validation methods
  validateParameters(params: SimulationParams): ValidationResult
}
```

### React Integration Layer
```typescript
// Custom hook for reactive calculations
function useCalculations(params: SimulationParams): CalculationResults {
  // Memoized calculations with dependency tracking
  // Automatic recalculation when params change
  // Error boundary integration
}
```

### Type Definitions
```typescript
interface CalculationResults {
  liquidation: LiquidationMetrics
  collateral: CollateralMetrics
  loan: LoanMetrics
  platform: PlatformMetrics
  validation: ValidationResult
}
```
