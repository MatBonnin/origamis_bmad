-- Messaging core tables
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_mentor_id_student_id_key" ON "conversations"("mentor_id", "student_id");
CREATE INDEX IF NOT EXISTS "conversations_student_id_idx" ON "conversations"("student_id");
CREATE INDEX IF NOT EXISTS "conversations_mentor_id_idx" ON "conversations"("mentor_id");
CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx" ON "conversations"("last_message_at");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "client_message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "messages_conversation_id_sender_id_client_message_id_key" ON "messages"("conversation_id", "sender_id", "client_message_id");
CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "messages_receiver_id_idx" ON "messages"("receiver_id");

CREATE TABLE IF NOT EXISTS "read_status" (
  "id" TEXT PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "last_read_message_id" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "read_status_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "read_status_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "read_status_conversation_id_user_id_key" ON "read_status"("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "read_status_user_id_idx" ON "read_status"("user_id");
