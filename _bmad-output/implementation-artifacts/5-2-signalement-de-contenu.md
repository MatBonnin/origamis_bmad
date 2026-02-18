# Story 5.2: Signalement de contenu

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want signaler un contenu ou un comportement,
so that contribuer Ã  la modÃ©ration.

## Acceptance Criteria

1. Given un contenu inappropriÃ© When lâ€™utilisateur le signale Then le signalement est enregistrÃ© et visible pour les admins

## Tasks / Subtasks

- [x] Ajouter tables `content_reports`, `content_report_tags`, `content_report_status` (AC: #1)
- [x] Endpoint `POST /reports` + `GET /reports/:id` + `PATCH /reports/:id/status` (AC: #1)
- [x] UI de signalement (modal, champs raison + captures, challenge captchas) (AC: #1)
- [x] Envoi notification admin + auteur (le cas échéant) (AC: #1)
- [x] Tests API + UI + workflow statut (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: community + moderation.
- Support multi-langue et RGPD.

### API Contracts (signalement)

- `POST /reports` -> `{ data: { report }, error: null }`
- `GET /reports/:id` -> `{ data: { report }, error: null }`
- `PATCH /reports/:id/status` -> `{ data: { status }, error: null }`
- Webhook to moderation system (admin) + notifications push.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `content_reports`: `id`, `reporter_id`, `target_type`, `target_id`, `reason`, `details`, `status`, `created_at`.
- `report_comments`: `report_id`, `admin_id`, `comment`, `created_at`.
- `content_report_tags`: `tag`.
- Conventions `snake_case`.

### UX & validation

- Modal dâ€™alerte accessible (labels, aria-live).
- Offrir templates de raison + piÃ¨ce jointe (capture).
- Captcha ou rate-limiting pour Ã©viter spam.
- Feedback clair aprÃ¨s signalement.

### Workflow & notifications

- Statuts: `new`, `in_review`, `escalated`, `resolved`.
- Notifier admin + reporter + auteur (si pas conflit) via `notifications`.
- Relier signalement Ã  la modÃ©ration (story 5-3).

### Testing Requirements

- API: create report, status transitions, RBAC.
- UI: signalement modal, validations, attachments.
- Workflow: report -> admin action -> notification.

### Do / Donâ€™t

- Do: conserver anonymat reporter si demandÃ©.
- Do: loguer interactions pour audit.
- Donâ€™t: dÃ©voiler identitÃ©s sans permission.

### Project Structure Notes

- Web: `apps/web/src/features/community/report`.
- API: `apps/api/src/modules/content-reports`.
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

- Module `content-reports` créé avec gestion des statuts `new|in_review|escalated|resolved`.
- Endpoint signalement sécurisé avec captcha token requis et option anonymat reporter.
- Modal de signalement intégrée dans la communauté (raison, détails, anonymat, captcha).
- Notifications déclenchées à la création et aux changements de statut.
- Tests ciblés passants: service/controller reports + UI report flow.

### Completion Notes List

- Story 5.2 finalisée: workflow de signalement complet API/UI avec statut et notifications.

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

- 2026-02-18: Story 5.2 completee (content reports API/UI, captcha, statuts, notifications, tests).
