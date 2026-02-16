-- CreateTable
CREATE TABLE "mentor_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "expertise_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "supported_levels" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "hourly_rate" INTEGER,
  "rating_avg" DOUBLE PRECISION DEFAULT 0,
  "is_validated" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_availability" (
  "id" TEXT NOT NULL,
  "mentor_user_id" TEXT NOT NULL,
  "is_available" BOOLEAN NOT NULL DEFAULT false,
  "next_available_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mentor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_intents" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "preferred_domain" TEXT,
  "budget_max" INTEGER,
  "preferred_objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_interactions" (
  "id" TEXT NOT NULL,
  "student_user_id" TEXT NOT NULL,
  "mentor_user_id" TEXT NOT NULL,
  "interaction_count" INTEGER NOT NULL DEFAULT 0,
  "last_interaction_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mentor_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_cache" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "cache_key" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recommendation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "mentor_profiles_domain_idx" ON "mentor_profiles"("domain");

-- CreateIndex
CREATE INDEX "mentor_profiles_is_validated_idx" ON "mentor_profiles"("is_validated");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_availability_mentor_user_id_key" ON "mentor_availability"("mentor_user_id");

-- CreateIndex
CREATE INDEX "mentor_availability_is_available_idx" ON "mentor_availability"("is_available");

-- CreateIndex
CREATE UNIQUE INDEX "user_intents_user_id_key" ON "user_intents"("user_id");

-- CreateIndex
CREATE INDEX "user_intents_user_id_idx" ON "user_intents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_interactions_student_user_id_mentor_user_id_key"
ON "mentor_interactions"("student_user_id", "mentor_user_id");

-- CreateIndex
CREATE INDEX "mentor_interactions_student_user_id_idx" ON "mentor_interactions"("student_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_cache_user_id_cache_key_key"
ON "recommendation_cache"("user_id", "cache_key");

-- CreateIndex
CREATE INDEX "recommendation_cache_expires_at_idx" ON "recommendation_cache"("expires_at");

-- AddForeignKey
ALTER TABLE "mentor_profiles"
ADD CONSTRAINT "mentor_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_availability"
ADD CONSTRAINT "mentor_availability_mentor_user_id_fkey"
FOREIGN KEY ("mentor_user_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_intents"
ADD CONSTRAINT "user_intents_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_interactions"
ADD CONSTRAINT "mentor_interactions_student_user_id_fkey"
FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_interactions"
ADD CONSTRAINT "mentor_interactions_mentor_user_id_fkey"
FOREIGN KEY ("mentor_user_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_cache"
ADD CONSTRAINT "recommendation_cache_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
