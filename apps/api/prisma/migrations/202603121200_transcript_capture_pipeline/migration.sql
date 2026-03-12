CREATE TYPE "transcript_consent_status" AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE "transcript_capture_status" AS ENUM ('not_started', 'recording', 'uploaded', 'failed');

ALTER TABLE "booking_sessions"
  ADD COLUMN "transcript_consent_status" "transcript_consent_status" NOT NULL DEFAULT 'pending',
  ADD COLUMN "transcript_capture_status" "transcript_capture_status" NOT NULL DEFAULT 'not_started',
  ADD COLUMN "transcript_capture_provider_id" TEXT,
  ADD COLUMN "transcript_source_url" TEXT,
  ADD COLUMN "transcript_error_message" TEXT;
