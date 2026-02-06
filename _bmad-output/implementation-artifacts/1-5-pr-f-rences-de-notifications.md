# Story 1.5: Préférences de notifications

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want configurer mes préférences de notifications,
so that recevoir les alertes que je souhaite.

## Acceptance Criteria

1. Given un utilisateur authentifié When il active/désactive ses préférences Then les préférences sont sauvegardées And elles sont appliquées aux notifications futures

## Tasks / Subtasks

- [x] Ajouter table/champs preferences notifications via Prisma migration (AC: #1)
- [x] Exposer endpoints REST lecture/mise a jour preferences (AC: #1)
- [x] UI preferences (toggles) + feedback success/erreur (AC: #1)
- [x] Integrer application des preferences dans emission notifications (AC: #1)
- [x] Tests API + UI (auth, sauvegarde, application) (AC: #1)

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

- `notification_preferences`: 
  - `user_id`
  - `channel` (`email`, `push`, `in_app`)
  - `category` (`messages`, `rdv`, `system`)
  - `enabled`
- Conventions `snake_case`.

### Validation & UX

- Toggles accesibles par canal + categorie (groupes `messages`, `rdv`, `system`).
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

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References
- `npm test -- --runInBand src/modules/users/users.service.spec.ts src/modules/users/users.controller.spec.ts src/modules/notifications/notifications.service.spec.ts src/modules/auth/auth.service.spec.ts` -> PASS (33 tests)
- `npm run test` (apps/web) -> PASS (2 tests UI)

### Completion Notes List
- Migration Prisma ajoutee pour `notification_preferences` + enums `notification_channel` / `notification_category`.
- Endpoints utilisateurs implementes:
- `GET /users/me/notification-preferences`
- `PATCH /users/me/notification-preferences`
- Initialisation automatique des preferences par defaut a l'inscription (9 combinaisons canal/categorie).
- UI de preferences creee avec toggles accessibles, feedback success/erreur en `aria-live`, et lien depuis dashboard.
- Integration emission: `NotificationsService.emitNotification` respecte les preferences et bloque l'envoi si desactive.
- Tests API et UI ajoutes pour auth, sauvegarde et application des preferences.

### File List
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/202602061230_add_notification_preferences/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.service.spec.ts`
- `apps/api/src/modules/users/dto/notification-preferences.dto.ts`
- `apps/api/src/modules/users/dto/index.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.controller.spec.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/users.service.spec.ts`
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.service.spec.ts`
- `apps/api/src/modules/notifications/index.ts`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.module.css`
- `apps/web/src/app/(app)/preferences-notifications/page.tsx`
- `apps/web/src/features/notifications/preferences/NotificationPreferencesForm.tsx`
- `apps/web/src/features/notifications/preferences/NotificationPreferencesForm.module.css`
- `apps/web/src/features/notifications/preferences/__tests__/NotificationPreferencesForm.test.tsx`

## Change Log
- 2026-02-06: Story 1.5 implementee (migration preferences notifications, endpoints GET/PATCH, UI toggles, integration emission, tests API/UI).
