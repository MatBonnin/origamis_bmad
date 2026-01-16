# Story 6.3: Gestion de la visibilité des mentors

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want gérer la visibilité des mentors,
so that ajuster l’affichage selon la qualité.

## Acceptance Criteria

1. Given un admin authentifié When il modifie la visibilité d’un mentor Then la visibilité est appliquée dans la recherche

- [ ] Endpoint `PATCH /mentors/:id/visibility` + `GET /mentors/visibility` (AC: #1)
- [ ] Ajouter règles de visibilité (pinned, hidden, experimental) (AC: #1)
- [ ] UI admin pour gérer, prévisualiser, planifier mise à jour (AC: #1)
- [ ] Synchro avec recherche (story 2-2) et recommandations (story 2-1) (AC: #1)
- [ ] Tests API + UI + propagation (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: reviews + admin.
- Visibilité influence search/recommendations.

- `PATCH /mentors/:id/visibility` -> `{ data: { mentor }, error: null }`
- `GET /mentors/visibility` -> `{ data: { visibility_rules }, error: null }`
- `GET /mentors/:id` include visibility flag.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_visibility`: `mentor_id`, `status` (`visible`, `hidden`, `priority`, `experimental`), `effective_from`, `notes`.
- Logs `mentor_visibility_history`.
- Conventions `snake_case`.

### UX & accessibilité

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

### Do / Don’t

- Do: log qui change la visibilité.
- Do: permettre rollback (undo).
- Don’t: enlever visibilité sans notif.

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

### Completion Notes List

### File List
