# Reference Documentation

This directory contains reference implementations and source materials used for feature development.

## Files

### ROLLING LOAN STRATEGY.html

**Purpose**: Reference implementation for Cycle Repeat Volatility algorithm  
**Source**: Original algorithm implementation used for PR #36  
**Date Added**: 2025-10-02  
**Related Feature**: Power Law Model Cycle Repeat Volatility

**Description**:
Complete standalone HTML application that implements Bitcoin leverage simulation with cycle repeat volatility. This file served as the reference implementation for developing the Cycle Repeat Volatility feature in the Power Law price projection model.

**Key Algorithm Components**:
- Historical price-to-PowerLaw ratio calculations
- Deviation pattern extraction and application
- Volatility cycling for extended projections
- Diminishing factor implementation

**Usage**:
- Open in web browser for standalone simulation
- Reference for understanding volatility algorithm implementation
- Validation tool for comparing algorithm results

**Implementation Status**:
✅ Algorithm successfully integrated into Power Law Model (PR #36)  
✅ Core functionality replicated in VolatilityService  
✅ Enhanced with TypeScript types and React integration  
✅ Comprehensive test coverage added (42 tests)

**Related Documentation**:
- [Cycle Repeat Volatility Guide](../cycle-repeat-volatility-guide.md)
- [Power Law Model Documentation](../price-projection-models.md)
- [Technical Specification](./.agent-os/specs/2025-10-02-power-law-cycle-volatility/)

---

**Note**: Reference files are preserved for historical context and algorithm validation. They are not part of the main application but serve as important documentation of feature development sources.
