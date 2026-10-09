-- University authentic table (credentials source of truth).
-- Columns match the university dump; pass stores bcrypt hashes.

CREATE TABLE IF NOT EXISTS "public"."authentic" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "pass" VARCHAR(255) NOT NULL,
    "user_type" VARCHAR(50) NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "authentic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "authentic_username_key" ON "public"."authentic"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "authentic_user_id_key" ON "public"."authentic"("user_id");
CREATE INDEX IF NOT EXISTS "authentic_user_type_idx" ON "public"."authentic"("user_type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'authentic_user_id_fkey'
  ) THEN
    ALTER TABLE "public"."authentic"
      ADD CONSTRAINT "authentic_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill authentic from existing users that have a university user_type.
INSERT INTO "public"."authentic" ("username", "pass", "user_type", "user_id")
SELECT
  LEFT(u."username", 100),
  u."password_hash",
  LEFT(u."user_type", 50),
  u."id"
FROM "public"."users" u
WHERE u."user_type" IS NOT NULL
  AND length(trim(u."user_type")) > 0
  AND NOT EXISTS (
    SELECT 1 FROM "public"."authentic" a
    WHERE a."username" = LEFT(u."username", 100) OR a."user_id" = u."id"
  );
