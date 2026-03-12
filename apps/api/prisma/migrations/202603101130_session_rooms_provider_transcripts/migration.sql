DO $$
BEGIN
  CREATE TYPE "session_room_status" AS ENUM ('scheduled', 'waiting', 'live', 'ended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "transcript_job_status" AS ENUM ('not_requested', 'pending_consent', 'queued', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "session_event_type" AS ENUM (
    'room_created',
    'participant_joined',
    'participant_left',
    'room_started',
    'room_ended',
    'transcript_requested',
    'transcript_completed',
    'transcript_failed',
    'webhook_received',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "booking_sessions"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'embedded-video',
  ADD COLUMN "provider_room_id" TEXT,
  ADD COLUMN "provider_join_url" TEXT,
  ADD COLUMN "status" "session_room_status" NOT NULL DEFAULT 'scheduled',
  ADD COLUMN "started_at" TIMESTAMP(3),
  ADD COLUMN "ended_at" TIMESTAMP(3),
  ADD COLUMN "transcript_status" "transcript_job_status" NOT NULL DEFAULT 'not_requested',
  ADD COLUMN "transcript_provider_job_id" TEXT,
  ADD COLUMN "transcript_consented_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "booking_sessions_provider_room_id_idx" ON "booking_sessions"("provider_room_id");

CREATE TABLE "session_documents" (
  "id" TEXT NOT NULL,
  "booking_session_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session_chat_messages" (
  "id" TEXT NOT NULL,
  "booking_session_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "document_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session_transcripts" (
  "id" TEXT NOT NULL,
  "booking_session_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "transcript_job_status" NOT NULL DEFAULT 'queued',
  "language" TEXT,
  "full_text" TEXT,
  "summary_text" TEXT,
  "segments_json" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_transcripts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session_events" (
  "id" TEXT NOT NULL,
  "booking_session_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "actor_id" TEXT,
  "event_type" "session_event_type" NOT NULL,
  "provider_event_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "session_documents_booking_id_created_at_idx" ON "session_documents"("booking_id", "created_at");
CREATE INDEX "session_chat_messages_booking_id_created_at_idx" ON "session_chat_messages"("booking_id", "created_at");
CREATE INDEX "session_chat_messages_booking_session_id_created_at_idx" ON "session_chat_messages"("booking_session_id", "created_at");
CREATE UNIQUE INDEX "session_transcripts_booking_session_id_key" ON "session_transcripts"("booking_session_id");
CREATE UNIQUE INDEX "session_transcripts_booking_id_key" ON "session_transcripts"("booking_id");
CREATE INDEX "session_transcripts_booking_id_status_idx" ON "session_transcripts"("booking_id", "status");
CREATE UNIQUE INDEX "session_events_provider_event_id_key" ON "session_events"("provider_event_id");
CREATE INDEX "session_events_booking_id_created_at_idx" ON "session_events"("booking_id", "created_at");

ALTER TABLE "session_documents"
  ADD CONSTRAINT "session_documents_booking_session_id_fkey"
    FOREIGN KEY ("booking_session_id") REFERENCES "booking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_documents_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_documents_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_chat_messages"
  ADD CONSTRAINT "session_chat_messages_booking_session_id_fkey"
    FOREIGN KEY ("booking_session_id") REFERENCES "booking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_chat_messages_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_chat_messages_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_chat_messages_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "session_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "session_transcripts"
  ADD CONSTRAINT "session_transcripts_booking_session_id_fkey"
    FOREIGN KEY ("booking_session_id") REFERENCES "booking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_transcripts_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_events"
  ADD CONSTRAINT "session_events_booking_session_id_fkey"
    FOREIGN KEY ("booking_session_id") REFERENCES "booking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_events_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "session_events_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
