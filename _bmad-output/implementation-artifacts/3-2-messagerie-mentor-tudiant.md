# Story 3.2: Messagerie mentor → étudiant

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want répondre aux messages des étudiants,
so that coordonner les échanges.

## Acceptance Criteria

1. Given un mentor authentifié When il répond dans une conversation Then le message est visible côté étudiant

## Tasks / Subtasks

- [ ] Réutiliser le module messaging (messages, conversations, read_status) pour mentors (AC: #1)
- [ ] Soumettre endpoint `POST /messages` avec RBAC mentor/étudiant + validation (AC: #1)
- [ ] Ajouter WebSocket `message.sent`, `message.typing`, `message.read` (AC: #1)
- [ ] Créer UI mentor: liste étudiants, composer, pièces jointes, statuts (AC: #1)
- [ ] Tests API + WebSocket + UI (RBAC, offline, erreurs) (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (mentor role required).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: modules messaging + scheduling.
- WebSocket pour push temps réel.

### API Contracts (messagerie mentor)

- `POST /messages` -> `{ data: { message }, error: null }` (mentor) with conversation_id.
- `GET /conversations/:id/messages` -> `{ data: { messages, metadata }, error: null }`.
- WebSocket events: `message.sent`, `message.typing`, `message.read`.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `messages`, `conversations`, `read_status` (voir story 3.1).
- Spécifier `sender_role` dans `read_status` pour analytics.
- Conventions `snake_case`.

### UX & accessibilité

- Mentor UI: student list (badge unread), composer accessible (textarea + attach).
- Bubbles alignées, focus visible, `aria-live`.
- Statut mentor (online/away) affiché.
- Loader + skeleton accessible (`aria-busy`).

### Real-time collaboration

- WebSocket pour envoyer, recevoir, typing, ack.
- Notifications push (si préférence active) + toasts (aria-live).
- Support offline (queue, retry).

### Testing Requirements

- API: RBAC, validation length, conversation permission.
- WebSocket: typing + ack + reconnect.
- UI: composer, attachments, error states.

### Do / Don’t

- Do: respecter RBAC (mentor only).
- Do: mentionner si étudiant offline ou indisponible.
- Don’t: afficher conversations hors scope.

### Project Structure Notes

- Web: `apps/web/src/features/messaging/mentor`.
- API: `apps/api/src/modules/messaging`.
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
