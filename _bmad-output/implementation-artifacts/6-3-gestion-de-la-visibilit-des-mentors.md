# Story 6.3: Gestion de la visibilitÃ© des mentors

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want gÃ©rer la visibilitÃ© des mentors,
so that ajuster lâ€™affichage selon la qualitÃ©.

## Acceptance Criteria

1. Given un admin authentifiÃ© When il modifie la visibilitÃ© dâ€™un mentor Then la visibilitÃ© est appliquÃ©e dans la recherche

- [x] Endpoint `PATCH /mentors/:id/visibility` + `GET /mentors/visibility` (AC: #1)
- [x] Ajouter rÃ¨gles de visibilitÃ© (pinned, hidden, experimental) (AC: #1)
- [x] UI admin pour gÃ©rer, prÃ©visualiser, planifier mise Ã  jour (AC: #1)
- [x] Synchro avec recherche (story 2-2) et recommandations (story 2-1) (AC: #1)
- [x] Tests API + UI + propagation (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: reviews + admin.
- VisibilitÃ© influence search/recommendations.

- `PATCH /mentors/:id/visibility` -> `{ data: { mentor }, error: null }`
- `GET /mentors/visibility` -> `{ data: { visibility_rules }, error: null }`
- `GET /mentors/:id` include visibility flag.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_visibility`: `mentor_id`, `status` (`visible`, `hidden`, `priority`, `experimental`), `effective_from`, `notes`.
- Logs `mentor_visibility_history`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Admin table with toggles, preview, scheduling (activate future status).
- ARIA accessible toggle + confirmation.
- Indicate if mentor is pinned or hidden.

### Integration & delivery

- Push updates to search/recommendation indexes.
- Trigger notification to mentors when hidden/visible status changes.
- Respect RBAC.

### Testing Requirements

- API: status transitions, scheduling.
- UI: toggles, previsualisation, confirmation modals.
- Integration: search/recommendation contexts.

### Do / Donâ€™t

- Do: log qui change la visibilitÃ©.
- Do: permettre rollback (undo).
- Donâ€™t: enlever visibilitÃ© sans notif.

### Project Structure Notes

- Web: `apps/web/src/features/admin/visibility`.
- API: `apps/api/src/modules/visibility`.
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

- npm test -- modules/mentors (apps/api)
- npm test -- src/features/admin/visibility/__tests__/MentorVisibilityBoard.test.tsx (apps/web)

### Completion Notes List

- Ajout des endpoints admin de visibilite (PATCH /mentors/:id/visibility, GET /mentors/visibility).
- Ajout des regles visible|hidden|priority|experimental avec controle de validation mentor et RBAC.
- Synchronisation de la recherche mentors pour exclure les mentors hidden/non validates via service admin.
- Ajout de l UI admin de gestion de visibilite (edition du statut, date effective, notes).
- Ajout des modeles Prisma et migration pour mentor_visibility et mentor_visibility_history.

### File List

- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/202602181200_epic6_mentors_reviews_validation_visibility/migration.sql
- apps/api/src/modules/mentors/mentors-admin.service.ts
- apps/api/src/modules/mentors/mentors-search.service.ts
- apps/api/src/modules/mentors/mentors-search.service.spec.ts
- apps/api/src/modules/mentors/mentors.controller.ts
- apps/web/src/features/admin/visibility/MentorVisibilityBoard.tsx
- apps/web/src/features/admin/visibility/MentorVisibilityBoard.module.css
- apps/web/src/features/admin/visibility/index.ts
- apps/web/src/features/admin/visibility/__tests__/MentorVisibilityBoard.test.tsx
- apps/web/src/app/(app)/admin/mentors/visibilite/page.tsx
- apps/web/src/app/(app)/dashboard/page.tsx
- apps/web/src/app/(app)/dashboard/page.module.css

### Change Log

- 2026-02-18: Implementation complete de la gestion de visibilite mentors (API + recherche + UI + tests).
