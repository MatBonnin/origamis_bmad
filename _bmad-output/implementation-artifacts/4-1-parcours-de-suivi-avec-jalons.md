# Story 4.1: Parcours de suivi avec jalons

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want avoir un parcours de suivi structuré avec jalons,
so that organiser ma progression.

## Acceptance Criteria

1. Given un étudiant authentifié When il accède à son parcours Then ses jalons sont affichés avec leur statut

## Tasks / Subtasks

- [ ] Créer service milestones (tables, statuses, progressions) (AC: #1)
- [ ] Exposer endpoint `GET /progression` + filtrage par student/mentor (AC: #1)
- [ ] UI parcours : timeline jalons, filtres, bandeau progression (AC: #1)
- [ ] Sync avec bookings/events pour lier RDV/visio (AC: #1)
- [ ] Tests API + UI + accessibilité (AC: #1)

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

### UX & accessibilité

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
- Integration: milestone update → notifications/webhooks.

### Do / Don’t

- Do: lock progression when milestone in review.
- Don’t: mark milestone done silently (requires confirmation).

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

### Completion Notes List

### File List
