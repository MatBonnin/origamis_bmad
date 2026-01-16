# Story 1.6: Onboarding étudiant guidé

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want compléter un onboarding guidé,
so that préciser mon profil et mes besoins.

## Acceptance Criteria

1. Given un étudiant nouvellement inscrit When il suit les étapes d’onboarding Then les réponses sont enregistrées étape par étape
2. Given un étudiant qui termine l’onboarding When il valide la dernière étape Then son onboarding est marqué comme complété

## Tasks / Subtasks

- [ ] Definir schema onboarding (steps + reponses) via Prisma migration (AC: #1, #2)
- [ ] Exposer endpoints REST pour progression et completion (AC: #1, #2)
- [ ] UI onboarding multi-etapes avec stepper (AC: #1, #2)
- [ ] Enregistrer chaque etape (autosave) + reprise (AC: #1)
- [ ] Marquer onboarding complete et rediriger dashboard (AC: #2)
- [ ] Tests API + UI (progression, reprise, completion) (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON.
- UX: responsive + WCAG 2.1 AA.

### Parcours UX (resume)

- Choix profil (etudiant/mentor) si non determine.
- Parcours academique: domaine, niveau, annee.
- Objectifs: selection multiple.
- Creation/confirmation compte puis redirection dashboard.

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

### Testing Requirements

- API: progression step, reprise, completion.
- Web: navigation etapes, validation champs, redirection finale.

### Do / Don't

- Do: conserver l'etat partiel pour reprise.
- Don't: perdre les reponses si refresh.

### Project Structure Notes

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
- Feature-first dans `apps/api/src/modules` et `apps/web/src/features`
- Conventions: snake_case DB, camelCase JSON, endpoints pluriel

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List
