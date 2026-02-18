# Story 7.4: Suppression des donnÃ©es personnelles

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want demander la suppression de mes donnÃ©es,
so that exercer mon droit RGPD.

## Acceptance Criteria

- 1. Given un utilisateur authentifiÃ© When il demande la suppression de ses donnÃ©es Then la demande est enregistrÃ©e And un processus de suppression est dÃ©clenchÃ©

## Tasks / Subtasks

- [x] Endpoint `POST /users/:id/request-deletion` -> queues suppressions (AC: #1)
- [x] Workflow `DELETE /users/:id/data` triggered after review + export log (AC: #1)
- [x] UI: gestionnaire RGPD avec formulaire, statut de demande, FAQ (AC: #1)
- [x] Notification client & admin + logging (AC: #1)
- [x] Tests API + UI + audit (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: admin/support/analytics.
- Processus RGPD traÃ§Ã© + audit.

### API Contracts (suppression)

- `POST /users/:id/request-deletion` -> `{ data: { request }, error: null }`
- `PATCH /users/:id/deletion-status` -> `{ data: { status }, error: null }`
- `DELETE /users/:id/data` -> `{ data: { success }, error: null }` (after approval).
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `deletion_requests`: `id`, `user_id`, `requested_at`, `status`, `reviewed_by`.
- `deletion_actions`: `request_id`, `admin_id`, `action`, `details`, `timestamp`.
- `deleted_artifacts`: list of tables cleaned (users, messages, bookings).
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Formulaire suppression avec champs (raison, export) + instructions WCAG.
- Timeline de statut (requested, reviewed, deleted).
- `aria-live` for confirmations, accessible confirmations modals.
- Provide FAQ + help links.

### Workflow & compliance

- Notify user/admin at each status change.
- Allow export of personal data before deletion (per RGPD).
- Keep retention log (who approved, what was deleted).
- Provide undo window until final delete.

### Testing Requirements

- API: request, status updates, delete actions, RBAC.
- UI: flow, exports, reminder notifications.
- Compliance: log entries, retention checks.

### Do / Donâ€™t

- Do: verify identity before deletion request.
- Do: log every delete action for audit.
- Donâ€™t: delete before admin approval.

### Project Structure Notes

- Web: `apps/web/src/features/rgpd/deletion`.
- API: `apps/api/src/modules/rgpd`.
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

- npm test -- --runInBand modules/admin modules/users modules/support modules/analytics (apps/api)
- npm test -- src/features/rgpd/deletion/__tests__/RgpdDeletionManager.test.tsx (apps/web)

### Completion Notes List

- Ajout du workflow RGPD dans `UsersController/UsersService` :
  - `POST /users/:id/request-deletion`
  - `PATCH /users/:id/deletion-status`
  - `DELETE /users/:id/data`
- Ajout des controles RBAC et verification identite pour la demande de suppression.
- Ajout du processus de suppression/anonymisation des donnees principales apres approbation admin.
- Ajout de l UI `RgpdDeletionManager` avec formulaire, statut et action admin de suppression finale.
- Ajout de la page `/rgpd/suppression` et acces depuis le dashboard.

### File List

- apps/api/src/modules/users/users.controller.ts
- apps/api/src/modules/users/users.service.ts
- apps/api/src/modules/users/users.controller.spec.ts
- apps/api/src/modules/users/users.service.spec.ts
- apps/web/src/features/rgpd/deletion/RgpdDeletionManager.tsx
- apps/web/src/features/rgpd/deletion/RgpdDeletionManager.module.css
- apps/web/src/features/rgpd/deletion/index.ts
- apps/web/src/features/rgpd/deletion/__tests__/RgpdDeletionManager.test.tsx
- apps/web/src/app/(app)/rgpd/suppression/page.tsx
- apps/web/src/app/(app)/dashboard/page.tsx
- apps/web/src/app/(app)/dashboard/page.module.css

### Change Log

- 2026-02-18: Livraison story 7.4 (workflow RGPD suppression + UI + tests).
