-- Epic 8 remaining stories: schema extensions

CREATE TYPE "mentor_support_type" AS ENUM ('ponctuel', 'suivi_regulier', 'long_uniquement');
CREATE TYPE "mentor_document_type" AS ENUM ('diploma', 'certificate');
CREATE TYPE "verification_status" AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE "calendar_provider" AS ENUM ('google');
CREATE TYPE "mentor_request_status" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
CREATE TYPE "program_milestone_status" AS ENUM ('planned', 'in_progress', 'review', 'done', 'blocked');
CREATE TYPE "program_document_type" AS ENUM ('memory', 'brief', 'annex', 'other');

ALTER TABLE "mentor_profiles"
  ADD COLUMN IF NOT EXISTS "education_level" TEXT,
  ADD COLUMN IF NOT EXISTS "degrees" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "support_types" "mentor_support_type"[] DEFAULT ARRAY[]::"mentor_support_type"[],
  ADD COLUMN IF NOT EXISTS "is_publish_ready" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "mentor_documents"
  RENAME COLUMN "type" TO "legacy_type";

ALTER TABLE "mentor_documents"
  ADD COLUMN IF NOT EXISTS "document_type" "mentor_document_type" DEFAULT 'diploma',
  ADD COLUMN IF NOT EXISTS "verification_status" "verification_status" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "verified_by" TEXT,
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

UPDATE "mentor_documents"
SET "document_type" = CASE
  WHEN COALESCE("legacy_type", '') ILIKE 'certificate' THEN 'certificate'::"mentor_document_type"
  ELSE 'diploma'::"mentor_document_type"
END
WHERE "document_type" IS NULL;

ALTER TABLE "mentor_documents"
  ALTER COLUMN "document_type" SET NOT NULL;

ALTER TABLE "mentor_documents"
  DROP COLUMN IF EXISTS "legacy_type";

ALTER TABLE "mentor_documents"
  ADD CONSTRAINT "mentor_documents_verified_by_fkey"
    FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "mentor_calendar_connections" (
  "id" TEXT NOT NULL,
  "mentor_id" TEXT NOT NULL,
  "provider" "calendar_provider" NOT NULL,
  "access_token_enc" TEXT NOT NULL,
  "refresh_token_enc" TEXT,
  "expires_at" TIMESTAMP(3),
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnected_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  CONSTRAINT "mentor_calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mentor_calendar_busy_slots" (
  "id" TEXT NOT NULL,
  "mentor_id" TEXT NOT NULL,
  "provider" "calendar_provider" NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_calendar_busy_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mentor_requests" (
  "id" TEXT NOT NULL,
  "mentor_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "status" "mentor_request_status" NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "decision_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_templates" (
  "id" TEXT NOT NULL,
  "mentor_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "program_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_template_milestones" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "milestone_order" INTEGER NOT NULL,
  "due_days_from_start" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "program_template_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_programs" (
  "id" TEXT NOT NULL,
  "template_id" TEXT,
  "mentor_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_program_milestones" (
  "id" TEXT NOT NULL,
  "program_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "milestone_order" INTEGER NOT NULL,
  "deadline_at" TIMESTAMP(3) NOT NULL,
  "status" "program_milestone_status" NOT NULL DEFAULT 'planned',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_program_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_documents" (
  "id" TEXT NOT NULL,
  "program_id" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  "document_type" "program_document_type" NOT NULL DEFAULT 'other',
  "file_name" TEXT,
  "url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "program_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mentor_calendar_connections_mentor_id_provider_key"
  ON "mentor_calendar_connections"("mentor_id", "provider");
CREATE INDEX "mentor_calendar_connections_provider_disconnected_at_idx"
  ON "mentor_calendar_connections"("provider", "disconnected_at");

CREATE UNIQUE INDEX "mentor_calendar_busy_slots_mentor_id_provider_provider_event_id_key"
  ON "mentor_calendar_busy_slots"("mentor_id", "provider", "provider_event_id");
CREATE INDEX "mentor_calendar_busy_slots_mentor_id_start_at_end_at_idx"
  ON "mentor_calendar_busy_slots"("mentor_id", "start_at", "end_at");

CREATE INDEX "mentor_requests_mentor_id_status_idx" ON "mentor_requests"("mentor_id", "status");
CREATE INDEX "mentor_requests_student_id_status_idx" ON "mentor_requests"("student_id", "status");

CREATE INDEX "program_templates_mentor_id_updated_at_idx" ON "program_templates"("mentor_id", "updated_at");
CREATE UNIQUE INDEX "program_template_milestones_template_id_milestone_order_key"
  ON "program_template_milestones"("template_id", "milestone_order");
CREATE INDEX "program_template_milestones_template_id_idx" ON "program_template_milestones"("template_id");

CREATE INDEX "student_programs_mentor_id_updated_at_idx" ON "student_programs"("mentor_id", "updated_at");
CREATE INDEX "student_programs_student_id_updated_at_idx" ON "student_programs"("student_id", "updated_at");
CREATE INDEX "student_program_milestones_program_id_milestone_order_idx"
  ON "student_program_milestones"("program_id", "milestone_order");

CREATE INDEX "program_documents_program_id_created_at_idx" ON "program_documents"("program_id", "created_at");
CREATE INDEX "program_documents_uploaded_by_created_at_idx" ON "program_documents"("uploaded_by", "created_at");

CREATE INDEX "mentor_profiles_is_publish_ready_idx" ON "mentor_profiles"("is_publish_ready");
CREATE INDEX "mentor_documents_verification_status_idx" ON "mentor_documents"("verification_status");

ALTER TABLE "mentor_calendar_connections"
  ADD CONSTRAINT "mentor_calendar_connections_mentor_id_fkey"
    FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_calendar_busy_slots"
  ADD CONSTRAINT "mentor_calendar_busy_slots_mentor_id_fkey"
    FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_requests"
  ADD CONSTRAINT "mentor_requests_mentor_id_fkey"
    FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "mentor_requests_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_templates"
  ADD CONSTRAINT "program_templates_mentor_id_fkey"
    FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_template_milestones"
  ADD CONSTRAINT "program_template_milestones_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "program_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_programs"
  ADD CONSTRAINT "student_programs_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "program_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "student_programs_mentor_id_fkey"
    FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "student_programs_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_program_milestones"
  ADD CONSTRAINT "student_program_milestones_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "student_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_documents"
  ADD CONSTRAINT "program_documents_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "student_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "program_documents_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
