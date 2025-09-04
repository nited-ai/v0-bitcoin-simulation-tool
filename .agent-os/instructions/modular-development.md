# Modular Development Instructions

> Version: 1.0.0
> Last updated: 2025-01-09
> Scope: Development workflows for modular architecture

## Overview

This document provides development instructions for working with the modular architecture of the Bitcoin simulation tool. Follow these guidelines when developing, testing, and maintaining the codebase.

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/nited-ai/v0-bitcoin-simulation-tool.git
   cd v0-bitcoin-simulation-tool
   pnpm install
   ```

2. **Understand Module Structure**
   - Review `src/modules/` directory structure
   - Read module-specific README files
   - Understand cross-module interfaces in `src/modules/shared/interfaces/`

3. **Run Development Server**
   ```bash
   pnpm dev
   ```

### Working with Modules

#### Adding New Functionality to Existing Modules

1. **Identify the Correct Module**
   - Parameters: Loan parameters, platform configurations, validation
   - Price Projection: Bitcoin price forecasting models
   - Strategies: Investment strategy implementations
   - Results: Analysis, visualization, export
   - Price Data: Historical data, API integration
   - Shared: Cross-module utilities and interfaces

2. **Follow TDD Approach**
   ```bash
   # Write tests first
   touch src/modules/[module]/__tests__/[feature].test.ts
   
   # Run tests (should fail initially)
   pnpm test src/modules/[module]/__tests__/[feature].test.ts
   
   # Implement functionality
   # Run tests again (should pass)
   ```

3. **Update Module Exports**
   - Add new functionality to module's `index.ts`
   - Update TypeScript types if needed
   - Document new functionality

#### Creating New Modules

1. **Create Module Structure**
   ```bash
   mkdir -p src/modules/[new-module]/{components,services,hooks,types,__tests__}
   touch src/modules/[new-module]/index.ts
   ```

2. **Define Module Interface**
   - Create interface in `src/modules/shared/interfaces/`
   - Define data contracts with other modules
   - Implement adapter classes if needed

3. **Implement Module Functionality**
   - Follow existing module patterns
   - Ensure independence from other modules
   - Implement comprehensive tests

### Cross-Module Development

#### Adding New Price Models

1. **Implement PriceProjectionModel Interface**
   ```typescript
   // src/modules/price-projection/models/NewModel.ts
   export class NewModel implements PriceProjectionModel {
     // Implementation
   }
   ```

2. **Register Model in Registry**
   ```typescript
   // src/modules/price-projection/services/PriceModelRegistry.ts
   this.registerModel('newModel', newModel, true, priority)
   ```

3. **Update PriceProjectionAdapter**
   - Handle new data fields if added
   - Test with existing strategies
   - Update documentation

4. **Test Integration**
   ```bash
   pnpm test src/modules/price-projection/__tests__/
   pnpm test __tests__/integration/cross-module-data-flow.test.ts
   ```

#### Adding New Strategies

1. **Implement InvestmentStrategyInterface**
   ```typescript
   // src/modules/strategies/implementations/NewStrategy.ts
   export class NewStrategy implements InvestmentStrategyInterface {
     // Implementation using StrategyPriceData interface
   }
   ```

2. **Register Strategy**
   ```typescript
   // src/modules/strategies/services/StrategyExecutionService.ts
   // Add strategy to available strategies
   ```

3. **Test with Price Projections**
   - Use existing price projection test data
   - Verify StrategyExecutionResult format
   - Test with results analysis

4. **Integration Testing**
   ```bash
   pnpm test src/modules/strategies/__tests__/
   pnpm test __tests__/integration/
   ```

### Testing Guidelines

#### Unit Testing

1. **Test Structure**
   ```typescript
   // src/modules/[module]/__tests__/[component].test.ts
   import { describe, it, expect, beforeEach, vi } from 'vitest'
   import { ComponentToTest } from '../[component]'
   
   describe('ComponentToTest', () => {
     // Test implementation
   })
   ```

2. **Mocking Cross-Module Dependencies**
   ```typescript
   // Mock other modules
   vi.mock('@/modules/price-projection', () => ({
     PriceProjectionService: vi.fn()
   }))
   ```

3. **Test Coverage Requirements**
   - Minimum 80% coverage for new code
   - Test both happy path and error scenarios
   - Test edge cases and boundary conditions

#### Integration Testing

1. **Cross-Module Data Flow Tests**
   ```typescript
   // __tests__/integration/data-flow.test.ts
   describe('Cross-Module Data Flow', () => {
     it('should flow data from price projection through strategy to results', async () => {
       // Test complete pipeline
     })
   })
   ```

2. **Performance Testing**
   ```typescript
   // Test data transformation performance
   // Test memory usage
   // Test concurrent operations
   ```

### Code Quality Standards

#### Import Management

1. **Use Module-Based Imports**
   ```typescript
   // Good
   import { PriceProjectionService } from '@/modules/price-projection'
   import { StrategyExecutionService } from '@/modules/strategies'
   
   // Avoid
   import { PriceProjectionService } from '../../../price-projection/services/PriceProjectionService'
   ```

2. **Barrel Exports**
   ```typescript
   // src/modules/[module]/index.ts
   export * from './components'
   export * from './services'
   export * from './hooks'
   export * from './types'
   ```

#### TypeScript Standards

1. **Strong Typing**
   - Use interfaces for all cross-module communication
   - Avoid `any` type
   - Use generic types where appropriate

2. **Interface Definitions**
   ```typescript
   // src/modules/shared/interfaces/[Module]Interface.ts
   export interface ModuleService {
     method(params: ParamType): Promise<ResultType>
   }
   ```

### Debugging and Troubleshooting

#### Common Issues

1. **Circular Dependencies**
   - Check import statements
   - Use interfaces to break cycles
   - Refactor shared code to shared module

2. **Data Flow Issues**
   - Verify adapter implementations
   - Check interface compatibility
   - Test data transformation

3. **Performance Issues**
   - Profile data transformation
   - Check for unnecessary re-renders
   - Optimize expensive calculations

#### Debugging Tools

1. **Module-Specific Logging**
   ```typescript
   console.log(`[${moduleName}] Operation completed:`, result)
   ```

2. **Data Flow Tracing**
   ```typescript
   // Add tracing to adapters
   console.log('Data transformation:', { input, output })
   ```

### Deployment Considerations

#### Build Optimization

1. **Tree Shaking**
   - Use ES modules
   - Avoid default exports for utilities
   - Import only what you need

2. **Code Splitting**
   - Lazy load non-critical modules
   - Use dynamic imports for large components

#### Environment Configuration

1. **Module-Specific Configuration**
   - Environment variables for module settings
   - Feature flags for module enablement
   - Performance monitoring per module

### Documentation Requirements

#### Module Documentation

1. **README Files**
   - Purpose and responsibility
   - Key components and services
   - Dependencies and interfaces
   - Usage examples

2. **API Documentation**
   - JSDoc comments for public methods
   - Interface documentation
   - Example usage

#### Change Documentation

1. **Update Relevant Documentation**
   - Module README files
   - Interface documentation
   - Migration guides if needed

2. **Agent OS Updates**
   - Update standards if patterns change
   - Update instructions for new workflows
   - Update product specifications
