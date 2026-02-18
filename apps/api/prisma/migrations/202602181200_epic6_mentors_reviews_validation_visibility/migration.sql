DO $$ BEGIN
  CREATE TYPE "mentor_review_status" AS ENUM ('pending', 'published', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "mentor_review_flag_status" AS ENUM ('open', 'reviewed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "mentor_status" AS ENUM ('pending_review', 'validated', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "mentor_visibility_status" AS ENUM ('visible', 'hidden', 'priority', 'experimental');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "mentor_reviews" (
  "id" TEXT PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "booking_id" TEXT,
  "rating" DOUBLE PRECISION NOT NULL,
  "body" TEXT NOT NULL,
  "status" "mentor_review_status" NOT NULL DEFAULT 'published',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_reviews_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "mentor_reviews_booking_id_key" ON "mentor_reviews"("booking_id");
CREATE INDEX IF NOT EXISTS "mentor_reviews_mentor_id_status_idx" ON "mentor_reviews"("mentor_id", "status");
CREATE INDEX IF NOT EXISTS "mentor_reviews_student_id_idx" ON "mentor_reviews"("student_id");

CREATE TABLE IF NOT EXISTS "mentor_ratings" (
  "mentor_id" TEXT PRIMARY KEY,
  "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_ratings_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "mentor_review_flags" (
  "id" TEXT PRIMARY KEY,
  "review_id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "mentor_review_flag_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_review_flags_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "mentor_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_review_flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mentor_review_flags_review_id_idx" ON "mentor_review_flags"("review_id");
CREATE INDEX IF NOT EXISTS "mentor_review_flags_reporter_id_idx" ON "mentor_review_flags"("reporter_id");

CREATE TABLE IF NOT EXISTS "mentor_validation_checks" (
  "id" TEXT PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "status" "mentor_status" NOT NULL,
  "checked_by" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_validation_checks_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_validation_checks_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mentor_validation_checks_mentor_id_status_idx" ON "mentor_validation_checks"("mentor_id", "status");
CREATE INDEX IF NOT EXISTS "mentor_validation_checks_checked_by_idx" ON "mentor_validation_checks"("checked_by");

CREATE TABLE IF NOT EXISTS "mentor_documents" (
  "id" TEXT PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_documents_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mentor_documents_mentor_id_idx" ON "mentor_documents"("mentor_id");

CREATE TABLE IF NOT EXISTS "mentor_visibility" (
  "id" TEXT PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "status" "mentor_visibility_status" NOT NULL DEFAULT 'visible',
  "effective_from" TIMESTAMP(3),
  "notes" TEXT,
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_visibility_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_visibility_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "mentor_visibility_mentor_id_key" ON "mentor_visibility"("mentor_id");
CREATE INDEX IF NOT EXISTS "mentor_visibility_status_idx" ON "mentor_visibility"("status");

CREATE TABLE IF NOT EXISTS "mentor_visibility_history" (
  "id" TEXT PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "status" "mentor_visibility_status" NOT NULL,
  "effective_from" TIMESTAMP(3),
  "notes" TEXT,
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_visibility_history_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_visibility_history_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mentor_visibility_history_mentor_id_updated_at_idx" ON "mentor_visibility_history"("mentor_id", "updated_at");
