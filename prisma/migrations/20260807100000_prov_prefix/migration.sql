-- Switch reference allocator default prefix from PG to PROV.

CREATE OR REPLACE FUNCTION "public"."next_correspondence_reference"(p_year integer)
RETURNS TABLE (sequence integer, reference text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence integer;
  v_prefix   text;
BEGIN
  INSERT INTO "public"."reference_counters" ("year", "last_value", "prefix", "updated_at")
  VALUES (p_year, 1, 'PROV', now())
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

UPDATE "public"."reference_counters"
SET "prefix" = 'PROV'
WHERE "prefix" = 'PG';

ALTER TABLE "public"."reference_counters"
  ALTER COLUMN "prefix" SET DEFAULT 'PROV';

UPDATE "public"."settings"
SET "value" = 'PROV'
WHERE "key" = 'referencePrefix' AND "value" = 'PG';
