# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-20-curve-type-selection/spec.md

> Created: 2025-01-20
> Version: 1.0.0

## Technical Requirements

### Logarithmic Curve Implementation

**Logarithmic Curve (Pure Cycle Repeat)**
- Apply historical percentage movements exactly as extracted from 4 years ago
- No mathematical transformation - maintains current working implementation
- Formula: `newPrice = currentPrice * historicalMovement[i]`
- Preserves original volatility and cycle characteristics
- This is the current behavior that needs to be explicitly labeled as "logarithmic"

### Extensible Architecture Design

**Curve Type Parameter System**
- Add `curveType: 'logarithmic'` to model configuration interface
- Design parameter structure to easily accommodate future curve types
- Maintain backward compatibility with existing implementations

**Transformation Method Architecture**
- Create `applyCurveTransformation()` method with curve type switching
- Initial implementation only handles 'logarithmic' case (no transformation)
- Method signature designed for future curve type additions:
  ```typescript
  private applyCurveTransformation(
    originalMovement: number,
    curveType: CurveType,
    timeProgress: number,
    curveParams?: CurveParameters
  ): number
  ```

### UI Component Architecture

**CurveTypeSelector Component**
- Single option display showing "Logarithmic (Pure Cycle Repeat)"
- Clear description explaining this maintains current cycle repeat behavior
- Component structure designed for easy addition of future curve type options
- Integration with existing sessionStorage parameter system

**Chart Integration**
- Maintain existing UnifiedPriceChart functionality
- Add curve type label to chart metadata
- Prepare chart architecture for future multi-curve display capability

### Data Flow Architecture

**Enhanced Cycle Repeat Model Updates**
- Add `curveType: 'logarithmic'` parameter to model configuration
- Implement `applyCurveTransformation()` method (initially returns original movement)
- Maintain full backward compatibility with existing curve controls logic
- Architecture ready for future curve type additions

**Parameter Integration Logic**
- All existing Curve Controls parameters work unchanged with logarithmic curve
- Parameter effects remain identical to current implementation
- Foundation established for future curve-specific parameter behaviors

## Approach Options

**Option A: Full Curve System Implementation**
- Pros: Complete feature set, powerful analysis capabilities
- Cons: Large implementation scope, higher complexity, longer development time

**Option B: Logarithmic Foundation First** (Selected)
- Pros: Manageable scope, establishes architecture, maintains current functionality, enables incremental additions
- Cons: Limited immediate feature expansion, requires future iterations for full capability

**Rationale:** Starting with logarithmic curve foundation allows us to establish the architecture correctly while maintaining current functionality. This approach enables incremental addition of other curve types without major refactoring.

## External Dependencies

**No New Dependencies Required**
- Logarithmic curve uses existing cycle repeat logic (no transformation)
- UI components use existing shadcn/ui component library
- Architecture designed to avoid new dependencies for future curve types
