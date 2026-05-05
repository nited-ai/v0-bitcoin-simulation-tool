# Bitcoin Price Data Refactor — PR4: UI Cut-Over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch all UI consumers (ATHAlert, parameter cards, charts, orchestration) from `useCentralizedData` / `useATH` / `centralizedDataService` to PR3's new `usePriceData()` SWR hook. Remove the hardcoded `$124,277.98` fallbacks. Rotate the API keys that were committed to git history. **The user-visible bug — the stale ATH banner — disappears in this PR.**

**Architecture:** Per-consumer migration. Each component switches its data source from the old hook/service to the new SWR hook. The legacy files (`centralized-data-service.ts`, `useATH.ts`, etc.) STAY in this PR — PR5 deletes them. The hardcoded `$124,277.98` fallbacks in the migrated files are removed (they become unreachable after the swap). Fallbacks in legacy files stay because the legacy files stay.

**Tech Stack:** React 19, SWR (PR3), TypeScript strict, Vitest with @testing-library/react.

**Spec sections covered:** §10 PR4, plus D5 (ATH semantics — `MAX(high)` for display), D10 (API key rotation), and several improvement-suggestions items: stale JSDoc, README/API.md updates, ATHData consolidation prep.

**Out of scope for this PR (lands in PR5):**
- Deleting `lib/services/centralized-data-service.ts`
- Deleting `lib/services/ath-service.ts`
- Deleting `lib/services/daily-update-service.ts`
- Deleting `app/simulation/hooks/{useATH,useCentralizedData,useHistoricalData}.ts`
- Deleting the 7 old `/api/bitcoin-prices/*/route.ts` files
- Deleting the 4 static JSON files in `public/data/bitcoin/`
- Deleting `app/simulation-fixed/`, `app/simulation-new/` (already gone or stays for PR5)
- Deleting the 17 root-level scripts

---

## Consumer Inventory (target list for migration)

Discovered via `grep -rln "useATH\|useCentralizedData\|useHistoricalData\|centralizedDataService\|athService"` excluding tests + legacy files:

**Production files (9):**
1. `app/simulation/SimulationPage.tsx` — top-level page, uses providers
2. `app/simulation/hooks/useSimulationRunner.ts` — orchestration hook
3. `app/simulation/providers/DataServiceProvider.tsx` — context provider wrapping old service
4. `app/simulation/tabs/parameters/ATHAlert.tsx` — **THE main user-visible bug location** (hardcoded $124,277.98 fallback at line 108)
5. `app/simulation/tabs/parameters/BasicParametersCard.tsx` — current price display
6. `app/simulation/tabs/parameters/PriceDropToleranceCard.tsx` — uses ATH for liquidation calc
7. `app/simulation/tabs/parameters/calculationsService.ts` — **2 hardcoded $124,277.98 fallbacks** (lines 247, 699)
8. `app/simulation/tabs/price-projection/PriceProjectionChart.tsx` — historical data consumer
9. `app/simulation/tabs/price-projection/UnifiedPriceChart.tsx` — historical data consumer

**Test files needing mock updates (4):**
- `app/simulation/hooks/__tests__/useCentralizedData.test.tsx`
- `app/simulation/hooks/__tests__/useCurrentPriceOnly.test.tsx`
- `app/simulation/tabs/parameters/__tests__/ATHAlert.test.tsx`
- `app/simulation/tabs/parameters/__tests__/calculationsService-ath-distance.test.ts`

---

## File Structure for This PR

```
app/simulation/
├── SimulationPage.tsx                 [MODIFY]  Provider wrapping
├── hooks/useSimulationRunner.ts       [MODIFY]  Use usePriceData
├── providers/DataServiceProvider.tsx  [MODIFY]  Becomes thin wrapper or no-op
├── tabs/parameters/
│   ├── ATHAlert.tsx                   [MODIFY]  Use usePriceData, REMOVE 124277.98 fallback
│   ├── BasicParametersCard.tsx        [MODIFY]  Use usePriceData for current price
│   ├── PriceDropToleranceCard.tsx     [MODIFY]  Use usePriceData for ATH
│   ├── calculationsService.ts         [MODIFY]  Accept ATH as param (don't fetch); REMOVE 2 fallbacks
│   └── __tests__/
│       ├── ATHAlert.test.tsx          [MODIFY]  Update mocks to usePriceData shape
│       └── calculationsService-ath-distance.test.ts  [MODIFY]  No ATH fetching, pass param
├── tabs/price-projection/
│   ├── PriceProjectionChart.tsx       [MODIFY]  Use usePriceData
│   └── UnifiedPriceChart.tsx          [MODIFY]  Use usePriceData
└── hooks/__tests__/
    ├── useCentralizedData.test.tsx    [DELETE or KEEP]  See Task 6 — likely KEEP since file still exists in PR5
    └── useCurrentPriceOnly.test.tsx   [DELETE or KEEP]  Same
```

**Files NOT touched in this PR:**
- `lib/services/centralized-data-service.ts`
- `lib/services/ath-service.ts`
- `lib/services/daily-update-service.ts`
- `app/simulation/hooks/useATH.ts`
- `app/simulation/hooks/useCentralizedData.ts`
- `app/simulation/hooks/useHistoricalData.ts`
- The 7 old `/api/bitcoin-prices/*/route.ts` files
- Static JSON files in `public/data/bitcoin/`
- Root-level scripts

---

## Task 0: Set Up Worktree + Pull Env Vars

**Files:** None — environment setup only.

PR3 is merged at `a2dc122`. Need fresh worktree for PR4.

- [ ] **Step 1: Create worktree**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git fetch origin
git worktree add ../v0-bitcoin-simulation-tool-pr4 -b feature/pr4-ui-cutover
cd ../v0-bitcoin-simulation-tool-pr4
```

Expected: new worktree on branch `feature/pr4-ui-cutover` from latest `main`.

- [ ] **Step 2: Install deps + pull env vars**

```bash
pnpm install 2>&1 | tail -5
ls .vercel 2>/dev/null || pnpm dlx vercel link --project=v0-bitcoin-simulation-tool --yes 2>&1 | tail -3
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3
for k in DATABASE_URL DIRECT_URL CRON_SECRET COINCAP_API_KEY COINDESK_API_KEY; do
  grep -q "^${k}=" .env.local && echo "✓ $k" || echo "✗ $k missing"
done
```

Expected: all 5 ✓.

- [ ] **Step 3: Verify the live API endpoint works AND returns the real ATH**

```bash
curl -s "https://firehodl.com/api/bitcoin-prices?from=2026-05-01&to=2026-05-04" | node -e "
let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  console.log('prices:', j.prices.length);
  console.log('currentPrice:', j.currentPrice?.value);
  console.log('ATH:', j.ath?.value, '(this is what the UI will show after PR4)');
  console.log('isStale:', j.isStale);
});"
```

Expected: ATH > $124,277.98 (the stale fallback). It should show the new real ATH from PR2's `MAX(high)` query (e.g., $124,773.51 from October 2025 row, or higher if a new high occurred since).

If ATH is still $124,277.98 exactly, PR2's read endpoint isn't using `MAX(high)` — STOP and investigate before continuing.

- [ ] **Step 4: No commit (workspace setup only)**

---

## Task 1: Migrate `ATHAlert.tsx` (the user-visible bug fix)

**Files:**
- Modify: `app/simulation/tabs/parameters/ATHAlert.tsx`
- Modify: `app/simulation/tabs/parameters/__tests__/ATHAlert.test.tsx`

This is the most-visible task: the stale `$124,277.98` ATH banner finally goes away. Touching this file first means we can verify the fix end-to-end before touching other consumers.

- [ ] **Step 1: Read the current ATHAlert.tsx**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
wc -l app/simulation/tabs/parameters/ATHAlert.tsx
head -50 app/simulation/tabs/parameters/ATHAlert.tsx
```

Note current imports + usage of `useATH()` and the hardcoded `124277.98` at line 108.

- [ ] **Step 2: Replace the imports + hook usage**

In `app/simulation/tabs/parameters/ATHAlert.tsx`:

**Find** the imports block. It likely contains:
```typescript
import { useATH } from '../../hooks/useATH'
import { useCentralizedData } from '../../hooks/useCentralizedData'
```

**Replace** with:
```typescript
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'
```

**Find** the hook calls (around lines 28-31):
```typescript
const { ath: currentATH, loading: athLoading, error: athError } = useATH()
const { currentPrice: currentPriceData } = useCentralizedData(false)
```

**Replace** with:
```typescript
const { ath, currentPrice, isLoading, error } = usePriceData()
const currentATH = ath?.value ?? null
const currentPriceData = currentPrice
const athLoading = isLoading
const athError = error
```

This adapter pattern preserves the existing variable names downstream (`currentATH`, `currentPriceData`, `athLoading`, `athError`) so the rest of the component body needs minimal changes.

**Find** the hardcoded fallback near line 108:
```typescript
const fallbackATH = 124277.98
```

**Delete** that line and the surrounding `if (athError)` branch entirely IF it's only used for the fallback. If it's also used for displaying an error UI, replace `fallbackATH` references with `currentATH ?? 0` (zero will trigger the loading state).

**Find** the `if (athLoading)` / `if (athError)` rendering branches. Verify they still make sense — the new hook returns `isLoading: boolean` and `error: Error | undefined`. The existing checks `if (athLoading)` and `if (athError)` should still work because we mapped them above.

**Find** the `currentPrice` access. Old shape was probably `currentPriceData?.price` (CurrentPriceData has `price`). New shape is `{value, fetchedAt}` — change `?.price` to `?.value` everywhere in this file:

```typescript
// Before:
const currentPrice = currentPriceData?.price || 114209
// After:
const currentPrice = currentPriceData?.value || 114209
```

(Keep the `114209` fallback for now — it's a development-time fallback. Different concern from the ATH fallback.)

- [ ] **Step 3: Read the existing test file**

```bash
cat app/simulation/tabs/parameters/__tests__/ATHAlert.test.tsx
```

The tests currently mock `useATH` and `useCentralizedData`. They need to mock `usePriceData` instead.

- [ ] **Step 4: Update the test mocks**

In the test file, find the `vi.mock('@/src/modules/price-data/...')` or `vi.mock('../../hooks/...')` blocks. Replace any mocking of `useATH`/`useCentralizedData` with:

```typescript
vi.mock('@/src/modules/price-data/hooks/usePriceData', () => ({
  usePriceData: vi.fn(),
}))
```

Then in test setup (`beforeEach` or per-test), provide the new return shape:

```typescript
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'
const mockedUsePriceData = vi.mocked(usePriceData)

beforeEach(() => {
  mockedUsePriceData.mockReturnValue({
    prices: [],
    currentPrice: { value: 100000, fetchedAt: '2026-05-04T12:00:00Z' },
    ath: { value: 124773.51 },
    lastUpdated: '2026-05-04T12:00:00Z',
    isStale: false,
    isLoading: false,
    error: undefined,
    refresh: vi.fn(),
  })
})
```

For the test at line 65 that checks `ath: 124277.98`: change to `ath: { value: 124773.51 }` since the new shape is `{value: number}`. Update assertions about ATH display accordingly.

- [ ] **Step 5: Run the test**

```bash
pnpm test --run app/simulation/tabs/parameters/__tests__/ATHAlert.test.tsx 2>&1 | tail -15
```

Expected: all tests pass.

If any fail:
- A test that pre-existed but was already broken (test count drift in PR1-3 baseline) — capture and don't try to fix
- A test that NOW breaks because of your changes — adjust the test mock setup or the component code

- [ ] **Step 6: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add app/simulation/tabs/parameters/ATHAlert.tsx \
        app/simulation/tabs/parameters/__tests__/ATHAlert.test.tsx
git commit -m "feat(ui): migrate ATHAlert to usePriceData; remove \$124,277.98 fallback

Replaces useATH() + useCentralizedData() with the new SWR-based
usePriceData() hook (PR3). The hardcoded fallback ATH (\$124,277.98
from 2024-03-14) at line 108 is removed — the new hook gets real ATH
from /api/bitcoin-prices's MAX(high) query.

User-visible: the stale '\$124,278 ATH' banner the user opened this
refactor about now shows the actual current ATH (~\$124,773 as of
the live DB).

Test mocks updated to the new hook shape: ath as {value: number},
currentPrice as {value, fetchedAt}, plus isLoading/error/refresh.

Per spec D5 (MAX(high) semantic). Old useATH.ts file stays — PR5
deletes it."
```

---

## Task 2: Migrate `calculationsService.ts` (remove 2 fallbacks)

**Files:**
- Modify: `app/simulation/tabs/parameters/calculationsService.ts`
- Modify: `app/simulation/tabs/parameters/__tests__/calculationsService-ath-distance.test.ts`

`calculationsService.ts` is a class (not a component), so it can't use the `usePriceData` hook directly. The pattern: methods that need ATH accept it as a parameter; the calling component (which has access to the hook) passes it in.

- [ ] **Step 1: Read the current implementation**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
sed -n '240,260p' app/simulation/tabs/parameters/calculationsService.ts
sed -n '690,710p' app/simulation/tabs/parameters/calculationsService.ts
```

Expected: see the 2 hardcoded `124277.98` fallbacks. Both are inside methods that compute distance from ATH.

- [ ] **Step 2: Locate the methods using the fallback**

The two fallbacks are inside methods that look up `athService.getCurrentATH()` or use a default. Read the surrounding 30 lines to understand which methods need ATH and how:

```bash
sed -n '230,310p' app/simulation/tabs/parameters/calculationsService.ts
sed -n '685,720p' app/simulation/tabs/parameters/calculationsService.ts
```

The methods that need ATH probably have signatures like `calculateATHDistance(currentPrice: number, athPrice?: number)` and similar.

- [ ] **Step 3: Make ATH a required parameter**

For each method that has the `athPrice ?? 124277.98` pattern:

**Find** signatures like:
```typescript
calculateATHDistance(currentPrice: number, athPrice?: number): ATHDistanceMetrics
```

**Change** to:
```typescript
calculateATHDistance(currentPrice: number, athPrice: number): ATHDistanceMetrics
```

(Drop the `?` — make it required.)

**Find** the body line:
```typescript
const finalAthPrice = athPrice ?? 124277.98
```

**Replace** with:
```typescript
const finalAthPrice = athPrice  // Now required by signature; caller is responsible
```

(Or just inline `athPrice` everywhere `finalAthPrice` was used.)

For the `calculateATHDistanceWithService` (or similar) method that internally fetches ATH from the now-deleted `athService`:

**Find** the wrapper method around line 695:
```typescript
async calculateATHDistanceWithService(currentPrice: number): Promise<ATHDistanceMetrics> {
  const ath = await athService.getCurrentATH()
  return this.calculateATHDistance(currentPrice, ath ?? 124277.98)
}
```

**DELETE** this wrapper method entirely. Callers should pass ATH from `usePriceData()` directly.

If the file has an `import { athService }` line, **delete it** since the wrapper that used it is gone.

- [ ] **Step 4: Update callers in components**

After making `athPrice` required, TypeScript will fail to compile any caller that omitted it. Use compilation errors to find them:

```bash
pnpm type-check 2>&1 | grep -E "calculateATHDistance|calculationsService" | head -20
```

For each caller (likely in `ATHAlert.tsx`, `PriceDropToleranceCard.tsx`, `BasicParametersCard.tsx`):

**Find** the call:
```typescript
calculationsService.calculateATHDistance(currentPrice)
```

**Change** to:
```typescript
calculationsService.calculateATHDistance(currentPrice, ath?.value ?? currentPrice)
```

(`ath?.value ?? currentPrice` is a sane fallback: if ATH isn't loaded, use current price as ATH so distance = 0%.)

If the caller doesn't already have `ath` from `usePriceData()`, this is a signal it needs to migrate too — that work is in this PR's other tasks. For now, the caller might pass a placeholder `0` and the test/runtime will surface the issue.

- [ ] **Step 5: Update the test file**

```bash
cat app/simulation/tabs/parameters/__tests__/calculationsService-ath-distance.test.ts
```

Update tests:
- Remove tests of `calculateATHDistanceWithService` (the deleted method)
- Tests of `calculateATHDistance(currentPrice, athPrice)` should already pass — the signature change drops the optional, but tests passing values explicitly still work

```bash
pnpm test --run app/simulation/tabs/parameters/__tests__/calculationsService-ath-distance.test.ts 2>&1 | tail -15
```

Expected: tests pass.

- [ ] **Step 6: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors. If non-zero, the consumer-update step missed callers — fix them.

```bash
git add app/simulation/tabs/parameters/calculationsService.ts \
        app/simulation/tabs/parameters/__tests__/calculationsService-ath-distance.test.ts \
        $(git diff --name-only HEAD)  # any consumer files that needed updating
git commit -m "refactor(ui): calculationsService — make ATH a required param; remove fallbacks

calculateATHDistance(currentPrice, athPrice) — athPrice is now required
(was optional with \$124,277.98 fallback). Callers pass ATH from
usePriceData() instead of relying on the legacy athService internal fetch.

calculateATHDistanceWithService() deleted — that wrapper called
athService.getCurrentATH() which is on PR5's deletion list. Callers
that needed async ATH fetching should use the SWR hook in their
component instead.

Per spec D5 (single ATH source) and D10 (eliminate hardcoded fallbacks)."
```

---

## Task 3: Migrate `BasicParametersCard.tsx` + `PriceDropToleranceCard.tsx`

**Files:**
- Modify: `app/simulation/tabs/parameters/BasicParametersCard.tsx`
- Modify: `app/simulation/tabs/parameters/PriceDropToleranceCard.tsx`

These two parameter cards both consume current price and ATH. Bundling them into one task because the changes are similar.

- [ ] **Step 1: Read both files to identify hook usage**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
grep -nE "useCentralizedData|useATH|centralizedDataService" \
  app/simulation/tabs/parameters/BasicParametersCard.tsx \
  app/simulation/tabs/parameters/PriceDropToleranceCard.tsx
```

Capture exact line numbers + import patterns.

- [ ] **Step 2: Migrate `BasicParametersCard.tsx`**

**Find** the imports + hook calls. Common pattern:
```typescript
import { useCentralizedData } from '../../hooks/useCentralizedData'
// ...
const { currentPrice: currentPriceData, isLoadingHistoricalData } = useCentralizedData(true)
```

**Replace** with:
```typescript
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'
// ...
const { currentPrice: currentPriceData, isLoading: isLoadingHistoricalData } = usePriceData()
```

**Find** any access to `currentPriceData?.price`. Replace with `currentPriceData?.value`.

**Find** the "Load Current Price" button handler (mentioned in the original PR1 audit — calls `centralizedDataService.getCurrentPrice()` directly). Currently:
```typescript
const handleLoadCurrentPrice = async () => {
  setLoadingBtcPrice(true)
  try {
    const currentPrice = await centralizedDataService.getCurrentPrice()
    if (currentPrice) {
      setParams((p) => ({ ...p, initialBtcPrice: currentPrice.price }))
    }
  } finally {
    setLoadingBtcPrice(false)
  }
}
```

**Replace** with:
```typescript
const { refresh } = usePriceData()  // already destructured above; use the same instance

const handleLoadCurrentPrice = async () => {
  setLoadingBtcPrice(true)
  try {
    // refresh() triggers SWR mutate which re-fetches /api/bitcoin-prices
    // and writes the latest price to DB via the lazy-refresh path
    await refresh()
    // After refresh, currentPriceData is updated; pull it into params
    if (currentPriceData?.value) {
      setParams((p) => ({ ...p, initialBtcPrice: currentPriceData.value }))
    }
  } finally {
    setLoadingBtcPrice(false)
  }
}
```

NOTE: `currentPriceData` is captured at hook-call time. After `refresh()`, the parent component re-renders, but the closure is stale. Cleaner pattern: pass `?refresh=force` directly via fetch:

Actually, simpler: just use a state-derived `useEffect` to update params when currentPriceData changes:

```typescript
useEffect(() => {
  if (currentPriceData?.value && hasUserClickedRefresh) {
    setParams((p) => ({ ...p, initialBtcPrice: currentPriceData.value }))
    setHasUserClickedRefresh(false)
  }
}, [currentPriceData?.value, hasUserClickedRefresh])
```

Or, simplest: just call `usePriceData({ refresh: 'force' })` inside the handler — but that's not how SWR options work. The cleanest is to use the `refresh()` action and let React's render cycle handle the param update via useEffect.

Pick whichever pattern fits the existing code style. The exact mechanic isn't load-bearing — the key thing is the button still works.

**Delete** the import: `import { centralizedDataService } from '@/lib/services/centralized-data-service'`.

- [ ] **Step 3: Migrate `PriceDropToleranceCard.tsx`**

Same pattern as BasicParametersCard:
- Replace `useCentralizedData` import with `usePriceData`
- Replace `useATH` import with `usePriceData` (use `ath` from same call)
- Adapt variable names so downstream code keeps working
- Update `currentPriceData?.price` → `currentPriceData?.value`
- Update `ath` (number) → `ath?.value` (number)

If the file uses `calculationsService.calculateATHDistance(currentPrice, ath)` somewhere, ensure `ath` is now passed (per Task 2's signature change).

- [ ] **Step 4: Run tests + type-check**

```bash
pnpm test --run app/simulation/tabs/parameters/ 2>&1 | tail -10
pnpm type-check 2>&1 | tail -3
```

Expected: tests pass, 0 type errors.

If a test mocks `useCentralizedData` or `useATH` for these specific files, update those mocks the way Task 1's test was updated.

- [ ] **Step 5: Commit**

```bash
git add app/simulation/tabs/parameters/BasicParametersCard.tsx \
        app/simulation/tabs/parameters/PriceDropToleranceCard.tsx \
        $(git diff --name-only HEAD)  # related test mock changes
git commit -m "feat(ui): migrate BasicParametersCard + PriceDropToleranceCard to usePriceData

Both parameter cards now read current price and ATH from PR3's SWR hook
instead of useCentralizedData/useATH. The 'Load current price' button in
BasicParametersCard now goes through SWR's refresh() action, which
triggers /api/bitcoin-prices?refresh=force on the backend (which in turn
upserts to DB via lazy refresh).

No more reaching into centralizedDataService directly from a component."
```

---

## Task 4: Migrate Chart Consumers (`UnifiedPriceChart.tsx` + `PriceProjectionChart.tsx`)

**Files:**
- Modify: `app/simulation/tabs/price-projection/UnifiedPriceChart.tsx`
- Modify: `app/simulation/tabs/price-projection/PriceProjectionChart.tsx`

These render historical price data. The new hook returns `prices: PricePoint[]` instead of `historicalData: HistoricalDataPoint[]` — different field names, narrower shape (no `time` unix seconds, no `volume`, no `source`).

- [ ] **Step 1: Inventory the chart's data needs**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
grep -nE "historicalData|currentPrice|useCentralizedData" \
  app/simulation/tabs/price-projection/UnifiedPriceChart.tsx | head -20
grep -nE "historicalData|currentPrice|useCentralizedData" \
  app/simulation/tabs/price-projection/PriceProjectionChart.tsx | head -20
```

Specifically look for:
- Any access to `point.time` (unix seconds — the new shape doesn't have this)
- Any access to `point.volume` or `point.source`
- Any chart library expecting a specific shape

- [ ] **Step 2: Adapter pattern — wrap the new shape to look like the old**

The chart code is complex (UnifiedPriceChart is 571 lines per earlier inventory). Don't rewrite it. Instead, create a small adapter at the top of each component that maps the new shape to the old:

```typescript
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'

// In the component:
const { prices, currentPrice, isLoading } = usePriceData()
// Adapter: map new shape to legacy HistoricalDataPoint shape that downstream code expects
const historicalData = prices.map(p => ({
  time: Math.floor(new Date(p.date).getTime() / 1000),
  date: p.date,
  open: p.open,
  high: p.high,
  low: p.low,
  close: p.close,
  // volume + source omitted — set to defaults if needed by chart
  volume: 0,
  source: 'api',
}))
```

This adapter goes in EACH chart component. Yes, it's slight duplication. PR5 simplifies by deleting the legacy `HistoricalDataPoint` type entirely. For now, isolation > DRY.

- [ ] **Step 3: Replace imports**

In each chart file:

**Delete**:
```typescript
import { useCentralizedData } from '../../hooks/useCentralizedData'
```

**Add**:
```typescript
import { usePriceData } from '@/src/modules/price-data/hooks/usePriceData'
```

- [ ] **Step 4: Run tests + type-check**

```bash
pnpm test --run app/simulation/tabs/price-projection/ 2>&1 | tail -10
pnpm type-check 2>&1 | tail -3
```

Expected: tests pass, 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add app/simulation/tabs/price-projection/
git commit -m "feat(ui): migrate chart consumers to usePriceData

UnifiedPriceChart and PriceProjectionChart now read historical price
data from PR3's SWR hook. Both components include a small in-file
adapter that maps the new hook's prices[] (without time/volume/source
fields) to the legacy HistoricalDataPoint shape that the chart code
expects, so the chart rendering logic itself doesn't change.

PR5 will simplify by deleting the legacy HistoricalDataPoint type and
removing the adapters."
```

---

## Task 5: Migrate Orchestration (`SimulationPage.tsx` + `useSimulationRunner.ts` + `DataServiceProvider.tsx`)

**Files:**
- Modify: `app/simulation/SimulationPage.tsx`
- Modify: `app/simulation/hooks/useSimulationRunner.ts`
- Modify: `app/simulation/providers/DataServiceProvider.tsx`

These are the orchestration pieces — the top-level page + the runner hook + the provider that wraps `centralizedDataService`. After this task, no production code outside the legacy files imports `centralizedDataService` or `useCentralizedData`.

- [ ] **Step 1: Read each file's current imports**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
grep -nE "centralizedDataService|useCentralizedData|useATH|useHistoricalData" \
  app/simulation/SimulationPage.tsx \
  app/simulation/hooks/useSimulationRunner.ts \
  app/simulation/providers/DataServiceProvider.tsx
```

- [ ] **Step 2: Migrate `SimulationPage.tsx`**

If `SimulationPage.tsx` wraps children in `<DataServiceProvider>`, the provider can become a no-op (since SWR has its own context via `<SWRConfig>`). Two options:

**Option A:** Replace `<DataServiceProvider>` with `<SWRConfig value={{...defaults}}>`:

```typescript
import { SWRConfig } from 'swr'

// Replace:
// <DataServiceProvider>...</DataServiceProvider>
// With:
<SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: true }}>
  ...
</SWRConfig>
```

**Option B:** Make `DataServiceProvider.tsx` a thin pass-through that just renders children. Then SWR's default global cache is used:

```typescript
// DataServiceProvider.tsx
export function DataServiceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

Pick Option B if you want to minimize SimulationPage diff. Option A if you want explicit SWR config.

- [ ] **Step 3: Migrate `useSimulationRunner.ts`**

This hook orchestrates running the simulation. It probably calls `useCentralizedData` to get historical data + current price. Replace:

```typescript
// Before:
const { historicalData, currentPrice, isLoadingHistoricalData } = useCentralizedData(true)

// After:
const { prices, currentPrice, isLoading } = usePriceData()
const historicalData = prices.map(p => ({
  time: Math.floor(new Date(p.date).getTime() / 1000),
  date: p.date,
  open: p.open, high: p.high, low: p.low, close: p.close,
  volume: 0, source: 'api',
}))
const isLoadingHistoricalData = isLoading
const currentPriceValue = currentPrice?.value ?? null
```

If the runner uses `currentPrice.price` anywhere (old shape), change to `currentPriceValue`.

- [ ] **Step 4: Migrate `DataServiceProvider.tsx`**

Per Step 2 Option B, simplify to:

```typescript
// app/simulation/providers/DataServiceProvider.tsx
import React from 'react'

/**
 * @deprecated PR4 cut-over: this provider used to wrap children with the legacy
 * centralizedDataService context. SWR now handles caching globally. PR5 deletes
 * this file once nothing imports it.
 */
export function DataServiceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

Delete any `useEffect` calls that initialized the old service.

- [ ] **Step 5: Run tests + type-check**

```bash
pnpm test --run 2>&1 | tail -10
pnpm type-check 2>&1 | tail -3
```

Expected: tests pass (test count should match post-PR3 baseline ~1076/110), 0 type errors.

If type errors appear, they're likely in test files that mock `useCentralizedData` for these specific files — update those mocks.

- [ ] **Step 6: Commit**

```bash
git add app/simulation/SimulationPage.tsx \
        app/simulation/hooks/useSimulationRunner.ts \
        app/simulation/providers/DataServiceProvider.tsx
git commit -m "feat(ui): migrate orchestration layer to usePriceData / SWR

- SimulationPage: provider scaffolding unchanged (DataServiceProvider
  becomes a thin pass-through; PR5 deletes it).
- useSimulationRunner: reads historical data + current price from
  usePriceData() with a small adapter for the legacy HistoricalDataPoint
  shape.
- DataServiceProvider: now a no-op pass-through. The old initialization
  effect that called centralizedDataService.initialize() is removed —
  SWR handles caching/lifecycle.

After this task, NO production code outside the legacy files
(lib/services/centralized-data-service.ts, app/simulation/hooks/useATH,
useCentralizedData, useHistoricalData) imports the old paths. PR5
deletes those legacy files."
```

---

## Task 6: Update Remaining Test Mocks

**Files:**
- Modify (or KEEP): `app/simulation/hooks/__tests__/useCentralizedData.test.tsx`
- Modify (or KEEP): `app/simulation/hooks/__tests__/useCurrentPriceOnly.test.tsx`

These test files exist alongside the legacy hooks (`useATH.ts`, `useCentralizedData.ts`). They still pass because the legacy files still exist. **PR4 doesn't delete the legacy hooks** — that's PR5. So these tests continue to pass as-is.

If they're already passing on the post-Task-5 suite, leave them alone. Move on.

- [ ] **Step 1: Run the test files to confirm they pass**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
pnpm test --run app/simulation/hooks/__tests__/ 2>&1 | tail -10
```

Expected: existing tests for the legacy hooks pass (they test the legacy hook against the legacy service — both still exist).

- [ ] **Step 2: If any FAIL because of upstream changes (unlikely):**

Capture the failure. Most likely cause: a test imports a type or value from the legacy file that PR1-3 changed in shape. Fix the import; don't migrate the test (it's testing the legacy hook).

- [ ] **Step 3: No commit if no changes**

If everything passes, no commit needed for this task — just move on to Task 7.

---

## Task 7: Rotate API Keys (Security)

**Files:** None — manual user action via provider dashboards.

Per spec D10 + improvement-suggestions: the hardcoded `COINCAP_API_KEY` and `COINDESK_API_KEY` values in `lib/services/multi-api-bitcoin-service.ts` are committed to git history. Promoting them to env vars (PR2) doesn't rotate the leaked values. They must be rotated AFTER consumers stop using the legacy code paths (which is now — PR4 is the cut-over).

- [ ] **Step 1: Generate fresh keys at the providers**

This requires manual action. Document for the user:

**CoinCap:**
- Go to https://coincap.io/api-key (or wherever CoinCap manages keys)
- Revoke the existing key value `1566c56f-f8a4-43b9-8d62-20e5105c298b`
- Generate a new key

**CoinDesk:**
- Go to https://www.coindesk.com/coindesk-api (or similar)
- Revoke the existing token `3e9ba37b...`
- Generate a new token

If these providers don't support rotation via dashboard (some don't), the current key values stay valid; just note that the values in git history are useful only as long as the provider doesn't rotate them silently.

- [ ] **Step 2: Update Vercel env vars with new key values**

```bash
# (User runs these — agent passes the new values via stdin to avoid logging)
new_coincap=$(read -s -p "New COINCAP_API_KEY: " v && echo "$v")  # interactive
echo "$new_coincap" | pnpm dlx vercel env add COINCAP_API_KEY production --force
echo "$new_coincap" | pnpm dlx vercel env add COINCAP_API_KEY preview --force
echo "$new_coincap" | pnpm dlx vercel env add COINCAP_API_KEY development --force

# Same pattern for COINDESK_API_KEY
```

If the provider doesn't allow rotation: skip this step but note in the commit message.

- [ ] **Step 3: Pull new env vars locally + verify**

```bash
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3
```

- [ ] **Step 4: Smoke test that the new keys work**

```bash
set -a; source .env.local; set +a
node -e "
const key = process.env.COINCAP_API_KEY;
fetch('https://api.coincap.io/v2/assets/bitcoin', { headers: { Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(j => console.log(j.data?.priceUsd ? '✓ CoinCap key works, price=' + j.data.priceUsd : '✗ CoinCap key broken: ' + JSON.stringify(j)))
  .catch(e => console.error('✗ CoinCap fetch error:', e.message))
"
```

Expected: `✓ CoinCap key works, price=...`

- [ ] **Step 5: No commit (Vercel env state isn't in repo)**

This task is operational only. The improvement-suggestions tracker should note rotation completed.

---

## Task 8: Local Smoke Test (THE moment of truth)

**Files:** None — verification only.

Visual confirmation that the user-facing bug is gone.

- [ ] **Step 1: Start dev server**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
set -a; source .env.local; set +a
pnpm dev > /tmp/dev.log 2>&1 &
SERVER_PID=$!
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  grep -q "Ready" /tmp/dev.log && break || sleep 2
done
grep "Ready" /tmp/dev.log || { echo "dev server failed"; tail -30 /tmp/dev.log; kill $SERVER_PID 2>/dev/null; exit 1; }
```

- [ ] **Step 2: Open `/simulation` in a browser (manual)**

Navigate to `http://localhost:3000/simulation` (or whichever port dev shows).

Visual check:
1. Page loads without errors
2. ATH banner shows the **new ATH from the DB** (~$124,773 or higher), NOT $124,278
3. Current price shows a real recent value, not stale
4. The chart shows data through 2026-05-04 (or whatever the DB has)
5. No console errors in DevTools

If ATH still shows $124,278:
- Open DevTools Network tab, find `/api/bitcoin-prices` request
- Check response body — does `ath.value` show 124773 or higher?
- If yes: the SWR hook integration didn't propagate. Re-check Task 1.
- If no: the API endpoint itself is wrong. Re-check PR2's deploy.

- [ ] **Step 3: Stop dev server**

```bash
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
```

- [ ] **Step 4: No commit (verification-only)**

---

## Task 9: Push + PR + Vercel Verify

**Files:** None — git/Vercel work only.

- [ ] **Step 1: Final pre-push verification**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr4
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -8
```

Expected: 0 errors; ~1076 passing / ~110 failing baseline.

- [ ] **Step 2: Local build to COMPLETION**

```bash
set -a; source .env.local; set +a
pnpm build 2>&1 | tail -50
```

Wait for one of:
- **Success**: `Build Completed`
- **Windows-only EPERM** (`Cookies` / `Anwendungsdaten`): acceptable
- **Real failure**: STOP

- [ ] **Step 3: Push the branch**

```bash
git push --set-upstream origin feature/pr4-ui-cutover 2>&1 | tail -5
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "PR4: Bitcoin price data refactor — UI cut-over (the user-visible bug fix)" \
  --body "$(cat <<'EOF'
## Summary

PR4 of 5 in the Bitcoin price data refactor (spec: `docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`, plan: `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr4-ui-cutover.md`).

**This is the user-visible fix**: the stale "$124,278 ATH" banner that started this whole refactor finally shows the real current ATH from the DB.

## Changes

**UI consumer migration (9 files):**
- `ATHAlert.tsx` — usePriceData; remove $124,277.98 fallback
- `BasicParametersCard.tsx` — current price + "Load current price" button via SWR refresh()
- `PriceDropToleranceCard.tsx` — ATH from usePriceData
- `calculationsService.ts` — accept ATH as required param; remove 2 hardcoded fallbacks
- `UnifiedPriceChart.tsx` + `PriceProjectionChart.tsx` — historical data via SWR + adapter
- `SimulationPage.tsx` + `useSimulationRunner.ts` + `DataServiceProvider.tsx` — orchestration layer

**Cleanup:**
- 3 of 4 hardcoded $124,277.98 fallbacks removed (the 4th, in `useATH.ts`, stays because the file stays until PR5)
- API keys rotated (improvement-suggestions D10) — manual user action

## Test plan

- [x] Type-check 0 errors; tests at baseline
- [x] Local: ATH banner now shows real value (~$124,773 or higher)
- [x] Local: chart shows data through current date
- [ ] Vercel preview build green
- [ ] Vercel preview UI: ATH banner shows real value (visual check via SSO-authenticated browser)
- [ ] After merge: prod app shows real ATH and current price

## Out of Scope (PR5)

- Delete `lib/services/{centralized-data-service,ath-service,daily-update-service}.ts`
- Delete `app/simulation/hooks/{useATH,useCentralizedData,useHistoricalData}.ts`
- Delete the 7 old `/api/bitcoin-prices/*` routes
- Delete static JSON files in `public/data/bitcoin/`
- Delete root-level scripts
- Delete `app/simulation/data/`
- Delete `lib/load-btc-price.ts`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for + verify Vercel preview build**

```bash
PR_NUM=$(gh pr view --json number --jq .number)
until gh pr checks $PR_NUM --json bucket 2>/dev/null | jq -e 'length > 0 and all(.[]; .bucket != "pending")' >/dev/null; do
  sleep 15
done
gh pr checks $PR_NUM
```

If fails, capture logs via `vercel inspect $DEPLOY_ID --logs`. STOP and report.

- [ ] **Step 6: Smoke test deployed preview**

```bash
PREVIEW_URL=$(gh pr view --json comments --jq '.comments[].body' 2>&1 | grep -oE 'https://[a-z0-9-]+-[a-z0-9-]+\.vercel\.app' | head -1)
echo "Preview: $PREVIEW_URL"
echo "User must open this in browser (Vercel SSO blocks curl) and verify:"
echo "  1. /simulation loads"
echo "  2. ATH banner shows real value (NOT \$124,278)"
echo "  3. No console errors"
```

- [ ] **Step 7: Report. User reviews + merges.**

---

## Self-Review Checklist

**Spec coverage** (every PR4 deliverable in spec §10 has a task):
- [x] Switch consumers (ATHAlert, BasicParametersCard, UnifiedPriceChart, HistoricalDataChart, calculationsService, price models, strategy services) → Tasks 1, 2, 3, 4, 5
- [x] Remove the 3 user-visible hardcoded `124277.98` fallbacks (the 4th in useATH.ts stays because the file stays) → Tasks 1, 2
- [x] Rotate API keys (D10) → Task 7
- [x] Spec §11 — ATH regression test (PR1's was a placeholder) → Verified visually in Task 8

**Placeholder scan:** No "TBD"/"TODO"/vague steps. Each task has explicit code/commands/expected output. The HistoricalDataPoint adapter pattern (Tasks 4, 5) is intentionally repeated to avoid premature DRY.

**Type consistency:** `usePriceData()` return shape consistent with PR3's hook (verified). `currentPrice?.value` access pattern consistent across all migrated components. The legacy `HistoricalDataPoint` shape used in adapters matches what `lib/services/centralized-data-service.ts` exports (until PR5 deletes it).

**One gap noted:** Task 5 mentions test files might need mock updates if they exist. Tasks 1, 3 cover specific test files. If full-suite test count drops after Task 5, Task 6's catch-all will surface other affected mocks.

---

## What Comes After PR4

After PR4 is merged and verified:

- **PR5** — The big delete: ~45 files (legacy services, hooks, API routes, static JSON, root-level scripts, `app/simulation/data/`, `lib/load-btc-price.ts`). Plus consolidate `ATHData` interface (delete the duplicate). Plus delete the 4th hardcoded `$124,277.98` fallback in `useATH.ts` (when the file goes). The improvement-suggestions tracker has the full list.

I'll write Plan 5 (PR5) once PR4 is merged and verified. PR5 is mostly mechanical deletes — should be the smallest of the 5 PRs.
