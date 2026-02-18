# Story 7.2: Support incidents liÃ©s aux sessions

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support,
I want consulter les incidents liÃ©s aux sessions,
so that aider Ã  la rÃ©solution.

## Acceptance Criteria

1. Given un incident dÃ©clarÃ© When le support consulte le dossier Then les dÃ©tails de session sont visibles

- [x] Endpoint `GET /sessions/:id/incidents`, `POST /incidents` + `PATCH /incidents/:id/status` (AC: #1)
- [x] UI support avec timeline incident (sessions, messages, notifications) (AC: #1)
- [x] IntÃ©grer logs + attachments (logs, visio replays, messages) (AC: #1)
- [x] Notifications automatiques (support, mentor, student) (AC: #1)
- [x] Tests API + UI + alert workflow (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (support/admin).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: admin/support/analytics.
- Historisation + RGPD.

### API Contracts (incidents)

- `POST /incidents` -> `{ data: { incident }, error: null }`
- `GET /sessions/:id/incidents` -> `{ data: { incidents }, error: null }`
- `PATCH /incidents/:id/status` -> `{ data: { incident }, error: null }`
- `GET /incidents?status=` -> list for support queue.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `incidents`: `id`, `session_id`, `type`, `reported_by`, `details`, `status`, `created_at`.
- `incident_logs`: `incident_id`, `action`, `performed_by`, `notes`.
- `incident_attachments`: `incident_id`, `type`, `url`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Timeline view (session events, incidents, notes).
- Accessible controls for support, modals with `aria-live`.
- Filters (status, severity) + search.

### Workflow & notifications

- Notify mentor/student/support when incident escalates.
- Link to booking/session/responses for context.
- Provide option to record resolution summary.

### Testing Requirements

- API: incident queue, status transitions, RBAC.
- UI: timeline, attachments, filters.
- Integration: notification triggers.

### Do / Donâ€™t

- Do: log each action (audit).
- Do: capture context (session id, user).
- Donâ€™t: hide incidents without resolution.

- Web: `apps/web/src/features/support/incidents`.
- API: `apps/api/src/modules/support`.
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

- npm test -- --runInBand modules/admin modules/users modules/support modules/analytics (apps/api)
- npm test -- src/features/support/incidents/__tests__/SupportIncidentsBoard.test.tsx (apps/web)

### Completion Notes List

- Creation du module API `support` avec endpoints : `GET /sessions/:id/incidents`, `POST /incidents`, `PATCH /incidents/:id/status`, `GET /incidents`.
- Ajout des structures incident/timeline/attachments et transitions de statut (open, in_review, resolved, escalated).
- Ajout de l UI support `SupportIncidentsBoard` avec filtre status et actions de resolution.
- Ajout de la page protegee `/admin/incidents` accessible admin/support.

### File List

- apps/api/src/modules/support/support.module.ts
- apps/api/src/modules/support/support.controller.ts
- apps/api/src/modules/support/support.service.ts
- apps/api/src/modules/support/support.controller.spec.ts
- apps/api/src/modules/support/support.service.spec.ts
- apps/api/src/modules/support/index.ts
- apps/web/src/features/support/incidents/SupportIncidentsBoard.tsx
- apps/web/src/features/support/incidents/SupportIncidentsBoard.module.css
- apps/web/src/features/support/incidents/index.ts
- apps/web/src/features/support/incidents/__tests__/SupportIncidentsBoard.test.tsx
- apps/web/src/app/(app)/admin/incidents/page.tsx

### Change Log

- 2026-02-18: Livraison story 7.2 (module support incidents API + UI + tests).
