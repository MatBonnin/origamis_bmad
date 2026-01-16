# Story 3.4: Disponibilités mentor

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want définir mes disponibilités,
so that permettre aux étudiants de réserver.

## Acceptance Criteria

1. Given un mentor authentifié When il configure ses créneaux Then les disponibilités sont enregistrées et visibles pour la réservation

## Tasks / Subtasks

- [ ] Définir la table `mentor_availability` + règles (slots, récurrences, timezone) (AC: #1)
- [ ] Endpoints REST `GET /mentors/me/availability`, `POST/PATCH/DELETE /mentors/me/availability` (AC: #1)
- [ ] UI dashboard mentor pour gérer les créneaux, règles, exceptions (AC: #1)
- [ ] Synchroniser avec calendrier RDV (vérifier conflits) + publication (AC: #1)
- [ ] Tests API + UI + validations (timezone, overlapping slots) (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules scheduling + messaging.
- WebSocket utilisé pour notifications (slot update).

### API Contracts (availability)

- `GET /mentors/me/availability` -> `{ data: { slots }, error: null }`
- `POST /mentors/me/availability` -> `{ data: { slot }, error: null }`
- `PATCH /mentors/me/availability/:id` -> `{ data: { slot }, error: null }`
- `DELETE /mentors/me/availability/:id` -> `{ data: { success: true }, error: null }`
- `GET /mentors/:id/availability` (students) -> `{ data: { availability }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_availability`: `id`, `mentor_id`, `starts_at`, `ends_at`, `rule`, `timezone`, `status`.
- `mentor_availability_rules`: `mentor_id`, `day_of_week`, `start_time`, `end_time`, `recurrence`.
- Support timezone (UTC) + conversions.
- Conventions `snake_case`.

### UX & validation

- Scheduler with day/time grid, add/remove slots, warning on overlap.
- Provide timezone selection, preview of timezone conversions.
- Accessibility: labels, keyboard navigation, `aria-live` errors.
- Visual statuses (published, draft, blocked).

### Integration & delivery

- Broadcasting updates to `notifications` + `messages`.
- Validate conflicts with existing RDV (existing story 3-5) before saving.
- WebSocket to signal new slot to students (if needed).

### Testing Requirements

- API: overlapping slot detection, timezone adjustments, RBAC.
- UI: grid interactions, keyboard nav, message if invalid.
- Integration: new slot -> visible in search (story 2).

### Do / Don’t

- Do: valider les créneaux contre les RDV existants.
- Do: publier uniquement après validation.
- Don’t: permettre créneau sans timezone.

### Project Structure Notes

- Web: `apps/web/src/features/mentors/availability`.
- API: `apps/api/src/modules/mentors/availability`.
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

### Completion Notes List

### File List
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
