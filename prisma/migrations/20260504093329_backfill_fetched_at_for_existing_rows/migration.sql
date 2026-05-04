-- Backfill fetched_at for rows pre-existing the column.
-- The previous migration's `ADD COLUMN fetched_at NOT NULL DEFAULT CURRENT_TIMESTAMP`
-- filled 4341 historical rows with the migration timestamp. This update sets
-- fetched_at = updated_at so PR2's lazy-refresh cooldown sees these rows as
-- stale and refreshes on first page load.
--
-- Idempotent: only touches rows where fetched_at differs from updated_at by
-- more than 1 minute (i.e., rows still bearing the migration timestamp).

UPDATE "public"."bitcoin_prices"
SET "fetched_at" = "updated_at"
WHERE ABS(EXTRACT(EPOCH FROM ("fetched_at" - "updated_at"))) > 60;
