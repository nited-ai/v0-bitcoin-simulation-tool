# Real OHLC Backfill — Design

**Date:** 2026-05-06
**Author:** Dmitri + Claude Opus
**Status:** Draft (pre-red-team)
**Follow-up to:** Bitcoin Price Data Refactor PR1-5 (`2026-05-03-bitcoin-price-data-refactor-design.md`)

---

## 1. Problem

The `bitcoin_prices` DB table contains 4509 rows from 2014-01-01 → 2026-05-06, but **every row has identical OHLC values** (`open == high == low == close`). The displayed ATH on the Parameters page therefore equals the highest CLOSE in the DB ($124,773 on 2025-10-07), not the highest HIGH.

### Root cause

`scripts/gap-fill-prices.ts:70-79` (the seed/gap-fill script used during PR1's data migration) uses CoinGecko's free-tier `/api/v3/coins/bitcoin/market_chart/range` endpoint, which returns ONLY close prices. The script assigns `open = high = low = close` as a workaround (and documents this on line 59):

```typescript
return response.prices.map(([tsMs, close]) => ({
  // ...
  open: close,   // FAKE
  high: close,   // FAKE
  low: close,    // FAKE
  close,
}))
```

A real bull-run candle on 2025-10-07 (per Bitstamp chart) had `H=126,272`, but the DB only stores `124,773` — losing $1,498 of intraday wick. Same problem for every row.

### Spec deviation

The original refactor spec (`2026-05-03`) D5 says: **ATH = MAX(high)**. With fake OHLC, `MAX(high) == MAX(close)`, so the spec is technically satisfied but the displayed value is wrong by the size of the largest intraday wick on the peak day. Users see a stale-looking ATH that doesn't match Bitstamp / TradingView.

---

## 2. Goal

After this fix, every row in `bitcoin_prices` from **2017-08-17 onwards** has real daily OHLC sourced from Binance Klines. Pre-2017 rows keep close-as-OHLC (acceptable per user — pre-2017 BTC was much lower than 2024-2025 peaks; doesn't affect ATH).

**Success criteria:**
- New ATH (MAX(high)) on the Parameters page rises by at least the size of the largest 2024-2025 intraday wick (estimated $1k-$3k difference).
- For a sample of high-volatility days (e.g., 2024-03-13 BTC ATH break, 2025-10-07 peak), DB row's `high` matches Binance/Bitstamp daily candle within $5.
- Same script handles fresh installs (zero rows) and incremental gap-fills (same idempotent UPDATE/INSERT path).
- The current redundancy (Vercel cron + GitHub Action + lazy refresh) keeps writing real OHLC for new days via the existing Binance live-price provider — unchanged by this PR.

**Non-goals:**
- Backfilling pre-2017 with real OHLC. Binance has no BTCUSDT data before 2017-08-17. Acceptable per user.
- Re-architecting the daily cron / live-price provider chain. Those already use Binance and write real OHLC for new rows.

---

## 3. Architecture

### 3.1 Single seed/backfill/gap-fill script

`scripts/backfill-and-seed-prices.ts` replaces `scripts/gap-fill-prices.ts`. Same lifecycle role: invoked via `pnpm db:seed` and `prisma.seed` config in `package.json`. Plus runnable directly as a one-shot for the production fix.

**Date-range routing:**

```
2013-11-01 .. 2017-08-16   → CoinGecko market_chart/range (close-as-OHLC, fake)
2017-08-17 .. today        → Binance Klines /api/v3/klines (real OHLC)
```

The split date (2017-08-17) is the first available BTCUSDT daily candle on Binance.

### 3.2 Idempotency via upsert

Every row is upserted by unique `date` key. Re-running the script is safe:
- New row → INSERT (covers fresh-install case)
- Existing row with same OHLC → UPDATE is a no-op (covers re-run case)
- Existing row with fake OHLC → UPDATE overwrites high/low/open/source with real values (covers production fix case)

This is the central design choice: one script, one path, three outcomes depending on DB state.

### 3.3 Pagination

Binance Klines returns max 1000 rows per request. Daily candles → 1000 days ≈ 2.7 years. For 2017-08-17 → 2026-05-06 (~3200 days), that's ~4 sequential requests. Synchronous loop is fine; rate limit is 1200/min weight, daily-kline is weight 2 → no throttling concerns at this volume.

CoinGecko free tier returns ~365 days per call before pagination is needed. For 2013-11-01 → 2017-08-16 (~1380 days), that's ~4 calls — but CoinGecko's `market_chart/range` endpoint takes a single date range and handles internal pagination. One request suffices, returns all rows.

### 3.4 Source attribution

Each row's `source` column reflects where the OHLC came from:
- `'binance-klines-1d'` — real OHLC, 2017-08-17+
- `'coingecko-close-only'` — close-as-OHLC, pre-2017

This makes it trivial to query "how many rows still have fake OHLC?" for future audits.

### 3.5 Run modes

CLI flags:
- (no flag) — incremental: detect gap, fetch missing range, upsert
- `--full` — fetch entire 2013-11-01 → today range, upsert all (production fix mode)
- `--dry-run` — fetch + parse, log diff vs current DB, no writes (used for verification before the production run)

The production fix is `pnpm tsx scripts/backfill-and-seed-prices.ts --full`. After that, the DB is correct; subsequent invocations are no-ops or fill new gaps with real OHLC.

---

## 4. Components

### 4.1 `scripts/backfill-and-seed-prices.ts`

Single file. Responsibilities:
- CLI arg parsing (`--full`, `--dry-run`)
- Range routing (CoinGecko vs Binance based on date)
- Pagination loop for Binance
- Upsert into `bitcoin_prices` via Prisma
- Summary log: rows fetched, rows updated, rows inserted, new MAX(high), comparison to old MAX(high)

### 4.2 `src/modules/price-data/services/PriceSource/providers/binance.ts` (modified)

Add `fetchHistoricalKlines(from: Date, to: Date): Promise<DailyOHLC[]>` to the existing Binance provider. Reused by:
- The new backfill script (this PR)
- Any future emergency-gap-fill (same script via incremental mode)

The existing `fetchCurrent()` in this file keeps its current behavior (live-price fetch).

### 4.3 Tests

```
scripts/__tests__/backfill-and-seed-prices.test.ts
  - parseKlinesResponse: shape + numeric validation
  - parseKlinesResponse: empty response
  - paginateKlines: 2-page mock returns concatenated array
  - paginateKlines: single page (< 1000 rows) terminates correctly
  - routeRange: dates < 2017-08-17 → coingecko branch
  - routeRange: dates >= 2017-08-17 → binance branch
  - routeRange: range straddling 2017-08-17 → both branches
  - upsertRows: insert new + update existing (integration test against in-memory DB)
  - dryRun: logs diff but writes nothing

src/modules/price-data/services/PriceSource/providers/__tests__/binance-historical.test.ts
  - fetchHistoricalKlines: parses Binance 12-tuple response correctly
  - fetchHistoricalKlines: handles empty range
  - fetchHistoricalKlines: throws on 4xx
```

13+ unit tests. TDD-style: write failing test, implement, green, refactor.

### 4.4 Deletes

```
scripts/gap-fill-prices.ts                       (replaced by new script)
scripts/__tests__/gap-fill-prices.test.ts        (replaced by new tests)
```

---

## 5. Data Flow

```
                 (--full mode for production fix)
                            │
                            ▼
backfill-and-seed-prices.ts
        │
        ├─── pre-2017 range (2013-11-01 .. 2017-08-16)
        │         │
        │         └─── CoinGecko /market_chart/range  (free tier, 1 call)
        │                          │
        │                          └─── close-as-OHLC ParsedRow[]
        │
        ├─── 2017+ range (2017-08-17 .. today)
        │         │
        │         └─── Binance /klines (paginated, ~4 calls)
        │                          │
        │                          └─── real-OHLC ParsedRow[]
        │
        └─── upsert(rows)  via Prisma  (idempotent on unique date key)
                            │
                            └─── log: inserted=X, updated=Y, new ATH=$Z
```

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| Binance 4xx/5xx | Retry once with 1s delay; on 2nd failure, throw → script exits non-zero. No partial commit. |
| CoinGecko rate limit (429) | Retry once with exponential backoff (5s, 30s); on 2nd failure, fail loud. |
| Network timeout (>30s) | Throw → script exits non-zero. |
| Date validation: from > to | Throw at CLI parse time. |
| `DATABASE_URL` missing | Throw at startup with actionable message. |
| Partial response (e.g., Binance returns 999 rows when 1000 expected) | Accept; pagination loop continues from `last_returned_date + 1`. |

The script is intentionally **not** transactional across the entire range. Each batch (one Binance page or one CoinGecko range) is upserted independently. If the script dies mid-run, re-running picks up where it left off (idempotent) — no manual cleanup.

---

## 7. Testing Strategy

**Unit:** All parser + pagination logic mocked against fixture API responses (saved as JSON test fixtures).

**Integration:** A single test against an SQLite Prisma instance verifies the full upsert path:
1. Pre-populate DB with 5 rows of fake OHLC
2. Run script in `--full` mode (mocked HTTP)
3. Assert: 5 rows still exist, `high`/`low`/`open` updated to real values, `source` column changed

**Manual:** After merge, run `pnpm tsx scripts/backfill-and-seed-prices.ts --full --dry-run` against production DB. Verify diff log looks sane (~3200 rows updated, new ATH > old ATH). Then run without `--dry-run` to commit.

---

## 8. Rollback

The script writes via Prisma upsert. To revert to the old fake-OHLC state:

1. Restore from PostgreSQL backup (Vercel Postgres has automatic point-in-time backups)
2. OR re-run the old `gap-fill-prices.ts` from a git checkout of pre-PR6 main → would re-fake all the OHLC. Not pretty but works.

The new ATH being higher is the desired outcome; rollback is unlikely needed. If a downstream consumer (chart, calculations) silently breaks because it was depending on `high == close`, that's a bug that surfaces post-deploy and gets a small follow-up fix — not a rollback trigger.

---

## 9. Open Questions

None remaining. User confirmed:
- Pre-2017 fake-OHLC acceptable
- Don't delete pre-2017 data
- Chart should start as early as possible (kept at 2013-11-01)
- Replace `gap-fill-prices.ts` entirely (single source of truth for seed/gap-fill/backfill)

---

## 10. Out of Scope

- Updating the live-price `fetchCurrent()` provider chain (already uses Binance, already writes real OHLC for new rows post-PR2)
- Adding intraday/hourly candles (daily is enough for ATH purposes)
- Hardening the cron heartbeat (separate concern)
- Backfilling volume data (the new script captures Binance volume but volume display is out of current UI scope)

---

## 11. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Binance API changes endpoint shape | Low | Version-pinned endpoint (`/api/v3/klines`), tests pin response shape |
| Binance rate limits during backfill | Very low | 4 sequential requests at weight 2 each = 8 weight; daily limit 1200/min |
| Production DB has rows we don't expect (e.g., manually inserted, weird dates) | Low | `--dry-run` first; upsert is non-destructive of close column; rows untouched if outside script's range |
| Daily cron writes mid-script | Low | Each batch upsert is its own transaction; cron writing 'today' overlaps the script's last batch but upsert is last-write-wins on the same date — both write real OHLC, so cosmetic only |
| Binance Klines returns all-zeroes for early days | Possible | Validate row: if all OHLC == 0, skip; log warning. Tests cover this. |

---

## 12. Implementation Workflow

Per project memory `feedback_workflow.md`:

1. ✅ Spec written (this doc)
2. ⏳ Spec self-review (next)
3. ⏳ User reviews spec
4. ⏳ Red-team review
5. ⏳ Plan written
6. ⏳ Plan red-teamed
7. ⏳ Subagent-driven execution (Opus, full permissions)
8. ⏳ Run script against production DB
9. ⏳ Verify ATH on Parameters page
