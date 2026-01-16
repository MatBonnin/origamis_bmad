# Story 3.7: Accès session visio

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want accéder à une session visio (ou lien externe),
so that réaliser la session prévue.

## Acceptance Criteria

1. Given un RDV confirmé When l’utilisateur accède au RDV Then un lien visio sécurisé est disponible

## Tasks / Subtasks

- [ ] Générer lien sécurisé (token + expiration) via service visio interne ou provider (AC: #1)
- [ ] Endpoint `GET /bookings/:id/session-link` + WebSocket `booking.session.ready` (AC: #1)
- [ ] UI RDV: boutons “Rejoindre visio”, instructions + fallback lien externe (AC: #1)
- [ ] Gérer décalages horaires (UTC -> utilisateur, mentor) (AC: #1)
- [ ] Tests : génération lien, permissions, fallback, UX (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules scheduling + messaging.
- WebSocket pour notifications RDV.

### API Contracts (session visio)

- `GET /bookings/:id/session-link` -> `{ data: { url, expires_at }, error: null }`
- `POST /bookings/:id/session-link/regenerate` (admin/mentor) -> new URL.
- WebSocket `booking.session.ready` pour notifier.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `sessions`: `booking_id`, `url`, `token`, `expires_at`.
- `session_access_logs`: `user_id`, `booking_id`, `accessed_at`, `result`.
- `availability`: indicates timezone for display.
- Conventions `snake_case`.

### UX & accessibilité

- Bouton “Rejoindre visio” (primary, accessible).
- Afficher timezone convertie + countdown.
- Fallback texte + bouton “Obtenir lien manuel”.
- `aria-live` for connection status.

### Security & delivery

- Tokens short-lived (ex: 10 min), tied to booking.
- Validate user is participant before returning URL.
- Support fallback to external provider link + instructions.
- Log access for audit.

### Testing Requirements

- API: access control, token expiry, regenerate.
- WebSocket: notifications for link ready.
- UI: join button, fallback, error states.

### Do / Don’t

- Do: stocker l’URL chiffrée (si provider).
- Do: invalider lien après expiration.
- Don’t: exposer lien si booking non confirmé.

### Project Structure Notes

- Web: `apps/web/src/features/bookings/session`.
- API: `apps/api/src/modules/bookings/session`.
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
