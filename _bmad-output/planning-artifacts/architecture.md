---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-Orig'ami-2026-01-16.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
  - _bmad-output/planning-artifacts/prd-validation-report-2026-01-16.md
  - _bmad-output/planning-artifacts/input-docs/DOSSIER-FINAL-ORIGAMIS.txt
  - _bmad-output/planning-artifacts/input-docs/Fonctionnalite-prevue.txt
workflowType: 'architecture'
project_name: 'site'
user_name: 'Mathieu'
date: '2026-01-16T12:08:36+01:00'
lastStep: 8
status: 'complete'
completedAt: '2026-01-16T13:51:31+01:00'---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Le produit couvre un parcours end-to-end pour etudiants et mentors: onboarding guide, matching/recherche de mentors, profils detailes, messagerie, RDV/visio, suivi par jalons, communaute, avis, et operations admin/support. Architectures clees: gestion des roles (etudiant/mentor/admin/support), coordination temps reel (messages/notifications), planification de sessions et historique, moderation de contenus, et gestion du cycle de vie utilisateur (consentement/suppression).

**Non-Functional Requirements:**
- Performance: pages publiques < 3s, actions cles < 2s
- Securite: chiffrement des donnees sensibles, RBAC, journalisation actions sensibles
- Scalabilite: x10 utilisateurs, pics saisonniers
- Accessibilite: WCAG 2.1 AA
- Fiabilite: 99.5% uptime, restauration < 24h
- Integration: visio externe via lien securise (option)

**Scale & Complexity:**
- Primary domain: web app full-stack
- Complexity level: medium
- Estimated architectural components: 8-12 (auth/roles, profils, matching/recherche, messagerie, scheduling/visio, jalons, communaute/moderation, notifications, admin/support)

### Technical Constraints & Dependencies

- Pages publiques SEO; zones authentifiees non prioritaires SEO
- Temps reel requis pour messagerie et notifications
- Support responsive desktop/tablette/mobile, navigation clavier et accessibilite AA
- Integration possible d’un service visio externe
- Exigences RGPD: consentement, suppression, protection des donnees

### Cross-Cutting Concerns Identified

- Authentification et gestion des roles
- Securite, chiffrement et journalisation
- Temps reel et notifications
- Moderation & signalement
- Accessibilite et performance percue
- Observabilite (mesure NFRs)

## Starter Template Evaluation

### Primary Technology Domain

Web app full-stack (React + API) avec besoins SEO (pages publiques) et temps reel (messagerie/notifications).

### Starter Options Considered

**Option 1: Next.js (front) + NestJS (back)**
- Next.js via `create-next-app@latest` (App Router, TypeScript, ESLint, etc.)
- NestJS via CLI (`npx @nestjs/cli@latest` ou install global)
- Avantages: SSR/SEO natif, separation claire front/back, patterns industriels
- Inconvenients: deux projets a maintenir (front + back)

**Option 2: Vite + React (front) + NestJS (back)**
- Vite pour SPA rapide
- Necessite SSR/SEO additionnel (plus complexe)
- Moins adapte vu l’exigence SEO

### Selected Starter: Next.js (front) + NestJS (API)

**Rationale for Selection:**
- SEO requis sur pages publiques -> Next.js (SSR/SSG)
- Stack TypeScript coherente front/back
- NestJS solide pour auth, roles, websocket, moderation
- Architecture scalable et conventionnelle

**Initialization Command:**

```bash
# Front
npx create-next-app@latest

# Back (sans install global)
npx @nestjs/cli@latest new my-nest-project
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript end-to-end

**Styling Solution:**
- `create-next-app` propose le choix (Tailwind, CSS modules, etc.)

**Build Tooling:**
- Next.js build pipeline (App Router)
- NestJS CLI (TS config, build standard)

**Testing Framework:**
- Next.js: lint + base testing a ajouter selon choix
- NestJS: structure standard, tests unitaires/integ a activer

**Code Organization:**
- Next.js App Router structure par routes
- NestJS structure par modules/services/controllers

**Development Experience:**
- DX moderne (hot reload, linting, TS strict possible)

**Note:** L’initialisation des deux projets est la premiere story d’implementation.

## Core Architectural Decisions

### Data Architecture

- Database: PostgreSQL 17
- ORM: Prisma 7.2.0
- Migrations: Prisma Migrate
- Cache: Redis 8.4.0 (optionnel, pour perf/fonctions temps reel)

### Authentication & Security

- Auth: NextAuth (Auth.js) 4.24.13
- Session/Token: JWT entre Next.js et NestJS
- Authorization: RBAC (etudiant, mentor, admin, support)
- API Security: JWT guards + rate limiting + validation DTO
- Data security: chiffrement en transit + controle d’acces par role

### API & Communication Patterns

- API style: REST
- API docs: OpenAPI/Swagger (@nestjs/swagger 11.2.5)
- Realtime: WebSocket via NestJS (@nestjs/websockets 11.1.12)
- Rate limiting: @nestjs/throttler 6.5.0

### Frontend Architecture

- State management: Zustand 5.0.10
- Forms: React Hook Form 7.71.1
- Data fetching: TanStack Query 5.90.18
- UI: Design system custom base sur la spec UX

### Infrastructure & Deployment

- Frontend hosting: Vercel (cible)
- API hosting: Fly.io (cible)
- Database/Storage: Supabase (Postgres + Storage)
- Monitoring: Sentry
- Deployment timing: differe (local-first, hebergement en dernier temps)

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Stack: Next.js (front) + NestJS (API)
- Data: PostgreSQL 17 + Prisma 7.2.0
- Auth: NextAuth 4.24.13 + JWT + RBAC
- API: REST + Swagger + WebSocket Nest

**Important Decisions (Shape Architecture):**
- Frontend state: Zustand 5.0.10
- Forms: React Hook Form 7.71.1
- Data fetching: TanStack Query 5.90.18
- Rate limiting: @nestjs/throttler 6.5.0
- Cache: Redis 8.4.0 (optionnel)

**Deferred Decisions (Post-MVP):**
- Hosting final (Vercel/Fly/Supabase) et monitoring Sentry

### Decision Impact Analysis

**Implementation Sequence:**
1) Initialiser Next.js et NestJS
2) Poser le schema de donnees (Prisma) et migrations
3) Mettre en place Auth + RBAC
4) Definir API REST + docs Swagger
5) Implementer temps reel (WebSocket)
6) Construire UI + state + forms + data fetching

**Cross-Component Dependencies:**
- Auth/RBAC conditionne API, UI et moderation
- Schema de donnees structure les modules (matching, messagerie, RDV, jalons)
- Temps reel depend du modele de donnees + autorisations

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 10 zones de conflit (naming, formats, structure, erreurs, events, tests)

### Naming Patterns

**Database Naming Conventions:**
- Tables/colonnes en `snake_case`
- PK: `id`
- FK: `{table}_id` (ex: `user_id`)

**API Naming Conventions:**
- Endpoints REST en pluriel: `/users`, `/mentors`, `/sessions`
- Parametres de route: `:id`
- Query params: `camelCase`

**Code Naming Conventions:**
- Composants React: `PascalCase`
- Fichiers composants: `Component.tsx`
- Fonctions/variables: `camelCase`

### Structure Patterns

**Project Organization:**
- Tests co-localises au meme niveau que le code (`*.test.ts(x)`)

**File Structure Patterns:**
- Modules Nest organises par domaine fonctionnel (ex: `matching`, `messaging`, `scheduling`)

### Format Patterns

**API Response Formats:**
- Enveloppe standard: `{ data, error }`

**Data Exchange Formats:**
- JSON en `camelCase`
- Dates en ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

### Communication Patterns

**Event System Patterns:**
- Evenements temps reel en `kebab-case` (ex: `message.created`)

**State Management Patterns:**
- Etats de chargement: `isLoading`, `isSaving`, `isSubmitting`

### Process Patterns

**Error Handling Patterns:**
- Erreur standard: `{ error: { code, message, details? } }`

### Enforcement Guidelines

**All AI Agents MUST:**
- Respecter `snake_case` pour la base de donnees
- Respecter `camelCase` dans les payloads JSON
- Utiliser l’enveloppe `{ data, error }` pour les reponses API

**Pattern Enforcement:**
- Revue rapide des PR pour conventions
- Tests schema/DTO pour valider formats

## Project Structure & Boundaries

### Complete Project Directory Structure
```
origami/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example
├── apps/
│   ├── web/                         # Next.js
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── .env.local
│   │   ├── public/
│   │   │   └── assets/
│   │   └── src/
│   │       ├── app/                 # App Router
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   ├── (public)/        # pages SEO
│   │       │   └── (app)/           # zones authentifiees
│   │       ├── components/
│   │       │   ├── ui/
│   │       │   ├── forms/
│   │       │   └── features/
│   │       ├── features/            # feature-first
│   │       │   ├── onboarding/
│   │       │   ├── matching/
│   │       │   ├── messaging/
│   │       │   ├── scheduling/
│   │       │   ├── milestones/
│   │       │   ├── community/
│   │       │   ├── reviews/
│   │       │   └── admin/
│   │       ├── lib/
│   │       │   ├── api/
│   │       │   ├── auth/
│   │       │   ├── hooks/
│   │       │   ├── stores/          # Zustand
│   │       │   └── utils/
│   │       ├── styles/
│   │       ├── types/
│   │       └── middleware.ts
│   └── api/                         # NestJS
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── .env
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   ├── modules/             # feature-first
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── onboarding/
│       │   │   ├── matching/
│       │   │   ├── messaging/
│       │   │   ├── scheduling/
│       │   │   ├── milestones/
│       │   │   ├── community/
│       │   │   ├── reviews/
│       │   │   ├── notifications/
│       │   │   └── admin/
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── pipes/
│       │   │   ├── interceptors/
│       │   │   ├── filters/
│       │   │   └── decorators/
│       │   └── shared/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── test/
│           ├── unit/
│           ├── integration/
│           └── e2e/
├── packages/
│   └── shared/                       # types + DTO partages
│       ├── package.json
│       └── src/
│           ├── types/
│           └── schemas/
└── docs/
    └── architecture.md
```

### Architectural Boundaries

**API Boundaries:**
- REST API NestJS dans `apps/api/src/modules/*`
- Auth/RBAC centralise dans `modules/auth` + `common/guards`

**Component Boundaries:**
- UI partagee: `apps/web/src/components/ui`
- Feature UI: `apps/web/src/features/*`

**Service Boundaries:**
- Chaque module Nest encapsule controller/service/repository

**Data Boundaries:**
- Schema Prisma dans `apps/api/prisma/schema.prisma`
- Acces DB via Prisma dans chaque module

### Requirements to Structure Mapping

**Feature Mapping:**
- Onboarding → `apps/web/src/features/onboarding` + `apps/api/src/modules/onboarding`
- Matching mentors → `matching`
- Messagerie → `messaging` (REST + WebSocket)
- RDV/Visio → `scheduling`
- Jalons/suivi → `milestones`
- Communaute/moderation → `community`
- Avis/validation mentors → `reviews` + `admin`
- Admin/support → `admin`
- Notifications → `notifications`

**Cross-Cutting Concerns:**
- Auth/RBAC → `modules/auth` + `common/guards`
- Rate limiting → `common/guards` + `@nestjs/throttler`
- Formats API → DTOs dans chaque module + `packages/shared/schemas`

### Integration Points

**Internal Communication:**
- Front ↔ API via REST
- Temps reel via WebSocket (messaging/notifications)

**External Integrations:**
- Visio externe (placeholder futur) dans `modules/scheduling`
- Storage (Supabase) via service `modules/storage` (a ajouter si besoin)

**Data Flow:**
- Front (TanStack Query) → API REST → Prisma → Postgres

### File Organization Patterns

**Configuration Files:**
- Env local: `apps/web/.env.local`, `apps/api/.env`
- Exemples: `.env.example` racine

**Source Organization:**
- Feature-first pour UI et API
- Shared types dans `packages/shared`

**Test Organization:**
- Web: tests co-localises `*.test.tsx`
- API: `apps/api/test/*`

**Asset Organization:**
- `apps/web/public/assets`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Les choix sont compatibles: Next.js + NestJS + Prisma + Postgres + NextAuth + WebSocket.

**Pattern Consistency:**
Les conventions (snake_case DB, camelCase JSON, enveloppe API) sont coherentes.

**Structure Alignment:**
Le monorepo + feature-first respecte les besoins et patterns.

### Requirements Coverage Validation ✅

**Feature Coverage:**
Onboarding, matching, messagerie, RDV, jalons, communaute, avis, admin, notifications couverts par modules dedies.

**Functional Requirements Coverage:**
Les 34 FRs sont couvertes via modules/flux.

**Non-Functional Requirements Coverage:**
Perf, securite, accessibilite, scalabilite, fiabilite, SEO couverts par stack et patterns.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Technos + versions definies.

**Structure Completeness:**
Arborescence complete et mapping fait.

**Pattern Completeness:**
Naming, formats, erreurs, tests et events specifies.

### Gap Analysis Results

- **Important:** NFRs mesurabilite a documenter (monitoring/tests) lors de l’implementation.
- **Deferred:** Hebergement final et observabilite (post-MVP).

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** High

**Key Strengths:**
- Stack coherente TS end-to-end
- Patterns clairs pour eviter conflits
- Structure feature-first alignee aux besoins

**Areas for Future Enhancement:**
- Detail mesures NFRs
- Choix exact visio provider

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-16T13:51:31+01:00
**Document Location:** _bmad-output/planning-artifacts/architecture.md

### Final Architecture Deliverables

**Complete Architecture Document**
- Decisions techniques avec versions verifiees
- Patterns d’implementation pour coherence
- Structure de projet complete
- Mapping requirements → modules
- Validation de coherence et couverture

**Implementation Handoff**
- Initialiser les projets via les commandes du starter
- Suivre les patterns et conventions definis
- Respecter la structure monorepo et les modules feature-first

**First Implementation Priority:**
```
# Front
npx create-next-app@latest

# Back (sans install global)
npx @nestjs/cli@latest new my-nest-project
```

### Architecture Status

**READY FOR IMPLEMENTATION ✅**

**Document Maintenance:** mettre a jour ce document en cas de nouvelles decisions majeures.
