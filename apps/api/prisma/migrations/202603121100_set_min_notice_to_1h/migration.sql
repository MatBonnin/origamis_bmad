-- Set booking minimum notice to 1 hour for all mentors

ALTER TABLE "mentor_availability"
ALTER COLUMN "min_notice_hours" SET DEFAULT 1;

UPDATE "mentor_availability"
SET "min_notice_hours" = 1
WHERE "min_notice_hours" <> 1;
