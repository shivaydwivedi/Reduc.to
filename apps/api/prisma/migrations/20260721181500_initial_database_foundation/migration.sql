-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER');

-- CreateEnum
CREATE TYPE "RedirectType" AS ENUM ('TEMPORARY_302', 'PERMANENT_301');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_email" TEXT,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_key" TEXT NOT NULL,
    "lookup_key" TEXT NOT NULL,
    "destination_url" TEXT NOT NULL,
    "title" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(3),
    "redirect_type" "RedirectType" NOT NULL DEFAULT 'TEMPORARY_302',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_id" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "visitor_hash" TEXT,
    "referrer_host" TEXT,
    "browser_family" TEXT,
    "operating_system_family" TEXT,
    "device_type" "DeviceType",
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_link_statistics" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "approximate_unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_link_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "links_lookup_key_key" ON "links"("lookup_key");

-- CreateIndex
CREATE INDEX "links_user_id_created_at_idx" ON "links"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "links_user_id_updated_at_idx" ON "links"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "links_user_id_is_active_created_at_idx" ON "links"("user_id", "is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "links_user_id_expires_at_idx" ON "links"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_revoked_at_expires_at_idx" ON "refresh_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_token_id_key" ON "refresh_tokens"("replaced_by_token_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_issued_at_idx" ON "refresh_tokens"("session_id", "issued_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_consumed_at_revoked_at_idx" ON "refresh_tokens"("session_id", "consumed_at", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "click_events_link_id_occurred_at_idx" ON "click_events"("link_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "click_events_link_id_visitor_hash_occurred_at_idx" ON "click_events"("link_id", "visitor_hash", "occurred_at");

-- CreateIndex
CREATE INDEX "click_events_occurred_at_idx" ON "click_events"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_link_statistics_link_id_date_key" ON "daily_link_statistics"("link_id", "date");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "refresh_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_link_statistics" ADD CONSTRAINT "daily_link_statistics_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "users" ADD CONSTRAINT "users_email_non_empty_check" CHECK (length(btrim("email")) > 0);

-- AddCheckConstraint
ALTER TABLE "links" ADD CONSTRAINT "links_lookup_key_lowercase_check" CHECK ("lookup_key" = lower("lookup_key"));

-- AddCheckConstraint
ALTER TABLE "links" ADD CONSTRAINT "links_lookup_key_non_empty_check" CHECK (length(btrim("lookup_key")) > 0);

-- AddCheckConstraint
ALTER TABLE "links" ADD CONSTRAINT "links_display_key_non_empty_check" CHECK (length(btrim("display_key")) > 0);

-- AddCheckConstraint
ALTER TABLE "links" ADD CONSTRAINT "links_expires_at_after_created_at_check" CHECK ("expires_at" IS NULL OR "expires_at" > "created_at");

-- AddCheckConstraint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_expires_at_after_created_at_check" CHECK ("expires_at" > "created_at");

-- AddCheckConstraint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_revoked_at_after_created_at_check" CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at");

-- AddCheckConstraint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_expires_at_after_issued_at_check" CHECK ("expires_at" > "issued_at");

-- AddCheckConstraint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_consumed_at_after_issued_at_check" CHECK ("consumed_at" IS NULL OR "consumed_at" >= "issued_at");

-- AddCheckConstraint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_revoked_at_after_issued_at_check" CHECK ("revoked_at" IS NULL OR "revoked_at" >= "issued_at");

-- AddCheckConstraint
ALTER TABLE "daily_link_statistics" ADD CONSTRAINT "daily_link_statistics_total_clicks_non_negative_check" CHECK ("total_clicks" >= 0);

-- AddCheckConstraint
ALTER TABLE "daily_link_statistics" ADD CONSTRAINT "daily_link_statistics_approximate_unique_visitors_non_negative_check" CHECK ("approximate_unique_visitors" >= 0);
