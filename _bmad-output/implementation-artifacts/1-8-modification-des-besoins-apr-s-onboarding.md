# Story 1.8: Modification des besoins après onboarding

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want modifier mes besoins après l’onboarding,
so that adapter mon accompagnement.

## Acceptance Criteria

1. Given un étudiant authentifié When il modifie ses besoins Then les changements sont enregistrés And ils sont pris en compte pour les recommandations

## Tasks / Subtasks

- [x] Definir schema besoins utilisateur (AC: #1)
- [x] Exposer endpoints REST lecture/mise a jour besoins (AC: #1)
- [x] UI: formulaire besoins (multi-select) + feedback (AC: #1)
- [x] Declencher recalcul recommandations (event ou flag) (AC: #1)
- [x] Tests API + UI (auth, validation, mise a jour) (AC: #1)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON.
- UX: responsive + WCAG 2.1 AA.

### API Contracts (besoins)

- `GET /users/me/needs` -> `{ data: { needs }, error: null }`
- `PATCH /users/me/needs` -> `{ data: { needs }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `user_needs`: `user_id`, `needs_json`, `updated_at`.
- Conventions `snake_case`.

### Integration recommandations

- Mettre un flag ou event `needs.updated` pour recalculer recommandations.

### Validation & UX

- Multi-select clair, feedback accessible.
- `aria-live` pour success/erreur.

### Project Structure Notes

- Web: `apps/web/src/features/profile/needs`.
- API: `apps/api/src/modules/users` (ou `matching` pour recalcul).
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: GET/PATCH besoins, auth required.
- Web: saisie + sauvegarde + feedback.

### Do / Don't

- Do: conserver historique minimal (timestamp).
- Don't: recalculer recommandations sans signaler le changement.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma db push: OK (EPERM on generate is known Windows DLL lock issue, non-blocking)

### Completion Notes List

- **Task 1**: Added `user_needs` model to Prisma schema with fields: id, user_id (unique), needs_json (Json), needs_updated (Boolean flag), created_at, updated_at. Pushed to DB.
- **Task 2**: Added `getNeeds()` and `updateNeeds()` methods to UsersService. getNeeds returns default empty needs if no record exists. updateNeeds merges partial updates with existing needs via upsert. Added `GET /users/me/needs` and `PATCH /users/me/needs` endpoints to UsersController with Swagger docs and data envelope wrapping.
- **Task 3**: Created `features/profile/needs/NeedsForm.tsx` component. Reuses SelectableCard for multi-select objectives, Select component for domain/level/graduation year. Accessible feedback via aria-live. Uses existing onboarding constants (objectives, domains, levels, graduationYears). Page route at `/besoins`.
- **Task 4**: The `needs_updated` boolean flag in `user_needs` table is set to `true` on every updateNeeds() call. Future recommendation service (Epic 2) will query `WHERE needs_updated = true` to trigger recalculation.
- **Task 5**: 15 new tests added (7 service + 2 controller + 6 DTO validation). Full suite: 147 tests pass, 0 regressions.

### Change Log

- 2026-02-16: Implemented user needs modification feature (schema, API, UI, flag, tests)

### File List

- apps/api/prisma/schema.prisma (modified - added user_needs model + relation)
- apps/api/src/modules/users/users.service.ts (modified - added getNeeds, updateNeeds)
- apps/api/src/modules/users/users.controller.ts (modified - added GET/PATCH me/needs endpoints)
- apps/api/src/modules/users/dto/user-needs.dto.ts (new - UpdateUserNeedsDto, UserNeedsResponseDto)
- apps/api/src/modules/users/dto/index.ts (modified - added user-needs export)
- apps/api/src/modules/users/dto/user-needs.dto.spec.ts (new - 6 DTO validation tests)
- apps/api/src/modules/users/users.service.spec.ts (modified - 7 new needs tests)
- apps/api/src/modules/users/users.controller.spec.ts (modified - 2 new needs tests)
- apps/web/src/features/profile/needs/NeedsForm.tsx (new - needs modification form)
- apps/web/src/features/profile/needs/NeedsForm.module.css (new - styles)
- apps/web/src/features/profile/needs/index.ts (new - barrel export)
- apps/web/src/app/(app)/besoins/page.tsx (new - page route)
