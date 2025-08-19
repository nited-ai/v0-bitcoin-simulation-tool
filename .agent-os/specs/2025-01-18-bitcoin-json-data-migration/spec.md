# Spec Requirements Document

> Spec: Bitcoin JSON Data Migration
> Created: 2025-01-18
> Status: Planning

## Overview

Migrate Bitcoin historical data loading from database API calls to static JSON files to achieve 5-10x performance improvement while maintaining complete backward compatibility with all existing functionality, especially the Price Projection tab and chart components.

## User Stories

### Performance Optimization Story

As a **simulation user**, I want to **load historical Bitcoin data instantly**, so that **I can see price projections and charts without waiting for slow database queries**.

The current system makes database API calls via `/api/bitcoin-prices/historical` which adds 500-2000ms latency. Users experience slow loading times when switching between tabs or refreshing the page. The new system will load pre-processed JSON files in 50-200ms, providing near-instant chart rendering and improved user experience.

### Developer Maintenance Story

As a **developer**, I want to **simplify the data loading architecture**, so that **I can maintain and debug the system more easily**.

The current system has complex fallback chains (Database → CSV → Mock data) with multiple cache layers and error handling paths. The new system will have a simple JSON file loading mechanism with predictable performance and fewer failure points.

## Spec Scope

1. **JSON File Generation** - Create optimized JSON files (daily.json, weekly.json, monthly.json) from existing Bitcoin price data
2. **Data Loading Service Migration** - Replace database API calls with static JSON file loading in centralized data service
3. **Backward Compatibility** - Ensure all existing components (Price Projection tab, charts, simulations) work exactly as before
4. **Performance Optimization** - Implement progressive loading strategy (monthly → weekly → daily) for optimal user experience
5. **Current Price Integration** - Maintain live API calls for current Bitcoin price while using JSON for historical data

## Out of Scope

- Changes to current price fetching mechanism (remains API-based)
- Modifications to price projection algorithms or chart rendering logic
- Database schema changes or removal of existing database infrastructure
- Changes to simulation calculation logic or user interface components

## Expected Deliverable

1. **Functional Price Projection Tab** - All price projection functionality works identically to current implementation with significantly improved loading performance
2. **Compatible Chart Components** - All existing chart components (UnifiedPriceChart, HistoricalDataChart, PriceProjectionChart) display data correctly using JSON files
3. **Performance Improvement** - Historical data loading time reduced from 500-2000ms to 50-200ms (5-10x improvement)

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-18-bitcoin-json-data-migration/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-18-bitcoin-json-data-migration/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-01-18-bitcoin-json-data-migration/sub-specs/api-spec.md
- Tests Specification: @.agent-os/specs/2025-01-18-bitcoin-json-data-migration/sub-specs/tests.md
