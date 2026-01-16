# Story 7.1: Gestion comptes et rôles

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want gérer les comptes et rôles utilisateurs,
so that administrer la plateforme.

## Acceptance Criteria

1. Given un admin authentifié When il modifie un compte ou un rôle Then les changements sont enregistrés

## Tasks / Subtasks

- [ ] Endpoint admin `GET /users`, `PATCH /users/:id`, `PATCH /users/:id/roles` (AC: #1)
- [ ] Ajouter tableau de bord comptes + filtres (status, rôle, sync RGPD) (AC: #1)
- [ ] Historiser changements (audit trail) (AC: #1)
- [ ] Tests API + audit + UI (AC: #1)

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

### UX & accessibilité

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

### Do / Don’t

- Do: enforce RBAC (admin vs support).
- Do: allow rollback via audit log.
- Don’t: expose passwords or tokens.

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

### Completion Notes List

### File List
