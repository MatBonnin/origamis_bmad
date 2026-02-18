# Story 4.2: Marquer un jalon comme terminÃ©

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Ã©tudiant,
I want marquer un jalon comme terminÃ©,
so that suivre mon avancement.

## Acceptance Criteria

1. Given un Ã©tudiant avec un jalon en cours When il le marque comme terminÃ© Then le statut est mis Ã  jour et la progression recalculÃ©e

## Tasks / Subtasks

- [x] Endpoint PATCH /milestones/:id/status (AC: #1)
- [x] Ajouter workflow validation (review/mentor validation) (AC: #1)
- [x] UI action “Marquer terminé” + confirmation + toast (AC: #1)
- [x] Recalcul progression student/mentor + trigger notifications (AC: #1)
- [x] Tests API + UI + notifications (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (student).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: milestones/jalons.
- Progression visible.

- `PATCH /milestones/:id/status` -> `{ data: { milestone }, error: null }`
- `GET /milestones/:id` -> `{ data: { milestone }, error: null }`
- `POST /milestones/:id/review` -> `{ data: { review }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `milestone_status_history`: `milestone_id`, `status`, `changed_by`, `timestamp`.
- `milestone_reviews`: `milestone_id`, `mentor_id`, `comments`, `approved`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Confirmation modal (aria-modal) + `aria-live` success.
- Status badge (en cours/terminÃ©/en attente).
- Accessible buttons (focus) + undo option.

### Integration & delivery

- Notify mentor + student on status change (story 2-3, 3-3).
- Recalculation of progress bars (story 4-1) and notifications.
- Trigger analytics event for completion.

### Testing Requirements

- API: status transitions, validation, unauthorized attempts.
- UI: modal, toast, undo, focus states.
- Integration: completion â†’ notifications/resume.

### Do / Donâ€™t

- Do: prÃ©venir mentor si milestone en review.
- Donâ€™t: allow direct completion without validation steps.

### Project Structure Notes

- Web: `apps/web/src/features/milestones/progress`.
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

- PATCH /milestones/:id/status implémenté avec règle de validation mentor avant passage en done.
- Workflow de review mentor implémenté via POST /milestones/:id/review.
- UI étudiant: action Marquer terminé avec confirmation et feedback ria-live.
- Recalcul progression renvoyé dans la réponse et notifications mentor/étudiant déclenchées.
- Tests passants: API ciblé (13/13), Web ciblé (5/5), API complet (289/289).

### Completion Notes List

- Story 4.2 terminée: transitions de statut, validation mentor, UI confirmation, notifications et tests livrés.

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

- 2026-02-18: Story 4.2 completee (PATCH status, workflow review mentor, UI confirmation, recalcul progression, notifications, tests).
