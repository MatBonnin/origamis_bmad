-- Availability V2: Enhanced scheduling system
-- Adds session settings, scheduling rules, weekly schedules, and date overrides

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Add new columns to mentor_availability
-- ══════════════════════════════════════════════════════════════════════════════

-- Session settings
ALTER TABLE "mentor_availability" ADD COLUMN "session_duration" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "mentor_availability" ADD COLUMN "buffer_before" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "mentor_availability" ADD COLUMN "buffer_after" INTEGER NOT NULL DEFAULT 0;

-- Scheduling rules
ALTER TABLE "mentor_availability" ADD COLUMN "min_notice_hours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "mentor_availability" ADD COLUMN "max_days_ahead" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "mentor_availability" ADD COLUMN "start_time_increment" INTEGER NOT NULL DEFAULT 30;

-- Limits
ALTER TABLE "mentor_availability" ADD COLUMN "daily_limit" INTEGER;
ALTER TABLE "mentor_availability" ADD COLUMN "weekly_limit" INTEGER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Create date_override_type enum
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "date_override_type" AS ENUM ('unavailable', 'custom_hours');

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Create mentor_weekly_schedule table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "mentor_weekly_schedule" (
    "id" TEXT NOT NULL,
    "availability_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "time_windows" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_weekly_schedule_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one entry per day per availability
CREATE UNIQUE INDEX "mentor_weekly_schedule_availability_id_day_of_week_key" ON "mentor_weekly_schedule"("availability_id", "day_of_week");

-- Index for faster lookups
CREATE INDEX "mentor_weekly_schedule_availability_id_idx" ON "mentor_weekly_schedule"("availability_id");

-- Foreign key
ALTER TABLE "mentor_weekly_schedule" ADD CONSTRAINT "mentor_weekly_schedule_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "mentor_availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Create mentor_date_overrides table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "mentor_date_overrides" (
    "id" TEXT NOT NULL,
    "availability_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "override_type" "date_override_type" NOT NULL,
    "time_windows" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_date_overrides_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one override per date per availability
CREATE UNIQUE INDEX "mentor_date_overrides_availability_id_date_key" ON "mentor_date_overrides"("availability_id", "date");

-- Index for faster lookups by date
CREATE INDEX "mentor_date_overrides_availability_id_date_idx" ON "mentor_date_overrides"("availability_id", "date");

-- Foreign key
ALTER TABLE "mentor_date_overrides" ADD CONSTRAINT "mentor_date_overrides_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "mentor_availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Migration: Convert existing slots to weekly schedule (optional)
-- ══════════════════════════════════════════════════════════════════════════════

-- This migrates existing mentor_availability_slots to the new mentor_weekly_schedule format
-- Only converts slots that are recurring and published

INSERT INTO "mentor_weekly_schedule" ("id", "availability_id", "day_of_week", "is_available", "time_windows", "updated_at")
SELECT
    gen_random_uuid()::text,
    availability_id,
    day_of_week,
    true,
    jsonb_agg(
        jsonb_build_object(
            'start', start_time,
            'end', end_time
        ) ORDER BY start_time
    ),
    NOW()
FROM "mentor_availability_slots"
WHERE is_recurring = true AND status = 'published'
GROUP BY availability_id, day_of_week
ON CONFLICT (availability_id, day_of_week) DO NOTHING;
