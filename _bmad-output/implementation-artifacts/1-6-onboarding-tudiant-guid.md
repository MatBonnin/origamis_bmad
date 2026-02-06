# Story 1.6: Onboarding étudiant guidé

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want compléter un onboarding guidé,
so that préciser mon profil et mes besoins.

## Acceptance Criteria

1. Given un étudiant nouvellement inscrit When il suit les étapes d’onboarding Then les réponses sont enregistrées étape par étape
2. Given un étudiant qui termine l’onboarding When il valide la dernière étape Then son onboarding est marqué comme complété

## Tasks / Subtasks

- [x] Definir schema onboarding (steps + reponses) via Prisma migration (AC: #1, #2)
- [x] Exposer endpoints REST pour progression et completion (AC: #1, #2)
- [x] UI onboarding multi-etapes avec stepper (AC: #1, #2)
- [x] Enregistrer chaque etape (autosave) + reprise (AC: #1)
- [x] Marquer onboarding complete et rediriger dashboard (AC: #2)
- [x] Tests API + UI (progression, reprise, completion) (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON.
- UX: responsive + WCAG 2.1 AA.

### Parcours UX (resume)

- L'onboarding fait partie de la creation de compte (story 1.1).
- Choix profil (etudiant/mentor).
- Parcours academique: domaine, niveau, annee.
- Objectifs: selection multiple.
- Fin onboarding -> redirection dashboard.

### API Contracts (onboarding)

- `GET /onboarding/me` -> `{ data: { step, answers, completed }, error: null }`
- `PATCH /onboarding/step` -> `{ data: { step, answers }, error: null }`
- `POST /onboarding/complete` -> `{ data: { completed: true }, error: null }`

### Donnees (minimum)

- `onboarding`: `user_id`, `step`, `answers_json`, `completed_at`.
- Conventions `snake_case`.

### Validation & UX

- Autosave par etape, idempotent.
- Stepper accessible, progression visible.
- Erreurs inline + `aria-live`.

### Project Structure Notes

- Web: `apps/web/src/features/onboarding`.
- API: `apps/api/src/modules/onboarding`.
- DTOs partages: `packages/shared/src/schemas`.
- Branding: logo principal disponible dans `apps/web/src/app/assets/logo.png`.

### Testing Requirements

- API: progression step, reprise, completion.
- Web: navigation etapes, validation champs, redirection finale.

### Do / Don't

- Do: conserver l'etat partiel pour reprise.
- Don't: perdre les reponses si refresh.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md
- doc_origami\maquette\Creation de compte  (Maquette de l(onboarding en noir en blanc, a mettre en couleur)

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References
- `npm test -- --runInBand src/modules/onboarding/onboarding.service.spec.ts src/modules/onboarding/onboarding.controller.spec.ts src/modules/auth/auth.service.spec.ts` -> PASS (22 tests)
- `npm run test` (apps/web) -> PASS (5 tests UI)

### Completion Notes List
- Schema onboarding ajoute (`onboarding` avec `step`, `answers_json`, `completed_at`) + migration SQL.
- Module API onboarding implemente avec endpoints:
- `GET /onboarding/me`
- `PATCH /onboarding/step`
- `POST /onboarding/complete`
- Reprise automatique implementee via lecture de l'etat onboarding existant.
- Autosave par etape implemente via `PATCH /onboarding/step` lors de la navigation.
- Completion onboarding implementee avec redirection dashboard.
- Flux inscription ajuste: apres creation/connexion auto, un etudiant est redirige vers `/onboarding`.
- L'emplacement du logo a ete documente (`apps/web/src/app/assets/logo.png`) dans le contexte projet.

### File List
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/202602061500_add_onboarding/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/onboarding/onboarding.module.ts`
- `apps/api/src/modules/onboarding/onboarding.controller.ts`
- `apps/api/src/modules/onboarding/onboarding.controller.spec.ts`
- `apps/api/src/modules/onboarding/onboarding.service.ts`
- `apps/api/src/modules/onboarding/onboarding.service.spec.ts`
- `apps/api/src/modules/onboarding/dto/onboarding.dto.ts`
- `apps/api/src/modules/onboarding/dto/index.ts`
- `apps/api/src/modules/onboarding/index.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.service.spec.ts`
- `apps/web/src/app/(app)/onboarding/page.tsx`
- `apps/web/src/features/onboarding/OnboardingWizard.tsx`
- `apps/web/src/features/onboarding/OnboardingWizard.module.css`
- `apps/web/src/features/onboarding/__tests__/OnboardingWizard.test.tsx`
- `apps/web/src/app/(public)/inscription/page.tsx`
- `docs/project-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
- 2026-02-06: Story 1.6 implementee (schema onboarding, endpoints API, wizard UI multi-etapes, autosave/reprise, completion avec redirection, tests API/UI).
