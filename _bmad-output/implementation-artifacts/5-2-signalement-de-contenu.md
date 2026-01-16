# Story 5.2: Signalement de contenu

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want signaler un contenu ou un comportement,
so that contribuer à la modération.

## Acceptance Criteria

1. Given un contenu inapproprié When l’utilisateur le signale Then le signalement est enregistré et visible pour les admins

## Tasks / Subtasks

- [ ] Ajouter tables `content_reports`, `content_report_tags`, `content_report_status` (AC: #1)
- [ ] Endpoint `POST /reports` + `GET /reports/:id` + `PATCH /reports/:id/status` (AC: #1)
- [ ] UI de signalement (modal, champs raison + captures, challenge captchas) (AC: #1)
- [ ] Envoi notification admin + auteur (le cas échéant) (AC: #1)
- [ ] Tests API + UI + workflow statut (AC: #1)

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

- Modal d’alerte accessible (labels, aria-live).
- Offrir templates de raison + pièce jointe (capture).
- Captcha ou rate-limiting pour éviter spam.
- Feedback clair après signalement.

### Workflow & notifications

- Statuts: `new`, `in_review`, `escalated`, `resolved`.
- Notifier admin + reporter + auteur (si pas conflit) via `notifications`.
- Relier signalement à la modération (story 5-3).

### Testing Requirements

- API: create report, status transitions, RBAC.
- UI: signalement modal, validations, attachments.
- Workflow: report -> admin action -> notification.

### Do / Don’t

- Do: conserver anonymat reporter si demandé.
- Do: loguer interactions pour audit.
- Don’t: dévoiler identités sans permission.

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
