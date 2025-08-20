# Spec Requirements Document

> Spec: Logarithmic Curve Control Model
> Created: 2025-01-20
> Status: Planning

## Overview

Create a new Bitcoin price projection model that applies mathematical logarithmic transformations to historical cycle patterns, allowing users to manipulate curve parameters and see real-time effects on price projections. This model will provide a mathematically smooth alternative to pure cycle repetition while maintaining the proven 4-year historical data extraction methodology.

## User Stories

### Mathematical Curve Manipulation

As a Bitcoin analyst, I want to apply logarithmic mathematical transformations to historical price movements using adjustable parameters (base multiplier, logarithmic strength, smoothing factor, growth acceleration), so that I can create mathematically smooth projections that follow logarithmic growth principles while maintaining the underlying cycle patterns.

The user will see real-time chart updates as they adjust curve control sliders, with default parameters that closely match the current cycle repeat behavior, providing a familiar starting point for exploration.

### Advanced Price Projection Control

As an advanced user, I want to start with parameters that match current cycle repeat results and then adjust logarithmic transformations to create more conservative or aggressive growth scenarios, so that I can model different mathematical assumptions about Bitcoin's future price behavior.

The interface will provide preset configurations (Pure Repeat, Smoothed Logarithmic, Conservative Growth, Aggressive Growth) with clear descriptions of how each preset affects the mathematical transformation of historical movements.

## Spec Scope

1. **New Model Creation** - Complete new LogarithmicCurveRepeatModel class with no technical debt from existing models
2. **Mathematical Transformations** - Implement true logarithmic transformations using ln() mathematical properties
3. **Curve Control UI** - Create LogarithmicCurveControls component with real-time parameter adjustment
4. **Registry Integration** - Register new model in PriceModelRegistry with proper priority
5. **Parameter Calibration** - Default parameters that closely match current cycle repeat behavior

## Out of Scope

- Modifications to existing Enhanced Cycle Repeat Model
- Multi-curve chart display functionality (future iteration)
- Integration with other price projection models
- Backend API changes or external data sources

## Expected Deliverable

1. **Functional Logarithmic Model** - New model produces mathematically transformed projections using logarithmic rules
2. **Interactive Curve Controls** - UI sliders that immediately update chart projections when adjusted
3. **Calibrated Default Behavior** - Default parameters produce results very similar to current cycle repeat model

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-20-logarithmic-curve-control-model/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-20-logarithmic-curve-control-model/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-01-20-logarithmic-curve-control-model/sub-specs/tests.md
