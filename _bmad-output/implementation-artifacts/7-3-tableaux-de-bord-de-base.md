# Story 7.3: Tableaux de bord de base

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want accéder à des tableaux de bord (matching, usage),
so that suivre l’activité globale.

## Acceptance Criteria

1. Given un admin authentifié When il consulte le dashboard Then des indicateurs de base sont affichés

- [ ] Endpoint `GET /analytics/dashboard?type=` (matching, usage, incidents) (AC: #1)
- [ ] Agrégations Prisma/SQL + cache (AC: #1)
- [ ] UI dashboards: charts, cards, filters, segmentation (AC: #1)
- [ ] Export CSV/PDF + schedule reports (AC: #1)
- [ ] Tests API + reporting + UI (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin/support).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: admin/support/analytics.
- Support RGPD, exports loggés.

### API Contracts (dashboards)

- `GET /analytics/dashboard?type=` -> `{ data: { metrics, metadata }, error: null }`
- `POST /analytics/reports` -> `{ data: { report_id }, error: null }`
- `GET /analytics/reports/:id` -> `{ data: { report }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `analytics_snapshots`: `type`, `payload_json`, `created_at`.
- `analytics_reports`: `id`, `type`, `status`, `generated_at`.
- `audit_reports`: `report_id`, `requested_by`, `status`.
- Conventions `snake_case`.

### UX & accessibilité

- Dashboards with cards, charts (bar, line, pie), filter ribbons.
- Accessible legend, `aria-live` updates, keyboard nav.
- Export buttons with aria labels.

### Integration & monitoring

- Schedule nightly exports, send notifications on anomalies.
- Feed from matching/reviews/incidents data.
- Provide drilldown & link to logs.

### Testing Requirements

- API: metrics, filters, exports, caching.
- UI: charts, filters, export modal.
- Performance: response < 500ms for base metrics.

### Do / Don’t

- Do: respect RBAC (only admin/support view).
- Do: log exports for compliance.
- Don’t: show sensitive PII.

- Web: `apps/web/src/features/analytics`.
- API: `apps/api/src/modules/analytics`.
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
