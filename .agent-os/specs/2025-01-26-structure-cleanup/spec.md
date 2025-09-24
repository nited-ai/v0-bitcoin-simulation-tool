# Spec Requirements Document

> Spec: Structure Cleanup
> Created: 2025-01-26
> Status: Planning

## Overview

Clean up the current Bitcoin simulation application structure by removing redundant files, consolidating scattered services, and organizing components by feature/tab to prepare for microservices architecture. This cleanup will eliminate confusion, reduce technical debt, and create a clear foundation for the modular architecture outlined in the product roadmap.

## User Stories

### Developer Experience Improvement

As a developer working on the Bitcoin simulation tool, I want a clean and intuitive file structure, so that I can quickly find components, understand the codebase organization, and contribute effectively without getting lost in duplicate or scattered files.

The current structure has empty directories (`src/app/`), duplicate services split between `lib/` and `src/lib/`, and broken duplicate components in `src/modules/*/components/` with outdated import paths. This creates confusion and slows development.

### Microservices Architecture Preparation

As a technical lead, I want the codebase organized by feature/tab rather than technical layers, so that we can easily extract independent microservices for price projection, strategy execution, and results analysis as outlined in Phase 1 of the roadmap.

The current technical-layer organization makes it difficult to identify clear boundaries for microservice extraction, while a feature-based organization will make these boundaries obvious.

## Spec Scope

1. **Remove Redundant Files** - Delete empty `src/app/` directory and broken duplicate components with outdated imports
2. **Consolidate Library Structure** - Move all services from `src/lib/` to `lib/` for single source of truth
3. **Reorganize by Feature/Tab** - Restructure `app/simulation/components/` into tab-based organization (parameters, price-projection, strategy, results)
4. **Update Import Paths** - Fix all import paths to use consolidated structure and update tsconfig.json path mappings
5. **Clean Module Structure** - Keep only business logic in `src/modules/` and remove broken UI components

## Out of Scope

- Implementing actual microservices architecture (that's Phase 1 of roadmap)
- Changing business logic or functionality
- Adding new features or components
- Database schema changes
- API modifications

## Expected Deliverable

1. Clean, intuitive file structure with no duplicate or empty directories
2. All components organized by feature/tab with working import paths
3. Single consolidated library location with all services and utilities
4. Updated tsconfig.json with correct path mappings
5. All existing functionality working without regressions

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-26-structure-cleanup/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-26-structure-cleanup/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-01-26-structure-cleanup/sub-specs/tests.md
