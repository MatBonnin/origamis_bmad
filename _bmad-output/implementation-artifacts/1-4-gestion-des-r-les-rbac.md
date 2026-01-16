# Story 1.4: Gestion des rôles (RBAC)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want attribuer et gérer les rôles des utilisateurs,
so that contrôler les accès selon les profils.

## Acceptance Criteria

1. Given un admin authentifié When il assigne un rôle (étudiant/mentor/admin/support) Then le rôle est enregistré And les permissions associées prennent effet
2. Given un utilisateur non autorisé When il tente d’accéder à une ressource protégée Then l’accès est refusé avec un message approprié

## Tasks / Subtasks

- [ ] Definir schema roles et relations (roles, user_roles) si non existant (AC: #1)
- [ ] Ajouter guard RBAC + decorator `@Roles(...)` (AC: #2)
- [ ] Exposer endpoints admin pour assignation des roles (AC: #1)
- [ ] UI admin minimale pour changer roles utilisateur (AC: #1)
- [ ] Messages d'erreur standardises (AC: #2)
- [ ] Tests API (assignation, accès interdit), tests UI basiques (AC: #1, #2)

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

### Completion Notes List

### File List
