# Story 4.1: Parcours de suivi avec jalons

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Ã©tudiant,
I want avoir un parcours de suivi structurÃ© avec jalons,
so that organiser ma progression.

## Acceptance Criteria

1. Given un Ã©tudiant authentifiÃ© When il accÃ¨de Ã  son parcours Then ses jalons sont affichÃ©s avec leur statut

## Tasks / Subtasks

- [x] Créer service milestones (tables, statuses, progressions) (AC: #1)
- [x] Exposer endpoint GET /progression + filtrage par student/mentor (AC: #1)
- [x] UI parcours : timeline jalons, filtres, bandeau progression (AC: #1)
- [x] Sync avec bookings/events pour lier RDV/visio (AC: #1)
- [x] Tests API + UI + accessibilité (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (student/mentor).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules milestones/jalons.
- Progression visible central.

- `GET /progression?user_id=&type=` -> `{ data: { milestones, metadata }, error: null }`
- `POST /milestones/:id/progress` -> `{ data: { milestone }, error: null }`
- `GET /milestones/:id` -> `{ data: { milestone }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `milestones`: `id`, `user_id`, `type`, `status`, `due_at`, `completed_at`.
- `milestone_progress`: `milestone_id`, `step`, `completed_at`.
- `progression_metadata`: `total_completed`, `total_pending`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Timeline card with status chips (planned/in-progress/done).
- Filters (by type, mentor, due date) with accessible buttons.
- `aria-live` for progress updates + tooltips for statuses.
- Progress bar (aria-valuenow) summarizing completion.

### Integration & delivery

- Sync with booking/session events (stories 3-5,3-7) for milestone updates.
- Notify mentors when student hits key milestones.
- Support message/notification triggers via `notifications` module.

### Testing Requirements

- API: filters, pagination, mentoring access.
- UI: timeline interactions, filters, progress updates.
- Integration: milestone update â†’ notifications/webhooks.

### Do / Donâ€™t

- Do: lock progression when milestone in review.
- Donâ€™t: mark milestone done silently (requires confirmation).

### Project Structure Notes

- Web: `apps/web/src/features/milestones`.
- API: `apps/api/src/modules/milestones`.
- Shared DTOs: `packages/shared/src/schemas`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- Module milestones implémenté côté API (controller/service/module) avec endpoint principal GET /progression.
- Timeline de progression construite depuis bookings + conversations avec metadata de completion.
- UI étudiant ajoutée sur /projets avec filtres de type, bandeau progression et annonces ria-live.
- Synchronisation des jalons RDV/visio/messages via sources booking/session/message.
- Tests passants: API ciblé (13/13), Web ciblé (5/5), API complet (289/289).

### Completion Notes List

- Story 4.1 terminée: service milestones, endpoint progression, UI parcours, sync events et tests livrés.

### File List

- apps/api/src/modules/milestones/milestones.service.ts
- apps/api/src/modules/milestones/milestones.controller.ts
- apps/api/src/modules/milestones/milestones.module.ts
- apps/api/src/modules/milestones/index.ts
- apps/api/src/modules/milestones/milestones.service.spec.ts
- apps/api/src/modules/milestones/milestones.controller.spec.ts
- apps/api/src/app.module.ts
- apps/web/src/app/(app)/projets/page.tsx
- apps/web/src/app/(app)/mentor/progression/page.tsx
- apps/web/src/features/milestones/index.ts
- apps/web/src/features/milestones/progress/index.ts
- apps/web/src/features/milestones/progress/StudentProgression.tsx
- apps/web/src/features/milestones/progress/StudentProgression.module.css
- apps/web/src/features/milestones/progress/__tests__/StudentProgression.test.tsx
- apps/web/src/features/mentors/progression/index.ts
- apps/web/src/features/mentors/progression/MentorProgression.tsx
- apps/web/src/features/mentors/progression/MentorProgression.module.css
- apps/web/src/features/mentors/progression/__tests__/MentorProgression.test.tsx

## Change Log

- 2026-02-18: Story 4.1 completee (module milestones, endpoint progression, UI parcours, sync bookings/messages, tests API/UI).
