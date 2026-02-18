# Story 3.7: Acces session visio

Status: review

## Story

As a utilisateur,
I want acceder a une session visio (ou lien externe),
so that realiser la session prevue.

## Acceptance Criteria

1. Given un RDV confirme When l'utilisateur accede au RDV Then un lien visio securise est disponible

## Tasks / Subtasks

- [x] Generer lien securise (token + expiration) via service visio interne (AC: #1)
- [x] Endpoint `GET /bookings/:id/session-link` (AC: #1)
- [x] UI RDV: bouton "Rejoindre visio" + fallback erreur (AC: #1)
- [x] Gerer fuseaux horaires (formatage fr-FR cote frontend) (AC: #1)
- [x] Tests : generation lien, permissions, fallback, UX (AC: #1)

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

- Added `booking_sessions` Prisma model (booking_id unique, session_token unique, session_url, expires_at)
- Added `getSessionLink` method to BookingsService: validates participant + confirmed status, returns existing valid session or generates new one with UUID token, expires 30 min after booking end time
- Regenerates expired session links automatically (update instead of create)
- Added `GET /bookings/:id/session-link` endpoint to BookingsController
- Added "Rejoindre visio" button in MyBookings.tsx for confirmed bookings only
- Button opens session URL in new tab with noopener/noreferrer security
- Loading state on button during fetch, error message on failure
- Backend: 6 new tests (generate link, return existing, regenerate expired, non-participant, non-confirmed, cancelled) — 243 total
- Frontend: 4 new tests (button shown for confirmed, hidden for pending, fetch+open session, error handling) — 66 total
- 0 regressions on full suite

### File List

- `apps/api/prisma/schema.prisma` (modified: added booking_sessions model + relation on bookings)
- `apps/api/src/modules/bookings/bookings.service.ts` (modified: added getSessionLink method, import randomUUID)
- `apps/api/src/modules/bookings/bookings.controller.ts` (modified: added GET :id/session-link endpoint)
- `apps/api/src/modules/bookings/bookings.service.spec.ts` (modified: 6 new getSessionLink tests, booking_sessions mock)
- `apps/web/src/features/bookings/MyBookings.tsx` (modified: added Rejoindre visio button + joinSession handler)
- `apps/web/src/features/bookings/__tests__/MyBookings.test.tsx` (modified: 4 new session link tests)
