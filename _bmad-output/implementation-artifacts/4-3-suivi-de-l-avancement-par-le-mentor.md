# Story 4.3: Suivi de lâ€™avancement par le mentor

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want suivre lâ€™avancement dâ€™un Ã©tudiant,
so that adapter mon accompagnement.

## Acceptance Criteria

1. Given un mentor authentifiÃ© When il consulte le suivi dâ€™un Ã©tudiant Then les jalons et leur statut sont visibles

## Tasks / Subtasks

- [x] Endpoint GET /students/:id/progression (AC: #1)
- [x] Ajouter section “Insights” (avancement, risques, notes) (AC: #1)
- [x] UI mentor: timeline, filtres par jalon, alertes (AC: #1)
- [x] Ajouter workflow notifications mentor (reminder, escalation) (AC: #1)
- [x] Tests API + UI + notifications (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (mentor view).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules milestones/jalons.
- Progression visible.

- `GET /students/:id/progression` -> `{ data: { milestones, metadata }, error: null }`
- `GET /students/:id/milestone-insights` -> `{ data: { insights }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_insights`: `student_id`, `risk_level`, `last_checkin`, `notes`.
- `milestone_notes`: `milestone_id`, `mentor_id`, `note`, `created_at`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Mentor dashboard with cards (progress, risk).
- Timeline, filters (type, status).
- AccessibilitÃ©: focus states, `aria-live` for alerts.
- Alerts for overdue milestones + CTA.

### Integration & delivery

- Notification escalations if stalled (story 3-3).
- Provide quick links to mentor conversation + booking.
- Sync with progression (story 4-1) and milestone completion (story 4-2).

### Testing Requirements

- API: progression retrieval, insights accuracy, RBAC.
- UI: timeline interactions, alert modals, keyboard nav.
- Integration: escalation â†’ notification action.

### Do / Donâ€™t

- Do: record mentor notes per milestone.
- Donâ€™t: expose other students data (RBAC).

### Project Structure Notes

- Web: `apps/web/src/features/mentors/progression`.
- API: `apps/api/src/modules/milestones`.
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

- Endpoints mentor implémentés: GET /students/:id/progression et GET /students/:id/milestone-insights.
- Contrôle RBAC appliqué: accès mentor uniquement sur étudiants liés (ou admin/support).
- UI mentor créée (/mentor/progression) avec timeline, insights risque/retards et actions de review.
- Workflow notifications branché pour validation/refus de jalon avec message à l étudiant.
- Tests passants: API ciblé (13/13), Web ciblé (5/5), API complet (289/289).

### Completion Notes List

- Story 4.3 terminée: vue mentor de suivi, insights, workflow notifications et tests livrés.

### File List

- apps/api/src/modules/milestones/milestones.service.ts
- apps/api/src/modules/milestones/milestones.controller.ts
- apps/api/src/modules/milestones/milestones.module.ts
- apps/api/src/modules/milestones/index.ts
- apps/api/src/modules/milestones/milestones.service.spec.ts
- apps/api/src/modules/milestones/milestones.controller.spec.ts
- apps/api/src/app.module.ts
- apps/web/src/app/(app)/projets/page.tsx
- apps/web/src/app/(app)/mentor/progression/page.tsx
- apps/web/src/features/milestones/index.ts
- apps/web/src/features/milestones/progress/index.ts
- apps/web/src/features/milestones/progress/StudentProgression.tsx
- apps/web/src/features/milestones/progress/StudentProgression.module.css
- apps/web/src/features/milestones/progress/__tests__/StudentProgression.test.tsx
- apps/web/src/features/mentors/progression/index.ts
- apps/web/src/features/mentors/progression/MentorProgression.tsx
- apps/web/src/features/mentors/progression/MentorProgression.module.css
- apps/web/src/features/mentors/progression/__tests__/MentorProgression.test.tsx

## Change Log

- 2026-02-18: Story 4.3 completee (GET progression mentor, insights, UI mentor, workflow review/notifications, tests).
