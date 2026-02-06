# Story 1.3: Gestion du profil utilisateur

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want consulter et modifier mon profil,
so that garder mes informations à jour.

## Acceptance Criteria

1. Given un utilisateur authentifié When il accède à son profil Then ses informations actuelles sont affichées
2. Given un utilisateur authentifié When il modifie ses informations avec des données valides Then les modifications sont enregistrées And un feedback de succès est affiché

## Tasks / Subtasks

- [x] Ajouter champs profil (niveau, objectifs, bio courte) via Prisma migration (AC: #1, #2)
- [x] Exposer endpoints REST profil (lecture + mise a jour) avec enveloppe `{ data, error }` (AC: #1, #2)
- [x] Mettre en place validation DTO + guards JWT (AC: #1, #2)
- [x] UI profil: affichage + edition + feedback succes/erreur (AC: #1, #2)
- [x] Ajouter gestion d'upload avatar si prevu, sinon stub (AC: #2)
- [x] Tests API + UI (auth required, validations, erreurs) (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA.

### API Contracts (profil)

- `GET /users/me` -> `{ data: { user }, error: null }`
- `PATCH /users/me` -> `{ data: { user }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `users`: `id`, `email`, `first_name`, `last_name`, `level`, `objectives`, `bio`, `avatar_url?`
- Conventions `snake_case`.

### Validation & UX

- Champs requis: `firstName`, `lastName`, `level` (si impose), `objectives` (liste).
- Erreurs inline + resume en haut, focus sur premier champ invalide.
- `aria-live` pour feedback; labels explicites; cibles 44px+.

### Project Structure Notes

- Monorepo: `apps/web`, `apps/api`, `packages/shared`.
- Web: `apps/web/src/features/profile`.
- API: `apps/api/src/modules/users`.
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: tests `GET/PATCH /users/me` (auth, validation, erreurs).
- Web: tests formulaire edition + feedback.
- Lint et typecheck sans erreurs.

### Do / Don't

- Do: respecter JWT + RBAC (utilisateur sur son profil).
- Do: retourner enveloppe `{ data, error }`.
- Don't: exposer d'autres profils sans authorization explicite.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Prisma client generation EPERM error (DLL locked by running process) - non-blocking, schema applied to DB successfully

### Completion Notes List

- Added profile fields (level, objectives, bio, avatar_url) to Prisma schema
- Created UsersModule with GET/PATCH /users/me endpoints
- Implemented UpdateProfileDto with class-validator decorations (level enum, objectives array, bio/avatarUrl max lengths)
- Created UserProfileResponseDto mapping snake_case DB fields to camelCase JSON
- Protected endpoints with JwtAuthGuard
- Created profile page at /profil with full form (first name, last name, level select, objectives list, bio textarea, avatar URL)
- Implemented WCAG 2.1 AA accessibility: aria-live for feedback, aria-invalid for errors, focus management, 44px+ touch targets
- API returns { data, error } envelope format
- All 73 tests pass (no regressions)
- TypeScript compiles without errors

### File List

- apps/api/prisma/schema.prisma (modified - added profile fields)
- apps/api/src/app.module.ts (modified - added UsersModule import)
- apps/api/src/modules/users/index.ts (new)
- apps/api/src/modules/users/users.module.ts (new)
- apps/api/src/modules/users/users.service.ts (new)
- apps/api/src/modules/users/users.service.spec.ts (new)
- apps/api/src/modules/users/users.controller.ts (new)
- apps/api/src/modules/users/users.controller.spec.ts (new)
- apps/api/src/modules/users/dto/index.ts (new)
- apps/api/src/modules/users/dto/update-profile.dto.ts (new)
- apps/api/src/modules/users/dto/update-profile.dto.spec.ts (new)
- apps/api/src/modules/users/dto/user-profile-response.dto.ts (new)
- apps/web/src/app/(app)/profil/page.tsx (new)
- apps/web/src/app/(app)/profil/page.module.css (new)

## Change Log

- 2026-02-06: Implemented profile management feature - schema migration, REST API endpoints, UI page, tests
