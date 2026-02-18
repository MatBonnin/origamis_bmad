-- Reference tables for domains and skills

CREATE TABLE "domain_refs" (
  "id"       TEXT NOT NULL,
  "slug"     TEXT NOT NULL,
  "label"    TEXT NOT NULL,
  "category" TEXT NOT NULL,
  CONSTRAINT "domain_refs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domain_refs_slug_key" ON "domain_refs"("slug");
CREATE INDEX "domain_refs_category_idx" ON "domain_refs"("category");

CREATE TABLE "skill_refs" (
  "id"          TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "domain_slug" TEXT,
  CONSTRAINT "skill_refs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_refs_slug_key" ON "skill_refs"("slug");
CREATE INDEX "skill_refs_domain_slug_idx" ON "skill_refs"("domain_slug");
