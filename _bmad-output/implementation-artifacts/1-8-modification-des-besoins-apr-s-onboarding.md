# Story 1.8: Modification des besoins après onboarding

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want modifier mes besoins après l’onboarding,
so that adapter mon accompagnement.

## Acceptance Criteria

1. Given un étudiant authentifié When il modifie ses besoins Then les changements sont enregistrés And ils sont pris en compte pour les recommandations

## Tasks / Subtasks

- [ ] Definir schema besoins utilisateur (AC: #1)
- [ ] Exposer endpoints REST lecture/mise a jour besoins (AC: #1)
- [ ] UI: formulaire besoins (multi-select) + feedback (AC: #1)
- [ ] Declencher recalcul recommandations (event ou flag) (AC: #1)
- [ ] Tests API + UI (auth, validation, mise a jour) (AC: #1)

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

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List
