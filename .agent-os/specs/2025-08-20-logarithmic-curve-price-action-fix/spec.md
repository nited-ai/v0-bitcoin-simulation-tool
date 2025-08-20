# Spec Requirements Document

> Spec: Logarithmic Curve Price Action Fix
> Created: 2025-08-20
> Status: Planning

## Overview

Fix the LogarithmicCurveRepeatModel's steep price climb issue by correcting the historical movement application logic to match the working Enhanced Cycle Repeat Model behavior. This will ensure realistic Bitcoin price projections that preserve natural volatility while allowing logarithmic curve transformations.

## User Stories

### Realistic Price Projections

As a Bitcoin holder using the simulation tool, I want the Logarithmic Curve Control Model to produce realistic price projections similar to the working cycle repeat model, so that I can make informed decisions about Bitcoin-backed loan strategies without being misled by astronomical price predictions.

The current implementation produces unrealistic exponential price climbs (reaching 3000M+ levels) due to incorrect compounding of historical movements. Users need projections that follow realistic Bitcoin price patterns with natural volatility while still allowing subtle logarithmic transformations for different market scenarios.

### Preserved Volatility with Curve Controls

As an advanced user, I want to apply logarithmic curve transformations to dampen large price movements while preserving the natural volatility patterns of Bitcoin, so that I can model more conservative scenarios without losing the realistic ups and downs that characterize Bitcoin markets.

The model should maintain Bitcoin's characteristic volatility (both positive and negative daily/weekly movements) while allowing users to apply mathematical transformations that reduce extreme movements for more conservative projections.

## Spec Scope

1. **Historical Movement Application Logic** - Fix the core algorithm to apply historical movements sequentially rather than cumulatively compounding them
2. **Movement Extraction Correction** - Ensure the model extracts and applies exactly 1460 days of historical movements correctly
3. **Volatility Preservation** - Maintain natural Bitcoin volatility patterns while allowing logarithmic transformations
4. **Parameter Range Optimization** - Adjust parameter ranges to provide meaningful control without extreme results
5. **Algorithm Alignment** - Match the working Enhanced Cycle Repeat Model's core projection logic exactly

## Out of Scope

- UI/UX changes to the Logarithmic Curve Controls component
- Adding new curve transformation types beyond logarithmic
- Modifying other price projection models
- Changes to the historical data loading system
- Performance optimizations beyond the core algorithm fix

## Expected Deliverable

1. LogarithmicCurveRepeatModel produces realistic price projections matching cycle repeat behavior when logarithmic strength is 0%
2. Model preserves natural Bitcoin volatility (both positive and negative movements) across all parameter settings
3. All existing unit tests pass and new tests verify correct movement application logic

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-20-logarithmic-curve-price-action-fix/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-20-logarithmic-curve-price-action-fix/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-08-20-logarithmic-curve-price-action-fix/sub-specs/tests.md
