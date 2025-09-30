# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-09-30-price-projection-standardization/spec.md

> Created: 2025-09-30  
> Status: Ready for Implementation

## Tasks

### Phase 1: Foundation & Service Layer (3-4 days)

- [ ] 1. Refactor PriceDataService to use UnifiedPriceProjectionService
  - [ ] 1.1 Write tests for refactored PriceDataService
  - [ ] 1.2 Add import for UnifiedPriceProjectionService and PriceProjectionAdapter
  - [ ] 1.3 Update generatePriceProjection() to use unified service internally
  - [ ] 1.4 Ensure backward compatibility by converting to legacy format
  - [ ] 1.5 Add logging for migration tracking
  - [ ] 1.6 Verify all tests pass

- [ ] 2. Add deprecation warnings to old type definitions
  - [ ] 2.1 Add @deprecated JSDoc to src/modules/price-projection/types/index.ts
  - [ ] 2.2 Add @deprecated JSDoc to legacy conversion methods
  - [ ] 2.3 Add console warnings for old format usage in development
  - [ ] 2.4 Update documentation to reference new standard location
  - [ ] 2.5 Verify deprecation warnings appear in development

- [ ] 3. Create migration utilities
  - [ ] 3.1 Write tests for migration helper functions
  - [ ] 3.2 Create src/modules/shared/utils/migrationHelpers.ts
  - [ ] 3.3 Implement logFormatUsage() function
  - [ ] 3.4 Implement validateMigration() function
  - [ ] 3.5 Export utilities from shared module
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Phase 1 integration testing
  - [ ] 4.1 Test service layer integration
  - [ ] 4.2 Verify backward compatibility maintained
  - [ ] 4.3 Check deprecation warnings appear correctly
  - [ ] 4.4 Run full test suite
  - [ ] 4.5 Verify zero TypeScript errors
  - [ ] 4.6 Document Phase 1 completion

### Phase 2: Hook Migration (4-5 days)

- [ ] 5. Migrate usePriceProjection hook
  - [ ] 5.1 Write tests for migrated usePriceProjection
  - [ ] 5.2 Update return type to use PriceProjectionResult
  - [ ] 5.3 Update generateProjection() to use unified service
  - [ ] 5.4 Update state management for new format
  - [ ] 5.5 Add migration logging
  - [ ] 5.6 Verify all tests pass

- [ ] 6. Migrate usePriceGeneration hook
  - [ ] 6.1 Write tests for migrated usePriceGeneration
  - [ ] 6.2 Update to use UnifiedPriceProjectionService
  - [ ] 6.3 Add temporary conversion for context compatibility
  - [ ] 6.4 Update dependencies array
  - [ ] 6.5 Add migration logging
  - [ ] 6.6 Verify all tests pass

- [ ] 7. Migrate usePriceData hook
  - [ ] 7.1 Write tests for migrated usePriceData
  - [ ] 7.2 Update return type to use PriceProjectionResult
  - [ ] 7.3 Update generateProjection() implementation
  - [ ] 7.4 Update state management
  - [ ] 7.5 Add migration logging
  - [ ] 7.6 Verify all tests pass

- [ ] 8. Migrate useMultiModelProjection hook
  - [ ] 8.1 Write tests for migrated useMultiModelProjection
  - [ ] 8.2 Update Map type to store PriceProjectionResult
  - [ ] 8.3 Update projection generation logic
  - [ ] 8.4 Update getProjectionForModel() return type
  - [ ] 8.5 Add migration logging
  - [ ] 8.6 Verify all tests pass

- [ ] 9. Phase 2 integration testing
  - [ ] 9.1 Test hook to context integration
  - [ ] 9.2 Test hook to component integration
  - [ ] 9.3 Verify data flow through application
  - [ ] 9.4 Run full test suite
  - [ ] 9.5 Check performance (no regression)
  - [ ] 9.6 Document Phase 2 completion

### Phase 3: Component Migration (5-6 days)

- [ ] 10. Update SimulationContext
  - [ ] 10.1 Write tests for updated SimulationContext
  - [ ] 10.2 Add priceProjection field (PriceProjectionResult | null)
  - [ ] 10.3 Add setPriceProjection method
  - [ ] 10.4 Keep legacy priceChartData for backward compatibility
  - [ ] 10.5 Update context provider implementation
  - [ ] 10.6 Verify all tests pass

- [ ] 11. Migrate Price Projection Tab components
  - [ ] 11.1 Write tests for migrated UnifiedPriceChart
  - [ ] 11.2 Update UnifiedPriceChart to accept PriceProjectionResult
  - [ ] 11.3 Update PriceProjectionChart component
  - [ ] 11.4 Update GrowthRateAnalysis component
  - [ ] 11.5 Add adapter usage for legacy format needs
  - [ ] 11.6 Verify all tests pass

- [ ] 12. Migrate Strategy Tab components
  - [ ] 12.1 Write tests for migrated strategy components
  - [ ] 12.2 Update strategy execution components
  - [ ] 12.3 Use PriceProjectionAdapter.toStrategyFormat()
  - [ ] 12.4 Update strategy visualization components
  - [ ] 12.5 Update prop types and interfaces
  - [ ] 12.6 Verify all tests pass

- [ ] 13. Migrate Results Tab components
  - [ ] 13.1 Write tests for migrated results components
  - [ ] 13.2 Update BitcoinPriceChart component
  - [ ] 13.3 Use PriceProjectionAdapter.toResultsFormat()
  - [ ] 13.4 Update other results visualization components
  - [ ] 13.5 Update prop types and interfaces
  - [ ] 13.6 Verify all tests pass

- [ ] 14. Phase 3 integration testing
  - [ ] 14.1 Visual regression testing for all charts
  - [ ] 14.2 Functional testing for each tab
  - [ ] 14.3 Cross-tab data flow testing
  - [ ] 14.4 User acceptance testing
  - [ ] 14.5 Performance benchmarking
  - [ ] 14.6 Document Phase 3 completion

### Phase 4: Cleanup & Removal (2-3 days)

- [ ] 15. Remove old type definitions
  - [ ] 15.1 Write verification tests for type cleanup
  - [ ] 15.2 Delete src/modules/price-projection/types/index.ts
  - [ ] 15.3 Remove duplicate types from src/modules/parameters/types/
  - [ ] 15.4 Remove duplicate types from src/modules/results/types/
  - [ ] 15.5 Update all imports to use standard location
  - [ ] 15.6 Verify all tests pass

- [ ] 16. Remove legacy conversion code
  - [ ] 16.1 Write verification tests for adapter cleanup
  - [ ] 16.2 Remove toLegacyFormat() from PriceProjectionAdapter
  - [ ] 16.3 Remove fromOldFormat() from PriceProjectionAdapter
  - [ ] 16.4 Remove legacy support from UnifiedPriceProjectionService
  - [ ] 16.5 Update adapter documentation
  - [ ] 16.6 Verify all tests pass

- [ ] 17. Evaluate and clean up deprecated services
  - [ ] 17.1 Write verification tests for service cleanup
  - [ ] 17.2 Evaluate if src/modules/price-projection/ can be deleted
  - [ ] 17.3 Remove legacy methods from PriceDataService
  - [ ] 17.4 Update service documentation
  - [ ] 17.5 Clean up unused imports
  - [ ] 17.6 Verify all tests pass

- [ ] 18. Update all imports across codebase
  - [ ] 18.1 Write import verification tests
  - [ ] 18.2 Use IDE refactoring to update import paths
  - [ ] 18.3 Verify no imports from deprecated locations
  - [ ] 18.4 Verify all imports from standard location
  - [ ] 18.5 Run type checking (zero errors)
  - [ ] 18.6 Verify all tests pass

- [ ] 19. Remove legacy context fields
  - [ ] 19.1 Write verification tests for context cleanup
  - [ ] 19.2 Remove priceChartData from SimulationContext
  - [ ] 19.3 Remove setPriceChartData from SimulationContext
  - [ ] 19.4 Update context provider implementation
  - [ ] 19.5 Update context documentation
  - [ ] 19.6 Verify all tests pass

- [ ] 20. Phase 4 final verification
  - [ ] 20.1 Run full regression test suite
  - [ ] 20.2 Verify zero TypeScript errors
  - [ ] 20.3 Verify build succeeds
  - [ ] 20.4 Analyze bundle size reduction
  - [ ] 20.5 Performance benchmarking
  - [ ] 20.6 Document Phase 4 completion

### Final Verification & Documentation

- [ ] 21. Final verification and metrics
  - [ ] 21.1 Verify ~500 lines of code removed
  - [ ] 21.2 Verify single PriceProjectionResult location
  - [ ] 21.3 Verify zero duplicate type definitions
  - [ ] 21.4 Verify 100% test pass rate
  - [ ] 21.5 Verify bundle size reduction (5-10%)
  - [ ] 21.6 Generate migration completion report

- [ ] 22. Update documentation
  - [ ] 22.1 Update architecture documentation
  - [ ] 22.2 Update API documentation
  - [ ] 22.3 Update developer guides
  - [ ] 22.4 Update migration guide (mark as complete)
  - [ ] 22.5 Create "What Changed" document for team
  - [ ] 22.6 Archive old documentation

- [ ] 23. Deployment preparation
  - [ ] 23.1 Create deployment checklist
  - [ ] 23.2 Prepare rollback plan
  - [ ] 23.3 Schedule deployment window
  - [ ] 23.4 Notify team of deployment
  - [ ] 23.5 Prepare monitoring dashboard
  - [ ] 23.6 Document deployment procedure

- [ ] 24. Post-deployment verification
  - [ ] 24.1 Monitor application performance
  - [ ] 24.2 Check error logs for issues
  - [ ] 24.3 Verify all features working
  - [ ] 24.4 Collect user feedback
  - [ ] 24.5 Address any issues found
  - [ ] 24.6 Mark migration as complete

## Task Dependencies

```
Phase 1 (Tasks 1-4)
    ↓
Phase 2 (Tasks 5-9)
    ↓
Phase 3 (Tasks 10-14)
    ↓
Phase 4 (Tasks 15-20)
    ↓
Final (Tasks 21-24)
```

## Estimated Timeline

- **Phase 1**: 3-4 days
- **Phase 2**: 4-5 days
- **Phase 3**: 5-6 days
- **Phase 4**: 2-3 days
- **Final**: 1-2 days

**Total**: 15-20 days (3-4 weeks calendar time)

## Success Criteria

- [ ] All 24 tasks completed
- [ ] All tests passing (100% pass rate)
- [ ] Zero TypeScript errors
- [ ] ~500 lines of code removed
- [ ] Single PriceProjectionResult location
- [ ] Bundle size reduced by 5-10%
- [ ] No performance regression
- [ ] Documentation updated
- [ ] Successfully deployed to production

