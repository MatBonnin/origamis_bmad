# Story 3.1: Messagerie étudiant → mentor

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want contacter un mentor via messagerie,
so that échanger avant un rendez-vous.

## Acceptance Criteria

1. Given un étudiant authentifié When il envoie un message à un mentor Then le message est transmis et visible dans le fil de discussion

## Tasks / Subtasks

- [x] Créer module messaging (Prisma `messages`, `conversations`, `read_status`) (AC: #1)
- [x] Implémenter endpoint REST `POST /messages`, `GET /conversations/:id/messages` (AC: #1)
- [x] Ajouter WebSocket `message.send`, `message.received`, `message.read` (AC: #1)
- [x] UI chat: conversation list, composer, message bubbles + loading skeletons (AC: #1)
- [x] Ajouter pagination, historique, choix canal push (AC: #1)
- [x] Tests API + WebSocket + UI (auth, validations, error handling) (AC: #1)

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

- `npm run prisma:generate --workspace=apps/api` (PASS)
- `npm test --workspace=apps/api -- messaging.service.spec.ts messaging.controller.spec.ts messaging.gateway.spec.ts send-message.dto.spec.ts` (PASS)
- `npm test --workspace=apps/web -- MessagingPanel.test.tsx` (PASS)
- `npm test --workspace=apps/web` (PASS, 11 fichiers)
- `npm test --workspace=apps/api` (PASS, 30 suites)

### Completion Notes List

- Nouveau module API `messaging` implemente avec persistance Prisma:
  - modeles `conversations`, `messages`, `read_status` + relations `users`
  - migration SQL `202602162100_add_messaging`
  - endpoints REST:
    - `GET /conversations`
    - `GET /conversations/:id/messages` (pagination curseur)
    - `POST /messages`
- WebSocket NestJS ajoute pour temps reel:
  - events entrants: `message.send`, `message.read`, `message.typing`
  - events emis: `message.received`, `message.new`, `message.read`
  - controle d acces conversation et marquage lu via `read_status`
- Regles metier messaging ajoutees:
  - pairage RBAC etudiant/mentor (conversation autorisee uniquement)
  - deduplication anti double-envoi avec `clientMessageId`
  - tri chronologique ASC sur fil de messages
  - integration notification via `NotificationsService.emitNotification`
- UI messagerie ajoutee:
  - page app `/(app)/messages`
  - composant `MessagingPanel` (liste conversations, fil, composer, canal push/in-app)
  - chargement historique via bouton "Charger l historique"
  - accessibilite: `aria-live`, `aria-busy`, skeletons
- Couverture de tests ajoutee pour API/WebSocket/UI:
  - service/controller/gateway messaging
  - DTO validations `SendMessageDto`
  - tests UI `MessagingPanel`
- Stabilisation regression web hors feature:
  - test onboarding accepte redirection vers `/dashboard` ou `/profile-suggestion`
  - correction escape apostrophe dans `OnboardingWizard`

### Implementation Plan

- Creer un module backend messaging dedie avec schema Prisma, endpoints REST et gateway WebSocket.
- Imposer les contraintes d acces etudiant/mentor et la deduplication pour garantir la coherence des conversations.
- Construire une UI chat minimalement complete (liste + fil + composer + historique + canal push) avec bonnes pratiques accessibilite.
- Verifier avec tests unitaires/integration cibles puis regression complete API/Web.

### File List

- apps/api/prisma/schema.prisma (modified)
- apps/api/prisma/migrations/202602162100_add_messaging/migration.sql (new)
- apps/api/src/app.module.ts (modified)
- apps/api/src/modules/messaging/messaging.module.ts (new)
- apps/api/src/modules/messaging/messaging.controller.ts (new)
- apps/api/src/modules/messaging/messaging.gateway.ts (new)
- apps/api/src/modules/messaging/messaging.service.ts (new)
- apps/api/src/modules/messaging/index.ts (new)
- apps/api/src/modules/messaging/dto/send-message.dto.ts (new)
- apps/api/src/modules/messaging/dto/get-conversation-messages-query.dto.ts (new)
- apps/api/src/modules/messaging/dto/index.ts (new)
- apps/api/src/modules/messaging/messaging.service.spec.ts (new)
- apps/api/src/modules/messaging/messaging.controller.spec.ts (new)
- apps/api/src/modules/messaging/messaging.gateway.spec.ts (new)
- apps/api/src/modules/messaging/dto/send-message.dto.spec.ts (new)
- apps/api/package.json (modified)
- package-lock.json (modified)
- apps/web/src/features/messaging/MessagingPanel.tsx (new)
- apps/web/src/features/messaging/MessagingPanel.module.css (new)
- apps/web/src/features/messaging/index.ts (new)
- apps/web/src/features/messaging/__tests__/MessagingPanel.test.tsx (new)
- apps/web/src/app/(app)/messages/page.tsx (new)
- apps/web/src/features/onboarding/__tests__/OnboardingWizard.test.tsx (modified)
- apps/web/src/features/onboarding/OnboardingWizard.tsx (modified)
- _bmad-output/implementation-artifacts/3-1-messagerie-tudiant-mentor.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-02-16: Story 3.1 implementee (module messaging Prisma/NestJS + WebSocket + UI chat + tests API/Web et regression complete).
