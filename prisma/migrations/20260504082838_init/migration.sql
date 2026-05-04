-- CreateTable
CREATE TABLE "public"."bitcoin_prices" (
    "id" SERIAL NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "source" VARCHAR(50) NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bitcoin_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_updates" (
    "id" SERIAL NOT NULL,
    "update_date" VARCHAR(10) NOT NULL,
    "records_added" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "source" VARCHAR(50) NOT NULL,
    "start_date" VARCHAR(10),
    "end_date" VARCHAR(10),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_usage" (
    "id" SERIAL NOT NULL,
    "api_name" VARCHAR(50) NOT NULL,
    "endpoint" VARCHAR(200) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "last_request_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "rate_limit_reset_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bitcoin_prices_date_key" ON "public"."bitcoin_prices"("date");

-- CreateIndex
CREATE INDEX "bitcoin_prices_date_idx" ON "public"."bitcoin_prices"("date");

-- CreateIndex
CREATE INDEX "bitcoin_prices_timestamp_idx" ON "public"."bitcoin_prices"("timestamp");

-- CreateIndex
CREATE INDEX "bitcoin_prices_source_idx" ON "public"."bitcoin_prices"("source");

-- CreateIndex
CREATE INDEX "data_updates_update_date_idx" ON "public"."data_updates"("update_date");

-- CreateIndex
CREATE INDEX "data_updates_status_idx" ON "public"."data_updates"("status");

-- CreateIndex
CREATE INDEX "data_updates_source_idx" ON "public"."data_updates"("source");

-- CreateIndex
CREATE INDEX "api_usage_api_name_last_request_at_idx" ON "public"."api_usage"("api_name", "last_request_at");

-- CreateIndex
CREATE INDEX "api_usage_api_name_rate_limit_reset_at_idx" ON "public"."api_usage"("api_name", "rate_limit_reset_at");
