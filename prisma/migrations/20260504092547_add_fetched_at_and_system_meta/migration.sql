-- AlterTable
ALTER TABLE "public"."bitcoin_prices" ADD COLUMN     "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."system_meta" (
    "key" VARCHAR(50) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_meta_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "bitcoin_prices_fetched_at_idx" ON "public"."bitcoin_prices"("fetched_at");

-- Bootstrap: ensure lastSuccessfulCronAt is never null on a fresh DB
-- (per spec §4.2 / decision D11). Without this, `new Date(undefined)`
-- returns NaN and the staleness recovery in the read endpoint never fires.
INSERT INTO "system_meta" ("key", "value", "updated_at")
VALUES ('lastSuccessfulCronAt', '1970-01-01T00:00:00.000Z', NOW())
ON CONFLICT ("key") DO NOTHING;
