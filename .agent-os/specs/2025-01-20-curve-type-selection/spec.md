# Spec Requirements Document

> Spec: Logarithmic Curve Control Foundation for Enhanced Cycle Repeat Model
> Created: 2025-01-20
> Status: Planning

## Overview

Implement the foundation for curve type selection by adding a Logarithmic curve control that maintains the current pure cycle repeat functionality while establishing the architecture for future curve types (Linear, S-Curve, Exponential). This creates a solid base for incremental curve type additions.

## User Stories

### Logarithmic Curve Selection

As a Bitcoin analyst, I want to explicitly select "Logarithmic (Pure Cycle Repeat)" as a curve type option, so that I understand I'm using the mathematical approach that applies historical movements exactly as extracted from 4 years ago without transformation.

The user will see a curve type selector showing "Logarithmic" as the current option with a clear description that this maintains the existing cycle repeat behavior. The UI will be designed to easily accommodate additional curve types in future iterations.

### Foundation for Future Curves

As a developer, I want the curve type architecture to be extensible, so that Linear, S-Curve, and Exponential transformations can be added incrementally without major refactoring of the existing logarithmic implementation.

The code structure will include a curve type parameter system, transformation method architecture, and UI components designed for easy expansion to additional mathematical curve types.

## Spec Scope

1. **Curve Type Parameter** - Add curveType parameter to model with "logarithmic" as initial option
2. **Logarithmic Implementation** - Maintain current cycle repeat behavior under explicit logarithmic curve selection
3. **Extensible Architecture** - Design transformation method structure for future curve type additions
4. **UI Foundation** - Create curve type selector UI component ready for additional options
5. **Preset Integration** - Update existing presets to include logarithmic curve type selection

## Out of Scope

- Implementation of Linear, S-Curve, or Exponential curve types (future iterations)
- Multi-curve chart display functionality (future iteration)
- Changes to core 4-year historical data extraction algorithm
- New external API integrations or data sources

## Expected Deliverable

1. **Logarithmic Curve Selection** - UI selector showing "Logarithmic (Pure Cycle Repeat)" option with clear description
2. **Extensible Architecture** - Code structure ready for additional curve types without major refactoring
3. **Maintained Functionality** - Current cycle repeat behavior preserved under logarithmic curve selection
