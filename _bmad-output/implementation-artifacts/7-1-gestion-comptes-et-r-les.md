# Story 7.1: Gestion comptes et rÃ´les

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want gÃ©rer les comptes et rÃ´les utilisateurs,
so that administrer la plateforme.

## Acceptance Criteria

1. Given un admin authentifiÃ© When il modifie un compte ou un rÃ´le Then les changements sont enregistrÃ©s

## Tasks / Subtasks

- [x] Endpoint admin `GET /users`, `PATCH /users/:id`, `PATCH /users/:id/roles` (AC: #1)
- [x] Ajouter tableau de bord comptes + filtres (status, rÃ´le, sync RGPD) (AC: #1)
- [x] Historiser changements (audit trail) (AC: #1)
- [x] Tests API + audit + UI (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: admin/support/analytics.
- RGPD + audit pour chaque modification.

### API Contracts (comptes)

- `GET /users?role=&status=&cursor=` -> `{ data: { users, metadata }, error: null }`
- `PATCH /users/:id` -> `{ data: { user }, error: null }`
- `PATCH /users/:id/roles` -> `{ data: { user }, error: null }`
- `PATCH /users/:id/status` -> `{ data: { user }, error: null }`
- `POST /users/:id/suppress` -> archive + flag RGPD.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `users`: `id`, `email`, `role`, `status`, `deleted_at`.
- `user_audit_logs`: `user_id`, `admin_id`, `action`, `details`, `created_at`.
- `user_roles`: many-to-many linking.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Table des comptes avec recherche, filtres, pagination.
- Accessible modals pour role/status change.
- `aria-live` for success/failure.
- Buttons size 44px+, focus states.

### Workflow & compliance

- Every change stored in audit, accessible for RGPD review.
- Provide "Suspend user" + "Delete data" flows.
- Notify user on role/status change.

### Testing Requirements

- API: user list, role change, suppression flow.
- UI: filters, modals, audit display.
- Compliance: audit entries created for each action.

### Do / Donâ€™t

- Do: enforce RBAC (admin vs support).
- Do: allow rollback via audit log.
- Donâ€™t: expose passwords or tokens.

- Web: `apps/web/src/features/admin/users`.
- API: `apps/api/src/modules/users`.
- Shared DTOs: `packages/shared/src/schemas`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- npm test -- --runInBand modules/admin modules/users modules/support modules/analytics (apps/api)
- npm test -- src/features/admin/users/__tests__/AdminUsersManager.test.tsx src/features/support/incidents/__tests__/SupportIncidentsBoard.test.tsx src/features/analytics/dashboard/__tests__/AnalyticsDashboard.test.tsx src/features/rgpd/deletion/__tests__/RgpdDeletionManager.test.tsx (apps/web)

### Completion Notes List

- Ajout des endpoints comptes admin sur `/users` : listage filtre, edition profil, roles, status, suppression logique.
- Extension de la couche admin avec statuts comptes (`active|suspended|deleted`), metadonnees RGPD et journal d audit.
- Mise a jour du front `AdminUsersManager` : filtres role/status, actions statut, affichage audit.
- Validation RBAC admin/support sur les operations de gestion de comptes.

### File List

- apps/api/src/modules/admin/admin.service.ts
- apps/api/src/modules/admin/admin.controller.ts
- apps/api/src/modules/admin/admin.service.spec.ts
- apps/api/src/modules/admin/admin.controller.spec.ts
- apps/api/src/modules/users/users.controller.ts
- apps/api/src/modules/users/users.module.ts
- apps/web/src/features/admin/users/AdminUsersManager.tsx
- apps/web/src/features/admin/users/AdminUsersManager.module.css
- apps/web/src/features/admin/users/__tests__/AdminUsersManager.test.tsx

### Change Log

- 2026-02-18: Livraison story 7.1 (gestion comptes/roles + audit + UI admin).
