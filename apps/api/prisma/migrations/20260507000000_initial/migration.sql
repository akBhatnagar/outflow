-- Outflow initial schema migration.
-- Created by hand to match the Prisma model in schema.prisma.
-- Extensions are enabled by infra/postgres/init/01-extensions.sql on first volume boot,
-- but we re-issue them here as IF NOT EXISTS so the migration is idempotent on shared dbs.

CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- Enums ----
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'FAMILY');
CREATE TYPE "Cadence" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM_DAYS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'TRIAL');
CREATE TYPE "SubscriptionSource" AS ENUM ('MANUAL', 'CSV', 'EMAIL_PARSER', 'EMAIL_LLM');

-- ---- users ----
CREATE TABLE "users" (
    "id"               TEXT        NOT NULL,
    "email"            CITEXT      NOT NULL,
    "passwordHash"     TEXT        NOT NULL,
    "name"             TEXT,
    "emailVerifiedAt"  TIMESTAMP(3),
    "tz"               TEXT        NOT NULL DEFAULT 'UTC',
    "currencyPref"     TEXT        NOT NULL DEFAULT 'USD',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- ---- refresh_tokens ----
CREATE TABLE "refresh_tokens" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "tokenHash"   TEXT NOT NULL,
    "familyId"    TEXT NOT NULL,
    "userAgent"   TEXT,
    "ip"          TEXT,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "revokedAt"   TIMESTAMP(3),
    "replacedBy"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx"   ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- audit_logs ----
CREATE TABLE "audit_logs" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT,
    "action"       TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId"   TEXT,
    "ip"           TEXT,
    "userAgent"    TEXT,
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_userId_createdAt_idx"        ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---- billing_accounts ----
CREATE TABLE "billing_accounts" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "stripeCustomerId"  TEXT,
    "stripeSubId"       TEXT,
    "plan"              "Plan" NOT NULL DEFAULT 'FREE',
    "status"            TEXT,
    "currentPeriodEnd"  TIMESTAMP(3),
    "cancelAt"          TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_accounts_userId_key"           ON "billing_accounts"("userId");
CREATE UNIQUE INDEX "billing_accounts_stripeCustomerId_key" ON "billing_accounts"("stripeCustomerId");
CREATE UNIQUE INDEX "billing_accounts_stripeSubId_key"      ON "billing_accounts"("stripeSubId");

ALTER TABLE "billing_accounts"
  ADD CONSTRAINT "billing_accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- categories ----
CREATE TABLE "categories" (
    "id"      TEXT NOT NULL,
    "slug"    TEXT NOT NULL,
    "name"    TEXT NOT NULL,
    "icon"    TEXT,
    "color"   TEXT,
    "sortKey" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- ---- subscriptions ----
CREATE TABLE "subscriptions" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "categoryId"     TEXT,
    "vendorSlug"     TEXT,
    "displayName"    TEXT NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'USD',
    "amountCents"    INTEGER NOT NULL,
    "cadence"        "Cadence" NOT NULL DEFAULT 'MONTHLY',
    "customDays"     INTEGER,
    "nextChargeDate" TIMESTAMP(3),
    "trialEndsAt"    TIMESTAMP(3),
    "status"         "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "source"         "SubscriptionSource" NOT NULL DEFAULT 'MANUAL',
    "confidence"     DECIMAL(3,2),
    "notes"          TEXT,
    "firstSeenAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "deletedAt"      TIMESTAMP(3),
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "subscriptions_userId_status_nextChargeDate_idx" ON "subscriptions"("userId", "status", "nextChargeDate");
CREATE INDEX "subscriptions_userId_deletedAt_idx"             ON "subscriptions"("userId", "deletedAt");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---- charges ----
CREATE TABLE "charges" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amountCents"    INTEGER NOT NULL,
    "currency"       TEXT NOT NULL,
    "chargedAt"      TIMESTAMP(3) NOT NULL,
    "source"         TEXT NOT NULL DEFAULT 'manual',
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "charges_subscriptionId_chargedAt_idx" ON "charges"("subscriptionId", "chargedAt");
CREATE INDEX "charges_userId_chargedAt_idx"         ON "charges"("userId", "chargedAt");

ALTER TABLE "charges"
  ADD CONSTRAINT "charges_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "charges"
  ADD CONSTRAINT "charges_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
