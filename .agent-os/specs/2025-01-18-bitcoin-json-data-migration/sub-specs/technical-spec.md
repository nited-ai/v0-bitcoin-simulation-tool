# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-18-bitcoin-json-data-migration/spec.md

> Created: 2025-01-18
> Version: 1.0.0

## Technical Requirements

### JSON File Format and Structure
- **Optimized Format**: Use compact array format `[timestamp, close]` instead of verbose objects to reduce file size by 50-70%
- **File Organization**: Three separate files for different data granularities (daily.json ~400KB, weekly.json ~60KB, monthly.json ~14KB)
- **Metadata Inclusion**: Each file contains metadata (startDate, endDate, interval, count, lastUpdated) for validation and debugging
- **Static File Serving**: Files served from `/public/data/bitcoin/` directory for optimal CDN caching and browser performance

### Data Loading Service Architecture
- **Interface Compatibility**: New JSON loading service must implement identical interface to current `centralizedDataService.loadHistoricalData()`
- **Progressive Loading**: Implement smart loading strategy that starts with monthly data for instant display, then progressively loads weekly/daily as needed
- **Error Handling**: Maintain existing fallback mechanisms with JSON files as primary source and current database API as fallback
- **Caching Strategy**: Leverage browser caching for JSON files while maintaining in-memory cache for processed data

### Integration Requirements
- **Zero Breaking Changes**: All existing components must work without modification
- **Type Safety**: Maintain existing TypeScript interfaces (`HistoricalDataPoint`, `DataServiceState`)
- **Hook Compatibility**: Existing hooks (`useCentralizedData`, `useHistoricalDataOnly`) must work identically
- **Performance Monitoring**: Integrate with existing `PerformanceMonitor` to track loading improvements

## Approach Options

**Option A: Direct File Replacement**
- Pros: Simplest implementation, minimal code changes
- Cons: No progressive loading, larger initial download

**Option B: Progressive Loading with Smart Caching** (Selected)
- Pros: Optimal user experience, maintains performance benefits, scalable architecture
- Cons: More complex implementation, requires careful cache management

**Option C: Hybrid Database + JSON Approach**
- Pros: Maintains database for updates, uses JSON for reads
- Cons: Doesn't achieve full performance benefits, maintains complexity

**Rationale:** Option B provides the best balance of performance improvement and user experience. The progressive loading ensures instant chart display with monthly data while allowing detailed analysis with daily data when needed.

## External Dependencies

**No new external dependencies required** - The implementation uses existing Next.js static file serving, browser fetch API, and current TypeScript/React infrastructure.

## Implementation Strategy

### Phase 1: JSON File Generation
1. Create data conversion script to process existing `bitcoin-price-backup.json`
2. Generate optimized JSON files with proper metadata
3. Validate data integrity and completeness

### Phase 2: Service Layer Migration
1. Create new `BitcoinJsonDataService` class implementing existing interface
2. Implement progressive loading logic (monthly → weekly → daily)
3. Integrate with existing `centralizedDataService` as drop-in replacement

### Phase 3: Integration and Testing
1. Update centralized data service to use JSON loader
2. Verify all chart components work identically
3. Confirm Price Projection tab functionality is preserved
4. Measure and validate performance improvements

### Data Update Strategy
- **Historical Data**: JSON files updated via build-time script or scheduled process
- **Current Price**: Continues using existing live API calls (no changes)
- **Fallback Mechanism**: Database API remains available as fallback for JSON loading failures
