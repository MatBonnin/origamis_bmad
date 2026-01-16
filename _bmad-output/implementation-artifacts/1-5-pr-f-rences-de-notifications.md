# Story 1.5: Préférences de notifications

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want configurer mes préférences de notifications,
so that recevoir les alertes que je souhaite.

## Acceptance Criteria

1. Given un utilisateur authentifié When il active/désactive ses préférences Then les préférences sont sauvegardées And elles sont appliquées aux notifications futures

## Tasks / Subtasks

- [ ] Ajouter table/champs preferences notifications via Prisma migration (AC: #1)
- [ ] Exposer endpoints REST lecture/mise a jour preferences (AC: #1)
- [ ] UI preferences (toggles) + feedback success/erreur (AC: #1)
- [ ] Integrer application des preferences dans emission notifications (AC: #1)
- [ ] Tests API + UI (auth, sauvegarde, application) (AC: #1)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON.
- UX: responsive + WCAG 2.1 AA.

### API Contracts (preferences)

- `GET /users/me/notification-preferences` -> `{ data: { preferences }, error: null }`
- `PATCH /users/me/notification-preferences` -> `{ data: { preferences }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `notification_preferences`: `user_id`, `email_enabled`, `push_enabled`, `in_app_enabled`.
- Conventions `snake_case`.

### Validation & UX

- Toggles accesibles (label + role switch).
- Feedback success/erreur, `aria-live`.

### Application

- Les envois futurs doivent respecter les preferences (pas d'envoi si desactive).

### Project Structure Notes

- Web: `apps/web/src/features/notifications/preferences`.
- API: `apps/api/src/modules/notifications` ou `modules/users`.
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: tests GET/PATCH, auth required.
- Integration: une notification n'est pas envoyee si preference desactivee.

### Do / Don't

- Do: charger les preferences par defaut a l'inscription.
- Don't: envoyer des notifications ignorees par user.

### Project Structure Notes

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
- Feature-first dans `apps/api/src/modules` et `apps/web/src/features`
- Conventions: snake_case DB, camelCase JSON, endpoints pluriel

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
