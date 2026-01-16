# Story 3.6: Annulation et report de rendez-vous

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want annuler ou reporter un rendez-vous,
so that ajuster mon planning.

## Acceptance Criteria

1. Given un RDV existant When l’utilisateur annule ou reporte Then le RDV est mis à jour And l’autre partie est notifiée

## Tasks / Subtasks

- [ ] Endpoint `PATCH /bookings/:id/status` (status: canceled/rescheduled) (AC: #1)
- [ ] Gestion des règles de cancel (préavis, pénalité, rebooking automatique) (AC: #1)
- [ ] UI: centre RDV (annuler/report) + confirmations + toasts (AC: #1)
- [ ] Synchroniser notifications & réouverture créneau (AC: #1)
- [ ] Tests: API status change, notifications, UI dialogues (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules bookings + messaging.
- WebSocket + notifications pour updates.

### API Contracts (annulation/report)

- `PATCH /bookings/:id/status` -> `{ data: { booking }, error: null }`
- Accept statuses: `canceled`, `rescheduled`, `pending-reschedule`.
- `POST /bookings/:id/reschedule` -> `{ data: { slot }, error: null }`
- WebSocket `booking.updated`, cancellations send to notifications.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `booking_status_history`: `booking_id`, `status`, `changed_by`, `reason`, `timestamp`.
- `booking_cancellations`: `booking_id`, `cancelled_at`, `reason`, `penalty_flag`.
- `availability` re-opened (slot unlock).
- Conventions `snake_case`.

### UX & accessibilité

- Dialog d'annulation + confirmations (ARIA modal).
- Indiquer règles (préavis, frais) + lien politique.
- Notification accessible (aria-live) pour update status.
- Buttons focus states, `aria-describedby` for reasoning.

### Integration & delivery

- Envoi notification (story 3-3) et message (story3-1/3-2).
- Recalculation availability (story 3-4) + release slot (if allowed).
- Analyser penalty & metrics (audit).

### Testing Requirements

- API: status transitions, penalty flags, RBAC.
- UI: dialogs, warning, rebooking flows.
- Integration: cancellation -> notifications & slot release.

### Do / Don’t

- Do: requérir justification si policy assigne (ex: preavis < 4h).
- Do: loguer les changements (audit).
- Don’t: accepter annulation hors fenêtre (policy).

### Project Structure Notes

- Web: `apps/web/src/features/bookings/management`.
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
