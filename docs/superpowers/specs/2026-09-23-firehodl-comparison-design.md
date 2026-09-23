# FireHODL comparison simulator

User approved the product direction in the 2026-09-23 audit and explicitly requested implementation. This document makes that approved direction executable. First release scope is P0/P1 plus deterministic historical and stress comparisons; optional Jev and jurisdiction-specific taxation remain subsequent releases as recommended.

## Architecture

Create a small pure comparison engine separate from the legacy loan-specific adapters. All public charts, metrics and exports consume its typed results. Keep the existing price API; replace the public landing and fragmented simulator entry with the new comparison workspace. Legacy strategy implementations are not exposed as verified products. No live trading or deployment in this change.

## Financial contract

- Canonical UTC daily path, inclusive t=0 and month anniversaries (clamp month-end). Inputs in USD, explicitly displayed. No cosmetic EUR conversion.
- All strategies start with identical BTC and cash and receive identical contributions at month-end, never at t=0. Withdrawal schedule may begin later; requested/paid/shortfall stored separately.
- Cash is an asset. Net wealth = BTC market value + cash - debt. Profit = net wealth + actual withdrawals - starting assets - contributions. Inflation-deflated wealth reported independently.
- Strategies: immediate investment, staged initial investment with ongoing DCA, cash reserve reference, target BTC/cash rebalancing, leveraged BTC accumulation, and collateralized withdrawal funding. Existing BTC never silently disappears.
- Generic loans only: explicit hypothetical terms; daily simple accrual on principal, origination fees annual or once, fixed-term maturity with optional refinance, maximum initial LTV and liquidation threshold. Liquidation evaluated on each day's low before closing-date contributions. Liquidation fee and unpaid residual debt retained. No promised provider equivalence or automatic debt forgiveness.
- User-defined growth, flat, early/late crash, prolonged bear, power-law relative to start, historical replay, damped cycle repeat. Strict historical bounds/gaps validation, no invented history. Power-law is a hypothesis; no synthetic confidence percentages.
- Identical paths for all strategies in each comparison. Stress matrix reports actual shortfalls and failures instead of claiming objective success probabilities.
- Versioned snapshot includes plan, strategy ids, scenario config and exact daily prices; import validates shape, limits, finite values and dates. Local saving is optional browser persistence; no account.

## UI

German first release. A calm financial workbench: white/slate surfaces, deep navy text, orange brand and blue/teal/purple strategy lines. System typography with tabular figures. One header, compact goal controls, editable plan sidebar, scenario selector, chart, sortable comparison and expandable journal. Mobile stacks the input panel above results. No landing hero. Explain generic loan assumptions, data age, taxes excluded and missing history in context.

## Acceptance

Independent hand-calculated accounting tests, chronological/no-lookahead tests, daily crash liquidation, honest shortfall, fees, zero-BTC starts, leap/month-end dates, import corruption tests. UI interactions for edits/strategy selections/saving/loading. Typecheck and production build required. Run existing tests and separately report inherited failures. Browser-check desktop/mobile, input edits, stress comparisons and export. No external publish until a concrete verified release is ready.
