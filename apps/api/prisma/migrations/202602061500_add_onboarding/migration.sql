-- CreateTable
CREATE TABLE "onboarding" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 1,
  "answers_json" JSONB NOT NULL DEFAULT '{}',
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_user_id_key" ON "onboarding"("user_id");

-- CreateIndex
CREATE INDEX "onboarding_user_id_idx" ON "onboarding"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding"
ADD CONSTRAINT "onboarding_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
