# Story 3.1: Messagerie étudiant → mentor

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want contacter un mentor via messagerie,
so that échanger avant un rendez-vous.

## Acceptance Criteria

1. Given un étudiant authentifié When il envoie un message à un mentor Then le message est transmis et visible dans le fil de discussion

## Tasks / Subtasks

- [ ] Créer module messaging (Prisma `messages`, `conversations`, `read_status`) (AC: #1)
- [ ] Implémenter endpoint REST `POST /messages`, `GET /conversations/:id/messages` (AC: #1)
- [ ] Ajouter WebSocket `message.send`, `message.received`, `message.read` (AC: #1)
- [ ] UI chat: conversation list, composer, message bubbles + loading skeletons (AC: #1)
- [ ] Ajouter pagination, historique, choix canal push (AC: #1)
- [ ] Tests API + WebSocket + UI (auth, validations, error handling) (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (étudiant/mentor).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: modules messaging + scheduling.
- WebSocket central pour temps réel.

### API Contracts (messagerie)

- `POST /messages` -> `{ data: { message }, error: null }`
- `GET /conversations/:id/messages?cursor=` -> `{ data: { messages, metadata }, error: null }`
- `GET /conversations` -> `{ data: { conversations }, error: null }`
- WebSocket events: `message.new` (payload message), `message.read` (conversation id), `message.typing`.
- Erreurs partagées: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `messages`: `id`, `conversation_id`, `sender_id`, `receiver_id`, `body`, `metadata`, `created_at`.
- `conversations`: `id`, `mentor_id`, `student_id`, `last_message_at`.
- `read_status`: `conversation_id`, `user_id`, `last_read_message_id`.
- Conventions `snake_case`.

### UX & accessibilité

- Composer accessible (textarea + submit).
- Bubbles alignées (mentor gauche, étudiant droite), avatars + timestamps.
- Focus visible (44px targets) + `aria-live` pour messages entrants.
- Loader accessible (skeleton, `aria-busy`).

### Real-time/notifications

- Utiliser WebSocket pour push instantané des messages.
- Duplications toasts + notifications push (si préférences activées).
- Marquer message comme lu à la lecture (mise à jour `read_status`).

### Testing Requirements

- API: validation payload (body required, max length), auth guard, error responses.
- WebSocket: message dispatch + receipt + reconnection.
- UI: composer, avatar, backlog load, error states.

### Do / Don’t

- Do: conserver l’ordre chronologique (ASC).
- Do: dédupliquer double envoi (client 2x).
- Don’t: afficher messages mentor si pas de conversation autorisée.

### Project Structure Notes

- Web: `apps/web/src/features/messaging`.
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
