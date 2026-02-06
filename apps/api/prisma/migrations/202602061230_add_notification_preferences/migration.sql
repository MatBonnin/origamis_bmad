-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('email', 'push', 'in_app');

-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('messages', 'rdv', 'system');

-- CreateTable
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "category" "notification_category" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_channel_category_key" ON "notification_preferences"("user_id", "channel", "category");

-- AddForeignKey
ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
