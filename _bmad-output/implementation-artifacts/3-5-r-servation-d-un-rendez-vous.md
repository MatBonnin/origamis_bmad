# Story 3.5: Réservation d’un rendez-vous

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want réserver un rendez-vous avec un mentor,
so that planifier une session.

## Acceptance Criteria

1. Given un étudiant authentifié When il choisit un créneau disponible Then un RDV est créé et confirmé

## Tasks / Subtasks

- [ ] Queuer réservation: `booking_requests` + validation (AC: #1)
- [ ] Endpoint `POST /bookings` (check availability, create RDV, send notifications) (AC: #1)
- [ ] UI booking: calendrier, selects, confirmation, timeslot availability (AC: #1)
- [ ] Vérifier conflits (availability vs RDV) + blocage sur consents/blocked mentors (AC: #1)
- [ ] Tests: API booking, conflict detection, UI flows (AC: #1)

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
- `GET /bookings/:id` -> `{ data: { booking }, error: null }`
- `PATCH /bookings/:id/status` -> `{ data: { status }, error: null }`
- `GET /bookings?user_id=` -> `{ data: { bookings }, error: null }`
- Notification flow (WebSocket `booking.confirmed`, email/push).
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `bookings`: `id`, `student_id`, `mentor_id`, `slot_id`, `status`, `created_at`.
- `booking_requests`: `student_id`, `mentor_id`, `requested_at`, `status`.
- `booking_slots`: pointers to availability slots.
- `booking_status_history`: track status transitions.
- Conventions `snake_case`.

### UX & validation

- Booking UI: calendar + availability overlay, CTA “réserver”.
- Indiquer si mentor a des règles (min notice, max par jour).
- Accessibility: keyboard nav calendar, `aria-live` for errors.
- Feedback (skeleton, spinner, toasts).

### Delivery & integration

- Bloquer slot côté RDV + notifications (story 3-3).
- Emit WebSocket `booking.confirmed` + send to notifications.
- Recompute availability (story 3-4) after booking.

### Testing Requirements

- API: availability check, conflict, RBAC.
- UI: booking path, error states, confirmations.
- Integration: booking -> notifications -> messages.

### Do / Don’t

- Do: confirm booking only si créneau encore valide.
- Do: verrouiller slot en parallèle (optimistic locking).
- Don’t: autoriser multi-booking same slot.

### Project Structure Notes

- Web: `apps/web/src/features/bookings`.
- API: `apps/api/src/modules/bookings`.
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
