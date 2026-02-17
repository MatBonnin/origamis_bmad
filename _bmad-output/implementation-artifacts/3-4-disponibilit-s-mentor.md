# Story 3.4: Disponibilités mentor

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want définir mes disponibilités,
so that permettre aux étudiants de réserver.

## Acceptance Criteria

1. Given un mentor authentifié When il configure ses créneaux Then les disponibilités sont enregistrées et visibles pour la réservation

## Tasks / Subtasks

- [x] Définir la table `mentor_availability_slots` + timezone sur `mentor_availability` (AC: #1)
- [x] Endpoints REST `GET /mentors/me/availability`, `POST/PATCH/DELETE /mentors/me/availability` + `GET /mentors/:id/availability` (AC: #1)
- [x] UI dashboard mentor pour gérer les créneaux (toggle dispo, timezone, ajout/suppression slots) (AC: #1)
- [x] Détection de chevauchement de créneaux (overlap) + validation startTime < endTime (AC: #1)
- [x] Tests API (10 backend) + UI (5 frontend) + validations (timezone, overlapping slots) (AC: #1)

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

- `GET /mentors/me/availability` -> `{ data: { isAvailable, timezone, slots }, error: null }`
- `POST /mentors/me/availability` -> `{ data: { slot }, error: null }`
- `PATCH /mentors/me/availability/general` -> `{ data: { isAvailable, timezone }, error: null }`
- `PATCH /mentors/me/availability/:slotId` -> `{ data: { slot }, error: null }`
- `DELETE /mentors/me/availability/:slotId` -> `{ data: { success: true }, error: null }`
- `GET /mentors/:id/availability` (students) -> `{ data: { isAvailable, timezone, slots }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing test failures: `@nestjs/websockets` module resolution in Jest for messaging.gateway.spec.ts and related files (4 suites) — not caused by story 3.4 changes.

### Completion Notes List

- Added `mentor_availability_slots` table to Prisma schema with day_of_week, start_time, end_time, is_recurring, status fields
- Added `timezone` field (default "Europe/Paris") and `slots` relation to existing `mentor_availability` model
- Created `MentorsAvailabilityService` with full CRUD: getMyAvailability, createSlot, updateSlot, deleteSlot, updateGeneralAvailability, getMentorAvailability (student view)
- Overlap detection: checks same-day slot time ranges before create/update
- Auto-creates availability record if missing (findOrCreateAvailability)
- Added 7 endpoints to MentorsController (before :id route to avoid conflicts)
- Student view (`GET /mentors/:id/availability`) returns only published slots
- Created AvailabilityManager frontend component with toggle, timezone selector, add slot form, grouped slots grid with delete
- WCAG 2.1 AA: aria-labelledby, aria-live, aria-label on delete buttons, focus-visible, min-touch-target 44px
- Responsive: single-column layout on mobile
- Backend: 10 tests passing (service CRUD, overlap, validation, RBAC, student view)
- Frontend: 5 tests passing (load, add, delete, empty state, network error)
- Regression: 221 backend tests pass, 51 frontend tests pass, 0 regressions introduced

### File List

- `apps/api/prisma/schema.prisma` (modified: added mentor_availability_slots model + timezone field)
- `apps/api/src/modules/mentors/mentors-availability.service.ts` (new)
- `apps/api/src/modules/mentors/mentors-availability.service.spec.ts` (new)
- `apps/api/src/modules/mentors/mentors.controller.ts` (modified: 7 new endpoints)
- `apps/api/src/modules/mentors/mentors.module.ts` (modified: added MentorsAvailabilityService)
- `apps/web/src/features/mentors/availability/AvailabilityManager.tsx` (new)
- `apps/web/src/features/mentors/availability/AvailabilityManager.module.css` (new)
- `apps/web/src/features/mentors/availability/index.ts` (new)
- `apps/web/src/features/mentors/availability/__tests__/AvailabilityManager.test.tsx` (new)
- `apps/web/src/app/(app)/mentor/availability/page.tsx` (new)
