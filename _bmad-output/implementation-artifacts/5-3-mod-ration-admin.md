# Story 5.3: Modération admin

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want modérer les contenus signalés,
so that maintenir un espace sûr.

## Acceptance Criteria

1. Given un admin authentifié When il traite un signalement Then il peut masquer/supprimer le contenu ou lever le signalement

## Tasks / Subtasks

- [ ] Endpoint admin `GET /reports/pending`, `PATCH /reports/:id/status`, `POST /reports/:id/actions` (AC: #1)
- [ ] Action workflow (hide content, restore, warn user, escalate) (AC: #1)
- [ ] UI admin dashboard (liste rapports, filtre, preview, action buttons) (AC: #1)
- [ ] Log & audit actions (who, when, reason) (AC: #1)
- [ ] Tests API + UI + audit trail + RBAC (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: community + moderation.
- Audit & compliance obligations (RGPD).

### API Contracts (modération)

- `GET /reports/pending` -> `{ data: { reports }, error: null }`
- `PATCH /reports/:id/status` -> `{ data: { report }, error: null }`
- `POST /reports/:id/actions` -> `{ data: { action }, error: null }`
- `GET /community/posts/:id` -> fetch for preview.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `report_actions`: `report_id`, `admin_id`, `action_type`, `reason`, `created_at`.
- `audit_logs`: `entity`, `entity_id`, `action`, `performed_by`, `created_at`.
- `community_posts` status updates (see story 5-1).
- Conventions `snake_case`.

### UX & accessibilité

- Admin panel with table, filters (severity, status), quick preview.
- Accessible action dropdown, confirmations (modal, aria-modal).
- `aria-live` for status updates.
- Provide keyboard shortcuts for workflows.

### Workflow & rules

- Actions: hide, delete permanently, warn user, escalate to support.
- Show policy reason and attachments.
- Notify reporter + author on action (via notifications story 3-3).
- Auto-lock content pending review.

### Testing Requirements

- API: RBAC (admin only), actions, status transitions.
- UI: filters, modals, keyboard nav, confirmation.
- Audit: log creation per action.

### Do / Don’t

- Do: enforce RBAC (only appointed admins can act).
- Do: keep audit trail for every decision (RGPD).
- Don’t: drop reports without resolution (track result).

### Project Structure Notes

- Web: `apps/web/src/features/admin/moderation`.
- API: `apps/api/src/modules/moderation`.
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

### Completion Notes List

### File List

### Project Structure Notes

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
- Feature-first dans `apps/api/src/modules` et `apps/web/src/features`
- Conventions: snake_case DB, camelCase JSON, endpoints pluriel

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
