-- Phase 1.5: email verification, password reset, login lockout, password rotation tracking
-- Idempotent where possible. Adds AuthToken model + new User columns.

-- New columns on users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AuthTokenPurpose enum
DO $$ BEGIN
  CREATE TYPE "AuthTokenPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AuthToken table
CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "AuthTokenPurpose" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "auth_tokens_userId_purpose_idx" ON "auth_tokens"("userId", "purpose");

ALTER TABLE "auth_tokens"
  DROP CONSTRAINT IF EXISTS "auth_tokens_userId_fkey";

ALTER TABLE "auth_tokens"
  ADD CONSTRAINT "auth_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
