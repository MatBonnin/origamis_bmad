# Story 1.4: Gestion des rôles (RBAC)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want attribuer et gérer les rôles des utilisateurs,
so that contrôler les accès selon les profils.

## Acceptance Criteria

1. Given un admin authentifié When il assigne un rôle (étudiant/mentor/admin/support) Then le rôle est enregistré And les permissions associées prennent effet
2. Given un utilisateur non autorisé When il tente d’accéder à une ressource protégée Then l’accès est refusé avec un message approprié

## Tasks / Subtasks

- [x] Definir schema roles et relations (roles, user_roles) si non existant (AC: #1)
- [x] Ajouter guard RBAC + decorator `@Roles(...)` (AC: #2)
- [x] Exposer endpoints admin pour assignation des roles (AC: #1)
- [x] UI admin minimale pour changer roles utilisateur (AC: #1)
- [x] Messages d'erreur standardises (AC: #2)
- [x] Tests API (assignation, accès interdit), tests UI basiques (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON, endpoints pluriel.

### Roles & Acces

- Roles: `etudiant`, `mentor`, `admin`, `support`.
- Toutes les routes protegees doivent verifier JWT + RBAC.
- Message d'erreur: `{ error: { code: "FORBIDDEN", message } }`.

### API Contracts (admin roles)

- `GET /admin/users` -> `{ data: { users }, error: null }`
- `PATCH /admin/users/:id/roles` -> `{ data: { user }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Project Structure Notes

- Web: `apps/web/src/features/admin/users` (table + role picker).
- API: `apps/api/src/modules/admin` + `modules/auth` (guards/decorators).
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: tests RBAC (admin ok, non admin refuse).
- API: tests assignation roles et validation.
- Web: tests UI (role change + feedback).

### Do / Don't

- Do: proteger endpoints admin avec guard RBAC.
- Do: journaliser action sensible (assignation role).
- Don't: permettre auto-promotion a admin sans garde-fou.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References
- `npm test -- --runInBand src/modules/admin/admin.service.spec.ts src/modules/admin/admin.controller.spec.ts src/modules/admin/dto/update-user-roles.dto.spec.ts src/common/guards/roles.guard.spec.ts` -> PASS (12 tests)
- `npm test -- --runInBand` -> echec non bloquant sur suite existante `password-reset.schema.spec.ts` (Prisma Query Engine cross-platform windows/linux)
- `npm run lint` (api/web) -> non bloquant, environnement ESLint incomplet localement
- `npm run test` (apps/web) -> PASS (vitest, test UI basique role change + feedback)

### Completion Notes List
- Schema RBAC deja present (`roles`, `user_roles`) verifie et reutilise.
- Module admin ajoute avec endpoints proteges:
- `GET /admin/users`
- `PATCH /admin/users/:id/roles`
- Garde-fou ajoute: un admin ne peut pas modifier ses propres roles.
- Journalisation de securite ajoutee sur assignation de roles.
- `RolesGuard` renvoie des erreurs standardisees `FORBIDDEN` avec message explicite.
- UI admin minimale ajoutee (liste utilisateurs + checkboxes de roles + sauvegarde via API).
- Tests UI basiques ajoutes pour verifier le changement de role et le feedback de succes.

### File List
- `apps/api/src/app.module.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/guards/roles.guard.spec.ts`
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.controller.spec.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `apps/api/src/modules/admin/dto/update-user-roles.dto.ts`
- `apps/api/src/modules/admin/dto/update-user-roles.dto.spec.ts`
- `apps/api/src/modules/admin/dto/index.ts`
- `apps/api/src/modules/admin/index.ts`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.module.css`
- `apps/web/src/app/(app)/admin/utilisateurs/page.tsx`
- `apps/web/src/features/admin/users/AdminUsersManager.tsx`
- `apps/web/src/features/admin/users/AdminUsersManager.module.css`
- `apps/web/src/features/admin/users/__tests__/AdminUsersManager.test.tsx`
- `apps/web/src/test/setup.ts`
- `apps/web/vitest.config.ts`
- `apps/web/package.json`
- `package-lock.json`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
- 2026-02-06: Implementation RBAC admin terminee, endpoints et UI admin minimaux livres, erreurs FORBIDDEN standardisees, tests API RBAC et tests UI basiques ajoutes.
