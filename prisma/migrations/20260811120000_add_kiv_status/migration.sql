-- Keep in View (KIV): park open letters for later review without closing them.
ALTER TYPE "CorrespondenceStatus" ADD VALUE IF NOT EXISTS 'KIV';

ALTER TABLE "correspondence"
  ADD COLUMN IF NOT EXISTS "status_before_kiv" "CorrespondenceStatus";
