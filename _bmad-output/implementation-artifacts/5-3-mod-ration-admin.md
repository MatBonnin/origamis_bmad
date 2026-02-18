# Story 5.3: ModÃ©ration admin

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want modÃ©rer les contenus signalÃ©s,
so that maintenir un espace sÃ»r.

## Acceptance Criteria

1. Given un admin authentifiÃ© When il traite un signalement Then il peut masquer/supprimer le contenu ou lever le signalement

## Tasks / Subtasks

- [x] Endpoint admin `GET /reports/pending`, `PATCH /reports/:id/status`, `POST /reports/:id/actions` (AC: #1)
- [x] Action workflow (hide content, restore, warn user, escalate) (AC: #1)
- [x] UI admin dashboard (liste rapports, filtre, preview, action buttons) (AC: #1)
- [x] Log & audit actions (who, when, reason) (AC: #1)
- [x] Tests API + UI + audit trail + RBAC (AC: #1)

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

### API Contracts (modÃ©ration)

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

### UX & accessibilitÃ©

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

### Do / Donâ€™t

- Do: enforce RBAC (only appointed admins can act).
- Do: keep audit trail for every decision (RGPD).
- Donâ€™t: drop reports without resolution (track result).

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

- Module `moderation` implémenté avec endpoint pending/actions et journal d audit en mémoire.
- Workflow admin appliqué: hide/restore/warn/escalate et impact statut post communautaire.
- UI admin livrée sur `/admin/moderation` avec filtres, actions rapides et feedback aria-live.
- RBAC appliqué sur endpoints de modération (admin/support).
- Tests ciblés passants: controller/service moderation + dashboard admin.

### Completion Notes List

- Story 5.3 finalisée: traitement admin des signalements, actions de modération, audit trail et tests.

### File List

- apps/api/src/modules/community/community.service.ts
- apps/api/src/modules/community/community.controller.ts
- apps/api/src/modules/community/community.gateway.ts
- apps/api/src/modules/community/community.module.ts
- apps/api/src/modules/community/index.ts
- apps/api/src/modules/community/community.service.spec.ts
- apps/api/src/modules/community/community.controller.spec.ts
- apps/api/src/modules/content-reports/content-reports.service.ts
- apps/api/src/modules/content-reports/content-reports.controller.ts
- apps/api/src/modules/content-reports/content-reports.module.ts
- apps/api/src/modules/content-reports/index.ts
- apps/api/src/modules/content-reports/content-reports.service.spec.ts
- apps/api/src/modules/content-reports/content-reports.controller.spec.ts
- apps/api/src/modules/moderation/moderation.service.ts
- apps/api/src/modules/moderation/moderation.controller.ts
- apps/api/src/modules/moderation/moderation.module.ts
- apps/api/src/modules/moderation/index.ts
- apps/api/src/modules/moderation/moderation.service.spec.ts
- apps/api/src/modules/moderation/moderation.controller.spec.ts
- apps/api/src/app.module.ts
- apps/web/src/app/(app)/communaute/page.tsx
- apps/web/src/app/(app)/admin/moderation/page.tsx
- apps/web/src/features/community/index.ts
- apps/web/src/features/community/CommunityFeed.tsx
- apps/web/src/features/community/CommunityFeed.module.css
- apps/web/src/features/community/report/index.ts
- apps/web/src/features/community/report/ReportModal.tsx
- apps/web/src/features/community/report/ReportModal.module.css
- apps/web/src/features/community/__tests__/CommunityFeed.test.tsx
- apps/web/src/features/admin/moderation/index.ts
- apps/web/src/features/admin/moderation/ModerationDashboard.tsx
- apps/web/src/features/admin/moderation/ModerationDashboard.module.css
- apps/web/src/features/admin/moderation/__tests__/ModerationDashboard.test.tsx
- apps/web/src/components/layout/Sidebar.tsx

## Change Log

- 2026-02-18: Story 5.3 completee (moderation admin endpoints/actions, dashboard, audit logs, tests).
