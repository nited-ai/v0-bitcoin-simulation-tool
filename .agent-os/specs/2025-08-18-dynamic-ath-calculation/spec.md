# Spec Requirements Document

> Spec: Simple ATH Update
> Created: 2025-08-18
> Status: Planning

## Overview

Update the hard-coded ATH (All-Time High) price from $125,000 to the actual last ATH of $124,277.98 and create a simple mechanism to automatically update this value when daily fetched prices exceed the current ATH. Store the ATH in a server-side JSON file following the same pattern as historical price data, with automatic updates integrated into the existing daily update service.

## User Stories

### Accurate ATH Display

As a Bitcoin simulation user, I want to see the actual all-time high price of $124,277.98 instead of the outdated $125,000 value, so that my liquidation tolerance calculations are accurate and reflect real market conditions.

The system will display the correct ATH value in the Parameters tab and use it for all liquidation calculations.

### Automatic ATH Updates

As a user of the simulation tool, I want the ATH value to automatically update when Bitcoin reaches new all-time highs, so that my liquidation calculations are always based on the most current data.

The system will automatically compare daily fetched prices with the stored ATH value and update it when new highs are detected, persisting the value in a server-side JSON file that all users can access.

## Spec Scope

1. **ATH JSON File Creation** - Create `public/data/bitcoin/ath.json` with actual ATH of $124,277.98
2. **Simple ATH Service** - Create lightweight service to manage ATH value with JSON file persistence
3. **Server-Side Updates** - Integrate with existing daily update service to detect and update new ATHs
4. **Component Integration** - Update PriceDropToleranceCard and calculationsService to use the ATH service
5. **Daily Update Integration** - Hook into existing `/api/bitcoin-prices/daily-update` to compare and update ATH

## Out of Scope

- Complex dynamic ATH calculation services
- Database integration for ATH tracking
- Automatic ATH detection and updates
- JSON data structure modifications
- Real-time price monitoring for new ATHs

## Expected Deliverable

1. Parameters tab displays dynamically calculated ATH based on actual historical high data instead of hard-coded 125,000 value
2. ATH value automatically updates when current Bitcoin price exceeds the stored ATH value
3. All existing liquidation tolerance calculations work correctly with the new dynamic ATH system

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-18-dynamic-ath-calculation/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-18-dynamic-ath-calculation/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-08-18-dynamic-ath-calculation/sub-specs/tests.md
