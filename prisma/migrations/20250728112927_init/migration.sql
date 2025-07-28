-- CreateTable
CREATE TABLE "bitcoin_prices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "data_updates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "update_date" TEXT NOT NULL,
    "records_added" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "api_name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "last_request_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "rate_limit_reset_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "bitcoin_prices_date_key" ON "bitcoin_prices"("date");

-- CreateIndex
CREATE INDEX "bitcoin_prices_date_idx" ON "bitcoin_prices"("date");

-- CreateIndex
CREATE INDEX "bitcoin_prices_timestamp_idx" ON "bitcoin_prices"("timestamp");

-- CreateIndex
CREATE INDEX "api_usage_api_name_last_request_at_idx" ON "api_usage"("api_name", "last_request_at");
