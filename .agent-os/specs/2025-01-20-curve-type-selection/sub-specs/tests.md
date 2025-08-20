# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-20-curve-type-selection/spec.md

> Created: 2025-01-20
> Version: 1.0.0

## Test Coverage

### Unit Tests

**CurveTypeSelector Component**
- Renders all four curve type options with correct labels and descriptions
- Handles curve type selection and updates sessionStorage correctly
- Integrates with existing simulation context and parameter system
- Shows appropriate visual indicators for each mathematical curve type

**Mathematical Transformation Functions**
- Logarithmic transformation returns original movements unchanged
- Linear transformation produces steady growth rate progression
- S-Curve transformation follows sigmoid mathematical properties
- Exponential transformation shows accelerating growth characteristics
- All transformations handle edge cases (zero, negative, extreme values)

**Enhanced Cycle Repeat Model**
- `applyCurveTransformation()` method correctly switches between curve types
- Multi-curve generation produces distinct results for each curve type
- Parameter integration affects different curves appropriately
- Backward compatibility maintained with existing single-curve logic

### Integration Tests

**Multi-Curve Chart Display**
- Chart renders multiple curves simultaneously with distinct colors
- Legend toggles correctly show/hide individual curves
- Color coding matches specification (Logarithmic: blue, Linear: green, etc.)
- Chart performance remains acceptable with multiple datasets

**Curve Type and Parameter Interaction**
- Market Maturity Impact affects Linear and Exponential curves more than Logarithmic
- Institutional Saturation modifies S-Curve behavior appropriately
- Cycle Evolution Rate influences all curves with correct mathematical application
- Preset selection updates curve parameters logically

**SessionStorage Integration**
- Curve type selection persists across browser sessions
- Multi-curve toggle states save and restore correctly
- Parameter changes apply to appropriate curve types
- Backward compatibility with existing parameter storage

### Feature Tests

**End-to-End Curve Selection Workflow**
- User can select curve type and see immediate chart update
- Multi-curve mode displays all enabled curves simultaneously
- Curve toggles work correctly in legend
- Export functionality includes all visible curves

**Mathematical Accuracy Validation**
- Each curve type produces mathematically correct transformations
- Growth rates and final values align with mathematical expectations
- Extreme parameter values don't break mathematical calculations
- Curve shapes visually match their mathematical definitions

**Preset Integration Scenarios**
- Optimistic preset uses Logarithmic curve with minimal curve controls
- Moonshots preset applies most aggressive mathematical transformation
- Conservative and Moderate presets show appropriate curve dampening
- Preset switching updates both curve type and parameters correctly

### Mocking Requirements

**Mathematical Functions**: Mock complex calculations for consistent testing
**Chart Rendering**: Mock Recharts components for unit test performance
**SessionStorage**: Mock browser storage for parameter persistence testing
**Date/Time**: Mock current date for consistent projection timeline testing
