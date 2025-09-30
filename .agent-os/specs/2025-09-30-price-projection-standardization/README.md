# Price Projection Output Standardization & Legacy System Elimination

> **Status**: Ready for Implementation  
> **Created**: 2025-09-30  
> **Estimated Duration**: 2-3 weeks (14-18 days)  
> **Risk Level**: Medium (phased approach minimizes risk)

## 🎯 Executive Summary

This specification outlines a comprehensive plan to eliminate all legacy price projection formats and standardize on a single output format across the entire Bitcoin Simulation Tool application. The migration will reduce maintenance burden by 50%+, remove ~500 lines of adapter code, and establish `app/simulation/price-models/types.ts` as the single source of truth.

## 📋 Quick Links

- **Main Spec**: [@spec.md](./spec.md)
- **Technical Specification**: [@sub-specs/technical-spec.md](./sub-specs/technical-spec.md)
- **Migration Plan**: [@sub-specs/migration-plan.md](./sub-specs/migration-plan.md)
- **Tests Specification**: [@sub-specs/tests.md](./sub-specs/tests.md)
- **File-by-File Checklist**: [@sub-specs/file-by-file-checklist.md](./sub-specs/file-by-file-checklist.md)
- **Tasks**: [@tasks.md](./tasks.md)

## 🎯 Goals

### Primary Goals
1. **Single Standard Format**: Migrate all code to use ONLY `PriceProjectionResult` from `app/simulation/price-models/types.ts`
2. **Remove Legacy Systems**: Eliminate old format and legacy `PriceChartDataPoint[]` arrays
3. **Standardized Data Exchange**: Define clear interfaces for Parameters → Price Projection → Strategies → Results
4. **Code Reduction**: Remove ~500 lines of redundant adapter code and duplicate types

### Success Metrics
- ✅ Zero format conversions needed
- ✅ ~500 lines of code removed
- ✅ Single type definition location
- ✅ 100% test pass rate
- ✅ 5-10% bundle size reduction
- ✅ No performance regression

## 📊 Current State vs Target State

### Before Migration (Current)
```
THREE INCOMPATIBLE FORMATS:
1. app/simulation/price-models/types.ts (new standard)
2. src/modules/price-projection/types/ (old standard)
3. src/modules/price-data/types/ (legacy arrays)

Problem: ~500 lines of adapter code needed!
```

### After Migration (Target)
```
SINGLE STANDARD FORMAT:
- app/simulation/price-models/types.ts (ONLY source)
- Used by ALL models, hooks, components, services
- Specialized adapters only for specific needs

Benefits: Zero conversion code, single source of truth!
```

## 🗓️ Migration Phases

### Phase 1: Foundation & Service Layer (3-4 days)
**Objective**: Refactor core services while maintaining backward compatibility

**Key Tasks**:
- Refactor `PriceDataService` to use `UnifiedPriceProjectionService`
- Add deprecation warnings to old types
- Create migration utilities
- Comprehensive testing

**Risk**: Low ✅

### Phase 2: Hook Migration (4-5 days)
**Objective**: Update all hooks to use unified service and return standard format

**Key Tasks**:
- Migrate `usePriceProjection`
- Migrate `usePriceGeneration`
- Migrate `usePriceData`
- Migrate `useMultiModelProjection`
- Integration testing

**Risk**: Medium ⚠️

### Phase 3: Component Migration (5-6 days)
**Objective**: Update all components to accept and use `PriceProjectionResult`

**Key Tasks**:
- Update `SimulationContext`
- Migrate Price Projection tab components
- Migrate Strategy tab components
- Migrate Results tab components
- Visual regression testing

**Risk**: High 🔴

### Phase 4: Cleanup & Removal (2-3 days)
**Objective**: Remove all legacy code and duplicate types

**Key Tasks**:
- Delete old type definitions
- Remove legacy conversion code
- Clean up deprecated services
- Update all imports
- Final verification

**Risk**: Low ✅

## 📈 Impact Analysis

### Code Metrics
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Type Definitions | 3 locations | 1 location | -67% |
| Adapter Code | ~500 lines | ~200 lines | -60% |
| Duplicate Types | ~150 lines | 0 lines | -100% |
| Bundle Size | Baseline | -5-10% | Smaller |

### Files Affected
| Category | Modified | Created | Deleted | Total |
|----------|----------|---------|---------|-------|
| Services | 3 | 1 | 1 | 5 |
| Hooks | 4 | 0 | 0 | 4 |
| Components | 12 | 0 | 0 | 12 |
| Types | 1 | 0 | 4 | 5 |
| Tests | 0 | 14 | 0 | 14 |
| **Total** | **20** | **15** | **5** | **40** |

## 🔒 Risk Mitigation

### Phase 1-2: Low-Medium Risk
- Maintains backward compatibility
- Service layer changes only
- Easy to test in isolation
- Simple rollback (1-2 hours)

### Phase 3: High Risk
- User-facing changes
- Complex component interactions
- Requires extensive testing
- Moderate rollback complexity (4-6 hours)

### Phase 4: Low Risk
- Cleanup only
- No functional changes
- Easy to verify
- Simple rollback (1-2 hours)

## 🧪 Testing Strategy

### Unit Tests
- 90%+ coverage target
- All services, hooks, adapters
- Format conversion validation
- Error handling

### Integration Tests
- 80%+ coverage target
- Service layer integration
- Hook to context integration
- Cross-tab data flow

### Visual Regression Tests
- All charts and visualizations
- Before/after comparisons
- Multiple price models

### Performance Tests
- Bundle size analysis
- Runtime performance
- Memory usage
- Load time metrics

## 📚 Documentation

### Technical Documentation
- Architecture overview with diagrams
- Data flow documentation
- API reference updates
- Migration guide

### Developer Documentation
- Usage examples for new format
- Migration patterns
- Best practices
- Troubleshooting guide

### Team Documentation
- "What Changed" summary
- Deployment checklist
- Rollback procedures
- Monitoring guide

## 🚀 Getting Started

### For Implementation
1. Read [@spec.md](./spec.md) for overview
2. Review [@sub-specs/technical-spec.md](./sub-specs/technical-spec.md) for technical details
3. Follow [@sub-specs/migration-plan.md](./sub-specs/migration-plan.md) for phased approach
4. Use [@tasks.md](./tasks.md) for task tracking
5. Reference [@sub-specs/file-by-file-checklist.md](./sub-specs/file-by-file-checklist.md) for detailed changes

### For Review
1. Start with this README for overview
2. Review [@spec.md](./spec.md) for requirements
3. Check [@sub-specs/migration-plan.md](./sub-specs/migration-plan.md) for timeline
4. Evaluate [@sub-specs/technical-spec.md](./sub-specs/technical-spec.md) for approach

### For Testing
1. Review [@sub-specs/tests.md](./sub-specs/tests.md) for test strategy
2. Follow test specifications per phase
3. Use [@sub-specs/file-by-file-checklist.md](./sub-specs/file-by-file-checklist.md) for verification

## 📞 Support & Questions

### During Migration
- Report blockers immediately
- Escalate risks to team lead
- Document workarounds
- Update timeline if needed

### After Migration
- Monitor application performance
- Check error logs
- Collect user feedback
- Address issues promptly

## ✅ Approval Checklist

Before starting implementation:

- [ ] Spec reviewed and approved
- [ ] Technical approach validated
- [ ] Timeline agreed upon
- [ ] Resources allocated
- [ ] Testing strategy approved
- [ ] Rollback plan documented
- [ ] Team notified

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-09-30 | Initial specification created |

---

**Ready to proceed?** Start with Phase 1 by following the tasks in [@tasks.md](./tasks.md)!

