-- ---------------------------------------------------------------------------
-- Search performance + data-integrity hardening
--
-- Kept outside the Prisma datamodel: full-text search columns, trigram indexes,
-- the atomic reference number allocator, and append-only guards on audit_logs.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- --- Full-text search --------------------------------------------------------
ALTER TABLE "public"."correspondence"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("reference_number", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("subject", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("student_name", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("matric_number", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("staff_id", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("remarks", '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS "correspondence_search_vector_idx"
  ON "public"."correspondence" USING GIN ("search_vector");

-- --- Fuzzy / partial matching ------------------------------------------------
CREATE INDEX IF NOT EXISTS "correspondence_reference_number_trgm_idx"
  ON "public"."correspondence" USING GIN ("reference_number" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "correspondence_student_name_trgm_idx"
  ON "public"."correspondence" USING GIN ("student_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "correspondence_subject_trgm_idx"
  ON "public"."correspondence" USING GIN ("subject" gin_trgm_ops);

-- --- Hot-path composite indexes ---------------------------------------------
CREATE INDEX IF NOT EXISTS "correspondence_office_status_idx"
  ON "public"."correspondence" ("destination_office_id", "status");

CREATE INDEX IF NOT EXISTS "correspondence_open_queue_idx"
  ON "public"."correspondence" ("status", "date_received" DESC)
  WHERE "status" IN ('RECEIVED', 'DIRECTED_TO_OFFICE', 'IN_PROGRESS');

-- --- Atomic reference number allocation -------------------------------------
CREATE OR REPLACE FUNCTION "public"."next_correspondence_reference"(p_year integer)
RETURNS TABLE (sequence integer, reference text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence integer;
  v_prefix   text;
BEGIN
  INSERT INTO "public"."reference_counters" ("year", "last_value", "prefix", "updated_at")
  VALUES (p_year, 1, 'PG', now())
  ON CONFLICT ("year") DO UPDATE
    SET "last_value" = "reference_counters"."last_value" + 1,
        "updated_at" = now()
  RETURNING "reference_counters"."last_value", "reference_counters"."prefix"
  INTO v_sequence, v_prefix;

  RETURN QUERY
    SELECT v_sequence,
           v_prefix || '/' || p_year::text || '/' || lpad(v_sequence::text, 6, '0');
END;
$$;

-- --- Append-only audit ledger -----------------------------------------------
CREATE OR REPLACE FUNCTION "public"."reject_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS "audit_logs_append_only" ON "public"."audit_logs";
CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "public"."audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "public"."reject_mutation"();

-- --- Data integrity constraints ---------------------------------------------
ALTER TABLE "public"."correspondence"
  DROP CONSTRAINT IF EXISTS "correspondence_applicant_identifier_check";
ALTER TABLE "public"."correspondence"
  ADD CONSTRAINT "correspondence_applicant_identifier_check" CHECK (
    ("applicant_type" = 'STUDENT' AND length(trim("matric_number")) > 0)
    OR ("applicant_type" = 'STAFF' AND "staff_id" IS NOT NULL AND length(trim("staff_id")) > 0)
  );

ALTER TABLE "public"."correspondence"
  DROP CONSTRAINT IF EXISTS "correspondence_sequence_positive_check";
ALTER TABLE "public"."correspondence"
  ADD CONSTRAINT "correspondence_sequence_positive_check" CHECK ("sequence" > 0);
