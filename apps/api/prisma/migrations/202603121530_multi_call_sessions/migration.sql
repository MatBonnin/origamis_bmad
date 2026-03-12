CREATE TYPE "call_session_status" AS ENUM ('initiated', 'waiting', 'live', 'ended', 'missed', 'cancelled');

CREATE TABLE "booking_call_sessions" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "call_token" TEXT NOT NULL,
  "session_url" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'livekit',
  "provider_room_id" TEXT,
  "provider_join_url" TEXT,
  "initiated_by" TEXT,
  "status" "call_session_status" NOT NULL DEFAULT 'initiated',
  "participant_identities_json" JSONB NOT NULL DEFAULT '[]',
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "transcript_consent_status" "transcript_consent_status" NOT NULL DEFAULT 'pending',
  "transcript_status" "transcript_job_status" NOT NULL DEFAULT 'not_requested',
  "transcript_capture_status" "transcript_capture_status" NOT NULL DEFAULT 'not_started',
  "transcript_capture_provider_id" TEXT,
  "transcript_provider_job_id" TEXT,
  "transcript_consented_at" TIMESTAMP(3),
  "transcript_source_url" TEXT,
  "transcript_error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_call_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_call_sessions_call_token_key" ON "booking_call_sessions"("call_token");
CREATE UNIQUE INDEX "booking_call_sessions_provider_room_id_key" ON "booking_call_sessions"("provider_room_id");
CREATE INDEX "booking_call_sessions_booking_id_status_idx" ON "booking_call_sessions"("booking_id", "status");
CREATE INDEX "booking_call_sessions_booking_id_created_at_idx" ON "booking_call_sessions"("booking_id", "created_at");
CREATE INDEX "booking_call_sessions_provider_room_id_idx" ON "booking_call_sessions"("provider_room_id");

ALTER TABLE "booking_call_sessions"
  ADD CONSTRAINT "booking_call_sessions_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "booking_call_sessions" (
  "id",
  "booking_id",
  "call_token",
  "session_url",
  "provider",
  "provider_room_id",
  "provider_join_url",
  "status",
  "started_at",
  "ended_at",
  "expires_at",
  "transcript_consent_status",
  "transcript_status",
  "transcript_capture_status",
  "transcript_capture_provider_id",
  "transcript_provider_job_id",
  "transcript_consented_at",
  "transcript_source_url",
  "transcript_error_message",
  "created_at",
  "updated_at"
)
SELECT
  ('migrated-' || bs."id"),
  bs."booking_id",
  bs."session_token",
  bs."session_url",
  CASE WHEN bs."provider" = 'booking-portal' THEN 'livekit' ELSE bs."provider" END,
  bs."provider_room_id",
  bs."provider_join_url",
  CASE
    WHEN bs."status" = 'scheduled' THEN 'initiated'::"call_session_status"
    WHEN bs."status" = 'waiting' THEN 'waiting'::"call_session_status"
    WHEN bs."status" = 'live' THEN 'live'::"call_session_status"
    WHEN bs."status" = 'ended' THEN 'ended'::"call_session_status"
    ELSE 'cancelled'::"call_session_status"
  END,
  bs."started_at",
  bs."ended_at",
  bs."expires_at",
  bs."transcript_consent_status",
  bs."transcript_status",
  bs."transcript_capture_status",
  bs."transcript_capture_provider_id",
  bs."transcript_provider_job_id",
  bs."transcript_consented_at",
  bs."transcript_source_url",
  bs."transcript_error_message",
  bs."created_at",
  bs."updated_at"
FROM "booking_sessions" bs
WHERE bs."provider_room_id" IS NOT NULL;

ALTER TABLE "session_transcripts" ADD COLUMN "booking_call_session_id" TEXT;
ALTER TABLE "session_events" ADD COLUMN "booking_call_session_id" TEXT;

UPDATE "session_transcripts" st
SET "booking_call_session_id" = bcs."id"
FROM "booking_call_sessions" bcs
WHERE bcs."booking_id" = st."booking_id"
  AND st."booking_call_session_id" IS NULL;

UPDATE "session_events" se
SET "booking_call_session_id" = bcs."id"
FROM "booking_call_sessions" bcs
WHERE bcs."booking_id" = se."booking_id"
  AND se."booking_call_session_id" IS NULL;

ALTER TABLE "session_transcripts"
  DROP CONSTRAINT IF EXISTS "session_transcripts_booking_session_id_fkey",
  DROP CONSTRAINT IF EXISTS "session_transcripts_booking_id_fkey";

ALTER TABLE "session_events"
  DROP CONSTRAINT IF EXISTS "session_events_booking_session_id_fkey",
  DROP CONSTRAINT IF EXISTS "session_events_booking_id_fkey";

DROP INDEX IF EXISTS "session_transcripts_booking_session_id_key";
DROP INDEX IF EXISTS "session_transcripts_booking_id_key";

ALTER TABLE "session_transcripts"
  DROP COLUMN "booking_session_id",
  ALTER COLUMN "booking_call_session_id" SET NOT NULL;

ALTER TABLE "session_events"
  DROP COLUMN "booking_session_id",
  ALTER COLUMN "booking_call_session_id" SET NOT NULL;

CREATE UNIQUE INDEX "session_transcripts_booking_call_session_id_key" ON "session_transcripts"("booking_call_session_id");

ALTER TABLE "session_transcripts"
  ADD CONSTRAINT "session_transcripts_booking_call_session_id_fkey"
  FOREIGN KEY ("booking_call_session_id") REFERENCES "booking_call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_transcripts_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_events"
  ADD CONSTRAINT "session_events_booking_call_session_id_fkey"
  FOREIGN KEY ("booking_call_session_id") REFERENCES "booking_call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_events_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
