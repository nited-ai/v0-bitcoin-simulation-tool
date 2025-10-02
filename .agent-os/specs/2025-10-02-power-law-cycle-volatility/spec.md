# Spec Requirements Document

> Spec: Power Law Cycle Repeat Volatility Integration
> Created: 2025-10-02
> Status: Planning

## Overview

Integrate the "Cycle Repeat Volatility" feature from the Rolling Loan Strategy into the Power Law price projection model settings. This feature applies historical Bitcoin price volatility patterns to the price projection line used by the strategy engine, creating more realistic price movements that mirror actual market cycles while maintaining the pure mathematical foundation of the Power Law regression lines (Support, Fit, Resistance).

**Reference Implementation**: `docs/ROLLING LOAN STRATEGY.html` contains the original volatility mechanism that serves as the implementation reference.

## User Stories

### Enhanced Power Law Projections

As a Bitcoin simulation user, I want to enable cycle repeat volatility on Power Law projections, so that I can see more realistic price movements that include historical volatility patterns rather than smooth mathematical curves.

**Detailed Workflow:**
1. User selects Power Law model in price projection tab
2. User sees new "Cycle Repeat Volatility" section in Power Law controls
3. User can optionally customize price projection parameters independent of regression lines
4. User toggles volatility feature on/off
5. When enabled, user can adjust pattern length (24-120 months, default: 96) and diminishing factor (0.5-1.0, default: 1.0)
6. Chart immediately updates to show volatility-enhanced price projection line
7. Power Law regression lines (Support/Fit/Resistance) remain pure mathematical curves
8. Price projection line maintains Power Law trend but includes realistic price swings

### Configurable Volatility Parameters

As an advanced user, I want to customize volatility parameters and price projection baselines, so that I can model different scenarios like diminishing future volatility, different historical pattern lengths, and custom projection parameters independent of the regression lines.

**Detailed Workflow:**
1. User can customize price projection baseline using "Apply to Price Projection" feature
2. User enables cycle repeat volatility
3. User adjusts "Pattern Length" slider to use different historical periods (24-120 months, default: 96)
4. User adjusts "Diminishing Factor" to reduce volatility over time (0.5-1.0, default: 1.0)
5. User sees real-time preview of how parameters affect the price projection line only
6. Power Law regression lines remain unaffected by volatility settings
7. Settings persist across sessions for consistent analysis

## Spec Scope

1. **Type System Enhancement** - Extend PowerLawSettings interface to include volatility parameters and independent price projection settings
2. **Core Algorithm Implementation** - Add deviation pattern calculation and application logic to PowerLawModel for price projection line only
3. **UI Controls Integration** - Add volatility controls section and "Apply to Price Projection" functionality to PowerLawControls component
4. **Historical Data Processing** - Implement extraction of price deviation patterns from historical data (reference: `docs/ROLLING LOAN STRATEGY.html`)
5. **Price Projection Independence** - Enable custom slope/intercept parameters for price projection line separate from regression lines
6. **Backward Compatibility** - Ensure existing Power Law functionality remains unchanged when volatility disabled

## Out of Scope

- Modifications to other price projection models (Manual Growth, Cycle Repeat, Enhanced)
- Changes to historical data collection or storage mechanisms
- Integration with loan calculation or strategy execution systems
- Performance optimizations beyond basic caching of deviation patterns

## Expected Deliverable

1. **Functional Volatility Toggle** - Users can enable/disable cycle repeat volatility in Power Law settings with immediate chart updates to price projection line only
2. **Parameter Controls** - Pattern length (24-120 months, default: 96) and diminishing factor (0.5-1.0, default: 1.0) sliders work correctly with real-time preview
3. **Independent Price Projection** - "Apply to Price Projection" functionality allows custom baseline parameters separate from regression lines
4. **Enhanced Projections** - Price projection line shows realistic volatility patterns when enabled while Power Law regression lines remain pure mathematical curves

## Spec Documentation

- Tasks: @.agent-os/specs/2025-10-02-power-law-cycle-volatility/tasks.md
- Technical Specification: @.agent-os/specs/2025-10-02-power-law-cycle-volatility/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-10-02-power-law-cycle-volatility/sub-specs/tests.md
