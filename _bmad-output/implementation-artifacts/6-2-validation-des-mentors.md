# Story 6.2: Validation des mentors

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want vÃ©rifier/valider un profil mentor,
so that garantir la qualitÃ© des mentors.

## Acceptance Criteria

- 1. Given un mentor en attente de validation When lâ€™admin valide le profil Then le mentor devient visible et actif

## Tasks / Subtasks

- [x] CrÃ©er workflow validation (awaited mentors en `pending_review`) (AC: #1)
- [x] Endpoint admin `POST /mentors/:id/validate`, `PATCH /mentors/:id/status` (AC: #1)
- [x] UI admin (liste mentors en attente, preview profil, actions) (AC: #1)
- [x] VÃ©rifier critÃ¨res (documents, avis, compliance) + notifications (AC: #1)
- [x] Tests API + UI + alerts (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: reviews + admin.
- Mentors en `pending_review` jusquâ€™Ã  validation.

### API Contracts (validation)

- `POST /mentors/:id/validate` -> `{ data: { mentor }, error: null }`
- `PATCH /mentors/:id/status` -> `{ data: { mentor }, error: null }`
- `GET /mentors/pending` -> `{ data: { mentors }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_validation_checks`: `mentor_id`, `status`, `checked_by`, `notes`.
- `mentor_documents`: `mentor_id`, `type`, `url`, `uploaded_at`.
- `mentor_status`: `pending`, `validated`, `rejected`.
- Conventions `snake_case`.

### UX & compliance

- Vue admin liste mentors, preview, statuts (pending, rejected).
- AccessibilitÃ©: focus sur actions, confirmations modales.
- Document checklist visible.
- Notifications (email/push) sur validation/rejet.

### Workflow & notifications

- GÃ©nÃ©rer Ã©vÃ©nements pour notifications + audits.
- Rejeter mentors (messages instructifs).
- Stocker logs (actions).

### Testing Requirements

- API: validation success, rejection, RBAC.
- UI: actions modales, preview documents.
- Integration: notifications triggered.

### Do / Donâ€™t

- Do: document raisons en cas de rejet.
- Do: conserver logs pour audits RGPD.
- Donâ€™t: exposer mentors non validÃ©s Ã  la recherche.

### Project Structure Notes

- Web: `apps/web/src/features/admin/mentor-validation`.
- API: `apps/api/src/modules/mentor-validation`.
- Shared DTOs: `packages/shared/src/schemas`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- npm test -- modules/mentors (apps/api)
- npm test -- src/features/admin/mentor-validation/__tests__/MentorValidationBoard.test.tsx (apps/web)

### Completion Notes List

- Ajout du workflow admin de validation mentor (GET /mentors/pending, POST /mentors/:id/validate, PATCH /mentors/:id/status).
- Ajout des gardes RBAC admin/support et du suivi des statuts (pending_review, validated, rejected).
- Ajout de l interface admin de validation avec liste pending, previsualisation et actions valider/rejeter.
- Ajout des modeles Prisma et migration pour mentor_validation_checks et mentor_documents.

### File List

- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/202602181200_epic6_mentors_reviews_validation_visibility/migration.sql
- apps/api/src/modules/mentors/mentors-admin.service.ts
- apps/api/src/modules/mentors/mentors-admin.service.spec.ts
- apps/api/src/modules/mentors/mentors.controller.ts
- apps/api/src/modules/mentors/mentors.module.ts
- apps/api/src/modules/mentors/index.ts
- apps/web/src/features/admin/mentor-validation/MentorValidationBoard.tsx
- apps/web/src/features/admin/mentor-validation/MentorValidationBoard.module.css
- apps/web/src/features/admin/mentor-validation/index.ts
- apps/web/src/features/admin/mentor-validation/__tests__/MentorValidationBoard.test.tsx
- apps/web/src/app/(app)/admin/mentors/validation/page.tsx

### Change Log

- 2026-02-18: Implementation complete de la validation des mentors (API + UI + tests + modeles Prisma).
