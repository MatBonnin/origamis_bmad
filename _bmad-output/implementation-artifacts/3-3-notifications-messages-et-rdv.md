# Story 3.3: Notifications messages et RDV

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want recevoir des notifications liées aux messages et rendez-vous,
so that être informé rapidement.

## Acceptance Criteria

1. Given un message reçu ou un RDV mis à jour When l’événement se produit Then une notification est envoyée selon les préférences

## Tasks / Subtasks

- [ ] Créer service notifications (queue, workers, canaux : email/push/in-app) (AC: #1)
- [ ] Déclencher depuis messages/RDV (hooks, events, WebSocket) en respectant préférences canal + catégorie (AC: #1)
- [ ] UI : centre notifications (liste, marquer lu, filtres messages/RDV/system) (AC: #1)
- [ ] Adapter RMQ/Redis fallback + retries pour les canaux distants (AC: #1)
- [ ] Tests end-to-end (message → worker → canal) et UI (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules messaging + scheduling.
- Notification engine central (queue + WebSocket).

### API Contracts (notifications)

- `POST /notifications/send` -> `{ data: { job_id }, error: null }`
- `GET /notifications` -> `{ data: { notifications }, error: null }`
- `PATCH /notifications/:id/read` -> `{ data: { success: true }, error: null }`
- WebSocket `notification.push` pour in-app update.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `notifications`: `id`, `user_id`, `category`, `channel`, `payload`, `sent_at`, `read_at`.
- `notification_events`: `source`, `entity_id`, `triggered_at`, `status`.
- `notifications_queue` (ou Redis) pour retries.
- Utiliser `notification_preferences` (story 1.5) pour filtrer.
- Conventions `snake_case`.

### UX & accesibilité

- Centre notifications: regroupement par message/RDV/system, filtres.
- Indicateurs préférences (enable/disable).
- `aria-live` pour toasts + `mark as read`.
- Skeletons pour chargement.

### Delivery & monitoring

- Respecter préférences (messages, rdv, system).
- Retry automatique + DLQ (ex: 5 retries).
- Logging/audit pour events sensibles.

### Testing Requirements

- End-to-end: message send/RDV update → notification via queue + canal.
- API: list, mark read, error states, filtering.
- UI: notifications center, toasts, offline fallback.

### Do / Don’t

- Do: respecter préférence canal & catégorie.
- Do: loguer les notifications sensibles (RGPD).
- Don’t: spammer si désactivé.

### Project Structure Notes

- Web: `apps/web/src/features/notifications`.
- API: `apps/api/src/modules/notifications`.
- Workers: `apps/api/src/modules/notifications/workers`.
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
