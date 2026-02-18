# Story 3.5: Réservation d'un rendez-vous

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want réserver un rendez-vous avec un mentor,
so that planifier une session.

## Acceptance Criteria

1. Given un étudiant authentifié When il choisit un créneau disponible Then un RDV est créé et confirmé

## Tasks / Subtasks

- [x] Queuer réservation: table `bookings` avec booking_status enum + validation (AC: #1)
- [x] Endpoint `POST /bookings` (check availability, create RDV, send notifications) + `GET /bookings` + `GET /bookings/:id` + `PATCH /bookings/:id/cancel` (AC: #1)
- [x] UI booking: BookingPanel (sélection créneau + date + confirmation) + MyBookings (liste + annulation) (AC: #1)
- [x] Vérifier conflits (availability vs RDV existants) + blocage self-booking + validation jour/date (AC: #1)
- [x] Tests: API booking (11 backend) + UI flows (9 frontend) (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules scheduling + messaging.
- WebSocket pour confirmation en temps réel.

### API Contracts (booking)

- `POST /bookings` -> `{ data: { booking }, error: null }`
- `GET /bookings` -> `{ data: { bookings }, error: null }`
- `GET /bookings/:id` -> `{ data: { booking }, error: null }`
- `PATCH /bookings/:id/cancel` -> `{ data: { booking }, error: null }`
- Notification flow via NotificationsService (in_app, catégorie rdv)
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

- Pre-existing test failures: `@nestjs/websockets` module resolution in Jest for messaging gateway/controller/service files (4 suites) — not caused by story 3.5 changes.

### Completion Notes List

- Added `booking_status` enum (pending, confirmed, cancelled, completed) and `bookings` table to Prisma schema
- Added relations on `users` (bookings_as_student, bookings_as_mentor) and `mentor_availability_slots` (bookings)
- Created `BookingsService` with full business logic: createBooking, getBooking, listMyBookings, cancelBooking
- Conflict detection: checks for existing non-cancelled booking on same slot+date before creating
- Validation: slot existence + published status, mentor availability, day-of-week match, no self-booking, date not in past
- Automatic notification to both mentor and student on creation and to other participant on cancellation (via NotificationsService, category: rdv)
- Created `BookingsController` with 4 endpoints, all protected by JwtAuthGuard
- Created `BookingsModule` importing PrismaModule + NotificationsModule, registered in AppModule
- Frontend: `BookingPanel` component — shows mentor availability slots, booking form with slot select + date picker + notes
- Frontend: `MyBookings` component — lists all user bookings with status indicators, cancel button for active bookings
- Page routes: `/mentors/:id/book` (booking flow) and `/bookings` (my bookings list)
- WCAG 2.1 AA: aria-labelledby, aria-live, role="alert", role="list/listitem", aria-label on cancel buttons
- Backend: 11 tests passing (create, slot not found, mentor unavailable, self-booking, day mismatch, conflict, cancel, non-participant, already cancelled, list, get access control)
- Frontend: 9 tests passing (BookingPanel: slots display, submit, unavailable, network error, validation; MyBookings: display, cancel, empty, error)
- Regression: 232 backend tests pass, 60 frontend tests pass, 0 regressions introduced

### File List

- `apps/api/prisma/schema.prisma` (modified: added booking_status enum, bookings model, relations on users and mentor_availability_slots)
- `apps/api/src/modules/bookings/bookings.service.ts` (new)
- `apps/api/src/modules/bookings/bookings.controller.ts` (new)
- `apps/api/src/modules/bookings/bookings.module.ts` (new)
- `apps/api/src/modules/bookings/bookings.service.spec.ts` (new)
- `apps/api/src/modules/bookings/index.ts` (new)
- `apps/api/src/app.module.ts` (modified: added BookingsModule)
- `apps/web/src/features/bookings/BookingPanel.tsx` (new)
- `apps/web/src/features/bookings/BookingPanel.module.css` (new)
- `apps/web/src/features/bookings/MyBookings.tsx` (new)
- `apps/web/src/features/bookings/MyBookings.module.css` (new)
- `apps/web/src/features/bookings/index.ts` (new)
- `apps/web/src/features/bookings/__tests__/BookingPanel.test.tsx` (new)
- `apps/web/src/features/bookings/__tests__/MyBookings.test.tsx` (new)
- `apps/web/src/app/(app)/bookings/page.tsx` (new)
- `apps/web/src/app/(app)/mentors/[id]/book/page.tsx` (new)
