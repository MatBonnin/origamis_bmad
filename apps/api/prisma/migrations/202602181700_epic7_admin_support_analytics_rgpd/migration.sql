DO $$ BEGIN
  CREATE TYPE "incident_status" AS ENUM ('open', 'in_review', 'resolved', 'escalated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "deletion_request_status" AS ENUM ('requested', 'reviewed', 'approved', 'rejected', 'deleted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "user_audit_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_audit_logs_user_id_created_at_idx" ON "user_audit_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_audit_logs_admin_id_created_at_idx" ON "user_audit_logs"("admin_id", "created_at");

CREATE TABLE IF NOT EXISTS "incidents" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reported_by" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" "incident_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incidents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "incidents_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "incidents_session_id_created_at_idx" ON "incidents"("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "incidents_status_idx" ON "incidents"("status");

CREATE TABLE IF NOT EXISTS "incident_logs" (
  "id" TEXT PRIMARY KEY,
  "incident_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performed_by" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_logs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "incident_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "incident_logs_incident_id_created_at_idx" ON "incident_logs"("incident_id", "created_at");

CREATE TABLE IF NOT EXISTS "incident_attachments" (
  "id" TEXT PRIMARY KEY,
  "incident_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_attachments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "incident_attachments_incident_id_idx" ON "incident_attachments"("incident_id");

CREATE TABLE IF NOT EXISTS "analytics_snapshots" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "analytics_snapshots_type_created_at_idx" ON "analytics_snapshots"("type", "created_at");

CREATE TABLE IF NOT EXISTS "analytics_reports" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload_json" JSONB
);

CREATE INDEX IF NOT EXISTS "analytics_reports_type_generated_at_idx" ON "analytics_reports"("type", "generated_at");

CREATE TABLE IF NOT EXISTS "audit_reports" (
  "id" TEXT PRIMARY KEY,
  "report_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "analytics_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "audit_reports_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "audit_reports_report_id_idx" ON "audit_reports"("report_id");
CREATE INDEX IF NOT EXISTS "audit_reports_requested_by_created_at_idx" ON "audit_reports"("requested_by", "created_at");

CREATE TABLE IF NOT EXISTS "deletion_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "deletion_request_status" NOT NULL DEFAULT 'requested',
  "reviewed_by" TEXT,
  "reason" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "deletion_requests_user_id_key" ON "deletion_requests"("user_id");
CREATE INDEX IF NOT EXISTS "deletion_requests_status_requested_at_idx" ON "deletion_requests"("status", "requested_at");

CREATE TABLE IF NOT EXISTS "deletion_actions" (
  "id" TEXT PRIMARY KEY,
  "request_id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deletion_actions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "deletion_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "deletion_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "deletion_actions_request_id_timestamp_idx" ON "deletion_actions"("request_id", "timestamp");
CREATE INDEX IF NOT EXISTS "deletion_actions_admin_id_timestamp_idx" ON "deletion_actions"("admin_id", "timestamp");
