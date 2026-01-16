# Story 4.3: Suivi de l’avancement par le mentor

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want suivre l’avancement d’un étudiant,
so that adapter mon accompagnement.

## Acceptance Criteria

1. Given un mentor authentifié When il consulte le suivi d’un étudiant Then les jalons et leur statut sont visibles

## Tasks / Subtasks

- [ ] Endpoint `GET /students/:id/progression` (AC: #1)
- [ ] Ajouter section “Insights” (avancement, risques, notes) (AC: #1)
- [ ] UI mentor: timeline, filtres par jalon, alertes (AC: #1)
- [ ] Ajouter workflow notifications mentor (reminder, escalation) (AC: #1)
- [ ] Tests API + UI + notifications (AC: #1)

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

### UX & accessibilité

- Mentor dashboard with cards (progress, risk).
- Timeline, filters (type, status).
- Accessibilité: focus states, `aria-live` for alerts.
- Alerts for overdue milestones + CTA.

### Integration & delivery

- Notification escalations if stalled (story 3-3).
- Provide quick links to mentor conversation + booking.
- Sync with progression (story 4-1) and milestone completion (story 4-2).

### Testing Requirements

- API: progression retrieval, insights accuracy, RBAC.
- UI: timeline interactions, alert modals, keyboard nav.
- Integration: escalation → notification action.

### Do / Don’t

- Do: record mentor notes per milestone.
- Don’t: expose other students data (RBAC).

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

### Completion Notes List

### File List
