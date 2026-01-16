# Story 4.2: Marquer un jalon comme terminé

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want marquer un jalon comme terminé,
so that suivre mon avancement.

## Acceptance Criteria

1. Given un étudiant avec un jalon en cours When il le marque comme terminé Then le statut est mis à jour et la progression recalculée

## Tasks / Subtasks

- [ ] Endpoint `PATCH /milestones/:id/status` (AC: #1)
- [ ] Ajouter workflow validation (review/mentor validation) (AC: #1)
- [ ] UI action “Marquer terminé” + confirmation + toast (AC: #1)
- [ ] Recalcul progression student/mentor + trigger notifications (AC: #1)
- [ ] Tests API + UI + notifications (AC: #1)

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

### UX & accessibilité

- Confirmation modal (aria-modal) + `aria-live` success.
- Status badge (en cours/terminé/en attente).
- Accessible buttons (focus) + undo option.

### Integration & delivery

- Notify mentor + student on status change (story 2-3, 3-3).
- Recalculation of progress bars (story 4-1) and notifications.
- Trigger analytics event for completion.

### Testing Requirements

- API: status transitions, validation, unauthorized attempts.
- UI: modal, toast, undo, focus states.
- Integration: completion → notifications/resume.

### Do / Don’t

- Do: prévenir mentor si milestone en review.
- Don’t: allow direct completion without validation steps.

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

### Completion Notes List

### File List
