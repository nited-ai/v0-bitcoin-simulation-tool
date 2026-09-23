# FireHODL comparison implementation plan

> Execute inline using executing-plans and test-driven-development. The user requested implementation of the preceding written audit; proceed under that authorization.

Goal: turn the public entry into a reliable Bitcoin investment comparison workspace.
Spec: docs/superpowers/specs/2026-09-23-firehodl-comparison-design.md
Stack: existing Next 15 / React 19 / TypeScript / Recharts / Vitest.

## Global constraints

USD only until a real FX layer exists; no new dependency or external transmission of portfolio inputs; no deployment; taxes excluded explicitly; generic credit assumptions labelled. Existing audit artifacts retained. Work in current feature checkout (already separate from main).

## Review focus

Empty/corrupt local storage; missing historical dates; month-end dates and leap years; debt surviving exhausted collateral; cashflow neutrality across strategies. Each is exercised by the corresponding tests below.

## Tasks

- [x] 1. Add tests under src/modules/simulator/__tests__ for daily paths, contributions, depleted withdrawals, cash balance and loan risk. Run `pnpm exec vitest run src/modules/simulator --maxWorkers=2`; expect unresolved new engine imports, then hand-calculated green expectations.
- [x] 2. Implement types.ts, paths.ts, engine.ts, persistence.ts and tests. Interfaces: Plan, Scenario, PriceDay, StrategyId, SimulationResult; buildPath(plan, scenario, history), simulate(plan, path, strategy), exportSnapshot / parseSnapshot. Freeze the date in saved plan; no hidden Date.now in calculations.
- [x] 3. Add SimulatorWorkspace.tsx and scoped CSS, chart and comparison components. Wire `/` and `/simulation` to the same workspace; links retain old URL compatibility. Add semantic UI tests for edits and engine integration.
- [x] 4. Fix cron GET and failed-refresh heartbeat; price staleness from actual timestamps; legacy adapter type contract. Add regression tests before fixes. Eliminate swallowed type errors and repair cross-platform build scripts/config.
- [x] 5. Run new and existing tests, typecheck, production build. Browser-test public flow; fix findings. Request one independent review while completing documentation and browser verification. Document remaining release prerequisites precisely.

## Execution ledger

- Start: existing audit 1046/1132 tests pass. Current feature branch feature/enable-strategy-results-tabs; clean tracked files. Prior written product direction approved by user.
- Ruling: implement a canonical pure engine for public comparison instead of extending two inconsistent legacy engines. Preserves old code for reference while removing it from the public decision path.

- Abschluss: Rechenkern, UI, Datenpflege und CI umgesetzt; Releasegruppe 186 Tests grün, Typecheck und Produktionsbuild erfolgreich. Unabhängiges Review abgearbeitet. Betriebs-/Betreiberangaben vor Veröffentlichung in docs/audits/2026-09-23-firehodl-umsetzung.md dokumentiert. Kein Deployment.
