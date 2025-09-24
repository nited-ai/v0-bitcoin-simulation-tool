# Spec Requirements Document

> Spec: Bitcoin Simulation Tool Architecture Simplification
> Created: 2025-01-26
> Status: Planning

## Overview

Simplify the Bitcoin Simulation Tool architecture by eliminating over-engineering while preserving 100% of user-facing functionality. This refactoring will reduce codebase complexity from ~10,000 lines to ~3,000 lines, improve maintainability, and enhance performance without losing any features.

## User Stories

### Primary User Story
**As a** Bitcoin simulation tool user  
**I want** the application to work identically to the current version  
**So that** I can continue using all existing features without any disruption  

### Developer User Story
**As a** developer maintaining this codebase  
**I want** a simplified architecture with consolidated code  
**So that** I can easily understand, modify, and extend the application  

### Performance User Story
**As a** user of the Bitcoin simulation tool  
**I want** faster loading times and better performance  
**So that** I can run simulations more efficiently  

## Spec Scope

### Architecture Simplification
- **Eliminate duplicate systems**: Remove `src/modules/` microservices architecture
- **Consolidate price engines**: Merge `lib/price-engine/` and `src/modules/price-projection/`
- **Simplify data layer**: Replace PostgreSQL/Prisma with static JSON data loading
- **Streamline services**: Consolidate overlapping service classes
- **Optimize state management**: Simplify hook architecture while preserving functionality

### Code Consolidation
- **Preserve all UI components**: Keep existing parameter, projection, and results components
- **Merge duplicate models**: Consolidate price projection model implementations
- **Unify calculation services**: Single calculation engine for all financial math
- **Consolidate type definitions**: Single source of truth for TypeScript types
- **Streamline constants**: Unified preset and configuration management

### Feature Preservation
- **Tab navigation system**: Parameters, Price Projection, Results tabs
- **All price models**: Manual Growth, Power Law, Cycle Repeat, Enhanced Cycle Repeat
- **Parameter management**: Risk levels, platform configs, custom platforms, presets
- **Visualization system**: All charts, graphs, and interactive elements
- **Export capabilities**: CSV, JSON, TXT export with identical formatting
- **Internationalization**: Full EN/DE/ES language support
- **Theme system**: Light/Dark/System theme switching
- **Validation system**: Real-time parameter validation and error handling

## Out of Scope

- **UI/UX changes**: No modifications to user interface or user experience
- **Feature additions**: No new functionality beyond current capabilities
- **Breaking changes**: No changes that would affect user workflows
- **Data format changes**: Export formats remain identical
- **API changes**: No modifications to external API integrations
- **Deployment changes**: Vercel deployment process remains unchanged

## Expected Deliverable

1. **Simplified codebase** with ~70% reduction in lines of code while maintaining 100% feature parity
2. **Consolidated architecture** with single source implementations replacing duplicate systems
3. **Improved performance** with faster loading times and reduced bundle size
4. **Enhanced maintainability** with clear, understandable code structure
5. **Comprehensive testing** ensuring all existing functionality works identically

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-26-bitcoin-simulation-simplification/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-26-bitcoin-simulation-simplification/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-01-26-bitcoin-simulation-simplification/sub-specs/tests.md
