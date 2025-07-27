# Spec Requirements Document

> Spec: Price Projection Tab Redesign
> Created: 2025-07-26
> Status: Planning

## Overview

Redesign the Bitcoin Simulation Tool with a dedicated Price Projection tab that provides a clean, focused interface for price model selection, configuration, and visualization. This will separate price projection functionality from the current combined Chart tab and create a proper tab-based navigation structure (Parameters, Price Projection, Strategy, Results).

## User Stories

### Price Model Configuration

As a Bitcoin investor, I want to select and configure different price prediction models in a dedicated tab, so that I can focus on understanding and customizing price projections before moving to strategy selection.

The user will see a clean interface with a dropdown to select from available models (Manual Growth Rates, Power Law Model, Cycle Repeat Model), configure model-specific parameters below, and immediately see the price projection chart update with historical data on the left and projected prices on the right.

### Price Line Selection for Strategy

As a user planning a Bitcoin lending strategy, I want to select which price line (fit/average, support, volatile) to use for my strategy calculations, so that I can choose conservative, moderate, or aggressive price assumptions.

The user will see the price projection chart with multiple lines (fit/average, support, volatile) and can select which line to pass to the strategy engine, with clear visual indicators showing the selected line and its impact on strategy calculations.

### Visual Price Projection Analysis

As a financial advisor, I want to see historical Bitcoin price data seamlessly connected to future projections in a single chart, so that I can analyze trends and explain projections to clients.

The user will see a unified chart showing historical data from 2016-2025 on the left side and projected data from 2025-2037 on the right side, with clear visual separation and consistent styling between historical and projected data.

## Spec Scope

1. **Tab Navigation Restructure** - Implement proper tab navigation with Parameters, Price Projection, Strategy, and Results tabs
2. **Price Model Selection Interface** - Clean dropdown with model descriptions and dynamic parameter configuration
3. **Unified Price Chart** - Historical data (left) seamlessly connected to projected data (right) with proper scaling
4. **Price Line Selection** - Interactive selection of fit/average, support, and volatile lines for strategy integration
5. **Model-Specific Configuration** - Dynamic parameter forms that change based on selected price model

## Out of Scope

- Strategy simulation functionality (belongs in Strategy tab)
- Results visualization (belongs in Results tab)
- Parameter configuration for loan amounts/terms (belongs in Parameters tab)
- Database integration or user authentication
- Mobile-specific optimizations

## Expected Deliverable

1. A functional Price Projection tab with model selection, configuration, and chart visualization
2. Proper tab navigation structure with all four tabs (Parameters, Price Projection, Strategy, Results)
3. Interactive price line selection that integrates with strategy calculations

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-26-price-projection-tab-redesign/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-26-price-projection-tab-redesign/sub-specs/technical-spec.md
- UI Specification: @.agent-os/specs/2025-07-26-price-projection-tab-redesign/sub-specs/ui-specification.md
- Tests Specification: @.agent-os/specs/2025-07-26-price-projection-tab-redesign/sub-specs/tests.md
