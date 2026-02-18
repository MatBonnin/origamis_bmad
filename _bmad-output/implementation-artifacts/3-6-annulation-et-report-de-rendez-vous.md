# Story 3.6: Annulation et report de rendez-vous

Status: review

## Story

As a utilisateur,
I want annuler ou reporter un rendez-vous,
so that ajuster mon planning.

## Acceptance Criteria

1. Given un RDV existant When l'utilisateur annule ou reporte Then le RDV est mis à jour And l'autre partie est notifiée

## Tasks / Subtasks

- [x] Endpoint `PATCH /bookings/:id/cancel` avec politique de préavis 4h (AC: #1)
- [x] Endpoint `POST /bookings/:id/reschedule` avec validation créneau/date (AC: #1)
- [x] Gestion des règles de cancel (préavis 4h minimum, vérification participant) (AC: #1)
- [x] UI: dialogs annulation et report avec confirmations + messages succès/erreur (AC: #1)
- [x] Synchroniser notifications à l'autre participant (AC: #1)
- [x] Tests: API cancel/reschedule/notice policy, UI dialogues (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Added `rescheduleBooking` method to BookingsService with full validation (participant check, status check, notice policy, slot validity, conflict detection)
- Added `checkNoticePolicy` private method enforcing 4h minimum notice for cancel and reschedule
- Added notice policy check to existing `cancelBooking` method
- Added `POST :id/reschedule` endpoint to BookingsController
- Rewrote MyBookings.tsx with cancel dialog (reason input, confirmation) and reschedule dialog (slot select, date picker, reason)
- Added overlay/dialog CSS with aria-modal accessibility
- Backend: 16/16 tests (237 total, 0 regressions)
- Frontend: 6/6 tests (62 total, 0 regressions)
- 4 pre-existing backend test failures (`@nestjs/websockets` module resolution) — unrelated

### File List

- `apps/api/src/modules/bookings/bookings.service.ts` (modified: rescheduleBooking, checkNoticePolicy, RescheduleBookingDto)
- `apps/api/src/modules/bookings/bookings.controller.ts` (modified: POST :id/reschedule endpoint)
- `apps/api/src/modules/bookings/bookings.service.spec.ts` (modified: 16 tests — reschedule + notice policy tests)
- `apps/web/src/features/bookings/MyBookings.tsx` (modified: cancel/reschedule dialogs)
- `apps/web/src/features/bookings/MyBookings.module.css` (modified: dialog styles)
- `apps/web/src/features/bookings/__tests__/MyBookings.test.tsx` (modified: 6 tests — cancel/reschedule dialog tests)
