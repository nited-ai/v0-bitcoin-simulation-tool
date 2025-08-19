# Spec Requirements Document

> Spec: Angle Adjustment Volatility Preservation
> Created: 2025-01-27
> Status: Planning

## Overview

Implement angle adjustment methodology in the Enhanced Cycle Repeat Model to preserve Bitcoin's historical volatility patterns (including 80%+ drawdowns and dramatic pumps) while applying diminishing returns theory to the overall cycle trajectory rather than dampening individual daily multipliers.

## User Stories

### Realistic Bitcoin Volatility Preservation

As a Bitcoin investor using the Enhanced Cycle Repeat Model, I want to see realistic price projections that include the dramatic 80%+ drawdowns and explosive pumps that Bitcoin historically experiences, so that I can make informed decisions based on realistic market behavior rather than artificially smoothed projections.

The current implementation dampens all volatility proportionally, turning 80% crashes into 40% dips and 100% pumps into 50% gains. This destroys the boom-bust cycle characteristics that define Bitcoin markets. Users need to see projections that maintain the volatile nature of Bitcoin while still accounting for market maturation effects.

### Economic Theory Integration Without Volatility Loss

As a user interested in diminishing returns theory, I want the model to apply economic principles to the overall cycle trajectory while preserving the day-to-day volatility patterns, so that I can understand how market maturation affects long-term outcomes without losing the realistic volatility that affects my loan strategies.

The angle adjustment approach should modify where the cycle ends up (the final destination) based on diminishing returns, while keeping the path to that destination volatile and realistic.

## Spec Scope

1. **Angle Adjustment Algorithm** - Replace current multiplier dampening with trajectory adjustment that preserves daily volatility
2. **Final Destination Calculation** - Calculate where the cycle should end with diminishing returns applied to the endpoint
3. **Gradual Trajectory Modification** - Apply angle adjustment progressively over time while maintaining historical multiplier patterns
4. **Volatility Preservation** - Ensure 80%+ drawdowns and dramatic pumps remain intact in the projection
5. **Backward Compatibility** - Maintain existing Enhanced Cycle Repeat Model interface and parameter structure

## Out of Scope

- Changes to the basic Cycle Repeat Model (only Enhanced version affected)
- Modifications to diminishing returns parameter structure or UI controls
- Changes to other price projection models
- Alterations to chart display or data visualization components

## Expected Deliverable

1. Enhanced Cycle Repeat Model generates projections with realistic Bitcoin volatility (80%+ drawdowns visible)
2. Diminishing returns theory still affects the overall cycle trajectory and final price destination
3. All existing Enhanced Cycle Repeat Model parameters and presets continue to function correctly
4. Chart displays show dramatic price movements that match Bitcoin's historical volatility patterns

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-27-angle-adjustment-volatility/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-27-angle-adjustment-volatility/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-01-27-angle-adjustment-volatility/sub-specs/tests.md
